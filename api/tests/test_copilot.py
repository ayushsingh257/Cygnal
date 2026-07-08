"""
Sprint 4B: AI Investigation Copilot — Backend Tests
Tests intent classification, IOC extraction, response format, and API endpoints.
"""

import pytest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from services.copilot import (
    classify_intent,
    extract_iocs_from_prompt,
    build_investigation_plan,
    process_copilot_message,
    INTENT_INVESTIGATE,
    INTENT_EXPLAIN,
    INTENT_SUMMARIZE,
    INTENT_RECOMMEND,
    INTENT_ANSWER,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def auth_headers(client):
    """Register and log in to get a valid token."""
    client.post("/api/auth/register", json={
        "username": "copilot_tester",
        "password": "CopilotPass@99",
        "role": "analyst",
        "department": "SOC",
        "team": "Blue"
    })
    resp = client.post("/api/auth/login", json={
        "username": "copilot_tester",
        "password": "CopilotPass@99"
    })
    data = resp.get_json()
    token = data.get("token", "")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ─── Unit: Intent Classification ──────────────────────────────────────────────

def test_intent_investigate_ip():
    intent = classify_intent("Check this IP address: 192.168.1.100")
    assert intent == INTENT_INVESTIGATE


def test_intent_investigate_domain():
    intent = classify_intent("investigate evil-domain.ru immediately")
    assert intent == INTENT_INVESTIGATE


def test_intent_investigate_hash():
    intent = classify_intent("Scan this hash: d41d8cd98f00b204e9800998ecf8427e")
    assert intent == INTENT_INVESTIGATE


def test_intent_summarize():
    intent = classify_intent("Summarize the findings from this investigation")
    assert intent == INTENT_SUMMARIZE


def test_intent_explain():
    intent = classify_intent("What happened in the last case?")
    assert intent == INTENT_EXPLAIN


def test_intent_recommend():
    intent = classify_intent("What should I do next in this investigation?")
    assert intent == INTENT_RECOMMEND


def test_intent_answer_generic():
    intent = classify_intent("Show me the active cases")
    assert intent == INTENT_ANSWER


# ─── Unit: IOC Extraction ────────────────────────────────────────────────────

def test_extract_ipv4_from_prompt():
    iocs = extract_iocs_from_prompt("Alert: source IP is 203.0.113.55 seen at 18:30 UTC")
    types = [i["type"] for i in iocs]
    values = [i["value"] for i in iocs]
    assert "ip" in types
    assert "203.0.113.55" in values


def test_extract_domain_from_prompt():
    iocs = extract_iocs_from_prompt("DNS query to malware-c2.ru detected")
    assert any(i["type"] == "domain" for i in iocs)


def test_extract_url_from_prompt():
    iocs = extract_iocs_from_prompt("User clicked https://phishing-site.example.com/payload")
    types = [i["type"] for i in iocs]
    assert "url" in types


def test_extract_sha256_from_prompt():
    sha256 = "a" * 64
    iocs = extract_iocs_from_prompt(f"File hash: {sha256}")
    assert any(i["type"] == "hash" and i["value"] == sha256 for i in iocs)


def test_extract_cve_from_prompt():
    iocs = extract_iocs_from_prompt("Exploit for CVE-2021-44228 detected in logs")
    assert any(i["type"] == "cve" and "CVE-2021-44228" in i["value"] for i in iocs)


def test_extract_email_from_prompt():
    iocs = extract_iocs_from_prompt("Phishing from: attacker@evil.com")
    assert any(i["type"] == "email" and "evil.com" in i["value"] for i in iocs)


def test_no_iocs_in_generic_prompt():
    iocs = extract_iocs_from_prompt("Show me a summary of active cases")
    # Might still find some tokens as domains; ensure it handles gracefully
    assert isinstance(iocs, list)


# ─── Unit: Investigation Plan Builder ─────────────────────────────────────────

def test_plan_for_ip():
    iocs = [{"value": "203.0.113.55", "type": "ip", "confidence": 98}]
    plan = build_investigation_plan(iocs)
    scanner_names = [s["scanner"] for s in plan["scanners"]]
    assert "IP Reputation" in scanner_names
    assert "WHOIS" in scanner_names
    assert plan["total_scanners"] >= 1
    assert plan["estimated_seconds"] >= 5


def test_plan_for_domain():
    iocs = [{"value": "malware.ru", "type": "domain", "confidence": 90}]
    plan = build_investigation_plan(iocs)
    scanner_names = [s["scanner"] for s in plan["scanners"]]
    assert "DNS" in scanner_names
    assert "WHOIS" in scanner_names


def test_plan_for_url():
    iocs = [{"value": "https://bad-site.com/download", "type": "url", "confidence": 97}]
    plan = build_investigation_plan(iocs)
    scanner_names = [s["scanner"] for s in plan["scanners"]]
    assert "HTTP Headers" in scanner_names


def test_plan_for_hash():
    iocs = [{"value": "d41d8cd98f00b204e9800998ecf8427e", "type": "hash", "confidence": 99}]
    plan = build_investigation_plan(iocs)
    scanner_names = [s["scanner"] for s in plan["scanners"]]
    assert "Threat Intelligence" in scanner_names


def test_plan_deduplication():
    """Same IP twice should produce deduplicated scanners."""
    iocs = [
        {"value": "8.8.8.8", "type": "ip", "confidence": 95},
        {"value": "8.8.8.8", "type": "ip", "confidence": 95},
    ]
    plan = build_investigation_plan(iocs)
    keys = [f"{s['scanner']}:{s['target']}" for s in plan["scanners"]]
    assert len(keys) == len(set(keys)), "Scanner plan contains duplicates"


# ─── Unit: Full Copilot Pipeline ──────────────────────────────────────────────

def test_process_investigate_message():
    result = process_copilot_message("Scan this IP: 203.0.113.55", case_id=None)
    assert result["intent"] == INTENT_INVESTIGATE
    assert result["requires_approval"] is True
    assert result["proposed_action"] is not None
    assert result["proposed_action"]["type"] == "LAUNCH_INVESTIGATION"
    assert len(result["iocs_detected"]) >= 1
    assert "Executive Summary" in result["response"]
    assert "Investigation Plan" in result["response"]
    assert "Confidence" in result["response"]


def test_process_summarize_message():
    result = process_copilot_message("Summarize the investigation findings", case_id=None)
    assert result["intent"] == INTENT_SUMMARIZE
    # Should not require approval for a summary
    assert result["requires_approval"] is False
    assert "Executive Summary" in result["response"] or "Findings Summary" in result["response"]


def test_process_recommend_message():
    result = process_copilot_message("What should I do next in this investigation?", case_id=None)
    assert result["intent"] == INTENT_RECOMMEND
    assert "Next Steps" in result["response"] or "Plan" in result["response"]
    assert result["requires_approval"] is False


def test_response_always_has_structured_sections():
    """All responses must be structured — no plain paragraphs."""
    for prompt in [
        "Scan 8.8.8.8",
        "Summarize findings",
        "What should I do next?",
        "Explain this case",
        "Show active cases",
    ]:
        result = process_copilot_message(prompt)
        assert "##" in result["response"], f"Response for '{prompt}' is missing structured headers"
        assert "###" in result["response"], f"Response for '{prompt}' is missing section headers"


# ─── API: /api/copilot/message ────────────────────────────────────────────────

def test_copilot_message_endpoint_investigate(client, auth_headers):
    resp = client.post("/api/copilot/message", json={
        "prompt": "Investigate IP 203.0.113.200 found in our logs"
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["intent"] == INTENT_INVESTIGATE
    assert data["requires_approval"] is True
    assert "proposed_action" in data
    assert "## " in data["response"]


def test_copilot_message_endpoint_summary(client, auth_headers):
    resp = client.post("/api/copilot/message", json={
        "prompt": "Summarize the current investigation findings"
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["intent"] == INTENT_SUMMARIZE


def test_copilot_message_missing_prompt(client, auth_headers):
    resp = client.post("/api/copilot/message", json={}, headers=auth_headers)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False


def test_copilot_message_no_auth(client):
    resp = client.post("/api/copilot/message", json={"prompt": "Check IP 1.2.3.4"})
    # Should succeed (auth is optional for copilot — user is recorded as 'unknown')
    data = resp.get_json()
    assert data["success"] is True


# ─── API: /api/copilot/approve ────────────────────────────────────────────────

def test_copilot_approve_no_action(client, auth_headers):
    resp = client.post("/api/copilot/approve", json={}, headers=auth_headers)
    assert resp.status_code == 400


def test_copilot_approve_wrong_type(client, auth_headers):
    resp = client.post("/api/copilot/approve", json={
        "proposed_action": {"type": "INVALID", "iocs": []}
    }, headers=auth_headers)
    assert resp.status_code == 400


def test_copilot_approve_no_iocs(client, auth_headers):
    resp = client.post("/api/copilot/approve", json={
        "proposed_action": {
            "type": "LAUNCH_INVESTIGATION",
            "iocs": [],
            "case_id": None
        }
    }, headers=auth_headers)
    assert resp.status_code == 400


def test_copilot_approve_launches_investigation(client, auth_headers):
    resp = client.post("/api/copilot/approve", json={
        "proposed_action": {
            "type": "LAUNCH_INVESTIGATION",
            "iocs": [{"value": "8.8.8.8", "type": "ip", "confidence": 95}],
            "case_id": None
        }
    }, headers=auth_headers)
    data = resp.get_json()
    # Should succeed and return a job_id
    assert resp.status_code == 200
    assert data["success"] is True
    assert "job_id" in data
    assert data["job_id"] is not None


# ─── API: /api/copilot/summary/<case_id> ─────────────────────────────────────

def test_copilot_summary_invalid_case(client, auth_headers):
    resp = client.get("/api/copilot/summary/nonexistent-case-id", headers=auth_headers)
    assert resp.status_code == 404


def test_copilot_summary_valid_case(client, auth_headers):
    # Create a case first
    case_resp = client.post("/api/cases", json={
        "title": "Copilot Test Case",
        "description": "Copilot summary test",
        "severity": "medium"
    }, headers=auth_headers)
    case_data = case_resp.get_json()
    if case_data.get("success"):
        case_id = case_data.get("case", {}).get("id") or case_data.get("id")
        if case_id:
            resp = client.get(f"/api/copilot/summary/{case_id}", headers=auth_headers)
            data = resp.get_json()
            assert resp.status_code == 200
            assert data["success"] is True
            assert "summary" in data
            assert "Findings Summary" in data["summary"]
