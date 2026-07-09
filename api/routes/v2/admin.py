"""
Cygnal Admin Routes — Production Hardening Phase B
B-03 FIX: Real audit logging backend.
Provides:
  - GET  /api/admin/audit       — Paginated audit log feed (admin only)
  - POST /api/admin/audit       — Write a structured audit log entry
  - GET  /api/admin/users       — List all users (admin only)
  - GET  /api/health            — Health check endpoint (public, for load balancers)
  - GET  /api/ready             — Readiness check endpoint (public)
"""

import uuid
import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from db_utils import get_db_connection
from auth_middleware import require_auth, require_role

admin_bp = Blueprint("admin_bp", __name__)


# ─── Health / Readiness Endpoints (B-07) ──────────────────────────────────────

@admin_bp.route("/health", methods=["GET"])
def health():
    """
    B-07 FIX: Health check endpoint for load balancers and container orchestration.
    Always returns 200 if the process is alive.
    """
    return jsonify({
        "status": "healthy",
        "service": "cygnal-backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@admin_bp.route("/ready", methods=["GET"])
def ready():
    """
    B-07 FIX: Readiness check endpoint. Verifies database connectivity.
    Returns 200 if the app is ready to serve traffic, 503 otherwise.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        conn.close()
        return jsonify({
            "status": "ready",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "not_ready",
            "database": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 503


# ─── Audit Log Backend (B-03) ─────────────────────────────────────────────────

def _ensure_audit_table():
    """Ensure the audit_log table exists. Called lazily."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            actor TEXT NOT NULL,
            target TEXT,
            details TEXT,
            ip_address TEXT,
            timestamp TEXT NOT NULL
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log(timestamp);")
    conn.commit()
    conn.close()


def write_audit_log(action: str, actor: str, target: str = None, details: dict = None, ip_address: str = None):
    """
    Write a structured audit log entry to the audit_log table.
    Call this from any route that performs a security-relevant action.

    Args:
        action:     What happened (e.g., 'user.login', 'case.delete', 'admin.create_user')
        actor:      Username of the person performing the action
        target:     The resource being acted on (e.g., case_id, username)
        details:    Additional context dict (will be JSON-encoded)
        ip_address: Client IP address
    """
    try:
        _ensure_audit_table()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_log (id, action, actor, target, details, ip_address, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            str(uuid.uuid4()),
            action,
            actor,
            target,
            json.dumps(details) if details else None,
            ip_address,
            datetime.now(timezone.utc).isoformat()
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        import logging
        logging.error(f"[AUDIT LOG WRITE ERROR] {str(e)}")


@admin_bp.route("/admin/audit", methods=["GET"])
@require_auth
@require_role("admin", "director", "soc_manager")
def get_audit_log(current_user):
    """
    B-03 FIX: Real audit log backend. Returns paginated audit entries from the database.
    This replaces the frontend mock data that was previously displayed.
    Requires admin, director, or soc_manager role.
    """
    _ensure_audit_table()

    limit = min(request.args.get("limit", 50, type=int), 200)
    offset = request.args.get("offset", 0, type=int)
    actor_filter = request.args.get("actor")
    action_filter = request.args.get("action")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = "SELECT id, action, actor, target, details, ip_address, timestamp FROM audit_log"
        params = []
        conditions = []

        if actor_filter:
            conditions.append("actor = ?")
            params.append(actor_filter)
        if action_filter:
            conditions.append("action LIKE ?")
            params.append(f"%{action_filter}%")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Count total matching records for pagination
        count_query = "SELECT COUNT(*) FROM audit_log"
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions)
        cursor.execute(count_query, params[:-2] if params else [])
        total = cursor.fetchone()[0]

        conn.close()

        entries = []
        for row in rows:
            entries.append({
                "id": row[0],
                "action": row[1],
                "actor": row[2],
                "target": row[3],
                "details": json.loads(row[4]) if row[4] else None,
                "ip_address": row[5],
                "timestamp": row[6]
            })

        return jsonify({
            "success": True,
            "audit_log": entries,
            "total": total,
            "limit": limit,
            "offset": offset
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500


@admin_bp.route("/admin/audit", methods=["POST"])
@require_auth
def log_audit_event(current_user):
    """
    Write a structured audit event. Any authenticated user can log events.
    Used by frontend to record significant user actions.
    """
    data = request.get_json(silent=True) or {}
    action = data.get("action", "").strip()
    target = data.get("target", "")
    details = data.get("details")

    if not action:
        return jsonify({"success": False, "error": "Action field is required."}), 400

    actor = current_user.get("username", "unknown")
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")

    write_audit_log(action=action, actor=actor, target=target, details=details, ip_address=ip)

    return jsonify({"success": True, "message": "Audit event recorded."})


# ─── Admin User Management ────────────────────────────────────────────────────

@admin_bp.route("/admin/users", methods=["GET"])
@require_auth
@require_role("admin", "director", "soc_manager")
def list_users(current_user):
    """List all registered users. Requires admin/director/soc_manager role."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT username, role, department, team, created_at, mfa_enabled
            FROM users ORDER BY created_at DESC;
        """)
        rows = cursor.fetchall()
        conn.close()

        users = []
        for r in rows:
            users.append({
                "username": r[0],
                "role": r[1],
                "department": r[2],
                "team": r[3],
                "created_at": r[4],
                "mfa_enabled": bool(r[5]) if r[5] is not None else False
            })

        return jsonify({"success": True, "users": users, "total": len(users)})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500
