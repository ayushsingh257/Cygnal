"""
Phase 2 Tests — Threat Intelligence & OSINT Connectors
Tests provider abstraction, enrichment engine, STIX parsing, and API endpoints.
All external API calls are mocked — no network access required.
"""
import pytest
import json
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app as flask_app
from database import init_lookup_db
from auth_utils import init_db

from services.threat_intel.base import (
    IndicatorType, Verdict, EnrichmentResult, ProviderConfig,
    BaseThreatIntelProvider, _utcnow,
)
from services.threat_intel.virustotal import VirusTotalProvider
from services.threat_intel.abuseipdb import AbuseIPDBProvider
from services.threat_intel.otx import AlienVaultOTXProvider
from services.threat_intel.threatfox import ThreatFoxProvider
from services.threat_intel.urlhaus import URLHausProvider
from services.threat_intel.shodan import ShodanProvider
from services.threat_intel.censys import CensysProvider
from services.threat_intel.misp import MISPProvider
from services.threat_intel.stix_taxii import parse_stix_bundle, _parse_stix_pattern
from services.threat_intel.enrichment import enrich_indicator, bulk_enrich, _aggregate


@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


@pytest.fixture
def auth_token(client):
    res = client.post("/api/login", json={"username": "Ayush Singh", "password": "Duster@2004"})
    return res.get_json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Base abstraction tests
# ─────────────────────────────────────────────────────────────────────────────

def test_base_provider_unavailable_when_no_key():
    cfg = ProviderConfig(name="test_provider", api_key="")
    class DummyProvider(BaseThreatIntelProvider):
        def enrich(self, indicator, indicator_type):
            return self._unavailable_result(indicator, indicator_type, "no key")
    p = DummyProvider(cfg)
    assert not p.is_available

def test_base_provider_available_with_key():
    cfg = ProviderConfig(name="test_provider", api_key="some_key")
    class DummyProvider(BaseThreatIntelProvider):
        def enrich(self, indicator, indicator_type):
            return self._unavailable_result(indicator, indicator_type, "no key")
    p = DummyProvider(cfg)
    assert p.is_available

def test_enrichment_result_to_dict():
    r = EnrichmentResult(
        provider="test",
        indicator="1.2.3.4",
        indicator_type=IndicatorType.IP,
        verdict=Verdict.MALICIOUS,
        confidence=0.9,
        tags=["botnet"],
        country="RU",
        queried_at=_utcnow(),
    )
    d = r.to_dict()
    assert d["verdict"] == "malicious"
    assert d["confidence"] == 0.9
    assert "botnet" in d["tags"]
    assert d["country"] == "RU"


# ─────────────────────────────────────────────────────────────────────────────
# 2. VirusTotal connector
# ─────────────────────────────────────────────────────────────────────────────

def test_virustotal_unavailable_without_key():
    provider = VirusTotalProvider(ProviderConfig(name="virustotal", api_key=""))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.UNKNOWN
    assert result.error is not None

