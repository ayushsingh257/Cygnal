import os
import base64
from cryptography.fernet import Fernet
from hashlib import sha256

_encryption_key = None

def get_encryption_key():
    global _encryption_key
    if not _encryption_key:
        jwt_secret = os.getenv("JWT_SECRET", "default_cygnal_secret_fallback_key")
        # Fernet requires a 32-byte url-safe base64 encoded key
        hashed = sha256(jwt_secret.encode()).digest()
        _encryption_key = base64.urlsafe_b64encode(hashed)
    return _encryption_key

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
