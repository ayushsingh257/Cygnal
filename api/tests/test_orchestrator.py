import pytest
import sqlite3
import json
import os
import sys

# Set path to import from parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import DB_PATH, init_lookup_db
from auth_utils import init_db
from services.orchestrator import (
    detect_input_type,
    build_execution_plan,
    run_investigation_worker
)

@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers(client):
    payload = {
        "username": "Ayush Singh",
        "password": "Duster@2004"
    }
    res = client.post("/api/login", json=payload)
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_target_auto_detection():
    # IP
    assert detect_input_type("198.51.100.15") == "ip"
    # URL
    assert detect_input_type("https://example.com/payload") == "url"
    assert detect_input_type("http://attacker.site") == "url"
    # Email
    assert detect_input_type("phish@threat.com") == "email"
    # Hash (SHA-256 and MD5)
    assert detect_input_type("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") == "hash"
    assert detect_input_type("44752f99f24c3d8ef4ff4820689b2b28") == "hash"
    # Domain
    assert detect_input_type("malicious-c2.lan") == "domain"
    # File
    assert detect_input_type("malware.exe") == "file"
    assert detect_input_type("invoice.pdf") == "file"
    # Text
    assert detect_input_type("This is a free text with IP 1.1.1.1 and email user@c2.com") == "text"

def test_orchestrator_execution_plan():
    assert "ip-reputation" in build_execution_plan("ip", "1.1.1.1")
    assert "headers" in build_execution_plan("url", "http://site.com")
    assert "dns" in build_execution_plan("domain", "site.com")
    assert "threat-intel" in build_execution_plan("hash", "hashval")
    assert "metadata" in build_execution_plan("file", "invoice.pdf")
    assert "email-headers" in build_execution_plan("email", "header")

def test_orchestrator_initialization(client, auth_headers):
    # Start an investigation on an IP
    res = client.post("/api/investigations/start", json={
        "target": "198.51.100.15",
        "input_type": "ip"
    }, headers=auth_headers)
    
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert "job_id" in data
    assert "case_id" in data
    assert data["status"] == "queued"
    
    job_id = data["job_id"]
    
    # Query status
    res_status = client.get(f"/api/investigations/{job_id}", headers=auth_headers)
    assert res_status.status_code == 200
    job_data = res_status.get_json()["job"]
    assert job_data["id"] == job_id
    assert job_data["target"] == "198.51.100.15"
    assert job_data["input_type"] == "ip"

def test_orchestrator_background_loop(client, auth_headers):
    # Use threat-intel (hash) as target for rapid test execution
    res = client.post("/api/investigations/start", json={
        "target": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "input_type": "hash"
    }, headers=auth_headers)
    
    data = res.get_json()
    job_id = data["job_id"]
    case_id = data["case_id"]
    
    # Poll for completion (maximum 10 retries)
    import time
    completed = False
    for _ in range(10):
        time.sleep(0.5)
        res_poll = client.get(f"/api/investigations/{job_id}", headers=auth_headers)
        poll_data = res_poll.get_json()
        if poll_data["job"]["status"] in ("completed", "failed"):
            completed = True
            break
            
    assert completed is True
    
    # Get final results
    res_results = client.get(f"/api/investigations/{job_id}/results", headers=auth_headers)
    res_data = res_results.get_json()
    assert res_data["success"] is True
    assert "results" in res_data
