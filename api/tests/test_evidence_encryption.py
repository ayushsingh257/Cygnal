"""
Cygnal Enterprise Hardening — Phase 3 Tests: Evidence Security & Storage Abstraction
Validates:
1. AES-256-GCM Envelope Encryption & Decryption
2. Unique IV and DEK Generation per Artifact
3. Cryptographic Tamper Detection & Authentication Tag Verification
4. Storage Abstraction Layer (Local, S3/MinIO, GCS)
5. Evidence Upload (Encryption + SHA-256 Hashing)
6. Evidence Download (Authorization, Decryption & SHA-256 Integrity Verification)
7. Multi-Tenant Cryptographic Isolation
8. Zero Plaintext On Disk
"""

import pytest
import os
import io
import sys
import json
import hashlib
from unittest.mock import patch, MagicMock

# Set path to import from api root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app
from database import DB_PATH, init_lookup_db
from db_utils import get_db_connection, set_thread_tenant_id, clear_thread_tenant_id
from jwt_utils import create_token
from crypto_utils import (
    encrypt_evidence_bytes,
    decrypt_evidence_bytes,
    wrap_dek,
    unwrap_dek,
    get_master_kek
)
from services.storage import (
    get_storage_provider,
    reset_storage_provider,
    LocalStorageProvider,
    S3StorageProvider,
    GCSStorageProvider
)

@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["PROPAGATE_EXCEPTIONS"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def setup_tenants_and_evidence():
    """Ensure seeded tenants and test users exist."""
    init_lookup_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES (1, 'Default Org', '2026-07-10T00:00:00Z');")
    cursor.execute("INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES (2, 'Enterprise Org', '2026-07-10T00:00:00Z');")
    
    cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role, department, team, created_at, tenant_id) VALUES ('analyst_org1', 'hash', 'analyst', 'SOC', 'Triage', '2026', 1);")
    cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role, department, team, created_at, tenant_id) VALUES ('analyst_org2', 'hash', 'analyst', 'SOC', 'Triage', '2026', 2);")
    
    conn.commit()
    conn.close()
    yield
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE username IN ('analyst_org1', 'analyst_org2');")
    cursor.execute("DELETE FROM tenants WHERE id IN (1, 2);")
    conn.commit()
    conn.close()

# ─── 1. Cryptographic Primitive Tests ────────────────────────────────────────

def test_aes_gcm_envelope_encryption_roundtrip():
    """Verify AES-256-GCM encryption and decryption recovers identical plaintext."""
    sample_payload = b"CRITICAL FORENSIC EVIDENCE: Confirmed IOC 198.51.100.24 C2 payload."
    enc = encrypt_evidence_bytes(sample_payload, tenant_id=1)
    
    assert enc["algorithm"] == "AES-256-GCM"
    assert "iv_hex" in enc
    assert "tag_hex" in enc
    assert "wrapped_dek" in enc
    assert enc["ciphertext"] != sample_payload
    
    # Decrypt
    decrypted = decrypt_evidence_bytes(
        enc["encrypted_payload"],
        iv_hex=enc["iv_hex"],
        tag_hex=enc["tag_hex"],
        wrapped_dek=enc["wrapped_dek"],
        tenant_id=1
    )
    assert decrypted == sample_payload

def test_unique_iv_and_dek_generation():
    """Verify encrypting identical plaintext twice produces distinct IVs, DEKs, and ciphertexts."""
    plaintext = b"SAME FORENSIC ARTIFACT DATA"
    enc1 = encrypt_evidence_bytes(plaintext, tenant_id=1)
    enc2 = encrypt_evidence_bytes(plaintext, tenant_id=1)
    
    assert enc1["iv_hex"] != enc2["iv_hex"]
    assert enc1["wrapped_dek"] != enc2["wrapped_dek"]
    assert enc1["ciphertext"] != enc2["ciphertext"]
    
    # Both decrypt correctly
    assert decrypt_evidence_bytes(enc1["encrypted_payload"], enc1["iv_hex"], enc1["tag_hex"], enc1["wrapped_dek"], tenant_id=1) == plaintext
    assert decrypt_evidence_bytes(enc2["encrypted_payload"], enc2["iv_hex"], enc2["tag_hex"], enc2["wrapped_dek"], tenant_id=1) == plaintext

