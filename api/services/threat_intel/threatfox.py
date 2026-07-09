"""
ThreatFox Connector — Cygnal v4.0 Phase 2
Supports: IP, domain, URL, hash IOC search via Abuse.ch ThreatFox API
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

logger = logging.getLogger("cygnal.threat_intel.threatfox")

THREATFOX_URL = "https://threatfox-api.abuse.ch/api/v1/"


class ThreatFoxProvider(BaseThreatIntelProvider):
    """
    ThreatFox (Abuse.ch) connector.
    ThreatFox is a free API — no key required but rate-limited.
    """

    def __init__(self, config: ProviderConfig):
        # ThreatFox is free — mark available even without an API key
        config.enabled = True
        super().__init__(config)

    @property
    def is_available(self) -> bool:
        return self.config.enabled

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        try:
            return _retry(
                lambda: self._query(indicator, indicator_type),
                max_retries=self.config.max_retries,
            )
        except Exception as exc:
            return self._error_result(indicator, indicator_type, exc)

    def _query(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        import requests

        payload = {"query": "search_ioc", "search_term": indicator}
        resp = requests.post(
            THREATFOX_URL,
            json=payload,
            timeout=self.config.timeout,
        )

        if resp.status_code == 429:
            raise RuntimeError("ThreatFox rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        query_status = data.get("query_status")

        if query_status == "no_result":
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                queried_at=_utcnow(),
            )

        iocs = data.get("data", [])
        if not iocs:
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                queried_at=_utcnow(),
            )

        # Aggregate tags from all matching IOC records
        tags: list[str] = []
        malware_names: list[str] = []
        for ioc in iocs:
            malware_names.append(ioc.get("malware", ""))
            tags.extend(ioc.get("tags") or [])
            if ioc.get("malware_printable"):
                tags.append(ioc["malware_printable"])

        tags = list({t.strip() for t in tags if t.strip()})
        confidence = min(0.5 + len(iocs) * 0.1, 0.95)

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=Verdict.MALICIOUS,
            confidence=round(confidence, 3),
            malicious_votes=len(iocs),
            tags=tags,
            last_seen=iocs[0].get("last_seen") if iocs else None,
            raw={"ioc_count": len(iocs), "malware": list(set(malware_names))},
            queried_at=_utcnow(),
        )
