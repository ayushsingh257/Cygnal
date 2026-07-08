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


def test_mfa_setup_and_verification_flow(client):
    import uuid
    import pyotp
    rand_user = f"mfa_user_{uuid.uuid4().hex[:6]}"
    
    # 1. Register user
    reg_payload = {
        "username": rand_user,
        "password": "PasswordMfa@2026",
        "role": "analyst"
    }
    res_reg = client.post("/api/register", json=reg_payload)
    reg_data = res_reg.get_json()
    assert res_reg.status_code == 200
    token = reg_data["token"]
    
    # 2. Trigger MFA Setup
    headers = {"Authorization": f"Bearer {token}"}
    res_setup = client.post("/api/auth/mfa/setup", headers=headers)
    assert res_setup.status_code == 200
    setup_data = res_setup.get_json()
    assert setup_data["success"] is True
    assert "secret" in setup_data
    assert "provisioning_uri" in setup_data
    
    secret = setup_data["secret"]
    
    # 3. Verify MFA Setup with valid TOTP code
    totp = pyotp.TOTP(secret)
    code = totp.now()
    
    res_verify = client.post("/api/auth/mfa/verify", json={"code": code}, headers=headers)
    verify_data = res_verify.get_json()
    assert res_verify.status_code == 200
    assert verify_data["success"] is True
    assert "token" in verify_data
    
    # 4. Trigger Login which should now require MFA challenge
    res_login = client.post("/api/login", json={
        "username": rand_user,
        "password": "PasswordMfa@2026"
    })
    login_data = res_login.get_json()
    assert res_login.status_code == 200
    assert login_data["success"] is True
    assert login_data.get("mfa_required") is True
    assert login_data["username"] == rand_user
    
    # 5. Challenge verify to log in fully
    res_chal = client.post("/api/auth/mfa/verify", json={
        "username": rand_user,
        "code": totp.now()
    })
    chal_data = res_chal.get_json()
    assert res_chal.status_code == 200
    assert chal_data["success"] is True
    assert "token" in chal_data
    assert chal_data["user"]["username"] == rand_user


