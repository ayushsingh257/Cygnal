"""
Cygnal Centralized Auth Middleware — Production Hardening
Provides reusable decorators for authentication and role-based access control (RBAC).
Eliminates the copy-pasted get_current_user() pattern found in every blueprint.
"""

from functools import wraps
from flask import request, jsonify
from jwt_utils import decode_token


def get_current_user():
    """
    Extract and validate the JWT from the Authorization header.
    Returns the decoded payload dict on success, or None if invalid/missing.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        return None
    try:
        decoded = decode_token(token)
        return decoded
    except Exception:
        return None


def get_username() -> str:
    """
    Convenience helper: returns the username string from the JWT or 'unknown'.
    """
    payload = get_current_user()
    if payload:
        return payload.get("username", "unknown")
    return "unknown"


def require_auth(f):
    """
    Decorator: requires a valid JWT token.
    Injects `current_user` (the decoded payload dict) as a kwarg to the endpoint.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        payload = get_current_user()
        if not payload:
            return jsonify({
                "success": False,
                "error": "Authentication required. Provide a valid Bearer token."
            }), 401
        kwargs["current_user"] = payload
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles):
    """
    Decorator: requires a valid JWT AND the user's role to be in allowed_roles.
    Must be stacked AFTER @require_auth (which injects current_user as kwarg).

    Usage:
        @blueprint.route("/admin/something")
        @require_auth
        @require_role("admin", "soc_manager")
        def admin_only_endpoint(current_user):
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if not current_user:
                return jsonify({
                    "success": False,
                    "error": "Authentication required."
                }), 401
            user_role = current_user.get("role", "")
            if user_role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": f"Insufficient privileges. Required: {', '.join(allowed_roles)}."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
