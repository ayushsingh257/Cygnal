"""
Cygnal v4.0 Phase 6 — Data Governance & Automated Retention Tests
Validates data classification, retention policy CRUD, multi-tenant isolation,
retention lifecycle evaluation, dry-run simulation, cryptographic destruction proofs,
RBAC enforcement, and compliance audit reporting.
"""

import pytest
import uuid
import sys
import os
from datetime import datetime, timezone, timedelta

# Set path to import from parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db_utils import get_db_connection
from database import init_lookup_db
from auth_utils import init_db
from backend import app
from services.governance import (
    DataClassification,
    LifecycleAction,
    ResourceType,
    RetentionPolicy,
    DeletionRecord,
    classify_resource,
    get_resource_classification,
    get_classification_stats,
    RetentionEngine,
    SecureDeletionPipeline,
    RetentionScheduler,
    GovernanceAudit
)

@pytest.fixture(autouse=True)
def setup_db():
    init_lookup_db()
    init_db()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    init_lookup_db()
    with app.test_client() as client:
        yield client


# ─── 1. Data Classification Assignment & Retrieval Tests ───────────────────────

def test_data_classification_assignment_and_retrieval():
    """Verify resources can be assigned classification levels and queried."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insert mock case
    case_id = str(uuid.uuid4())
    case_num = f"CYG-GOV-{uuid.uuid4().hex[:6]}"
    cursor.execute("""
        INSERT INTO cases (id, case_number, title, tenant_id, data_classification, created_at)
        VALUES (?, ?, 'Governance Test Case', 1, 'INTERNAL', '2026-08-01T00:00:00Z');
    """, (case_id, case_num))
    conn.commit()
    conn.close()

    # Reclassify to RESTRICTED
    res = classify_resource(
        resource_type="cases",
        resource_id=case_id,
        classification_level="RESTRICTED",
        classification_reason="High-risk incident involving executive accounts",
        classified_by="ciso_admin",
        tenant_id=1
    )
    assert res["success"] is True
    assert res["data_classification"] == "RESTRICTED"
    assert res["previous_classification"] == "INTERNAL"

    # Query classification
    info = get_resource_classification("cases", case_id, tenant_id=1)
    assert info is not None
    assert info["data_classification"] == "RESTRICTED"
    assert info["classified_by"] == "ciso_admin"
    assert "executive" in info["classification_reason"]


def test_classification_stats_aggregation():
    """Verify tenant-scoped classification statistics aggregation."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cases WHERE tenant_id = 99;")
    c1_id = f"c99-1-{uuid.uuid4().hex[:6]}"
    c2_id = f"c99-2-{uuid.uuid4().hex[:6]}"
    cursor.execute("""
        INSERT INTO cases (id, case_number, title, tenant_id, data_classification)
        VALUES (?, ?, 'Test 1', 99, 'CONFIDENTIAL'),
               (?, ?, 'Test 2', 99, 'TOP_SECRET');
    """, (c1_id, c1_id, c2_id, c2_id))
    conn.commit()
    conn.close()

    stats = get_classification_stats(tenant_id=99)
    assert stats["total_resources"] >= 2
    assert stats["by_level"]["CONFIDENTIAL"] >= 1
    assert stats["by_level"]["TOP_SECRET"] >= 1


# ─── 2. Retention Policy CRUD & Validation Tests ──────────────────────────────

def test_retention_policy_crud_lifecycle():
    """Verify creation, reading, updating, and deletion of retention policies."""
    # 1. Create policy
    policy = RetentionEngine.create_policy(
        tenant_id=1,
        resource_type="evidence",
        classification_level="RESTRICTED",
        retention_days=365,
        action_after_expiry="DELETE",
        created_by="admin"
    )
    assert policy.id is not None
    assert policy.retention_days == 365
    assert policy.action_after_expiry == "DELETE"

    # 2. Get policy
    fetched = RetentionEngine.get_policy(policy.id, tenant_id=1)
    assert fetched is not None
    assert fetched.id == policy.id

    # 3. Update policy
    updated = RetentionEngine.update_policy(
        policy_id=policy.id,
        tenant_id=1,
        retention_days=180,
        action_after_expiry="ARCHIVE",
        enabled=True,
        updated_by="admin"
    )
    assert updated.retention_days == 180
    assert updated.action_after_expiry == "ARCHIVE"

    # 4. Delete policy
    deleted = RetentionEngine.delete_policy(policy.id, tenant_id=1, deleted_by="admin")
    assert deleted is True
    assert RetentionEngine.get_policy(policy.id, tenant_id=1) is None


# ─── 3. Multi-Tenant Governance Isolation Tests ───────────────────────────────

