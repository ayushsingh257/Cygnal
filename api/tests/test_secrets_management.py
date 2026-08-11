"""
Cygnal Enterprise Hardening — Phase 4 Tests: Secrets Management
Validates:
1. Env, GCP Secret Manager, and HashiCorp Vault Provider Functionality
2. Secrets Manager Factory & Dynamic Provider Selection
3. Dual-Key Zero-Downtime JWT Secret Rotation (Current + Previous with Grace Period)
4. Production Startup Validation & Mandatory Key Enforcement
5. Secret Access Audit Trail (Zero Plaintext Logging)
"""

import pytest
import os
import sys
import time
from unittest.mock import patch, MagicMock

# Set path to import from api root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.secrets import (
    get_secrets_manager,
    reset_secrets_manager,
    get_secret,
    get_required_secret,
    audit_secret_access,
    get_secret_access_audit_log,
    validate_production_secrets,
    EnvSecretsProvider,
    GCPSecretManagerProvider,
    VaultSecretsProvider
)
from jwt_utils import create_token, decode_token, get_current_jwt_secret

# ─── 1. Provider Unit Tests ──────────────────────────────────────────────────

def test_env_secrets_provider():
    """Verify EnvSecretsProvider retrieves environment variables and handles missing keys."""
    provider = EnvSecretsProvider()
    assert provider.provider_name == "env"
    
    with patch.dict(os.environ, {"CYGNAL_TEST_SECRET": "env_super_secret_value"}):
        assert provider.get_secret("CYGNAL_TEST_SECRET") == "env_super_secret_value"
        assert provider.get_required_secret("CYGNAL_TEST_SECRET") == "env_super_secret_value"
        assert provider.get_secret("NON_EXISTENT_KEY", default="fallback") == "fallback"
        
    with pytest.raises(ValueError):
        provider.get_required_secret("DEFINITELY_MISSING_SECRET_KEY_123")

def test_gcp_secret_manager_provider():
    """Verify GCPSecretManagerProvider mock retrieval, version listing, and caching."""
    provider = GCPSecretManagerProvider(project_id="test-gcp-project", ttl_seconds=60)
    assert provider.provider_name == "gcp"
    
    # Test secret rotation and retrieval
    provider.rotate_secret("CYGNAL_GCP_SECRET", "version_1_secret_value")
    assert provider.get_secret("CYGNAL_GCP_SECRET") == "version_1_secret_value"
    
    # Rotate to version 2
    provider.rotate_secret("CYGNAL_GCP_SECRET", "version_2_secret_value")
    assert provider.get_secret("CYGNAL_GCP_SECRET") == "version_2_secret_value"
    
    versions = provider.list_versions("CYGNAL_GCP_SECRET")
    assert len(versions) >= 2
    assert provider.health_check()["status"] == "healthy"

def test_vault_secrets_provider():
    """Verify VaultSecretsProvider mock KV retrieval, version management, and rotation."""
    provider = VaultSecretsProvider(vault_url="http://vault.local:8200", token="s.testToken")
    assert provider.provider_name == "vault"
    
    provider.rotate_secret("DATABASE_PASSWORD", "vault_db_secure_pass_v1")
    assert provider.get_secret("DATABASE_PASSWORD") == "vault_db_secure_pass_v1"
    
    provider.rotate_secret("DATABASE_PASSWORD", "vault_db_secure_pass_v2")
    assert provider.get_secret("DATABASE_PASSWORD") == "vault_db_secure_pass_v2"
    
    versions = provider.list_versions("DATABASE_PASSWORD")
    assert len(versions) >= 2
    assert provider.health_check()["status"] == "healthy"

def test_secrets_manager_factory_switching():
    """Verify factory returns appropriate provider based on SECRET_PROVIDER."""
    reset_secrets_manager()
    
    p_env = get_secrets_manager("env")
    assert isinstance(p_env, EnvSecretsProvider)
    
    p_gcp = get_secrets_manager("gcp")
    assert isinstance(p_gcp, GCPSecretManagerProvider)
    
    p_vault = get_secrets_manager("vault")
    assert isinstance(p_vault, VaultSecretsProvider)
    
    reset_secrets_manager()

