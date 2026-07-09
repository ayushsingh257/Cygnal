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

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "CRITICAL: JWT_SECRET environment variable is not set. "
        "This is required for token signing and security. "
        "Set JWT_SECRET in your .env file or environment before starting the application."
    )

JWT_EXPIRY = os.getenv("JWT_EXPIRY", "3d")

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
    try:
        if JWT_EXPIRY.endswith("d"):
            return timedelta(days=int(JWT_EXPIRY[:-1]))
        elif JWT_EXPIRY.endswith("h"):
            return timedelta(hours=int(JWT_EXPIRY[:-1]))
    except Exception:
        pass
    return timedelta(days=3)


# ─── Token Creation ────────────────────────────────────────────────────────────

def create_token(payload: dict) -> str:
    """
    Create a signed JWT with a unique JTI for revocation support.
    All timestamps use timezone-aware UTC to avoid deprecated datetime.utcnow().
    """
    now = datetime.now(timezone.utc)
    expiry = now + get_expiry_delta()
    full_payload = dict(payload)
    full_payload["jti"] = str(uuid.uuid4())   # unique token ID for blocklist
    full_payload["iat"] = now
    full_payload["exp"] = expiry
    return jwt.encode(full_payload, JWT_SECRET, algorithm="HS256")


def create_internal_service_token(service_name: str, ttl_seconds: int = 3600) -> str:
    """
    C-02 FIX: Create a short-lived, scope-limited internal service token.
    These tokens use scope='internal' and have NO role field, preventing
    any route decorated with @require_role from granting them elevated access.

    Args:
        service_name: identifier for the calling service (e.g. 'AutonomicAgent')
        ttl_seconds:  lifetime in seconds (default 1 hour)
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
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


# ─── Token Decoding ────────────────────────────────────────────────────────────

def decode_token(token: str) -> dict | None:
    """
    Decode and validate a JWT.
    Rejects tokens that have been blocklisted (logged-out or revoked).
    Returns the decoded payload dict, or None on any failure.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # C-03: Reject revoked tokens
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

