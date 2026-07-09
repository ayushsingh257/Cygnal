"""
URLHaus Connector — Cygnal v4.0 Phase 2
Supports: URL and domain/host lookup via Abuse.ch URLHaus API
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

logger = logging.getLogger("cygnal.threat_intel.urlhaus")

URLHAUS_URL = "https://urlhaus-api.abuse.ch/v1/"


class URLHausProvider(BaseThreatIntelProvider):
    """
    URLHaus (Abuse.ch) connector.
    Free API — no key required.
    """

    def __init__(self, config: ProviderConfig):
        config.enabled = True
        super().__init__(config)

    @property
    def is_available(self) -> bool:
        return self.config.enabled

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if indicator_type not in (IndicatorType.URL, IndicatorType.DOMAIN):
            return self._unavailable_result(
                indicator, indicator_type, f"URLHaus: type {indicator_type.value} not supported"
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

        if indicator_type == IndicatorType.URL:
            endpoint = f"{URLHAUS_URL}url/"
            payload = {"url": indicator}
        else:
            endpoint = f"{URLHAUS_URL}host/"
            payload = {"host": indicator}

        resp = requests.post(endpoint, data=payload, timeout=self.config.timeout)

        if resp.status_code == 429:
            raise RuntimeError("URLHaus rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        status = data.get("query_status")

        if status in ("no_results", "invalid_url", "invalid_host"):
            return EnrichmentResult(
                provider=self.name,
                indicator=indicator,
                indicator_type=indicator_type,
                verdict=Verdict.UNKNOWN,
                confidence=0.0,
                queried_at=_utcnow(),
            )

        url_status = data.get("url_status") or data.get("blacklists", {})
        tags = data.get("tags") or []

        # Determine verdict from url_status or blacklist fields
        if url_status == "online":
            verdict = Verdict.MALICIOUS
            confidence = 0.9
        elif url_status == "offline":
            verdict = Verdict.SUSPICIOUS
            confidence = 0.5
        elif isinstance(url_status, dict):
            # Host query — check blacklists
            in_spamhaus = url_status.get("spamhaus_dbl") not in (None, "not listed")
            in_surbl = url_status.get("surbl") not in (None, "not listed")
            if in_spamhaus or in_surbl:
                verdict = Verdict.MALICIOUS
                confidence = 0.85
            else:
                verdict = Verdict.UNKNOWN
                confidence = 0.0
        else:
            verdict = Verdict.UNKNOWN
            confidence = 0.0

        urls_on_host = data.get("urls", [])
        malware_samples = [u.get("url", "") for u in urls_on_host[:5]]

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=confidence,
            tags=tags,
            last_seen=data.get("date_added"),
            raw={"url_status": url_status, "threat": data.get("threat"), "samples": malware_samples},
            queried_at=_utcnow(),
        )
