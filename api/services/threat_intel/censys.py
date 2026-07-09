"""
Censys Connector — Cygnal v4.0 Phase 2
Supports: IP host data lookup via Censys Search API v2
Architecture-ready — gracefully degrades if credentials are absent.
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

logger = logging.getLogger("cygnal.threat_intel.censys")

CENSYS_BASE = "https://search.censys.io/api/v2"


class CensysProvider(BaseThreatIntelProvider):
    """
    Censys Search API v2 connector.
    Requires CENSYS_API_ID and CENSYS_API_SECRET (passed as api_key in format "id:secret").
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if not self.is_available:
            return self._unavailable_result(indicator, indicator_type, "Censys credentials not configured")

        if indicator_type != IndicatorType.IP:
            return self._unavailable_result(
                indicator, indicator_type, f"Censys: type {indicator_type.value} not supported"
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

        # api_key stored as "api_id:api_secret"
        try:
            api_id, api_secret = self.config.api_key.split(":", 1)
        except ValueError:
            return self._unavailable_result(indicator, indicator_type, "Censys: api_key must be 'id:secret'")

        url = f"{CENSYS_BASE}/hosts/{indicator}"
        resp = requests.get(url, auth=(api_id, api_secret), timeout=self.config.timeout)

        if resp.status_code == 404:
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                error="Not found in Censys",
                queried_at=_utcnow(),
            )

        if resp.status_code == 401:
            return self._unavailable_result(indicator, indicator_type, "Censys: Invalid credentials")

        if resp.status_code == 429:
            raise RuntimeError("Censys rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        result = data.get("result", {})
        services = result.get("services", [])
        ports = [s.get("port") for s in services if s.get("port")]
        hostnames = result.get("dns", {}).get("reverse_dns", {}).get("names", [])
        country = result.get("location", {}).get("country_code")
        asn = str(result.get("autonomous_system", {}).get("asn", "")) or None
        isp = result.get("autonomous_system", {}).get("name")
        labels = result.get("labels", [])

        # Censys doesn't provide explicit malice verdict — infer from labels
        verdict = Verdict.UNKNOWN
        confidence = 0.0
        if any(l in labels for l in ("bot", "c2", "malware-c2")):
            verdict = Verdict.MALICIOUS
            confidence = 0.8
        elif any(l in labels for l in ("scanner", "honeypot-scanner")):
            verdict = Verdict.SUSPICIOUS
            confidence = 0.4

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=confidence,
            tags=labels,
            country=country,
            asn=asn,
            isp=isp,
            hostnames=hostnames,
            last_seen=result.get("last_updated_at"),
            raw={"ports": ports, "services_count": len(services)},
            queried_at=_utcnow(),
        )
