"""
AbuseIPDB Connector — Cygnal v4.0 Phase 2
Supports: IP address abuse confidence score and category lookup
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

logger = logging.getLogger("cygnal.threat_intel.abuseipdb")

ABUSEIPDB_BASE = "https://api.abuseipdb.com/api/v2"

ABUSE_CATEGORIES = {
    1: "DNS Compromise",
    2: "DNS Poisoning",
    3: "Fraud Orders",
    4: "DDoS Attack",
    5: "FTP Brute-Force",
    6: "Ping of Death",
    7: "Phishing",
    8: "Fraud VoIP",
    9: "Open Proxy",
    10: "Web Spam",
    11: "Email Spam",
    12: "Blog Spam",
    13: "VPN IP",
    14: "Port Scan",
    15: "Hacking",
    16: "SQL Injection",
    17: "Spoofing",
    18: "Brute-Force",
    19: "Bad Web Bot",
    20: "Exploited Host",
    21: "Web App Attack",
    22: "SSH",
    23: "IoT Targeted",
}


class AbuseIPDBProvider(BaseThreatIntelProvider):
    """AbuseIPDB v2 connector — IP abuse confidence scoring."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        if not self.is_available:
            return self._unavailable_result(indicator, indicator_type, "AbuseIPDB API key not configured")

        if indicator_type != IndicatorType.IP:
            return self._unavailable_result(
                indicator, indicator_type, f"AbuseIPDB: type {indicator_type.value} not supported"
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

        headers = {"Key": self.config.api_key, "Accept": "application/json"}
        params = {"ipAddress": indicator, "maxAgeInDays": 90, "verbose": ""}

        resp = requests.get(
            f"{ABUSEIPDB_BASE}/check",
            headers=headers,
            params=params,
            timeout=self.config.timeout,
        )

        if resp.status_code == 401:
            return self._unavailable_result(indicator, indicator_type, "AbuseIPDB: Invalid API key")

        if resp.status_code == 429:
            raise RuntimeError("AbuseIPDB rate limit exceeded")

        resp.raise_for_status()
        return self._parse(resp.json(), indicator, indicator_type)

    def _parse(self, data: dict, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        d = data.get("data", {})
        score = d.get("abuseConfidenceScore", 0)  # 0-100
        confidence = round(score / 100, 3)

        if score >= 75:
            verdict = Verdict.MALICIOUS
        elif score >= 25:
            verdict = Verdict.SUSPICIOUS
        elif score > 0:
            verdict = Verdict.SUSPICIOUS
        else:
            verdict = Verdict.CLEAN

        category_ids = []
        for report in d.get("reports", []):
            category_ids.extend(report.get("categories", []))
        tags = list({ABUSE_CATEGORIES.get(c, f"category_{c}") for c in category_ids})

        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=verdict,
            confidence=confidence,
            tags=tags,
            country=d.get("countryCode"),
            isp=d.get("isp"),
            last_seen=d.get("lastReportedAt"),
            raw={"total_reports": d.get("totalReports"), "abuse_score": score},
            queried_at=_utcnow(),
        )
