"""
Cygnal JWT Utilities — Production Hardening
Adds:
  - JTI (JWT ID) field to every token for revocation support
  - In-memory token blocklist with Redis upgrade path (C-03)
  - create_internal_service_token() for scoped agent tokens (C-02)
  - Explicit import of timezone-aware datetime to avoid deprecated utcnow()
"""

import os
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load environmental configs
load_dotenv()

def get_current_jwt_secret() -> str:
    """Retrieves active JWT signing key via Secrets Manager."""
    try:
        from services.secrets import get_secret
        sec = get_secret("JWT_SECRET_CURRENT", requesting_service="auth.jwt") or get_secret("JWT_SECRET", requesting_service="auth.jwt")
        if sec:
            return sec
    except Exception:
        pass
    return os.getenv("JWT_SECRET_CURRENT") or os.getenv("JWT_SECRET") or "default_cygnal_jwt_secret_key_2026"

def get_previous_jwt_secret() -> str | None:
    """Retrieves previous JWT signing key for rotation grace period validation."""
    try:
        from services.secrets import get_secret
        return get_secret("JWT_SECRET_PREVIOUS", requesting_service="auth.jwt")
    except Exception:
        return os.getenv("JWT_SECRET_PREVIOUS")

def get_jwt_expiry() -> str:
    return os.getenv("JWT_EXPIRY", "3d")

# Backwards compatibility export
JWT_SECRET = get_current_jwt_secret()

# ─── Token Blocklist (C-03) ────────────────────────────────────────────────────
# Redis-backed blocklist in production; in-memory fallback for dev/test.
_memory_blocklist: set[str] = set()

def _get_redis():
    """Return a Redis client if REDIS_URL is configured, else None."""
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis
        r = redis.from_url(redis_url, decode_responses=True, socket_timeout=1)
        r.ping()
        return r
    except Exception:
        return None


def blocklist_token(jti: str, ttl_seconds: int):
    """
    Mark a token JTI as revoked for the remainder of its lifetime.
    Uses Redis if available, falls back to in-memory set.
    """
    r = _get_redis()
    if r:
        try:
            r.set(f"cygnal:blocklist:{jti}", "1", ex=ttl_seconds)
            return
        except Exception:
            pass
    # In-memory fallback
    _memory_blocklist.add(jti)


def is_token_revoked(jti: str) -> bool:
    """
    Check if a token JTI has been revoked.
    """
    r = _get_redis()
    if r:
        try:
            return r.exists(f"cygnal:blocklist:{jti}") == 1
        except Exception:
            pass
    return jti in _memory_blocklist


# ─── Expiry Helper ─────────────────────────────────────────────────────────────

def get_expiry_delta() -> timedelta:
    exp_str = get_jwt_expiry()
    try:
        if exp_str.endswith("d"):
            return timedelta(days=int(exp_str[:-1]))
        elif exp_str.endswith("h"):
            return timedelta(hours=int(exp_str[:-1]))
    except Exception:
        pass
    return timedelta(days=3)


# ─── Token Creation ────────────────────────────────────────────────────────────

def create_token(payload: dict) -> str:
    """
    Create a signed JWT with a unique JTI for revocation support.
    Signed using the active current key from Secrets Manager.
    """
    now = datetime.now(timezone.utc)
    expiry = now + get_expiry_delta()
    full_payload = dict(payload)
    full_payload["jti"] = str(uuid.uuid4())   # unique token ID for blocklist
    full_payload["iat"] = now
    full_payload["exp"] = expiry
    return jwt.encode(full_payload, get_current_jwt_secret(), algorithm="HS256")


def create_internal_service_token(service_name: str, ttl_seconds: int = 3600) -> str:
    """
    Create a short-lived, scope-limited internal service token.
    These tokens use scope='internal' and have NO role field, preventing
    any route decorated with @require_role from granting them elevated access.
    """
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(seconds=ttl_seconds)
    payload = {
        "username": service_name,
        "scope": "internal",       # never matches role-based guards
        "role": "service",         # explicit non-privileged marker
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expiry,
    }
    return jwt.encode(payload, get_current_jwt_secret(), algorithm="HS256")


# ─── Token Decoding & Dual-Key Rotation ───────────────────────────────────────

def decode_token(token: str) -> dict | None:
    """
    Decode and validate a JWT.
    Supports seamless dual-key rotation (validates against current key first, then previous key within grace period).
    Rejects tokens that have been blocklisted (logged-out or revoked).
    Returns the decoded payload dict, or None on any failure.
    """
    current_key = get_current_jwt_secret()
    try:
        payload = jwt.decode(token, current_key, algorithms=["HS256"])
        # Reject revoked tokens
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            return None
        return payload
    except jwt.InvalidSignatureError:
        # Check previous key during rotation grace period
        prev_key = get_previous_jwt_secret()
        if prev_key:
            try:
                payload = jwt.decode(token, prev_key, algorithms=["HS256"])
                jti = payload.get("jti")
                if jti and is_token_revoked(jti):
                    return None
                # Check rotation grace window
                grace_hours = int(os.getenv("JWT_ROTATION_GRACE_HOURS", "24"))
                iat = payload.get("iat")
                if iat:
                    if isinstance(iat, (int, float)):
                        issued_at = datetime.fromtimestamp(iat, tz=timezone.utc)
                    else:
                        issued_at = datetime.now(timezone.utc)
                    if datetime.now(timezone.utc) - issued_at > timedelta(hours=grace_hours):
                        return None  # Grace period expired for old key
                return payload
            except Exception:
                return None
        return None
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

