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
    cursor.execute("SELECT username FROM users WHERE username = 'ai_tester';")
    if not cursor.fetchone():
        pwd_hash = hash_password("Duster@2004")
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES ('ai_tester', ?, 'analyst', 'Security Research', 'AI Sandbox', '2026-07-07T00:00:00Z');
        """, (pwd_hash,))
        conn.commit()
    conn.close()

    token = create_token({"username": "ai_tester", "role": "analyst"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_ai_chat_missing_prompt(client, auth_headers):
    res = client.post("/api/ai/chat", headers=auth_headers, json={"prompt": ""})
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["success"] is False

def test_ai_chat_success(client, auth_headers):
    # Insert a mock case to match in RAG
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cases WHERE case_number = 'CYG-2026-9999';")
    cursor.execute("""
        INSERT INTO cases (id, case_number, title, description, status, severity, created_by)
        VALUES ('ai-test-uuid', 'CYG-2026-9999', 'AI System Leak Triage', 'Match in RAG context', 'open', 'critical', 'ai_tester');
    """)
    conn.commit()
    conn.close()

    res = client.post("/api/ai/chat", headers=auth_headers, json={"prompt": "Explain details of case CYG-2026-9999"})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert "CYG-2026-9999" in data["response"]
    assert "AI System Leak Triage" in data["response"]

def test_ai_agents_pipeline_success(client, auth_headers):
    res = client.post("/api/ai/agents", headers=auth_headers, json={"target": "malicious-host.net"})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert len(data["steps"]) == 4
    assert data["steps"][0]["agent"] == "Recon & OSINT Agent"
    assert data["steps"][1]["agent"] == "Malware Analysis Agent"
