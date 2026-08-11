"""
Cygnal Phase 7 — AI Privacy Controls & Zero-Data-Leakage Masking Test Suite
Validates PII detection, credential zero-leakage protection, prompt/response sanitization,
RAG vector embedding safeguards, tenant privacy event isolation, and REST API telemetry.
"""

import pytest
import json
import uuid
import hashlib
import sys
import os
from datetime import datetime, timezone

# Set path to import from api root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_lookup_db
from db_utils import get_db_connection, set_thread_tenant_id, clear_thread_tenant_id
from jwt_utils import create_token
from backend import app

from services.ai_privacy import (
    SensitiveDataDetector,
    MaskingEngine,
    AIPrivacyGateway,
    AIPrivacyAudit,
    PrivacyFindingType,
    PrivacySeverity,
    PrivacyEventType
)
from services.vector_service import index_text_entity


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def setup_test_db():
    init_lookup_db()
    clear_thread_tenant_id()
    yield
    clear_thread_tenant_id()


@pytest.fixture
def auth_headers():
    token = create_token({"username": "admin_tester", "role": "admin", "tenant_id": 1})
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


def test_email_detection_and_masking():
    """Test 1: Email detection and partial pseudonymization."""
    prompt = "Please send the case files to john.doe@cybercorp.com and contact admin@internal.net."
    findings = SensitiveDataDetector.detect(prompt)

    email_findings = [f for f in findings if f.finding_type == PrivacyFindingType.EMAIL.value]
    assert len(email_findings) == 2
    assert email_findings[0].original_value == "john.doe@cybercorp.com"

    sanitized, _ = MaskingEngine.apply_masking(prompt, findings, reversible=False)
    assert "john.doe@cybercorp.com" not in sanitized
    assert "j***@cybercorp.com" in sanitized
    assert "a***@internal.net" in sanitized


def test_api_key_detection_and_redaction():
    """Test 2: Multi-vendor API key and Cloud credential detection."""
    sample = (
        "OpenAI key is sk-live-abc12345678901234567890, "
        "AWS key is AKIAIOSFODNN7EXAMPLE, "
        "GitHub token is ghp_1234567890abcdefghijklmnopqrstuvwxyz"
    )
    findings = SensitiveDataDetector.detect(sample)
    
    assert any(f.finding_type in (PrivacyFindingType.API_KEY.value, PrivacyFindingType.CLOUD_CREDENTIAL.value) for f in findings)
    assert all(f.is_secret for f in findings)

    sanitized, _ = MaskingEngine.apply_masking(sample, findings, reversible=False)
    assert "sk-live-abc12345678901234567890" not in sanitized
    assert "AKIAIOSFODNN7EXAMPLE" not in sanitized
    assert "ghp_1234567890abcdefghijklmnopqrstuvwxyz" not in sanitized
    assert "[REDACTED_API_KEY]" in sanitized or "[REDACTED_CLOUD_CREDENTIAL]" in sanitized


def test_jwt_token_detection():
    """Test 3: Bearer JWT token detection and redaction."""
    fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    prompt = f"Authorization header: Bearer {fake_jwt}"

    findings = SensitiveDataDetector.detect(prompt)
    jwt_findings = [f for f in findings if f.finding_type == PrivacyFindingType.JWT_TOKEN.value]
    assert len(jwt_findings) == 1
    assert jwt_findings[0].severity == PrivacySeverity.CRITICAL.value

    sanitized, _ = MaskingEngine.apply_masking(prompt, findings, reversible=False)
    assert fake_jwt not in sanitized
    assert "[REDACTED_TOKEN]" in sanitized


def test_prompt_sanitization_workflow():
    """Test 4: Gateway prompt sanitization replaces PII and secrets with sanitized representations."""
    raw_prompt = "Investigate user alex.smith@acme.org connecting from 192.168.1.100 using password=SuperSecret99!"
    
    result = AIPrivacyGateway.sanitize_prompt(
        prompt=raw_prompt,
        user_id="soc_analyst",
        tenant_id=1,
        target_provider="internal",
        strict_secret_blocking=False
    )

    assert not result.blocked
    assert "alex.smith@acme.org" not in result.sanitized_text
    assert "SuperSecret99!" not in result.sanitized_text
    assert len(result.findings) >= 2


def test_response_sanitization_workflow():
    """Test 5: Gateway response sanitization catches and redacts accidental LLM leakage."""
    llm_output = (
        "Analysis complete. The database password is password=ProductionDBPass123! "
        "and contact security team at emergency@corp.com."
    )

    result = AIPrivacyGateway.sanitize_response(
        response_text=llm_output,
        user_id="llm_assistant",
        tenant_id=1
    )

    assert "ProductionDBPass123!" not in result.sanitized_text
    assert "emergency@corp.com" not in result.sanitized_text
    assert "[REDACTED_PASSWORD]" in result.sanitized_text
    assert "e***@corp.com" in result.sanitized_text


