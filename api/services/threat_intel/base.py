"""
Cygnal v4.0 Phase 2 — Threat Intelligence Provider Architecture
Base classes and typed models for all TI connectors.
"""
from __future__ import annotations

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger("cygnal.threat_intel")


class IndicatorType(str, Enum):
    IP = "ip"
    DOMAIN = "domain"
    URL = "url"
    HASH_MD5 = "hash_md5"
    HASH_SHA1 = "hash_sha1"
    HASH_SHA256 = "hash_sha256"
    EMAIL = "email"
    CVE = "cve"


class Verdict(str, Enum):
    MALICIOUS = "malicious"
    SUSPICIOUS = "suspicious"
    CLEAN = "clean"
    UNKNOWN = "unknown"


@dataclass
class EnrichmentResult:
    """Standardised enrichment result from any TI provider."""
    provider: str
    indicator: str
    indicator_type: IndicatorType
    verdict: Verdict
    confidence: float                    # 0.0 – 1.0
    malicious_votes: int = 0
    harmless_votes: int = 0
    undetected_votes: int = 0
    tags: list[str] = field(default_factory=list)
    country: Optional[str] = None
    asn: Optional[str] = None
    isp: Optional[str] = None
    hostnames: list[str] = field(default_factory=list)
    last_seen: Optional[str] = None
    raw: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    cached: bool = False
    queried_at: str = ""

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "indicator": self.indicator,
            "indicator_type": self.indicator_type.value,
            "verdict": self.verdict.value,
            "confidence": self.confidence,
            "malicious_votes": self.malicious_votes,
            "harmless_votes": self.harmless_votes,
            "undetected_votes": self.undetected_votes,
            "tags": self.tags,
            "country": self.country,
            "asn": self.asn,
            "isp": self.isp,
            "hostnames": self.hostnames,
            "last_seen": self.last_seen,
            "error": self.error,
            "cached": self.cached,
            "queried_at": self.queried_at,
        }


@dataclass
class ProviderConfig:
    """Configuration validated at startup time."""
    name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: int = 10
    max_retries: int = 3
    enabled: bool = True
    rate_limit_per_minute: int = 60


class BaseThreatIntelProvider(ABC):
    """
    Abstract base class every TI connector must implement.
    Adding a new provider requires only subclassing this and registering.
    """

    def __init__(self, config: ProviderConfig):
        self.config = config
        self.name = config.name

    @property
    def is_available(self) -> bool:
        """Returns True when the provider has credentials and is enabled."""
        return bool(self.config.enabled and self.config.api_key)

    @abstractmethod
    def enrich(self, indicator: str, indicator_type: IndicatorType) -> EnrichmentResult:
        """
        Query the provider for a single IOC and return a normalised result.
        Must handle timeouts, auth errors, and rate limits internally.
        Must NEVER raise — return EnrichmentResult with error set instead.
        """

    def _unavailable_result(self, indicator: str, indicator_type: IndicatorType, reason: str) -> EnrichmentResult:
        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=Verdict.UNKNOWN,
            confidence=0.0,
            error=reason,
            queried_at=_utcnow(),
        )

    def _error_result(self, indicator: str, indicator_type: IndicatorType, exc: Exception) -> EnrichmentResult:
        logger.warning("[%s] enrichment error for %s: %s", self.name, indicator, exc)
        return EnrichmentResult(
            provider=self.name,
            indicator=indicator,
            indicator_type=indicator_type,
            verdict=Verdict.UNKNOWN,
            confidence=0.0,
            error=str(exc),
            queried_at=_utcnow(),
        )


def _utcnow() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"


def _retry(fn, max_retries: int = 3, base_delay: float = 1.0):
    """
    Simple exponential-back-off retry wrapper.
    Returns the function result or re-raises the last exception.
    """
    last_exc: Exception = RuntimeError("Retry not attempted")
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            delay = base_delay * (2 ** attempt)
            logger.debug("Retry %d/%d in %.1fs — %s", attempt + 1, max_retries, delay, exc)
            time.sleep(delay)
    raise last_exc
