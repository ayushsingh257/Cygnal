"""
VirusTotal v3 Connector — Cygnal v4.0 Phase 2
Supports: IP, domain, URL, file hash lookup
"""
from __future__ import annotations

import hashlib
import base64
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

logger = logging.getLogger("cygnal.threat_intel.virustotal")

VT_BASE = "https://www.virustotal.com/api/v3"


class VirusTotalProvider(BaseThreatIntelProvider):
    """VirusTotal v3 API connector."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if not self.is_available:
            return self._unavailable_result(indicator, indicator_type, "VirusTotal API key not configured")

        try:
            return _retry(
                lambda: self._query(indicator, indicator_type),
                max_retries=self.config.max_retries,
            )
        except Exception as exc:
            return self._error_result(indicator, indicator_type, exc)

    def _query(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        import requests

        headers = {"x-apikey": self.config.api_key, "Accept": "application/json"}
        endpoint = self._build_endpoint(indicator, indicator_type)
        url = f"{VT_BASE}/{endpoint}"

        resp = requests.get(url, headers=headers, timeout=self.config.timeout)

        if resp.status_code == 404:
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                error="Not found in VirusTotal",
                queried_at=_utcnow(),
            )

        if resp.status_code == 401:
            return self._unavailable_result(indicator, indicator_type, "VirusTotal: Invalid API key")

        if resp.status_code == 429:
            raise RuntimeError("VirusTotal rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _build_endpoint(self, indicator: str, indicator_type: IndicatorType) -> str:
        if indicator_type == IndicatorType.IP:
            return f"ip_addresses/{indicator}"
        if indicator_type == IndicatorType.DOMAIN:
            return f"domains/{indicator}"
        if indicator_type in (IndicatorType.URL,):
            url_id = base64.urlsafe_b64encode(indicator.encode()).decode().rstrip("=")
            return f"urls/{url_id}"
        if indicator_type in (IndicatorType.HASH_MD5, IndicatorType.HASH_SHA1, IndicatorType.HASH_SHA256):
            return f"files/{indicator}"
        raise ValueError(f"VirusTotal: unsupported indicator type {indicator_type}")

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})

        malicious = stats.get("malicious", 0)
        harmless = stats.get("harmless", 0)
        undetected = stats.get("undetected", 0)
        suspicious = stats.get("suspicious", 0)
        total = malicious + harmless + undetected + suspicious or 1

        if malicious > 0:
            verdict = Verdict.MALICIOUS
        elif suspicious > 0:
            verdict = Verdict.SUSPICIOUS
        elif harmless > 0:
            verdict = Verdict.CLEAN
        else:
            verdict = Verdict.UNKNOWN

        confidence = round(malicious / total, 3) if malicious else (
            round(suspicious / total, 3) if suspicious else 0.0
        )

        tags = attrs.get("tags", [])
        country = attrs.get("country")
        asn = str(attrs.get("asn", "")) or None
        isp = attrs.get("as_owner")

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=confidence,
            malicious_votes=malicious,
            harmless_votes=harmless,
            undetected_votes=undetected,
            tags=tags,
            country=country,
            asn=asn,
            isp=isp,
            raw=data,
            queried_at=_utcnow(),
        )