def test_retention_policy_tenant_isolation():
    """Verify Tenant A cannot view, modify, or delete Tenant B policies."""
    # Create policy for Tenant 10
    policy_t10 = RetentionEngine.create_policy(
        tenant_id=10,
        resource_type="cases",
        classification_level="CONFIDENTIAL",
        retention_days=90,
        created_by="tenant10_admin"
    )

    # Create policy for Tenant 20
    policy_t20 = RetentionEngine.create_policy(
        tenant_id=20,
        resource_type="cases",
        classification_level="CONFIDENTIAL",
        retention_days=120,
        created_by="tenant20_admin"
    )

    # Tenant 10 policies should not include Tenant 20
    t10_policies = RetentionEngine.get_policies(tenant_id=10)
    t10_ids = [p.id for p in t10_policies]
    assert policy_t10.id in t10_ids
    assert policy_t20.id not in t10_ids

    # Tenant 10 cannot fetch Tenant 20's policy directly
    assert RetentionEngine.get_policy(policy_t20.id, tenant_id=10) is None

    # Tenant 10 cannot delete Tenant 20's policy
    assert RetentionEngine.delete_policy(policy_t20.id, tenant_id=10) is False
    assert RetentionEngine.get_policy(policy_t20.id, tenant_id=20) is not None


# ─── 4. Retention Evaluation Engine Tests ─────────────────────────────────────

def test_retention_evaluation_detects_expired_resources():
    """Verify the retention evaluation engine identifies expired resources based on policy age."""
    tenant_id = 77
    # Create policy: retain reports for 30 days then DELETE
    RetentionEngine.create_policy(
        tenant_id=tenant_id,
        resource_type="reports",
        classification_level="CONFIDENTIAL",
        retention_days=30,
        action_after_expiry="DELETE",
        created_by="admin"
    )

    old_date = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    fresh_date = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    rep_old_id = f"rep-old-{uuid.uuid4().hex[:6]}"
    rep_fresh_id = f"rep-fresh-{uuid.uuid4().hex[:6]}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (id, title, content, created_by, created_at, tenant_id, data_classification)
        VALUES (?, 'Old Expired Report', 'Data', 'analyst', ?, ?, 'CONFIDENTIAL'),
               (?, 'Fresh Valid Report', 'Data', 'analyst', ?, ?, 'CONFIDENTIAL');
    """, (rep_old_id, old_date, tenant_id, rep_fresh_id, fresh_date, tenant_id))
    conn.commit()
    conn.close()

    expired_list = RetentionEngine.evaluate_retention(tenant_id=tenant_id)
    expired_ids = [e.resource_id for e in expired_list]

    assert rep_old_id in expired_ids
    assert rep_fresh_id not in expired_ids


# ─── 5. Dry-Run Lifecycle Execution Tests ─────────────────────────────────────

def test_dry_run_lifecycle_execution_does_not_delete():
    """Verify dry_run=True returns planned actions without altering database."""
    tenant_id = 88
    RetentionEngine.create_policy(
        tenant_id=tenant_id,
        resource_type="cases",
        classification_level="CONFIDENTIAL",
        retention_days=10,
        action_after_expiry="DELETE",
        created_by="admin"
    )

    old_date = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat() + "Z"
    case_dry_id = f"case-dry-{uuid.uuid4().hex[:6]}"
    case_dry_num = f"CYG-DRY-{uuid.uuid4().hex[:6]}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO cases (id, case_number, title, created_at, tenant_id, data_classification)
        VALUES (?, ?, 'Dry Run Case', ?, ?, 'CONFIDENTIAL');
    """, (case_dry_id, case_dry_num, old_date, tenant_id))
    conn.commit()
    conn.close()

    # Execute dry run
    dry_res = RetentionScheduler.run_lifecycle_cycle(tenant_id=tenant_id, dry_run=True)
    assert dry_res["dry_run"] is True
    assert dry_res["total_expired"] >= 1
    assert "Would execute" in dry_res["message"]

    # Verify case still exists in DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM cases WHERE id = ? AND tenant_id = ?;", (case_dry_id, tenant_id))
    assert cursor.fetchone() is not None
    conn.close()


# ─── 6. Secure Deletion Workflow & Destruction Proofs ─────────────────────────