def test_tenant_privacy_event_isolation():
    """Test 6: Privacy audit events are strictly isolated per tenant boundary."""
    AIPrivacyAudit.log_event(
        event_type=PrivacyEventType.PROMPT_SANITIZED.value,
        user_id="user_tenant_10",
        tenant_id=10,
        detected_category="API_KEY",
        severity="CRITICAL",
        action_taken="MASKED"
    )

    AIPrivacyAudit.log_event(
        event_type=PrivacyEventType.PROMPT_SANITIZED.value,
        user_id="user_tenant_20",
        tenant_id=20,
        detected_category="EMAIL",
        severity="MEDIUM",
        action_taken="MASKED"
    )

    events_10 = AIPrivacyAudit.get_events(tenant_id=10)
    events_20 = AIPrivacyAudit.get_events(tenant_id=20)

    assert any(e.user_id == "user_tenant_10" for e in events_10)
    assert not any(e.user_id == "user_tenant_20" for e in events_10)

    assert any(e.user_id == "user_tenant_20" for e in events_20)
    assert not any(e.user_id == "user_tenant_10" for e in events_20)


def test_vector_privacy_metadata():
    """Test 7: RAG vector embeddings are pre-sanitized and persist privacy audit metadata."""
    set_thread_tenant_id(1)
    entity_id = f"test-ioc-{uuid.uuid4().hex[:8]}"
    raw_text = "Internal node incident reported by support@victim.com with key sk-live-9999888877776666"

    index_text_entity(
        entity_id=entity_id,
        entity_type="incident_note",
        text_content=raw_text
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT text_content, privacy_filtered, masking_applied, original_hash FROM vector_records WHERE entity_id = ?;",
        (entity_id,)
    )
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    stored_text = row[0]
    privacy_filtered = row[1]
    masking_applied = row[2]
    original_hash = row[3]

    assert "sk-live-9999888877776666" not in stored_text
    assert "support@victim.com" not in stored_text
    assert privacy_filtered == 1
    assert masking_applied == 1
    assert original_hash == hashlib.sha256(raw_text.encode("utf-8")).hexdigest()


def test_ai_privacy_audit_logging():
    """Test 8: Privacy audit logging records structured records and computes posture scores."""
    AIPrivacyAudit.log_event(
        event_type=PrivacyEventType.SECRET_BLOCKED.value,
        user_id="threat_hunter",
        tenant_id=1,
        detected_category="PRIVATE_KEY",
        severity="CRITICAL",
        action_taken="BLOCKED",
        details={"reason": "Attempted transmission of RSA private key"}
    )

    stats = AIPrivacyAudit.get_privacy_stats(tenant_id=1)
    assert stats["success"] is True
    assert stats["total_events"] >= 1
    assert stats["total_blocked_secrets"] >= 1
    assert "CRITICAL" in stats["by_severity"]
    assert stats["privacy_score"] >= 75


def test_rbac_privacy_endpoints(client, auth_headers):
    """Test 9: Privacy API endpoints require valid JWT authentication."""
    # Unauthenticated request
    res_unauth = client.get("/api/ai-privacy/events")
    assert res_unauth.status_code in (401, 403)

    # Authenticated request
    res_auth = client.get("/api/ai-privacy/events", headers=auth_headers)
    assert res_auth.status_code == 200
    data = res_auth.get_json()
    assert data["success"] is True
    assert isinstance(data["events"], list)

    # Stats endpoint
    res_stats = client.get("/api/ai-privacy/stats", headers=auth_headers)
    assert res_stats.status_code == 200
    assert "privacy_score" in res_stats.get_json()


def test_external_ai_provider_blocking_simulation():
    """Test 10: Strict external provider mode blocks outbound critical credential transmission."""
    private_key_prompt = (
        "Analyze this configuration file:\n"
        "-----BEGIN RSA PRIVATE KEY-----\n"
        "MIIEowIBAAKCAQEA0Y1W9ZqOQZ...\n"
        "-----END RSA PRIVATE KEY-----\n"
    )

    result = AIPrivacyGateway.sanitize_prompt(
        prompt=private_key_prompt,
        user_id="lead_analyst",
        tenant_id=1,
        target_provider="external",
        strict_secret_blocking=True
    )

    assert result.blocked is True
    assert result.has_critical_secrets is True
    assert "blocked" in result.block_reason.lower()
    assert result.sanitized_text == ""
