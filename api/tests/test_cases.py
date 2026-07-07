import pytest
import sqlite3
import json
import io
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import DB_PATH, init_lookup_db
from auth_utils import init_db, hash_password
from jwt_utils import create_token

@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()

@pytest.fixture
def auth_headers():
    # Generate test analyst credentials and token
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username = 'test_analyst';")
    if not cursor.fetchone():
        pwd_hash = hash_password("Duster@2004")
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES ('test_analyst', ?, 'analyst', 'Incident Response', 'Triage', '2026-07-07T00:00:00Z');
        """, (pwd_hash,))
        conn.commit()
    conn.close()

    token = create_token({"username": "test_analyst", "role": "analyst"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_create_and_fetch_cases(client, auth_headers):
    # Test Create Case
    payload = {
        "title": "Suspicious External Ingress Sweep",
        "description": "Port sweeps and telemetry alerts logged from GreyNoise feeds.",
        "severity": "high",
        "department": "Incident Response"
    }
    res = client.post("/api/cases", json=payload, headers=auth_headers)
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert "case" in data
    assert data["case"]["title"] == "Suspicious External Ingress Sweep"
    case_id = data["case"]["id"]

    # Test Fetch Cases list
    res_list = client.get("/api/cases", headers=auth_headers)
    data_list = res_list.get_json()
    assert res_list.status_code == 200
    assert len(data_list["cases"]) >= 1

    # Test Fetch Specific Case Details
    res_detail = client.get(f"/api/cases/{case_id}", headers=auth_headers)
    data_detail = res_detail.get_json()
    assert res_detail.status_code == 200
    assert data_detail["case"]["case_number"].startswith("CYG-")
    assert len(data_detail["timeline"]) >= 1 # case_created event logs

def test_add_timeline_event(client, auth_headers):
    # Setup a mock case
    res_case = client.post("/api/cases", json={"title": "Timeline Test Case"}, headers=auth_headers)
    case_id = res_case.get_json()["case"]["id"]

    # Post event
    event_payload = {
        "description": "Analyst logged suspicious HTTP headers CSP block alerts.",
        "event_type": "analyst_note"
    }
    res_evt = client.post(f"/api/cases/{case_id}/timeline", json=event_payload, headers=auth_headers)
    assert res_evt.status_code == 200
    assert res_evt.get_json()["success"] is True

    # Retrieve details
    res_detail = client.get(f"/api/cases/{case_id}", headers=auth_headers)
    detail_data = res_detail.get_json()
    assert len(detail_data["timeline"]) == 2 # creation + manual note

def test_upload_evidence_hash(client, auth_headers):
    res_case = client.post("/api/cases", json={"title": "Evidence Test Case"}, headers=auth_headers)
    case_id = res_case.get_json()["case"]["id"]

    # Upload mock document file payload
    mock_file_content = b"CYGNAL_FORENSICS_EVIDENCE_LOG_BODY_HASH_VERIFY"
    expected_sha256 = "630de5895eac384bdad6e553d5def3430d219bce8d44e24e12a2bb901f1bd2f9" # calculated hash


    file_data = {
        "file": (io.BytesIO(mock_file_content), "suspect_report.txt")
    }

    res_upload = client.post(f"/api/cases/{case_id}/evidence", data=file_data, content_type="multipart/form-data", headers=auth_headers)
    upload_data = res_upload.get_json()
    assert res_upload.status_code == 200
    assert upload_data["success"] is True
    assert upload_data["evidence"]["filename"] == "suspect_report.txt"
    assert upload_data["evidence"]["file_hash"] == expected_sha256
    assert upload_data["evidence"]["file_size"] == len(mock_file_content)
