import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import hashlib
import pytest
from backend import app
from db_utils import get_db_connection
from jwt_utils import create_token
from services.parser_registry import siem_parsers
from services.extraction_pipeline import ioc_pipeline
from services.agent import run_autonomic_loop_worker

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c

@pytest.fixture
def auth_headers():
    token = create_token({"username": "webhook_tester", "role": "admin"})
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

@pytest.fixture
def webhook_headers():
    return {
        "X-Cygnal-Webhook-Key": "cygnal-default-webhook-secret-2026",
        "Content-Type": "application/json"
    }


# ─── Unit: SIEM Pluggable Parsers ─────────────────────────────────────────────

def test_splunk_parser():
    payload = {
        "search_name": "Phishing Search Alert",
        "sid": "splunk-job-112233",
        "result": {
            "severity": "high",
            "description": "Custom splunk alert triggered.",
            "target_ip": "1.2.3.4"
        }
    }
    parser = siem_parsers.get_parser("splunk")
    parsed = parser.parse(payload)
    
    assert parsed["external_id"] == "splunk-job-112233"
    assert parsed["title"] == "Phishing Search Alert"
    assert parsed["severity"] == "high"
    assert "Custom splunk alert triggered" in parsed["description"]

def test_sentinel_parser():
    payload = {
        "properties": {
            "title": "Sentinel Threat Intel Match",
            "severity": "Critical",
            "description": "Matched known indicators on host.",
            "alertDisplayName": "Sentinel-Alert-4455"
        }
    }
    parser = siem_parsers.get_parser("sentinel")
    parsed = parser.parse(payload)
    
    assert parsed["external_id"] == "Sentinel-Alert-4455"
    assert parsed["title"] == "Sentinel Threat Intel Match"
    assert parsed["severity"] == "critical"
    assert "Matched known indicators" in parsed["description"]

def test_generic_parser():
    payload = {
        "title": "Wazuh Agent Off",
        "severity": "low",
        "description": "Agent offline for 10m."
    }
    parser = siem_parsers.get_parser("generic")
    parsed = parser.parse(payload)
    
    assert parsed["title"] == "Wazuh Agent Off"
    assert parsed["severity"] == "low"
    assert "Agent offline" in parsed["description"]


# ─── Unit: Modular Extraction Pipeline ────────────────────────────────────────

def test_ioc_extraction_pipeline():
    text = "Malware download detected from IP 203.0.113.88 contacting evil-site.com at https://evil-site.com/payload.exe. Binary MD5: c3499c2729730a7f807efb8676a92de1 CVE match CVE-2026-9988."
    extracted = ioc_pipeline.extract(text)
    
    values = [item["value"] for item in extracted]
    types = [item["type"] for item in extracted]
    
    assert "203.0.113.88" in values
    assert "evil-site.com" in values
    assert "https://evil-site.com/payload.exe" in values
    assert "c3499c2729730a7f807efb8676a92de1" in values
    assert "CVE-2026-9988" in values
    
    assert "ip" in types
    assert "domain" in types
    assert "url" in types
    assert "hash" in types
    assert "cve" in types


# ─── API Integration tests ───────────────────────────────────────────────────

def test_siem_webhook_ingest_auth_failure(client):
    payload = {"title": "Test Auth", "description": "Failure check"}
    # No headers passed
    resp = client.post("/api/webhooks/siem", json=payload)
    assert resp.status_code == 401
    
    # Wrong key header passed
    headers = {"X-Cygnal-Webhook-Key": "wrong-key-value", "Content-Type": "application/json"}
    resp = client.post("/api/webhooks/siem", json=payload, headers=headers)
    assert resp.status_code == 401

def test_siem_webhook_ingest_success(client, webhook_headers):
    payload = {
        "search_name": "Autonomic Ingest Test",
        "sid": "splunk-test-9988",
        "result": {
            "severity": "medium",
            "description": "Suspicious login from IP 185.190.140.23",
            "target": "185.190.140.23"
        }
    }
    raw_payload_bytes = json.dumps(payload).encode("utf-8")
    expected_hash = hashlib.sha256(raw_payload_bytes).hexdigest()
    
    resp = client.post("/api/webhooks/siem", data=raw_payload_bytes, headers=webhook_headers)
    assert resp.status_code == 202
    data = resp.get_json()
    assert data["success"] is True
    assert "alert_id" in data
    assert data["payload_hash"] == expected_hash
    
    # Verify alert exists in database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT title, payload_hash, status FROM inbound_alerts WHERE id = ?;", (data["alert_id"],))
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    assert row[0] == "Autonomic Ingest Test"
    assert row[1] == expected_hash
    assert row[2] == "unhandled"

def test_alerts_query_routes(client, webhook_headers, auth_headers):
    # Ingest one alert first
    payload = {"title": "Query Route Test", "description": "Details here", "severity": "low"}
    raw = json.dumps(payload).encode("utf-8")
    resp_ingest = client.post("/api/webhooks/siem", data=raw, headers=webhook_headers)
    alert_id = resp_ingest.get_json()["alert_id"]
    
    # Query list without auth (should return 401)
    resp = client.get("/api/webhooks/alerts")
    assert resp.status_code == 401
    
    # Query list with auth
    resp = client.get("/api/webhooks/alerts", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    alert_ids = [a["id"] for a in data["alerts"]]
    assert alert_id in alert_ids
    
    # Query details
    resp_det = client.get(f"/api/webhooks/alerts/{alert_id}", headers=auth_headers)
    assert resp_det.status_code == 200
    data_det = resp_det.get_json()
    assert data_det["alert"]["title"] == "Query Route Test"
    assert data_det["alert"]["payload_hash"] is not None
    
    # Query logs
    resp_logs = client.get(f"/api/webhooks/alerts/{alert_id}/logs", headers=auth_headers)
    assert resp_logs.status_code == 200
    data_logs = resp_logs.get_json()
    assert len(data_logs["logs"]) >= 1
    assert data_logs["logs"][0]["stage"] == "ingestion"

def test_take_over_action(client, webhook_headers, auth_headers):
    # Ingest alert
    payload = {"title": "Take Over Test Alert", "description": "Target IP 8.8.8.8", "severity": "medium"}
    raw = json.dumps(payload).encode("utf-8")
    resp_ingest = client.post("/api/webhooks/siem", data=raw, headers=webhook_headers)
    alert_id = resp_ingest.get_json()["alert_id"]
    
    # Take over with auth
    resp = client.post(f"/api/webhooks/alerts/{alert_id}/take-over", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    
    # Check database status
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM inbound_alerts WHERE id = ?;", (alert_id,))
    row = cursor.fetchone()
    conn.close()
    
    assert row[0] == "failed"  # failed = Needs Analyst in take over