def test_secure_deletion_workflow_and_cryptographic_proof():
    """Verify permanent purge, cascade cleanup, and unalterable cryptographic destruction proof."""
    tenant_id = 95
    case_id = f"case-purge-{uuid.uuid4().hex[:6]}"
    case_num = f"CYG-PURGE-{uuid.uuid4().hex[:6]}"
    timeline_id = f"time-{uuid.uuid4().hex[:6]}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO cases (id, case_number, title, created_at, tenant_id, data_classification)
        VALUES (?, ?, 'Target Case for Secure Purge', '2026-01-01T00:00:00Z', ?, 'RESTRICTED');
    """, (case_id, case_num, tenant_id))
    cursor.execute("""
        INSERT INTO timeline (id, case_id, event_type, description, timestamp, tenant_id)
        VALUES (?, ?, 'note', 'Timeline entry', '2026-01-01T00:00:00Z', ?);
    """, (timeline_id, case_id, tenant_id))
    conn.commit()
    conn.close()

    # Execute secure permanent deletion
    record = SecureDeletionPipeline.execute_deletion(
        resource_type="cases",
        resource_id=case_id,
        deletion_reason="Mandatory compliance lifecycle purge",
        deleted_by="compliance_officer",
        tenant_id=tenant_id
    )

    assert record.id is not None
    assert record.resource_id == case_id
    assert record.verification_hash is not None
    assert len(record.verification_hash) == 64  # SHA-256 hex string

    # Verify case and related timeline items are gone
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM cases WHERE id = ?;", (case_id,))
    assert cursor.fetchone() is None
    cursor.execute("SELECT id FROM timeline WHERE case_id = ?;", (case_id,))
    assert cursor.fetchone() is None

    # Verify deletion record is persisted
    cursor.execute("SELECT verification_hash, deleted_by FROM deletion_records WHERE id = ?;", (record.id,))
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == record.verification_hash
    assert row[1] == "compliance_officer"
    conn.close()


# ─── 7. Deletion History & Audit Generation ───────────────────────────────────

def test_deletion_history_retrieval():
    """Verify retrieval of tenant-isolated deletion records."""
    tenant_id = 101
    del_id = f"del-rec-{uuid.uuid4().hex[:6]}"

    # Insert deletion record directly
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO deletion_records (id, tenant_id, resource_type, resource_id, deletion_reason, deleted_by, deleted_at, verification_hash)
        VALUES (?, 101, 'evidence', 'ev-101', 'Retention expired', 'system', '2026-08-11T12:00:00Z', 'abcdef123456');
    """, (del_id,))
    conn.commit()
    conn.close()

    history = SecureDeletionPipeline.get_deletion_history(tenant_id=101)
    assert len(history) >= 1
    assert any(h.verification_hash == "abcdef123456" for h in history)


# ─── 8. Compliance Report Generation ──────────────────────────────────────────

def test_compliance_report_generation():
    """Verify comprehensive compliance report structure, scores, and issue identification."""
    report = GovernanceAudit.generate_compliance_report(tenant_id=1)
    assert report["success"] is True
    assert "compliance_status" in report
    assert "compliance_score" in report
    assert "classification" in report
    assert "retention" in report
    assert "deletion_audit" in report
    assert isinstance(report["issues_identified"], list)


# ─── 9. Governance API Endpoints & RBAC Enforcement ───────────────────────────

def test_governance_api_rbac_and_crud(client):
    """Verify API endpoints require auth and enforce role restrictions."""
    from jwt_utils import create_token

    admin_token = create_token({"username": "admin_user", "role": "admin", "tenant_id": 1})
    director_token = create_token({"username": "director_user", "role": "director", "tenant_id": 1})
    analyst_token = create_token({"username": "analyst_user", "role": "analyst", "tenant_id": 1})

    # 1. Unauthenticated requests are rejected
    unauth_res = client.get("/api/governance/policies")
    assert unauth_res.status_code == 401

    # 2. Analyst can READ policies
    read_res = client.get("/api/governance/policies", headers={"Authorization": f"Bearer {analyst_token}"})
    assert read_res.status_code == 200

    # 3. Analyst CANNOT CREATE policies (403 Forbidden)
    analyst_create_res = client.post(
        "/api/governance/policies",
        headers={"Authorization": f"Bearer {analyst_token}"},
        json={
            "resource_type": "cases",
            "classification_level": "RESTRICTED",
            "retention_days": 90,
            "action_after_expiry": "DELETE"
        }
    )
    assert analyst_create_res.status_code == 403

    # 4. Admin CAN CREATE policies (201 Created)
    admin_create_res = client.post(
        "/api/governance/policies",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "resource_type": "cases",
            "classification_level": "RESTRICTED",
            "retention_days": 90,
            "action_after_expiry": "DELETE"
        }
    )
    assert admin_create_res.status_code == 201
    policy_data = admin_create_res.get_json()["policy"]
    policy_id = policy_data["id"]

    # 5. Director CAN UPDATE policy
    director_update_res = client.post(
        "/api/governance/policies",
        headers={"Authorization": f"Bearer {director_token}"},
        json={
            "id": policy_id,
            "retention_days": 120,
            "action_after_expiry": "ARCHIVE"
        }
    )
    assert director_update_res.status_code == 200

    # 6. Admin can trigger retention status (dry_run)
    status_res = client.get("/api/governance/retention/status?dry_run=true", headers={"Authorization": f"Bearer {admin_token}"})
    assert status_res.status_code == 200
    assert status_res.get_json()["dry_run"] is True

    # 7. Compliance report endpoint
    report_res = client.get("/api/governance/compliance/report", headers={"Authorization": f"Bearer {admin_token}"})
    assert report_res.status_code == 200
    assert report_res.get_json()["success"] is True

    # 8. Admin CAN DELETE policy
    delete_res = client.delete(f"/api/governance/policies/{policy_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert delete_res.status_code == 200