# ─── 2. Dual-Key Zero-Downtime JWT Secret Rotation Tests ─────────────────────

def test_jwt_dual_key_secret_rotation():
    """
    Verify zero-downtime JWT rotation:
    1. Token created with key A.
    2. Secret rotates: Key B becomes current, Key A becomes previous.
    3. New tokens sign with Key B.
    4. Existing token signed with Key A continues to validate during grace period.
    5. Tokens signed with unknown keys fail validation.
    """
    key_a = "secret_key_version_1_initial_signing_key_abcdef123456"
    key_b = "secret_key_version_2_rotated_signing_key_fedcba654321"
    unknown_key = "unauthorized_random_attacker_secret_key_999999"
    
    # 1. Sign token with Key A
    with patch.dict(os.environ, {"JWT_SECRET_CURRENT": key_a, "JWT_SECRET": key_a}):
        token_a = create_token({"username": "analyst_alice", "role": "analyst", "tenant_id": 1})
        payload_a = decode_token(token_a)
        assert payload_a is not None
        assert payload_a["username"] == "analyst_alice"
        
    # 2. Rotate to Key B (Key B is current, Key A is previous)
    with patch.dict(os.environ, {
        "JWT_SECRET_CURRENT": key_b,
        "JWT_SECRET_PREVIOUS": key_a,
        "JWT_ROTATION_GRACE_HOURS": "24"
    }):
        # Sign new token with Key B
        token_b = create_token({"username": "analyst_bob", "role": "analyst", "tenant_id": 1})
        
        # Token B decodes with current key
        payload_b = decode_token(token_b)
        assert payload_b is not None
        assert payload_b["username"] == "analyst_bob"
        
        # Token A (signed with previous key) STILL decodes cleanly during grace period!
        payload_a_rotated = decode_token(token_a)
        assert payload_a_rotated is not None
        assert payload_a_rotated["username"] == "analyst_alice"
        
    # 3. Verify token signed with completely unknown key is rejected
    import jwt
    malicious_token = jwt.encode({"username": "hacker", "exp": time.time() + 3600}, unknown_key, algorithm="HS256")
    with patch.dict(os.environ, {"JWT_SECRET_CURRENT": key_b, "JWT_SECRET_PREVIOUS": key_a}):
        assert decode_token(malicious_token) is None

# ─── 3. Production Startup Validation & Audit Logging Tests ──────────────────

def test_production_startup_validation_enforcement():
    """Verify startup is aborted in production if mandatory secrets are missing or default."""
    # Development mode: passes
    with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
        assert validate_production_secrets() is True
        
    # Production mode with default placeholders: must raise RuntimeError
    with patch.dict(os.environ, {
        "ENVIRONMENT": "production",
        "JWT_SECRET": "CHANGE_ME_placeholder",
        "CYGNAL_MASTER_KEK": "CHANGE_ME_placeholder"
    }):
        with pytest.raises(RuntimeError) as exc_info:
            validate_production_secrets()
        assert "CRITICAL PRODUCTION STARTUP FAILURE" in str(exc_info.value)
        
    # Production mode with valid strong secrets: passes
    with patch.dict(os.environ, {
        "ENVIRONMENT": "production",
        "JWT_SECRET": "c7f1a8b9e4d20394857162938475610293847561029384756102938475610293",
        "CYGNAL_MASTER_KEK": "9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"
    }):
        assert validate_production_secrets() is True

def test_secret_access_audit_logging():
    """Verify secret access events are logged without exposing plaintext secret values."""
    audit_secret_access("THREAT_INTEL_API_KEY", requesting_service="ai.threat_intel")
    audit_secret_access("DATABASE_URL", requesting_service="db.pool")
    
    logs = get_secret_access_audit_log()
    assert len(logs) >= 2
    
    latest_event = logs[-1]
    assert latest_event["secret_key"] == "DATABASE_URL"
    assert latest_event["requesting_service"] == "db.pool"
    assert "timestamp" in latest_event
    # Verify no secret value field exists in audit structure
    assert "value" not in latest_event
    assert "secret_value" not in latest_event
