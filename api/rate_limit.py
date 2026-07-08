"""
Simple in-memory rate limiter for authentication endpoints.
Tracks failed login/registration attempts per IP address.
"""

import time
from functools import wraps
from flask import request, jsonify, current_app
from collections import defaultdict

# Track attempts: {key: [(timestamp, attempt_count)]}
_rate_limit_store = defaultdict(list)

# Configuration
MAX_ATTEMPTS_PER_WINDOW = 5  # Max attempts
WINDOW_SECONDS = 300  # 5-minute window
LOCKOUT_SECONDS = 900  # 15-minute lockout after exceeding limit

def get_client_ip():
    """Extract client IP from request (handles proxies)."""
    if request.headers.getlist("X-Forwarded-For"):
        return request.headers.getlist("X-Forwarded-For")[0]
    return request.remote_addr or "unknown"

def is_rate_limited(key: str) -> bool:
    """Check if client is rate limited."""
    now = time.time()
    
    if key not in _rate_limit_store:
        return False
    
    # Remove old entries outside the window
    _rate_limit_store[key] = [
        (ts, count) for ts, count in _rate_limit_store[key]
        if now - ts < WINDOW_SECONDS
    ]
    
    # If no recent attempts, not limited
    if not _rate_limit_store[key]:
        return False
    
    # Check if in lockout period (last attempt was recent and limit was exceeded)
    if len(_rate_limit_store[key]) >= MAX_ATTEMPTS_PER_WINDOW:
        last_attempt_time = _rate_limit_store[key][-1][0]
        if now - last_attempt_time < LOCKOUT_SECONDS:
            return True
    
    return False

def record_attempt(key: str):
    """Record an authentication attempt."""
    now = time.time()
    _rate_limit_store[key].append((now, 1))
    
    # Cleanup old entries
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
