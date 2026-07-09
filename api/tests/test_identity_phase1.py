import pytest
import sqlite3
import json
import os
import sys
import jwt
from datetime import datetime, timezone, timedelta
from db_utils import get_db_connection

# Set path to import from parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app as flask_app
from database import DB_PATH, init_lookup_db
from auth_utils import init_db
from services.identity import (
    get_identity_provider,
    map_groups_to_role,
    create_user_session,
    refresh_user_session,
    revoke_user_session,
    revoke_all_user_sessions,
    get_active_sessions,
    create_service_account,
    authenticate_service_account
)

@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()

@pytest.fixture
def app():
    flask_app.config["TESTING"] = True
    return flask_app

@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client

def test_dynamic_role_mapping(app):
    with app.app_context():
        # Setup clean mappings
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM directory_group_mappings;")
        cursor.execute("""
            INSERT INTO directory_group_mappings (provider, external_group_name, internal_role, created_at)
            VALUES ('entra_id', 'SOC Managers', 'soc_manager', '2026-07-09T12:00:00Z');
        """)
        cursor.execute("""
            INSERT INTO directory_group_mappings (provider, external_group_name, internal_role, created_at)
            VALUES ('entra_id', 'Enterprise Admin', 'admin', '2026-07-09T12:00:00Z');
        """)
        conn.commit()
        conn.close()

        # Highest weight mapping checks
        role1 = map_groups_to_role("entra_id", ["SOC Managers"])
        assert role1 == "soc_manager"

        role2 = map_groups_to_role("entra_id", ["SOC Managers", "Enterprise Admin"])
        assert role2 == "admin"

        # Fallback
        role3 = map_groups_to_role("entra_id", ["Interns"])
        assert role3 == "analyst"

def test_session_lifecycle(app):
    with app.app_context():
        username = "session_test_analyst"
        role = "analyst"
        ip = "127.0.0.1"
        ua = "PytestClient"

        # 1. Create session
        res = create_user_session(username, role, ip, ua)
        assert "access_token" in res
        assert "refresh_token" in res

        # Decode & check fields
        access_claims = jwt.decode(res["access_token"], options={"verify_signature": False})
        assert access_claims["username"] == username
        assert access_claims["role"] == role
        assert access_claims["type"] == "access"

        refresh_claims = jwt.decode(res["refresh_token"], options={"verify_signature": False})
        assert refresh_claims["username"] == username
        assert refresh_claims["type"] == "refresh"

        # 2. Get active sessions
        sessions = get_active_sessions(username)
        assert len(sessions) == 1
        assert sessions[0]["jti"] == access_claims["jti"]
        assert sessions[0]["ip_address"] == ip

        # 3. Refresh session (rotation)
        refreshed = refresh_user_session(res["refresh_token"], ip, ua)
        assert "access_token" in refreshed
        assert "refresh_token" in refreshed

        # Verify old session is updated/revoked
        new_sessions = get_active_sessions(username)
        assert len(new_sessions) == 1
        assert new_sessions[0]["jti"] != access_claims["jti"]

        # 4. Revocation check
        revoke_user_session(new_sessions[0]["jti"])
        assert len(get_active_sessions(username)) == 0

def test_service_accounts(app):
    with app.app_context():
        # Setup service account
        sa = create_service_account("SIEM_Connector", ["indicators:write", "cases:read"], 10, "admin_user")
        assert "client_id" in sa
        assert "client_secret" in sa

        # Authenticate
        token = authenticate_service_account(sa["client_id"], sa["client_secret"])
        assert token is not None

        # Verify token scopes and claims
        claims = jwt.decode(token, options={"verify_signature": False})
        assert claims["username"] == "service_account:SIEM_Connector"
        assert claims["role"] == "service"
        assert claims["scope"] == "indicators:write,cases:read"

        # Failure check
        assert authenticate_service_account(sa["client_id"], "wrong_secret") is None

def test_endpoints_sso_and_tokens(client):
    # Setup mock user mapping
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO directory_group_mappings (provider, external_group_name, internal_role, created_at)
        VALUES ('entra_id', 'SOC Managers', 'soc_manager', '2026-07-09T12:00:00Z');
    """)
    conn.commit()
    conn.close()

    # 1. Login redirect URL generation
    res = client.get("/api/auth/sso/login/entra_id?redirect_uri=http://localhost:3001/sso-callback&state=mystate")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "url" in data
    assert "response_type=code" in data["url"] or "mock_entra_code_12345" in data["url"]

    # 2. SSO callback mock verification (using mock mode/dev credentials bypass)
    # The entra_id.py handle_callback mock pathway is triggered because variables are absent in pytest environment
    payload = {
        "code": "mock_auth_code_for_entra_id",
        "redirect_uri": "http://localhost:3001/sso-callback",
        "state": "mystate"
    }
    res = client.post("/api/auth/sso/callback/entra_id", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "soc_manager" # dynamic mapping mapped 'SOC Managers' (mocked default group) to 'soc_manager'

    # Get access/refresh tokens
    access_token = data["token"]
    refresh_token = data["refresh_token"]

    # 3. Refresh token rotation endpoint
    res = client.post("/api/auth/token/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    refresh_data = res.get_json()
    assert refresh_data["success"] is True
    assert "access_token" in refresh_data
    assert "refresh_token" in refresh_data

    # 4. Service Account credentials flow endpoint
    sa_res = client.post("/api/auth/oauth/token", json={
        "grant_type": "client_credentials",
        "client_id": "nonexistent_client_id",
        "client_secret": "invalid"
    })
    assert sa_res.status_code == 401
