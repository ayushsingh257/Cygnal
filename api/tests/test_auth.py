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

    # Test patch profile — requires admin token (H-01: RBAC fix)
    # Log in as admin to get admin token
    admin_login = client.post("/api/login", json={
        "username": "Ayush Singh",
        "password": "Duster@2004"
    })
    admin_data = admin_login.get_json()
    assert admin_login.status_code == 200
    admin_token = admin_data["token"]

    patch_payload = {
        "department": "Threat Intelligence",
        "team": "CTI Team"
    }
    admin_headers = {
        "Authorization": f"Bearer {admin_token}"
    }
    res_patch = client.patch(f"/api/admin/users/{rand_user}", json=patch_payload, headers=admin_headers)
    patch_data = res_patch.get_json()
    assert res_patch.status_code == 200
    assert patch_data["success"] is True
    assert patch_data["user"]["department"] == "Threat Intelligence"
    assert patch_data["user"]["team"] == "CTI Team"

    # Verify analyst token is rejected from patch (RBAC regression check)
    analyst_headers = {"Authorization": f"Bearer {data['token']}"}
    res_unauth_patch = client.patch(f"/api/admin/users/{rand_user}", json=patch_payload, headers=analyst_headers)
    assert res_unauth_patch.status_code == 403, "Analyst should NOT be able to patch user profiles"


def test_c01_admin_self_registration_blocked(client):
    """
    C-01 Regression Test: Verify that self-registration with a privileged role
    (admin, director, soc_manager, red_lead, blue_lead) returns 403.
    Only 'analyst' and 'intern' roles are allowed via self-registration.
    """
    import uuid
    for blocked_role in ["admin", "director", "soc_manager", "red_lead", "blue_lead"]:
        res = client.post("/api/register", json={
            "username": f"test_{blocked_role}_{uuid.uuid4().hex[:4]}",
            "password": "Password123!",
            "role": blocked_role
        })
        data = res.get_json()
        assert res.status_code == 403, f"Expected 403 for role '{blocked_role}', got {res.status_code}"
        assert data["success"] is False
        assert "administrator" in data["error"].lower() or "403" in str(res.status_code)

    # Verify allowed roles still work
    for allowed_role in ["analyst", "intern"]:
        res = client.post("/api/register", json={
            "username": f"test_{allowed_role}_{uuid.uuid4().hex[:4]}",
            "password": "Password123!",
            "role": allowed_role
        })
        assert res.status_code == 200, f"Expected 200 for role '{allowed_role}', got {res.status_code}"


def test_c03_logout_and_token_revocation(client):
    """
    C-03 Regression Test: Verify that logging out invalidates the JWT token.
    A request made with the token after logout must return 401.
    """
    import uuid
    rand_user = f"logout_test_{uuid.uuid4().hex[:6]}"
    # Register
    res = client.post("/api/register", json={
        "username": rand_user,
        "password": "TestPass@2026",
        "role": "analyst"
    })
    assert res.status_code == 200
    token = res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify token works
    cases_res = client.get("/api/cases", headers=headers)
    assert cases_res.status_code == 200

    # Logout
    logout_res = client.post("/api/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.get_json()["success"] is True

    # Verify token is now rejected
    cases_res_after = client.get("/api/cases", headers=headers)
    assert cases_res_after.status_code == 401, "Token should be rejected after logout"


def test_admin_create_user_endpoint(client):
    """
    C-01 Regression Test: Admin-only endpoint can create privileged roles.
    Non-admin users are blocked from this endpoint.
    """
    import uuid
    # Get admin token
    admin_login = client.post("/api/login", json={
        "username": "Ayush Singh",
        "password": "Duster@2004"
    })
    admin_token = admin_login.get_json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin can create a director
    new_director = f"director_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/admin/users/create", json={
        "username": new_director,
        "password": "DirectorPass@2026",
        "role": "director",
        "department": "Executive",
        "team": "Leadership"
    }, headers=admin_headers)
    assert res.status_code == 201, f"Admin create user failed: {res.get_json()}"
    assert res.get_json()["user"]["role"] == "director"

    # Analyst cannot create users via admin endpoint
    analyst_reg = client.post("/api/register", json={
        "username": f"analyst_{uuid.uuid4().hex[:6]}",
        "password": "Password123!",
        "role": "analyst"
    })
    analyst_token = analyst_reg.get_json()["token"]
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

    res_blocked = client.post("/api/admin/users/create", json={
        "username": f"blocked_{uuid.uuid4().hex[:6]}",
        "password": "Password123!",
        "role": "admin"
    }, headers=analyst_headers)
    assert res_blocked.status_code == 403, "Analyst should NOT be able to create admin users"



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


