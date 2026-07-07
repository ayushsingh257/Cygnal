import pytest
import sqlite3
import json
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
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username = 'report_tester';")
    if not cursor.fetchone():
        pwd_hash = hash_password("Duster@2004")
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES ('report_tester', ?, 'analyst', 'Forensic Audit', 'Reporting Unit', '2026-07-07T00:00:00Z');
        """, (pwd_hash,))
        conn.commit()
    conn.close()

    token = create_token({"username": "report_tester", "role": "analyst"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_reports_lifecycle(client, auth_headers):
    # 1. Create Report
    payload = {
        "title": "Incident Forensic Audit CYG-2026-1111",
        "description": "Sealed metadata properties analysis",
        "content": "{\"executive_summary\": \"System ingress sweeps completed.\", \"timelines\": []}",
        "case_id": None
    }
    res = client.post("/api/reports", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    report_id = data["report_id"]
    share_token = data["share_token"]

    # 2. List Reports
    res_list = client.get("/api/reports", headers=auth_headers)
    assert res_list.status_code == 200
    data_list = json.loads(res_list.data)
    assert data_list["success"] is True
    assert any(r["id"] == report_id for r in data_list["reports"])

    # 3. Read Report
    res_get = client.get(f"/api/reports/{report_id}", headers=auth_headers)
    assert res_get.status_code == 200
    data_get = json.loads(res_get.data)
    assert data_get["success"] is True
    assert data_get["report"]["title"] == "Incident Forensic Audit CYG-2026-1111"

    # 4. Access Shared Report Publicly (No Auth Headers)
    res_share = client.get(f"/api/reports/share/{share_token}")
    assert res_share.status_code == 200
    data_share = json.loads(res_share.data)
    assert data_share["success"] is True
    assert data_share["report"]["title"] == "Incident Forensic Audit CYG-2026-1111"
