import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from hashlib import sha256
from typing import Tuple, Dict, Any

_encryption_key = None
_master_kek = None

def get_encryption_key() -> bytes:
    """Returns a 32-byte url-safe base64 encoded Fernet key derived from JWT_SECRET."""
    global _encryption_key
    if not _encryption_key:
        jwt_secret = os.getenv("JWT_SECRET", "default_cygnal_secret_fallback_key")
        hashed = sha256(jwt_secret.encode()).digest()
        _encryption_key = base64.urlsafe_b64encode(hashed)
    return _encryption_key

def get_master_kek() -> bytes:
    """Returns a raw 32-byte Master Key Encryption Key (KEK) for AES-256-GCM DEK wrapping."""
    global _master_kek
    if not _master_kek:
        kek_secret = os.getenv("CYGNAL_MASTER_KEK", os.getenv("JWT_SECRET", "default_cygnal_master_kek_secret_key_2026"))
        _master_kek = sha256(kek_secret.encode()).digest()  # 32 bytes (256 bits)
    return _master_kek

def encrypt_secret(plaintext: str) -> str:
    """Encrypts plaintext using a key derived from JWT_SECRET."""
    if not plaintext:
        return ""
    fernet = Fernet(get_encryption_key())
    return fernet.encrypt(plaintext.encode()).decode()

def decrypt_secret(ciphertext: str) -> str:
    """Decrypts ciphertext using a key derived from JWT_SECRET."""
    if not ciphertext:
        return ""
    fernet = Fernet(get_encryption_key())
    return fernet.decrypt(ciphertext.encode()).decode()

# ─── AES-256-GCM Evidence Envelope Encryption ────────────────────────────────

def wrap_dek(dek: bytes, tenant_id: int = 1) -> str:
    """Wraps (encrypts) a Data Encryption Key using the Master KEK and tenant context."""
    master_key = get_master_kek()
    # Incorporate tenant_id into KEK derivation for cryptographic tenant key separation
    tenant_derived_kek = sha256(master_key + str(tenant_id).encode()).digest()
    aesgcm = AESGCM(tenant_derived_kek)
    iv = os.urandom(12)
    wrapped = aesgcm.encrypt(iv, dek, associated_data=str(tenant_id).encode())
    # Format: base64(iv + ciphertext_with_tag)
    return base64.b64encode(iv + wrapped).decode("utf-8")

def unwrap_dek(wrapped_dek_b64: str, tenant_id: int = 1) -> bytes:
    """Unwraps (decrypts) a Data Encryption Key using the Master KEK and tenant context."""
    master_key = get_master_kek()
    tenant_derived_kek = sha256(master_key + str(tenant_id).encode()).digest()
    raw = base64.b64decode(wrapped_dek_b64.encode("utf-8"))
    iv = raw[:12]
    wrapped_ciphertext = raw[12:]
    aesgcm = AESGCM(tenant_derived_kek)
    return aesgcm.decrypt(iv, wrapped_ciphertext, associated_data=str(tenant_id).encode())

def encrypt_evidence_bytes(plaintext: bytes, tenant_id: int = 1) -> Dict[str, Any]:
    """
    Encrypts evidence bytes using AES-256-GCM envelope encryption.
    Generates a unique 256-bit DEK and unique 96-bit IV per file.
    Returns encrypted ciphertext and metadata required for storage.
    """
    if not plaintext:
        plaintext = b""
    
    # 1. Generate unique 256-bit Data Encryption Key (DEK)
    dek = AESGCM.generate_key(bit_length=256)
    
    # 2. Generate unique 96-bit (12-byte) IV
    iv = os.urandom(12)
    
    # 3. Encrypt with AES-256-GCM
    aesgcm = AESGCM(dek)
    encrypted_with_tag = aesgcm.encrypt(iv, plaintext, associated_data=str(tenant_id).encode())
    
    # In AESGCM output, the last 16 bytes are the authentication tag
    ciphertext = encrypted_with_tag[:-16]
    tag = encrypted_with_tag[-16:]
    
    # 4. Wrap DEK
    wrapped_dek = wrap_dek(dek, tenant_id)
    
    return {
        "ciphertext": ciphertext,
        "iv_hex": iv.hex(),
        "tag_hex": tag.hex(),
        "wrapped_dek": wrapped_dek,
        "algorithm": "AES-256-GCM",
        "encrypted_payload": encrypted_with_tag  # ciphertext + tag combined for storage
    }

def decrypt_evidence_bytes(encrypted_payload: bytes, iv_hex: str, tag_hex: str, wrapped_dek: str, tenant_id: int = 1) -> bytes:
    """
    Decrypts encrypted evidence bytes using AES-256-GCM.
    Unwraps DEK and validates authentication tag.
    Raises InvalidTag if ciphertext, IV, or tag is tampered with.
    """
    # 1. Unwrap DEK
    dek = unwrap_dek(wrapped_dek, tenant_id)
    
    # 2. Reconstruct IV and complete encrypted payload with tag
    iv = bytes.fromhex(iv_hex)
    tag = bytes.fromhex(tag_hex)
    
    # If encrypted_payload doesn't already have the tag attached
    if not encrypted_payload.endswith(tag):
        full_payload = encrypted_payload + tag
    else:
        full_payload = encrypted_payload
        
    aesgcm = AESGCM(dek)
    return aesgcm.decrypt(iv, full_payload, associated_data=str(tenant_id).encode())