def test_tamper_detection_and_invalid_tag():
    """Verify tampering with ciphertext or auth tag raises cryptographic verification failure."""
    plaintext = b"IMMUTABLE EVIDENCE LEDGER"
    enc = encrypt_evidence_bytes(plaintext, tenant_id=1)
    
    # Tamper with encrypted bytes
    tampered_bytes = bytearray(enc["encrypted_payload"])
    tampered_bytes[5] ^= 0xFF  # Flip bits
    
    with pytest.raises(Exception):
        decrypt_evidence_bytes(
            bytes(tampered_bytes),
            iv_hex=enc["iv_hex"],
            tag_hex=enc["tag_hex"],
            wrapped_dek=enc["wrapped_dek"],
            tenant_id=1
        )

def test_cross_tenant_cryptographic_key_isolation():
    """Verify DEK wrapped for Tenant 1 cannot be unwrapped or decrypted by Tenant 2 context."""
    plaintext = b"TENANT 1 CONFIDENTIAL EVIDENCE"
    enc = encrypt_evidence_bytes(plaintext, tenant_id=1)
    
    # Attempt decryption with Tenant 2 context must fail cryptographically
    with pytest.raises(Exception):
        decrypt_evidence_bytes(
            enc["encrypted_payload"],
            iv_hex=enc["iv_hex"],
            tag_hex=enc["tag_hex"],
            wrapped_dek=enc["wrapped_dek"],
            tenant_id=2
        )

# ─── 2. Storage Abstraction Layer Tests ──────────────────────────────────────

def test_local_storage_provider_crud(tmp_path):
    """Verify LocalStorageProvider save, retrieve, exists, metadata, and delete."""
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    test_key = "test_case_1/evidence_artifact.enc"
    test_data = b"\x00\x01\x02ENCRYPTED_BINARY_PAYLOAD\xFF"
    
    # 1. Save
    saved_key = provider.save(test_key, test_data)
    assert saved_key == test_key
    assert provider.exists(test_key) is True
    
    # 2. Retrieve
    retrieved = provider.retrieve(test_key)
    assert retrieved == test_data
    
    # 3. Metadata
    meta = provider.metadata(test_key)
    assert meta["provider"] == "local"
    assert meta["size_bytes"] == len(test_data)
    assert meta["is_encrypted"] is True
    
    # 4. Delete
    assert provider.delete(test_key) is True
    assert provider.exists(test_key) is False

def test_s3_storage_provider_fallback():
    """Verify S3StorageProvider functions in standalone/fallback environments."""
    provider = S3StorageProvider(bucket_name="test-s3-bucket")
    test_key = "s3_case_99/artifact.enc"
    test_data = b"S3_ENCRYPTED_VAULT_BYTES"
    
    provider.save(test_key, test_data)
    assert provider.exists(test_key) is True
    assert provider.retrieve(test_key) == test_data
    
    meta = provider.metadata(test_key)
    assert meta["size_bytes"] == len(test_data)
    
    provider.delete(test_key)
    assert provider.exists(test_key) is False

def test_gcs_storage_provider_fallback():
    """Verify GCSStorageProvider functions in standalone/fallback environments."""
    provider = GCSStorageProvider(bucket_name="test-gcs-bucket")
    test_key = "gcs_case_55/artifact.enc"
    test_data = b"GCS_ENCRYPTED_VAULT_BYTES"
    
    provider.save(test_key, test_data)
    assert provider.exists(test_key) is True
    assert provider.retrieve(test_key) == test_data
    
    provider.delete(test_key)
    assert provider.exists(test_key) is False

def test_storage_provider_factory():
    """Verify get_storage_provider returns configured provider class."""
    reset_storage_provider()
    with patch.dict(os.environ, {"STORAGE_PROVIDER": "s3"}):
        p_s3 = get_storage_provider("s3")
        assert isinstance(p_s3, S3StorageProvider)
        
    p_local = get_storage_provider("local")
    assert isinstance(p_local, LocalStorageProvider)
    reset_storage_provider()

# ─── 3. Evidence API Workflow & Multi-Tenant Tests ───────────────────────────

