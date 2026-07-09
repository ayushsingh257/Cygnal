"""
STIX/TAXII Foundation — Cygnal v4.0 Phase 2
Parses STIX 2.x bundles and queries TAXII 2.1 collections.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from services.threat_intel.base import (
    EnrichmentResult,
    IndicatorType,
    Verdict,
    _utcnow,
)

logger = logging.getLogger("cygnal.threat_intel.stix_taxii")


# ─────────────────────────────────────────────────────────────────────────────
# STIX 2.x Bundle Parser
# ─────────────────────────────────────────────────────────────────────────────

def parse_stix_bundle(bundle_json: str | dict) -> list[dict]:
    """
    Parse a STIX 2.x bundle and extract indicator objects with their patterns.
    Returns a list of normalised IOC dicts ready for database insertion.
    """
    if isinstance(bundle_json, str):
        bundle = json.loads(bundle_json)
    else:
        bundle = bundle_json

    if bundle.get("type") != "bundle":
        raise ValueError("Input is not a valid STIX 2.x bundle")

    iocs: list[dict] = []
    for obj in bundle.get("objects", []):
        if obj.get("type") == "indicator":
            iocs.append(_extract_indicator(obj))

    return iocs


def _extract_indicator(obj: dict) -> dict:
    pattern = obj.get("pattern", "")
    indicator_type, value = _parse_stix_pattern(pattern)

    return {
        "stix_id": obj.get("id"),
        "name": obj.get("name", ""),
        "description": obj.get("description", ""),
        "pattern": pattern,
        "indicator_type": indicator_type,
        "value": value,
        "valid_from": obj.get("valid_from"),
        "valid_until": obj.get("valid_until"),
        "confidence": obj.get("confidence", 0),
        "labels": obj.get("labels", []),
        "created_by": obj.get("created_by_ref"),
        "modified": obj.get("modified"),
    }


def _parse_stix_pattern(pattern: str) -> tuple[str, str]:
    """
    Extract indicator type and value from a STIX pattern string.
    Example: "[ipv4-addr:value = '1.2.3.4']" → ("ip", "1.2.3.4")
    """
    import re
    pattern = pattern.strip("[]").strip()

    mappings = [
        (r"ipv4-addr:value\s*=\s*'([^']+)'", "ip"),
        (r"domain-name:value\s*=\s*'([^']+)'", "domain"),
        (r"url:value\s*=\s*'([^']+)'", "url"),
        (r"file:hashes\.MD5\s*=\s*'([^']+)'", "hash_md5"),
        (r"file:hashes\.'SHA-1'\s*=\s*'([^']+)'", "hash_sha1"),
        (r"file:hashes\.'SHA-256'\s*=\s*'([^']+)'", "hash_sha256"),
        (r"email-addr:value\s*=\s*'([^']+)'", "email"),
    ]

    for regex, itype in mappings:
        m = re.search(regex, pattern, re.IGNORECASE)
        if m:
            return itype, m.group(1)

    return "unknown", pattern


# ─────────────────────────────────────────────────────────────────────────────
# TAXII 2.1 Client
# ─────────────────────────────────────────────────────────────────────────────

class TAXIIClient:
    """
    Lightweight TAXII 2.1 client for fetching STIX bundles from collections.
    """

    def __init__(self, server_url: str, username: str = "", password: str = "", timeout: int = 30):
        self.server_url = server_url.rstrip("/")
        self.username = username
        self.password = password
        self.timeout = timeout

    def list_collections(self, api_root: str = "taxii2") -> list[dict]:
        """List available TAXII collections under an API root."""
        import requests

        url = f"{self.server_url}/{api_root}/collections/"
        headers = {"Accept": "application/taxii+json;version=2.1"}
        auth = (self.username, self.password) if self.username else None

        resp = requests.get(url, headers=headers, auth=auth, timeout=self.timeout, verify=False)
        resp.raise_for_status()
        return resp.json().get("collections", [])

    def fetch_collection(
        self,
        collection_id: str,
        api_root: str = "taxii2",
        added_after: str = None,
        limit: int = 500,
    ) -> list[dict]:
        """
        Fetch and parse all STIX objects from a TAXII collection.
        Returns normalised IOC dicts.
        """
        import requests

        url = f"{self.server_url}/{api_root}/collections/{collection_id}/objects/"
        headers = {"Accept": "application/taxii+json;version=2.1"}
        auth = (self.username, self.password) if self.username else None
        params: dict[str, Any] = {"limit": limit}
        if added_after:
            params["added_after"] = added_after

        resp = requests.get(url, headers=headers, auth=auth, params=params, timeout=self.timeout, verify=False)
        resp.raise_for_status()

        bundle = resp.json()
        return parse_stix_bundle(bundle)
