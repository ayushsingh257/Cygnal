import pytest
import os
import sys
import json

# Set path to import from parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import init_lookup_db
from auth_utils import init_db
from jwt_utils import create_token

@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "service" in data

def test_ready_endpoint(client):
    res = client.get("/api/ready")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"

def test_audit_log_unauthenticated(client):
    # GET and POST should require auth
    res_get = client.get("/api/admin/audit")
    assert res_get.status_code == 401

    res_post = client.post("/api/admin/audit", json={"action": "test.action"})
    assert res_post.status_code == 401

def test_audit_log_rbac_restriction(client):
    # Register an analyst user
    analyst_token = create_token({"username": "some_analyst", "role": "analyst"})
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # Analyst should NOT be allowed to GET audit logs
    res_get = client.get("/api/admin/audit", headers=headers)
    assert res_get.status_code == 403

    # Analyst SHOULD be allowed to POST audit logs (e.g. reporting UI actions)
    res_post = client.post("/api/admin/audit", json={
        "action": "ui.view_case",
        "target": "case-123",
        "details": {"tab": "evidence"}
    }, headers=headers)
    assert res_post.status_code == 200
    assert res_post.get_json()["success"] is True

def test_audit_log_retrieval_and_filtering(client):
    # Login/Create admin token
    admin_token = create_token({"username": "admin_user", "role": "admin"})
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    # Write a couple of audit events
    client.post("/api/admin/audit", json={
        "action": "case.delete",
        "target": "case-456",
        "details": {"reason": "duplicate"}
    }, headers=headers)

    client.post("/api/admin/audit", json={
        "action": "user.login",
        "target": "admin_user",
        "details": {"method": "password"}
    }, headers=headers)

    # Get audit logs as admin
    res_get = client.get("/api/admin/audit", headers=headers)
    assert res_get.status_code == 200
    data = res_get.get_json()
    assert data["success"] is True
    assert len(data["audit_log"]) >= 2

    # Verify fields are populated
    first_entry = data["audit_log"][0]
    assert "id" in first_entry
    assert "timestamp" in first_entry
    assert "actor" == "admin_user" or first_entry["actor"] == "admin_user"

    # Filter by action
    res_filter = client.get("/api/admin/audit?action=case.delete", headers=headers)
    assert res_filter.status_code == 200
    filter_data = res_filter.get_json()
    assert any(entry["action"] == "case.delete" for entry in filter_data["audit_log"])


def test_rate_limiter_in_memory_fallback():
    from rate_limit import is_rate_limited, record_attempt, _rate_limit_store
    key = "test_ip_in_mem:route"
    
    # Reset local store for this test
    if key in _rate_limit_store:
         del _rate_limit_store[key]

    # Verify not limited initially
    assert not is_rate_limited(key)

    # Trigger limit by recording attempts
    for _ in range(5):
        record_attempt(key)

    # Verify limited
    assert is_rate_limited(key)


def test_rate_limiter_redis_flow(monkeypatch):
    from rate_limit import is_rate_limited, record_attempt
    
    # Mock Redis client using a simple dictionary to simulate sorted set actions
    class MockRedis:
        def __init__(self):
            self.store = {}
        def ping(self):
            return True
        def zremrangebyscore(self, key, min_val, max_val):
            pass
        def zcard(self, key):
            return len(self.store.get(key, []))
        def zrange(self, key, start, end, withscores=False):
            items = self.store.get(key, [])
            if not items:
                return []
            return [(str(items[-1]), items[-1])]
        def zadd(self, key, mapping):
            if key not in self.store:
                self.store[key] = []
            for ts in mapping.values():
                self.store[key].append(ts)
        def expire(self, key, ttl):
            pass

    mock_r = MockRedis()
    monkeypatch.setattr("rate_limit._get_redis", lambda: mock_r)

    key = "test_ip_redis:route"

    # Verify not limited initially
    assert not is_rate_limited(key)

    # Record 5 attempts
    for _ in range(5):
        record_attempt(key)

    # Verify limited
    assert is_rate_limited(key)

