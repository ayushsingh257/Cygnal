"""
AlienVault OTX Connector — Cygnal v4.0 Phase 2
Supports: IP, domain, URL, file hash pulse/indicator lookup
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

logger = logging.getLogger("cygnal.threat_intel.otx")

OTX_BASE = "https://otx.alienvault.com/api/v1"

_TYPE_MAP = {
    IndicatorType.IP: "IPv4",
    IndicatorType.DOMAIN: "domain",
    IndicatorType.URL: "url",
    IndicatorType.HASH_MD5: "file",
    IndicatorType.HASH_SHA1: "file",
    IndicatorType.HASH_SHA256: "file",
}


class AlienVaultOTXProvider(BaseThreatIntelProvider):
    """AlienVault OTX connector — pulse-based threat intelligence."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if not self.is_available:
            return self._unavailable_result(indicator, indicator_type, "OTX API key not configured")

        if indicator_type not in _TYPE_MAP:
            return self._unavailable_result(
                indicator, indicator_type, f"OTX: type {indicator_type.value} not supported"
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

        otx_type = _TYPE_MAP[indicator_type]
        headers = {"X-OTX-API-KEY": self.config.api_key}

        # Fetch general info
        url = f"{OTX_BASE}/indicators/{otx_type}/{indicator}/general"
        resp = requests.get(url, headers=headers, timeout=self.config.timeout)

        if resp.status_code == 400:
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                error="OTX: invalid indicator format",
                queried_at=_utcnow(),
            )

        if resp.status_code == 401:
            return self._unavailable_result(indicator, indicator_type, "OTX: Invalid API key")

        if resp.status_code == 429:
            raise RuntimeError("OTX rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        pulse_info = data.get("pulse_info", {})
        pulse_count = pulse_info.get("count", 0)

        # Gather tags from pulses
        tags: list[str] = []
        for pulse in pulse_info.get("pulses", [])[:10]:
            tags.extend(pulse.get("tags", []))
            tags.append(pulse.get("name", ""))
        tags = list({t.strip() for t in tags if t.strip()})

        if pulse_count >= 5:
            verdict = Verdict.MALICIOUS
            confidence = min(0.5 + pulse_count * 0.05, 0.95)
        elif pulse_count >= 1:
            verdict = Verdict.SUSPICIOUS
            confidence = min(0.2 + pulse_count * 0.1, 0.6)
        else:
            verdict = Verdict.UNKNOWN
            confidence = 0.0

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=round(confidence, 3),
            tags=tags,
            country=data.get("country_code"),
            last_seen=data.get("modified"),
            raw={"pulse_count": pulse_count, "sections": data.get("sections", [])},
            queried_at=_utcnow(),
        )
