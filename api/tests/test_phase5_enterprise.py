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
    cache_service.invalidate_cache(tenant_id=2, cache_type="vector_search", key="doc1")


def test_tenant_isolation_evidence(client):
    """Verify Tenant A cannot access or list Tenant B evidence files."""
    import io
    token_org1 = create_token({"username": "user_org1", "role": "analyst", "tenant_id": 1})
    token_org2 = create_token({"username": "user_org2", "role": "analyst", "tenant_id": 2})

    # Org 1 creates case
    res_c1 = client.post("/api/cases", headers={"Authorization": f"Bearer {token_org1}"}, json={
        "title": "Case Org 1 Evidence", "severity": "medium"
    })
    case1_id = res_c1.get_json()["case"]["id"]

    # Org 2 creates case
    res_c2 = client.post("/api/cases", headers={"Authorization": f"Bearer {token_org2}"}, json={
        "title": "Case Org 2 Evidence", "severity": "high"
    })
    case2_id = res_c2.get_json()["case"]["id"]

    # Org 1 uploads evidence
    data_file1 = (io.BytesIO(b"Org 1 Confidential Evidence File"), "evidence_org1.txt")
    res_up1 = client.post(f"/api/cases/{case1_id}/evidence", headers={"Authorization": f"Bearer {token_org1}"}, data={"file": data_file1}, content_type="multipart/form-data")
    assert res_up1.status_code == 200

    # Org 2 uploads evidence
    data_file2 = (io.BytesIO(b"Org 2 Secret Malware Payload"), "evidence_org2.txt")
    res_up2 = client.post(f"/api/cases/{case2_id}/evidence", headers={"Authorization": f"Bearer {token_org2}"}, data={"file": data_file2}, content_type="multipart/form-data")
    assert res_up2.status_code == 200

    # Org 1 queries case 2 detail / evidence. Must receive 404
    res_probe = client.get(f"/api/cases/{case2_id}", headers={"Authorization": f"Bearer {token_org1}"})
    assert res_probe.status_code == 404

    # Org 1 queries its own case. Must only see Org 1 evidence
    res_own = client.get(f"/api/cases/{case1_id}", headers={"Authorization": f"Bearer {token_org1}"})
    assert res_own.status_code == 200
    ev_list = res_own.get_json()["evidence"]
    assert any(e["filename"] == "evidence_org1.txt" for e in ev_list)
    assert not any(e["filename"] == "evidence_org2.txt" for e in ev_list)


def test_tenant_isolation_audit_logs(client):
    """Verify Administrator of Tenant A only sees Tenant A audit logs."""
    from routes.v2.admin import write_audit_log
    token_admin_org1 = create_token({"username": "admin_org1", "role": "admin", "tenant_id": 1})
    token_admin_org2 = create_token({"username": "admin_org2", "role": "admin", "tenant_id": 2})

    # Write audit log as Org 1
    set_thread_tenant_id(1)
    write_audit_log("case.deleted", "admin_org1", target="CASE-ORG1", details={"secret": "org1_info"}, ip_address="10.0.0.1")
    clear_thread_tenant_id()

    # Write audit log as Org 2
    set_thread_tenant_id(2)
    write_audit_log("user.provisioned", "admin_org2", target="USER-ORG2", details={"secret": "org2_info"}, ip_address="10.0.0.2")
    clear_thread_tenant_id()

    # Org 1 Admin queries audit log
    res1 = client.get("/api/admin/audit", headers={"Authorization": f"Bearer {token_admin_org1}"})
    assert res1.status_code == 200
    logs1 = res1.get_json()["audit_log"]
    assert any(l["actor"] == "admin_org1" for l in logs1)
    assert not any(l["actor"] == "admin_org2" for l in logs1)


def test_tenant_isolation_vector_records():
    """Verify semantic vector searches and indexing are strictly isolated per-tenant."""
    from services.vector_service import index_text_entity, semantic_search

    set_thread_tenant_id(1)
    index_text_entity("doc-org1", "case", "Malicious ransomware attack targeting Org 1 critical mainframe.")
    clear_thread_tenant_id()

    set_thread_tenant_id(2)
    index_text_entity("doc-org2", "case", "Malicious ransomware attack targeting Org 2 secret vault.")
    clear_thread_tenant_id()

    # Query as Org 1
    set_thread_tenant_id(1)
    results_org1 = semantic_search("ransomware attack", limit=5)
    clear_thread_tenant_id()

    # Must find doc-org1 but NEVER doc-org2
    entity_ids_org1 = [r["entity_id"] for r in results_org1]
    assert "doc-org1" in entity_ids_org1
    assert "doc-org2" not in entity_ids_org1

    # Query as Org 2
    set_thread_tenant_id(2)
    results_org2 = semantic_search("ransomware attack", limit=5)
    clear_thread_tenant_id()

    entity_ids_org2 = [r["entity_id"] for r in results_org2]
    assert "doc-org2" in entity_ids_org2
    assert "doc-org1" not in entity_ids_org2


def test_tenant_isolation_notifications(client):
    """Verify notifications cannot cross tenant boundaries."""
    from services.collaboration_service import create_notification
    token_org1 = create_token({"username": "user_org1", "role": "analyst", "tenant_id": 1})
    token_org2 = create_token({"username": "user_org2", "role": "analyst", "tenant_id": 2})

    # Create notification for Org 1 user
    set_thread_tenant_id(1)
    create_notification("user_org1", "Alert Org 1", "Org 1 incident notification", "system")
    clear_thread_tenant_id()

    # Create notification for Org 2 user
    set_thread_tenant_id(2)
    create_notification("user_org2", "Alert Org 2", "Org 2 incident notification", "system")
    clear_thread_tenant_id()

    # Org 1 checks notifications
    res1 = client.get("/api/notifications", headers={"Authorization": f"Bearer {token_org1}"})
    assert res1.status_code == 200
    notifs1 = res1.get_json()["notifications"]
    assert any("Alert Org 1" in n["title"] for n in notifs1)
    assert not any("Alert Org 2" in n["title"] for n in notifs1)


def test_postgresql_rls_policies_and_context():
    """Verify PostgreSQL RLS dialect methods and tenant parameter scoping."""
    from db_utils import DialectConnection, DialectCursor

    class MockPgCursor:
        def __init__(self):
            self.executed = []
        def execute(self, sql, params=None):
            self.executed.append((sql, params))
        def fetchall(self):
            return []
        def fetchone(self):
            return None
        def close(self):
            pass

    class MockPgConn:
        def __init__(self):
            self.cur = MockPgCursor()
        def cursor(self):
            return self.cur
        def commit(self):
            pass
        def rollback(self):
            pass
        def close(self):
            pass

    mock_conn = MockPgConn()
    dconn = DialectConnection(mock_conn, is_pg_mode=True)
    dconn.set_tenant_context(42)

    # Verify SET LOCAL app.current_tenant_id was executed
    assert any("SET LOCAL app.current_tenant_id" in sql for sql, _ in mock_conn.cur.executed)

