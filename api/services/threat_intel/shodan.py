"""
Shodan Connector — Cygnal v4.0 Phase 2
Supports: IP lookup (host info, open ports, CVEs, country, ISP)
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

logger = logging.getLogger("cygnal.threat_intel.shodan")

SHODAN_BASE = "https://api.shodan.io"


class ShodanProvider(BaseThreatIntelProvider):
    """Shodan Host Info connector — best suited for IP enrichment."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if not self.is_available:
            return self._unavailable_result(indicator, indicator_type, "Shodan API key not configured")

        if indicator_type not in (IndicatorType.IP,):
            return self._unavailable_result(
                indicator, indicator_type, f"Shodan: indicator type {indicator_type.value} not supported"
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

        url = f"{SHODAN_BASE}/shodan/host/{indicator}"
        params = {"key": self.config.api_key}

        resp = requests.get(url, params=params, timeout=self.config.timeout)

        if resp.status_code == 404:
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                error="Not found in Shodan",
                queried_at=_utcnow(),
            )

        if resp.status_code == 401:
            return self._unavailable_result(indicator, indicator_type, "Shodan: Invalid API key")

        if resp.status_code == 429:
            raise RuntimeError("Shodan rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        vulns = list(data.get("vulns", {}).keys())
        tags = data.get("tags", []) + vulns
        hostnames = data.get("hostnames", [])
        country = data.get("country_code")
        isp = data.get("isp")
        asn = data.get("asn")

        # Shodan doesn't provide a direct verdict — infer from CVEs and tags
        if vulns:
            verdict = Verdict.MALICIOUS
            confidence = min(0.3 + 0.1 * len(vulns), 0.9)
        elif "malware" in tags or "compromised" in tags:
            verdict = Verdict.MALICIOUS
            confidence = 0.7
        elif "honeypot" in tags or "scanner" in tags:
            verdict = Verdict.SUSPICIOUS
            confidence = 0.4
        else:
            verdict = Verdict.UNKNOWN
            confidence = 0.0

        ports = [item.get("port") for item in data.get("data", []) if item.get("port")]

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=confidence,
            tags=tags,
            country=country,
            asn=asn,
            isp=isp,
            hostnames=hostnames,
            last_seen=data.get("last_update"),
            raw={"ports": ports, "vulns": vulns, "org": data.get("org")},
            queried_at=_utcnow(),
        )