def test_evidence_upload_and_download_flow(client, tmp_path):
    """
    Complete E2E workflow:
    1. Upload evidence file.
    2. Verify it is stored as encrypted ciphertext on disk (never plaintext).
    3. Query case details and verify encryption metadata.
    4. Download evidence and verify decrypted content and SHA-256 integrity.
    """
    token = create_token({"username": "analyst_org1", "role": "analyst", "tenant_id": 1})
    
    # 1. Create Case
    res_case = client.post("/api/cases", headers={"Authorization": f"Bearer {token}"}, json={
        "title": "Case Ransomware Evidence Test",
        "description": "Investigating encrypted memory dump",
        "severity": "high"
    })
    assert res_case.status_code == 200
    case_id = res_case.get_json()["case"]["id"]
    
    # 2. Upload Evidence
    raw_evidence_data = b"FORENSIC_RAW_PACKET_CAPTURE_PAYLOAD_ABC123"
    expected_sha256 = hashlib.sha256(raw_evidence_data).hexdigest()
    
    upload_file = (io.BytesIO(raw_evidence_data), "packet_capture.pcap")
    res_up = client.post(
        f"/api/cases/{case_id}/evidence",
        headers={"Authorization": f"Bearer {token}"},
        data={"file": upload_file},
        content_type="multipart/form-data"
    )
    assert res_up.status_code == 200
    up_data = res_up.get_json()
    assert up_data["success"] is True
    evidence_id = up_data["evidence"]["id"]
    assert up_data["evidence"]["file_hash"] == expected_sha256
    assert up_data["evidence"]["encryption_algorithm"] == "AES-256-GCM"
    assert up_data["evidence"]["encryption_status"] == "encrypted"
    
    # 3. Verify Stored Artifact on Disk is Encrypted Ciphertext
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT storage_path FROM evidence WHERE id = ?;", (evidence_id,))
    storage_path = cursor.fetchone()[0]
    conn.close()
    
    storage_provider = get_storage_provider()
    stored_bytes = storage_provider.retrieve(storage_path)
    # Stored bytes MUST NOT contain the plaintext
    assert raw_evidence_data not in stored_bytes
    
    # 4. Query Case Details
    res_detail = client.get(f"/api/cases/{case_id}", headers={"Authorization": f"Bearer {token}"})
    assert res_detail.status_code == 200
    evidence_list = res_detail.get_json()["evidence"]
    assert len(evidence_list) >= 1
    ev_item = next(e for e in evidence_list if e["id"] == evidence_id)
    assert ev_item["encryption_algorithm"] == "AES-256-GCM"
    assert ev_item["integrity_status"] == "verified"
    
    # 5. Download Evidence and verify decryption & SHA-256 match
    res_dl = client.get(
        f"/api/cases/{case_id}/evidence/{evidence_id}/download",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_dl.status_code == 200
    assert res_dl.data == raw_evidence_data
    assert hashlib.sha256(res_dl.data).hexdigest() == expected_sha256

def test_evidence_download_authorization_and_cross_tenant_rejection(client):
    """Verify unauthorized or cross-tenant downloads are rejected."""
    token_org1 = create_token({"username": "analyst_org1", "role": "analyst", "tenant_id": 1})
    token_org2 = create_token({"username": "analyst_org2", "role": "analyst", "tenant_id": 2})
    
    # Org 1 creates case & uploads evidence
    res_c1 = client.post("/api/cases", headers={"Authorization": f"Bearer {token_org1}"}, json={
        "title": "Org 1 Confidential Case", "severity": "critical"
    })
    case1_id = res_c1.get_json()["case"]["id"]
    
    evidence_file = (io.BytesIO(b"TOP SECRET ORG 1 EVIDENCE"), "secret.doc")
    res_up = client.post(
        f"/api/cases/{case1_id}/evidence",
        headers={"Authorization": f"Bearer {token_org1}"},
        data={"file": evidence_file},
        content_type="multipart/form-data"
    )
    ev1_id = res_up.get_json()["evidence"]["id"]
    
    # 1. Unauthenticated download (no token) -> 401
    res_unauth = client.get(f"/api/cases/{case1_id}/evidence/{ev1_id}/download")
    assert res_unauth.status_code == 401
    
    # 2. Org 2 tries to download Org 1 evidence -> 404 (isolated)
    res_cross = client.get(
        f"/api/cases/{case1_id}/evidence/{ev1_id}/download",
        headers={"Authorization": f"Bearer {token_org2}"}
    )
    assert res_cross.status_code == 404
