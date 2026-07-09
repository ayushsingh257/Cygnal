"""
MISP Connector — Cygnal v4.0 Phase 2
Supports: IP, domain, URL, hash IOC search via MISP REST API
"""
from __future__ import annotations

import logging

from services.threat_intel.base import (
    BaseThreatIntelProvider,
    EnrichmentResult,
    IndicatorType,
    ProviderConfig,
    Verdict,
    _retry,
    _utcnow,
)

logger = logging.getLogger("cygnal.threat_intel.misp")

_TYPE_MAP = {
    IndicatorType.IP: "ip-dst",
    IndicatorType.DOMAIN: "domain",
    IndicatorType.URL: "url",
    IndicatorType.HASH_MD5: "md5",
    IndicatorType.HASH_SHA1: "sha1",
    IndicatorType.HASH_SHA256: "sha256",
}


class MISPProvider(BaseThreatIntelProvider):
    """
    MISP instance connector.
    Requires MISP_URL (base_url) and MISP_API_KEY (api_key).
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if not self.is_available:
            return self._unavailable_result(indicator, indicator_type, "MISP URL/API key not configured")

        if indicator_type not in _TYPE_MAP:
            return self._unavailable_result(
                indicator, indicator_type, f"MISP: type {indicator_type.value} not supported"
            )

        try:
            return _retry(
                lambda: self._query(indicator, indicator_type),
                max_retries=self.config.max_retries,
            )
        except Exception as exc:
            return self._error_result(indicator, indicator_type, exc)

    def _query(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        import requests

        misp_type = _TYPE_MAP[indicator_type]
        base = self.config.base_url.rstrip("/")
        url = f"{base}/attributes/restSearch"

        headers = {
            "Authorization": self.config.api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        payload = {
            "returnFormat": "json",
            "type": misp_type,
            "value": indicator,
            "limit": 50,
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=self.config.timeout, verify=False)

        if resp.status_code == 401:
            return self._unavailable_result(indicator, indicator_type, "MISP: Invalid API key")

        if resp.status_code == 429:
            raise RuntimeError("MISP rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        attributes = data.get("response", {}).get("Attribute", [])

        if not attributes:
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                queried_at=_utcnow(),
            )

        tags: list[str] = []
        event_ids: list[str] = []
        for attr in attributes:
            event_ids.append(str(attr.get("event_id", "")))
            for tag in attr.get("Tag", []):
                tags.append(tag.get("name", ""))

        tags = list({t.strip() for t in tags if t.strip()})
        hit_count = len(attributes)
        confidence = min(0.4 + hit_count * 0.1, 0.95)

        # Infer verdict from MISP taxonomy tags
        is_malicious = any("tlp:red" in t.lower() or "malware" in t.lower() for t in tags)
        is_suspicious = any("suspicious" in t.lower() for t in tags)

        if is_malicious or hit_count >= 3:
            verdict = Verdict.MALICIOUS
        elif is_suspicious or hit_count >= 1:
            verdict = Verdict.SUSPICIOUS
        else:
            verdict = Verdict.UNKNOWN

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=round(confidence, 3),
            tags=tags,
            raw={"attribute_count": hit_count, "event_ids": list(set(event_ids))[:10]},
            queried_at=_utcnow(),
        )
