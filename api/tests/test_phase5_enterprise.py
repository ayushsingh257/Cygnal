import pytest
import json
import sys
import os
from unittest.mock import patch, MagicMock

# Set path to import from parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import DB_PATH, init_lookup_db
from db_utils import get_db_connection, get_current_tenant_id, set_thread_tenant_id, clear_thread_tenant_id
from jwt_utils import create_token
import services.cache_service as cache_service

# Mock Redis Client class
class MockRedis:
    def __init__(self):
        self.store = {}
    def get(self, key):
        return self.store.get(key)
    def set(self, key, value, ex=None):
        self.store[key] = value
        return True
    def delete(self, *keys):
        for k in keys:
            if k in self.store:
                del self.store[k]
        return True
    def keys(self, pattern):
        prefix = pattern.replace("*", "")
        return [k for k in self.store.keys() if k.startswith(prefix)]
    def ping(self):
        return True

@pytest.fixture(autouse=True)
def mock_redis_cache():
    cache_service._redis_disabled = False
    mock_r = MockRedis()
    with patch("services.cache_service.redis_client", mock_r):
        yield mock_r

@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["PROPAGATE_EXCEPTIONS"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def setup_tenants_and_users():
    """Ensure seeded tenants and multiple organization users are present for isolation testing."""
    init_lookup_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create tenants
    cursor.execute("INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES (1, 'Default Org', '2026-07-10T00:00:00Z');")
    cursor.execute("INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES (2, 'Enterprise Org', '2026-07-10T00:00:00Z');")
    
    # Create users belonging to different tenants
    cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role, department, team, created_at, tenant_id) VALUES ('user_org1', 'hash', 'analyst', 'SOC', 'Triage', '2026', 1);")
    cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role, department, team, created_at, tenant_id) VALUES ('user_org2', 'hash', 'analyst', 'SOC', 'Triage', '2026', 2);")
    cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role, department, team, created_at, tenant_id) VALUES ('admin_org1', 'hash', 'admin', 'SOC', 'Triage', '2026', 1);")
    
    conn.commit()
    conn.close()
    yield
    
    # Clean up test user records
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE username IN ('user_org1', 'user_org2', 'admin_org1');")
    cursor.execute("DELETE FROM tenants WHERE id IN (1, 2);")
    conn.commit()
    conn.close()

def test_tenant_isolation_cases_filtering(client):
    """Verify standard user from Org 1 cannot see or access Org 2 case records."""
    token_org1 = create_token({"username": "user_org1", "role": "analyst", "tenant_id": 1})
    token_org2 = create_token({"username": "user_org2", "role": "analyst", "tenant_id": 2})

    # 1. Org 1 creates a case
    res1 = client.post("/api/cases", headers={"Authorization": f"Bearer {token_org1}"}, json={
        "title": "Incident Org 1",
        "description": "Confidential details",
        "severity": "medium"
    })
    print("ERROR RESPONSE ORG 1:", res1.get_json())
    assert res1.status_code == 200
    case_org1 = res1.get_json()["case"]["id"]

    # 2. Org 2 creates a case
    res2 = client.post("/api/cases", headers={"Authorization": f"Bearer {token_org2}"}, json={
        "title": "Incident Org 2",
        "description": "Enterprise secret",
        "severity": "high"
    })
    assert res2.status_code == 200
    case_org2 = res2.get_json()["case"]["id"]

    # 3. Org 1 fetches cases list. Must ONLY see Org 1 case.
    res_list1 = client.get("/api/cases", headers={"Authorization": f"Bearer {token_org1}"})
    assert res_list1.status_code == 200
    cases1 = res_list1.get_json()["cases"]
    assert any(c["id"] == case_org1 for c in cases1)
    assert not any(c["id"] == case_org2 for c in cases1)

    # 4. Org 1 tries to access Org 2 case detail explicitly. Must return 404 (not found).
    res_detail = client.get(f"/api/cases/{case_org2}", headers={"Authorization": f"Bearer {token_org1}"})
    assert res_detail.status_code == 404

    # Cleanup
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cases WHERE id IN (?, ?);", (case_org1, case_org2))
    conn.commit()
    conn.close()

def test_tenant_onboarding_restrictions(client):
    """Verify only global administrators can onboard new organizations."""
    token_analyst = create_token({"username": "user_org1", "role": "analyst", "tenant_id": 1})
    token_admin = create_token({"username": "admin_org1", "role": "admin", "tenant_id": 1})

    # Analyst attempt (forbidden)
    res1 = client.post("/api/admin/tenants", headers={"Authorization": f"Bearer {token_analyst}"}, json={
        "name": "Unauthorized Org"
    })
    assert res1.status_code == 403

    # Admin attempt (allowed)
    res2 = client.post("/api/admin/tenants", headers={"Authorization": f"Bearer {token_admin}"}, json={
        "name": "New Authorized Tenant"
    })
    assert res2.status_code == 200
    
    # Cleanup
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tenants WHERE name = 'New Authorized Tenant';")
    conn.commit()
    conn.close()

def test_infrastructure_monitoring_metrics(client):
    """Verify monitoring endpoints correctly retrieve services status and require RBAC."""
    token_analyst = create_token({"username": "user_org1", "role": "analyst", "tenant_id": 1})
    token_admin = create_token({"username": "admin_org1", "role": "admin", "tenant_id": 1})

    # Unauthorized access check
    res_forbidden = client.get("/api/admin/monitoring", headers={"Authorization": f"Bearer {token_analyst}"})
    assert res_forbidden.status_code == 403

    # Authorized metrics retrieve check
    res_ok = client.get("/api/admin/monitoring", headers={"Authorization": f"Bearer {token_admin}"})
    assert res_ok.status_code == 200
    data = res_ok.get_json()
    assert data["success"] is True
    metrics = data["metrics"]
    assert "uptime" in metrics
    assert metrics["database"] == "healthy"
    assert "redis" in metrics
    assert "celery" in metrics
    assert "system" in metrics

def test_tenant_cache_keys_isolation():
    """Verify get_cached and set_cached enforce key namespacing by tenant_id."""
    cache_service.set_cached(tenant_id=1, cache_type="vector_search", key="doc1", value={"data": "tenant1"})
    cache_service.set_cached(tenant_id=2, cache_type="vector_search", key="doc1", value={"data": "tenant2"})

    val1 = cache_service.get_cached(tenant_id=1, cache_type="vector_search", key="doc1")
    val2 = cache_service.get_cached(tenant_id=2, cache_type="vector_search", key="doc1")

    assert val1 == {"data": "tenant1"}
    assert val2 == {"data": "tenant2"}

    # Invalidate tenant 1
    cache_service.invalidate_cache(tenant_id=1, cache_type="vector_search", key="doc1")
    assert cache_service.get_cached(tenant_id=1, cache_type="vector_search", key="doc1") is None
    # Tenant 2 must survive invalidation
    assert cache_service.get_cached(tenant_id=2, cache_type="vector_search", key="doc1") == {"data": "tenant2"}

    cache_service.invalidate_cache(tenant_id=2, cache_type="vector_search", key="doc1")
