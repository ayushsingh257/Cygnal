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

@pytest.fixture(autouse=True)
def setup_database():
    # Initialize schema
    init_lookup_db()
    init_db()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_admin_seeded(client):
    # Test logging in as the default seeded admin
    payload = {
        "username": "Ayush Singh",
        "password": "Duster@2004"
    }
    res = client.post("/api/login", json=payload)
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["role"] == "admin"

def test_invalid_login(client):
    payload = {
        "username": "Ayush Singh",
        "password": "wrong_password"
    }
    res = client.post("/api/login", json=payload)
    data = res.get_json()
    assert res.status_code == 401
    assert data["success"] is False
    assert "token" not in data

def test_registration_and_patch(client):
    import uuid
    rand_user = f"analyst_{uuid.uuid4().hex[:6]}"
    # Register a new analyst node
    reg_payload = {
        "username": rand_user,
        "password": "Duster@2004",
        "role": "analyst",
        "department": "Incident Response",
        "team": "Malware Ops"
    }
    res = client.post("/api/register", json=reg_payload)
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["username"] == rand_user

    # Try duplicate registration
    res_dup = client.post("/api/register", json=reg_payload)
    assert res_dup.status_code == 409

    # Test patch profile configurations
    token = data["token"]
    patch_payload = {
        "department": "Threat Intelligence",
        "team": "CTI Team"
    }
    headers = {
        "Authorization": f"Bearer {token}"
    }
    res_patch = client.patch(f"/api/admin/users/{rand_user}", json=patch_payload, headers=headers)
    patch_data = res_patch.get_json()
    assert res_patch.status_code == 200
    assert patch_data["success"] is True
    assert patch_data["user"]["department"] == "Threat Intelligence"
    assert patch_data["user"]["team"] == "CTI Team"