def test_virustotal_parses_malicious_response():
    provider = VirusTotalProvider(ProviderConfig(name="virustotal", api_key="fake_key"))
    mock_response = {
        "data": {
            "attributes": {
                "last_analysis_stats": {"malicious": 15, "harmless": 50, "undetected": 10, "suspicious": 2},
                "tags": ["malware", "botnet"],
                "country": "CN",
                "asn": 12345,
            }
        }
    }
    result = provider._parse(mock_response, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS
    assert result.confidence > 0
    assert "malware" in result.tags
    assert result.country == "CN"

def test_virustotal_parses_clean_response():
    provider = VirusTotalProvider(ProviderConfig(name="virustotal", api_key="fake_key"))
    mock_response = {
        "data": {
            "attributes": {
                "last_analysis_stats": {"malicious": 0, "harmless": 70, "undetected": 3, "suspicious": 0},
                "tags": [],
            }
        }
    }
    result = provider._parse(mock_response, "google.com", IndicatorType.DOMAIN)
    assert result.verdict == Verdict.CLEAN
    assert result.confidence == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 3. AbuseIPDB connector
# ─────────────────────────────────────────────────────────────────────────────

def test_abuseipdb_unavailable_without_key():
    provider = AbuseIPDBProvider(ProviderConfig(name="abuseipdb", api_key=""))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.UNKNOWN
    assert result.error is not None

def test_abuseipdb_rejects_non_ip():
    provider = AbuseIPDBProvider(ProviderConfig(name="abuseipdb", api_key="key"))
    result = provider.enrich("example.com", IndicatorType.DOMAIN)
    assert result.error is not None

def test_abuseipdb_parses_high_score():
    provider = AbuseIPDBProvider(ProviderConfig(name="abuseipdb", api_key="fake"))
    data = {
        "data": {
            "abuseConfidenceScore": 95,
            "countryCode": "RU",
            "isp": "Bad ISP",
            "lastReportedAt": "2025-01-01",
            "totalReports": 42,
            "reports": [{"categories": [14, 18]}],
        }
    }
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS
    assert result.confidence > 0.9
    assert result.country == "RU"

def test_abuseipdb_parses_zero_score():
    provider = AbuseIPDBProvider(ProviderConfig(name="abuseipdb", api_key="fake"))
    data = {"data": {"abuseConfidenceScore": 0, "countryCode": "US", "reports": []}}
    result = provider._parse(data, "8.8.8.8", IndicatorType.IP)
    assert result.verdict == Verdict.CLEAN


# ─────────────────────────────────────────────────────────────────────────────
# 4. OTX connector
# ─────────────────────────────────────────────────────────────────────────────

def test_otx_unavailable_without_key():
    provider = AlienVaultOTXProvider(ProviderConfig(name="otx", api_key=""))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.error is not None

def test_otx_parses_high_pulse_count():
    provider = AlienVaultOTXProvider(ProviderConfig(name="otx", api_key="fake"))
    data = {
        "pulse_info": {
            "count": 8,
            "pulses": [
                {"tags": ["botnet", "c2"], "name": "BadCampaign"},
                {"tags": ["malware"], "name": "Ransomware Group"},
            ],
        },
        "country_code": "CN",
        "modified": "2025-01-01",
    }
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS
    assert result.confidence > 0.5

def test_otx_parses_zero_pulses():
    provider = AlienVaultOTXProvider(ProviderConfig(name="otx", api_key="fake"))
    data = {"pulse_info": {"count": 0, "pulses": []}}
    result = provider._parse(data, "8.8.8.8", IndicatorType.IP)
    assert result.verdict == Verdict.UNKNOWN
    assert result.confidence == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 5. ThreatFox connector
# ─────────────────────────────────────────────────────────────────────────────

def test_threatfox_always_available():
    provider = ThreatFoxProvider(ProviderConfig(name="threatfox"))
    assert provider.is_available

def test_threatfox_parses_no_result():
    provider = ThreatFoxProvider(ProviderConfig(name="threatfox"))
    data = {"query_status": "no_result"}
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.UNKNOWN

def test_threatfox_parses_iocs():
    provider = ThreatFoxProvider(ProviderConfig(name="threatfox"))
    data = {
        "query_status": "ok",
        "data": [
            {
                "malware": "Emotet",
                "malware_printable": "Emotet",
                "tags": ["c2", "banking"],
                "last_seen": "2025-01-01",
            }
        ],
    }
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS
    assert result.confidence > 0
    assert "c2" in result.tags


# ─────────────────────────────────────────────────────────────────────────────
# 6. URLHaus connector
# ─────────────────────────────────────────────────────────────────────────────

def test_urlhaus_always_available():
    provider = URLHausProvider(ProviderConfig(name="urlhaus"))
    assert provider.is_available

def test_urlhaus_rejects_ip():
    provider = URLHausProvider(ProviderConfig(name="urlhaus"))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.error is not None

def test_urlhaus_parses_online():
    provider = URLHausProvider(ProviderConfig(name="urlhaus"))
    data = {"query_status": "ok", "url_status": "online", "tags": ["malware"], "date_added": "2025-01-01"}
    result = provider._parse(data, "http://evil.com", IndicatorType.URL)
    assert result.verdict == Verdict.MALICIOUS
    assert result.confidence > 0.8

def test_urlhaus_parses_no_results():
    provider = URLHausProvider(ProviderConfig(name="urlhaus"))
    data = {"query_status": "no_results"}
    result = provider._parse(data, "http://good.com", IndicatorType.URL)
    assert result.verdict == Verdict.UNKNOWN


# ─────────────────────────────────────────────────────────────────────────────
# 7. Shodan connector
# ─────────────────────────────────────────────────────────────────────────────

def test_shodan_unavailable_without_key():
    provider = ShodanProvider(ProviderConfig(name="shodan", api_key=""))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.error is not None

def test_shodan_parses_with_cves():
    provider = ShodanProvider(ProviderConfig(name="shodan", api_key="fake"))
    data = {
        "vulns": {"CVE-2021-44228": {}, "CVE-2022-1234": {}},
        "tags": [],
        "hostnames": ["evil.host.com"],
        "country_code": "RU",
        "isp": "Evil ISP",
        "asn": "AS12345",
        "last_update": "2025-01-01",
        "data": [{"port": 22}, {"port": 80}],
    }
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS
    assert any("CVE" in t for t in result.tags)


# ─────────────────────────────────────────────────────────────────────────────
# 8. Censys connector
# ─────────────────────────────────────────────────────────────────────────────

def test_censys_unavailable_without_key():
    provider = CensysProvider(ProviderConfig(name="censys", api_key=""))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.error is not None

def test_censys_parses_c2_label():
    provider = CensysProvider(ProviderConfig(name="censys", api_key="id:secret"))
    data = {
        "result": {
            "labels": ["c2", "malware-c2"],
            "services": [{"port": 443}],
            "dns": {"reverse_dns": {"names": []}},
            "location": {"country_code": "CN"},
            "autonomous_system": {"asn": 12345, "name": "EvilASN"},
        }
    }
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS

def test_censys_rejects_non_ip():
    provider = CensysProvider(ProviderConfig(name="censys", api_key="id:secret"))
    result = provider.enrich("example.com", IndicatorType.DOMAIN)
    assert result.error is not None


# ─────────────────────────────────────────────────────────────────────────────
# 9. MISP connector
# ─────────────────────────────────────────────────────────────────────────────

def test_misp_unavailable_without_key():
    provider = MISPProvider(ProviderConfig(name="misp", api_key="", base_url=""))
    result = provider.enrich("1.2.3.4", IndicatorType.IP)
    assert result.error is not None

def test_misp_parses_attributes():
    provider = MISPProvider(ProviderConfig(name="misp", api_key="fake", base_url="http://misp.local"))
    data = {
        "response": {
            "Attribute": [
                {"event_id": "101", "Tag": [{"name": "tlp:red"}, {"name": "malware:banker"}]},
                {"event_id": "102", "Tag": [{"name": "botnet"}]},
            ]
        }
    }
    result = provider._parse(data, "1.2.3.4", IndicatorType.IP)
    assert result.verdict == Verdict.MALICIOUS

def test_misp_parses_no_attributes():
    provider = MISPProvider(ProviderConfig(name="misp", api_key="fake", base_url="http://misp.local"))
    data = {"response": {"Attribute": []}}
    result = provider._parse(data, "8.8.8.8", IndicatorType.IP)
    assert result.verdict == Verdict.UNKNOWN


# ─────────────────────────────────────────────────────────────────────────────
# 10. STIX parsing
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_STIX_BUNDLE = {
    "type": "bundle",
    "id": "bundle--test-1234",
    "objects": [
        {
            "type": "indicator",
            "id": "indicator--abc-1",
            "name": "Malicious IP",
            "pattern": "[ipv4-addr:value = '192.168.1.100']",
            "pattern_type": "stix",
            "valid_from": "2025-01-01T00:00:00Z",
            "labels": ["malicious-activity"],
            "confidence": 85,
        },
        {
            "type": "indicator",
            "id": "indicator--abc-2",
            "name": "Phishing Domain",
            "pattern": "[domain-name:value = 'evil.example.com']",
            "pattern_type": "stix",
            "valid_from": "2025-01-01T00:00:00Z",
            "labels": ["phishing"],
        },
        {
            "type": "indicator",
            "id": "indicator--abc-3",
            "name": "Malware Hash",
            "pattern": "[file:hashes.'SHA-256' = 'abc123def456']",
            "pattern_type": "stix",
            "valid_from": "2025-01-01T00:00:00Z",
        },
        {
            "type": "malware",  # non-indicator — should be ignored
            "id": "malware--xyz-1",
            "name": "Emotet",
        },
    ],
}

def test_stix_parse_bundle_extracts_indicators():
    iocs = parse_stix_bundle(SAMPLE_STIX_BUNDLE)
    assert len(iocs) == 3  # only indicator objects

def test_stix_parse_extracts_ip():
    iocs = parse_stix_bundle(SAMPLE_STIX_BUNDLE)
    ip_ioc = next(i for i in iocs if i["indicator_type"] == "ip")
    assert ip_ioc["value"] == "192.168.1.100"
    assert ip_ioc["confidence"] == 85

def test_stix_parse_extracts_domain():
    iocs = parse_stix_bundle(SAMPLE_STIX_BUNDLE)
    domain_ioc = next(i for i in iocs if i["indicator_type"] == "domain")
    assert domain_ioc["value"] == "evil.example.com"

def test_stix_parse_extracts_hash():
    iocs = parse_stix_bundle(SAMPLE_STIX_BUNDLE)
    hash_ioc = next(i for i in iocs if i["indicator_type"] == "hash_sha256")
    assert hash_ioc["value"] == "abc123def456"

def test_stix_pattern_parser():
    assert _parse_stix_pattern("[ipv4-addr:value = '1.2.3.4']") == ("ip", "1.2.3.4")
    assert _parse_stix_pattern("[domain-name:value = 'evil.com']") == ("domain", "evil.com")
    assert _parse_stix_pattern("[url:value = 'http://x.com']") == ("url", "http://x.com")
    assert _parse_stix_pattern("[file:hashes.MD5 = 'deadbeef']") == ("hash_md5", "deadbeef")

def test_stix_parse_rejects_invalid_bundle():
    with pytest.raises(ValueError, match="not a valid STIX"):
        parse_stix_bundle({"type": "not-bundle"})


# ─────────────────────────────────────────────────────────────────────────────
# 11. Enrichment aggregation engine
# ─────────────────────────────────────────────────────────────────────────────

def test_aggregate_malicious_wins():
    results = [
        EnrichmentResult("virustotal", "1.2.3.4", IndicatorType.IP, Verdict.MALICIOUS, 0.9, queried_at=_utcnow()),
        EnrichmentResult("abuseipdb", "1.2.3.4", IndicatorType.IP, Verdict.SUSPICIOUS, 0.5, queried_at=_utcnow()),
        EnrichmentResult("otx", "1.2.3.4", IndicatorType.IP, Verdict.CLEAN, 0.0, queried_at=_utcnow()),
    ]
    agg = _aggregate("1.2.3.4", IndicatorType.IP, results)
    assert agg["verdict"] == "malicious"
    assert agg["confidence"] > 0

def test_aggregate_unknown_when_all_errors():
    results = [
        EnrichmentResult("vt", "1.2.3.4", IndicatorType.IP, Verdict.UNKNOWN, 0.0, error="API error", queried_at=_utcnow()),
    ]
    agg = _aggregate("1.2.3.4", IndicatorType.IP, results)
    assert agg["verdict"] == "unknown"
    assert agg["confidence"] == 0.0

def test_aggregate_collects_tags():
    results = [
        EnrichmentResult("vt", "1.2.3.4", IndicatorType.IP, Verdict.MALICIOUS, 0.8, tags=["botnet", "c2"], queried_at=_utcnow()),
        EnrichmentResult("otx", "1.2.3.4", IndicatorType.IP, Verdict.MALICIOUS, 0.7, tags=["ransomware"], queried_at=_utcnow()),
    ]
    agg = _aggregate("1.2.3.4", IndicatorType.IP, results)
    assert "botnet" in agg["tags"]
    assert "ransomware" in agg["tags"]


# ─────────────────────────────────────────────────────────────────────────────
# 12. API endpoint tests
# ─────────────────────────────────────────────────────────────────────────────

def test_providers_endpoint_requires_auth(client):
    res = client.get("/api/threat-intel/providers")
    assert res.status_code == 401

def test_providers_endpoint_returns_list(client, auth_headers):
    res = client.get("/api/threat-intel/providers", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert isinstance(data["providers"], list)
    assert len(data["providers"]) >= 7

def test_enrich_endpoint_requires_auth(client):
    res = client.post("/api/threat-intel/enrich", json={"indicator": "1.2.3.4", "type": "ip"})
    assert res.status_code == 401

def test_enrich_endpoint_validates_input(client, auth_headers):
    # Missing type
    res = client.post("/api/threat-intel/enrich", json={"indicator": "1.2.3.4"}, headers=auth_headers)
    assert res.status_code == 400

    # Invalid type
    res = client.post("/api/threat-intel/enrich",
                     json={"indicator": "1.2.3.4", "type": "invalid_type"},
                     headers=auth_headers)
    assert res.status_code == 400

def test_enrich_endpoint_runs_with_no_providers_configured(client, auth_headers):
    """With no API keys configured, providers will return unavailable but the endpoint should succeed."""
    res = client.post("/api/threat-intel/enrich",
                     json={"indicator": "1.2.3.4", "type": "ip"},
                     headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "data" in data

def test_bulk_enrich_endpoint(client, auth_headers):
    res = client.post("/api/threat-intel/enrich/bulk", json={
        "indicators": [
            {"value": "1.2.3.4", "type": "ip"},
            {"value": "evil.com", "type": "domain"},
        ]
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 2

def test_bulk_enrich_rejects_too_many(client, auth_headers):
    indicators = [{"value": f"1.2.3.{i}", "type": "ip"} for i in range(51)]
    res = client.post("/api/threat-intel/enrich/bulk",
                     json={"indicators": indicators},
                     headers=auth_headers)
    assert res.status_code == 400

def test_enrich_specific_provider_not_found(client, auth_headers):
    res = client.post("/api/threat-intel/enrich/provider/nonexistent",
                     json={"indicator": "1.2.3.4", "type": "ip"},
                     headers=auth_headers)
    assert res.status_code == 404

def test_stix_parse_endpoint(client, auth_headers):
    res = client.post("/api/threat-intel/stix/parse",
                     json={"bundle": SAMPLE_STIX_BUNDLE},
                     headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 3

def test_stix_parse_endpoint_rejects_invalid(client, auth_headers):
    res = client.post("/api/threat-intel/stix/parse",
                     json={"bundle": {"type": "not-bundle"}},
                     headers=auth_headers)
    assert res.status_code == 400

def test_enrichment_history_endpoint(client, auth_headers):
    # First create an enrichment result
    client.post("/api/threat-intel/enrich",
               json={"indicator": "8.8.8.8", "type": "ip"},
               headers=auth_headers)
    # Then query history
    res = client.get("/api/threat-intel/history", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert isinstance(data["results"], list)

def test_config_endpoint_requires_admin(client):
    # Anonymous user — no auth
    res = client.get("/api/threat-intel/config")
    assert res.status_code == 401

def test_config_endpoint_accessible_to_admin(client, auth_headers):
    res = client.get("/api/threat-intel/config", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "config" in data
