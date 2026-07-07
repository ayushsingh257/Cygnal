import pytest
import sqlite3
import json
import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import DB_PATH, init_lookup_db
from auth_utils import init_db, hash_password
from jwt_utils import create_token
from services.extractor import extract_entities_from_text

@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()
    # Clean tables to ensure a clean test state and prevent database lockups
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM case_indicators;")
        cursor.execute("DELETE FROM evidence_relations;")
        cursor.execute("DELETE FROM evidence;")
        cursor.execute("DELETE FROM cases;")
        conn.commit()
    finally:
        conn.close()

@pytest.fixture
def auth_headers():
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE username = 'test_analyst';")
        if not cursor.fetchone():
            pwd_hash = hash_password("Duster@2004")
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, department, team, created_at)
                VALUES ('test_analyst', ?, 'analyst', 'Incident Response', 'Triage', '2026-07-07T00:00:00Z');
            """, (pwd_hash,))
            conn.commit()
    finally:
        conn.close()

    token = create_token({"username": "test_analyst", "role": "analyst"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_regex_extractor_service():
    """
    Unit test for the regex extractor service validating all 14 supported IOC types.
    """
    text_content = r"""
    We observed suspicious inbound connection from 198.51.100.12 and IPv6 ::1.
    The host reached out to malicious-domain.lan and server.local.
    Attacker username admin and NT AUTHORITY\SYSTEM.
    The process powershell.exe executed command referencing HKLM\Software\Microsoft\Windows\CurrentVersion\Run.
    File paths involved: C:\Windows\System32\cmd.exe and /var/log/secure.
    MD5 hash: 442ea02491754dc381543b6768e67d7f
    SHA1 hash: f605eacd47849889f4e6dccbc576eea2194d4123
    SHA256 hash: 630de5895eac384bdad6e553d5def3430d219bce8d44e24e12a2bb901f1bd2f9
    Phishing link: http://bad-site.com/login.html sent via bad-email@domain.com.
    Related vulnerabilities: CVE-2023-38606.
    MITRE ATT&CK Tactic TA0002 and Technique T1059.001.
    """
    
    extracted = extract_entities_from_text(text_content)
    
    types = [item["type"] for item in extracted]
    values = [item["value"] for item in extracted]
    
    # Assertions for all 14 entity types
    assert "ip" in types
    assert "198.51.100.12" in values
    assert "::1" in values
    
    assert "hostname" in types
    assert "server.local" in values
    
    assert "username" in types
    assert "admin" in values
    assert "NT AUTHORITY\\SYSTEM" in values
    
    assert "process_name" in types
    assert "powershell.exe" in values
    
    assert "registry_path" in types
    assert "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" in values
    
    assert "filepath" in types
    assert "C:\\Windows\\System32\\cmd.exe" in values
    assert "/var/log/secure" in values
    
    assert "hash" in types
    assert "442ea02491754dc381543b6768e67d7f" in values
    assert "f605eacd47849889f4e6dccbc576eea2194d4123" in values
    assert "630de5895eac384bdad6e553d5def3430d219bce8d44e24e12a2bb901f1bd2f9" in values
    
    assert "url" in types
    assert "http://bad-site.com/login.html" in values
    
    assert "domain" in types
    # Should be classified as hostname, not domain
    assert "malicious-domain.lan" not in [item["value"] for item in extracted if item["type"] == "domain"]
    assert "malicious-domain.lan" in [item["value"] for item in extracted if item["type"] == "hostname"]
    
    assert "email" in types
    assert "bad-email@domain.com" in values
    
    assert "cve" in types
    assert "CVE-2023-38606" in values
    
    assert "mitre_tactic" in types
    assert "TA0002" in values
    
    assert "mitre_technique" in types
    assert "T1059.001" in values

def test_extract_iocs_api_endpoint(client, auth_headers):
    """
    Integration test validating the POST /api/cases/<case_id>/extract-iocs route.
    """
    # 1. Create a test case
    res_case = client.post("/api/cases", json={"title": "IOC Extraction Case"}, headers=auth_headers)
    case_id = res_case.get_json()["case"]["id"]
    
    # 2. Add local threat intel to check confidence boosting
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO threat_intel (indicator, type, source, tags)
            VALUES ('malicious-domain.lan', 'domain', 'local_feed', 'ransomware');
        """)
        conn.commit()
    finally:
        conn.close()
    
    # 3. Call extract endpoint
    payload = {
        "text": "Suspicious host 198.51.100.12 contacted malicious-domain.lan running CVE-2023-38606"
    }
    res_extract = client.post(f"/api/cases/{case_id}/extract-iocs", json=payload, headers=auth_headers)
    data = res_extract.get_json()
    
    assert res_extract.status_code == 200
    assert data["success"] is True
    assert data["extracted_count"] == 3
    
    # Verify values saved in DB
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT indicator_value, confidence_score, severity FROM case_indicators WHERE case_id = ?;", (case_id,))
        rows = cursor.fetchall()
    finally:
        conn.close()
    
    row_map = {row[0]: (row[1], row[2]) for row in rows}
    assert "198.51.100.12" in row_map
    assert "malicious-domain.lan" in row_map
    assert "CVE-2023-38606" in row_map
    
    # Check threat intel lookup matched boosts confidence score to 100 and severity to critical (ransomware tag)
    assert row_map["malicious-domain.lan"][0] == 100
    assert row_map["malicious-domain.lan"][1] == "critical"
    
    # Check default confidence for IP and CVE
    assert row_map["198.51.100.12"][0] == 85
    assert row_map["CVE-2023-38606"][0] == 80

def test_extract_iocs_evidence_relations(client, auth_headers):
    """
    Integration test checking that uploading/extracting from evidence automatically maps evidence relationships.
    """
    # 1. Create case
    res_case = client.post("/api/cases", json={"title": "Evidence Link Case"}, headers=auth_headers)
    case_id = res_case.get_json()["case"]["id"]
    
    ev_id1 = str(uuid.uuid4())
    ev_id2 = str(uuid.uuid4())
    
    # 2. Insert two mock evidence files under this case
    now_str = "2026-07-07T00:00:00Z"
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO evidence (id, case_id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at)
            VALUES (?, ?, 'suspect_log.txt', 123, 'hash123', 'text/plain', 'test_analyst', ?);
        """, (ev_id1, case_id, now_str))
        cursor.execute("""
            INSERT INTO evidence (id, case_id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at)
            VALUES (?, ?, 'suspect_log.txt', 123, 'hash123', 'text/plain', 'test_analyst', ?);
        """, (ev_id2, case_id, now_str))
        conn.commit()
    finally:
        conn.close()
    
    # 3. Trigger extraction passing evidence_id to check relationship mappings
    payload = {
        "text": "Extracting indicators from evidence logging",
        "evidence_id": ev_id1
    }
    res_extract = client.post(f"/api/cases/{case_id}/extract-iocs", json=payload, headers=auth_headers)
    assert res_extract.status_code == 200
    
    # Verify evidence relation row created
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT correlation_reason, weight FROM evidence_relations WHERE source_evidence_id = ?;", (ev_id1,))
        rel = cursor.fetchone()
    finally:
        conn.close()
    
    assert rel is not None
    assert "Duplicate file hash" in rel[0]
    assert rel[1] == 100
