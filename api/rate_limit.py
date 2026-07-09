"""
Cygnal Rate Limiting — Production Hardening Phase B
B-01 FIX: Distributed Redis-based rate limiting.
Tracks failed authentication attempts. Uses a Redis Sorted Set for sliding window
tracking, with automatic fallback to local in-memory tracking if Redis is offline.
"""

import os
import time
from functools import wraps
from flask import request, jsonify, current_app
from collections import defaultdict

# Local fallback store
_rate_limit_store = defaultdict(list)

# Configuration
MAX_ATTEMPTS_PER_WINDOW = 5  # Max attempts
WINDOW_SECONDS = 300  # 5-minute window
LOCKOUT_SECONDS = 900  # 15-minute lockout after exceeding limit


def _get_redis():
    """Return an active Redis connection if REDIS_URL is configured, else None."""
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


def get_client_ip():
    """Extract client IP from request (handles proxies)."""
    if request.headers.getlist("X-Forwarded-For"):
        return request.headers.getlist("X-Forwarded-For")[0]
    return request.remote_addr or "unknown"


def is_rate_limited(key: str) -> bool:
    """Check if client is currently rate limited."""
    now = time.time()
    
    # ─── Redis Sorted Set Implementation ───
    r = _get_redis()
    if r:
        try:
            redis_key = f"cygnal:rate_limit:{key}"
            # Remove attempts older than WINDOW_SECONDS
            r.zremrangebyscore(redis_key, 0, now - WINDOW_SECONDS)
            # Count remaining attempts in the window
            count = r.zcard(redis_key)
            if count >= MAX_ATTEMPTS_PER_WINDOW:
                # Check timestamp of the last attempt to enforce lockout
                last_attempts = r.zrange(redis_key, -1, -1, withscores=True)
                if last_attempts:
                    last_ts = last_attempts[0][1]
                    if now - last_ts < LOCKOUT_SECONDS:
                        return True
            return False
        except Exception:
            # Fail-open to in-memory fallback on Redis connectivity errors
            pass

    # ─── In-Memory Fallback ───
    if key not in _rate_limit_store:
        return False
    
    # Remove old entries outside the window
    _rate_limit_store[key] = [
        (ts, count) for ts, count in _rate_limit_store[key]
        if now - ts < WINDOW_SECONDS
    ]
    
    if not _rate_limit_store[key]:
        return False
    
    if len(_rate_limit_store[key]) >= MAX_ATTEMPTS_PER_WINDOW:
        last_attempt_time = _rate_limit_store[key][-1][0]
        if now - last_attempt_time < LOCKOUT_SECONDS:
            return True
    
    return False


def record_attempt(key: str):
    """Record an authentication attempt."""
    now = time.time()
    
    # ─── Redis Implementation ───
    r = _get_redis()
    if r:
        try:
            redis_key = f"cygnal:rate_limit:{key}"
            # Add timestamp as member and score
            r.zadd(redis_key, {str(now): now})
            # Ensure key expires from Redis eventually
            r.expire(redis_key, WINDOW_SECONDS + LOCKOUT_SECONDS)
            return
        except Exception:
            pass

    # ─── In-Memory Fallback ───
    _rate_limit_store[key].append((now, 1))
    _rate_limit_store[key] = [
        (ts, count) for ts, count in _rate_limit_store[key]
        if now - ts < WINDOW_SECONDS + LOCKOUT_SECONDS
    ]


def rate_limit_auth(f):
    """Decorator to apply rate limiting to auth endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Bypass rate limiting in testing mode to prevent lockouts during test execution
        if current_app and current_app.config.get("TESTING"):
            return f(*args, **kwargs)
            
        client_key = f"{get_client_ip()}:{request.path}"
        
        # Check if rate limited
        if is_rate_limited(client_key):
            return jsonify({
                "success": False,
                "error": "Too many failed authentication attempts. Please try again later."
            }), 429  # Too Many Requests
        
        # Execute the function
        result = f(*args, **kwargs)
        
        # If response is an error response (401, 400, etc.), record the attempt
        if isinstance(result, tuple) and len(result) > 1 and result[1] >= 400:
            record_attempt(client_key)
        
        return result
    
    return decorated_function

