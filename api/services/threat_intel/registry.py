"""
Threat Intelligence Registry — Cygnal v4.0 Phase 2
Builds and manages all configured providers from environment variables.
"""
from __future__ import annotations

import os
import logging
from typing import Optional

from services.threat_intel.base import BaseThreatIntelProvider, ProviderConfig
from services.threat_intel.virustotal import VirusTotalProvider
from services.threat_intel.shodan import ShodanProvider
from services.threat_intel.abuseipdb import AbuseIPDBProvider
from services.threat_intel.otx import AlienVaultOTXProvider
from services.threat_intel.threatfox import ThreatFoxProvider
from services.threat_intel.urlhaus import URLHausProvider
from services.threat_intel.censys import CensysProvider
from services.threat_intel.misp import MISPProvider

logger = logging.getLogger("cygnal.threat_intel.registry")

_registry: Optional[dict[str, BaseThreatIntelProvider]] = None


def _build_registry() -> dict[str, BaseThreatIntelProvider]:
    """
    Instantiate all providers from environment variables.
    Called once at startup. Providers without credentials are included
    but report is_available=False when queried.
    """
    providers: dict[str, BaseThreatIntelProvider] = {}

    # VirusTotal
    providers["virustotal"] = VirusTotalProvider(ProviderConfig(
        name="virustotal",
        api_key=os.getenv("VIRUSTOTAL_API_KEY", ""),
        timeout=int(os.getenv("VT_TIMEOUT", "15")),
        max_retries=int(os.getenv("VT_MAX_RETRIES", "3")),
    ))

    # Shodan
    providers["shodan"] = ShodanProvider(ProviderConfig(
        name="shodan",
        api_key=os.getenv("SHODAN_API_KEY", ""),
        timeout=int(os.getenv("SHODAN_TIMEOUT", "15")),
    ))

    # AbuseIPDB
    providers["abuseipdb"] = AbuseIPDBProvider(ProviderConfig(
        name="abuseipdb",
        api_key=os.getenv("ABUSEIPDB_API_KEY", ""),
        timeout=int(os.getenv("ABUSEIPDB_TIMEOUT", "10")),
    ))

    # AlienVault OTX
    providers["otx"] = AlienVaultOTXProvider(ProviderConfig(
        name="otx",
        api_key=os.getenv("OTX_API_KEY", ""),
        timeout=int(os.getenv("OTX_TIMEOUT", "15")),
    ))

    # ThreatFox (free — always available)
    providers["threatfox"] = ThreatFoxProvider(ProviderConfig(
        name="threatfox",
        timeout=int(os.getenv("THREATFOX_TIMEOUT", "10")),
    ))

    # URLHaus (free — always available)
    providers["urlhaus"] = URLHausProvider(ProviderConfig(
        name="urlhaus",
        timeout=int(os.getenv("URLHAUS_TIMEOUT", "10")),
    ))

    # Censys (api_key = "api_id:api_secret")
    censys_id = os.getenv("CENSYS_API_ID", "")
    censys_secret = os.getenv("CENSYS_API_SECRET", "")
    censys_key = f"{censys_id}:{censys_secret}" if censys_id and censys_secret else ""
    providers["censys"] = CensysProvider(ProviderConfig(
        name="censys",
        api_key=censys_key,
        timeout=int(os.getenv("CENSYS_TIMEOUT", "15")),
    ))

    # MISP
    providers["misp"] = MISPProvider(ProviderConfig(
        name="misp",
        api_key=os.getenv("MISP_API_KEY", ""),
        base_url=os.getenv("MISP_URL", ""),
        timeout=int(os.getenv("MISP_TIMEOUT", "20")),
    ))

    available = [name for name, p in providers.items() if p.is_available]
    logger.info("[TI Registry] %d/%d providers available: %s", len(available), len(providers), available)
    return providers


def get_registry() -> dict[str, BaseThreatIntelProvider]:
    """Return the singleton provider registry, building it on first call."""
    global _registry
    if _registry is None:
        _registry = _build_registry()
    return _registry


def get_provider(name: str) -> Optional[BaseThreatIntelProvider]:
    return get_registry().get(name)


def list_providers() -> list[dict]:
    """Return metadata about all registered providers."""
    return [
        {
            "name": name,
            "available": provider.is_available,
            "enabled": provider.config.enabled,
        }
        for name, provider in get_registry().items()
    ]
