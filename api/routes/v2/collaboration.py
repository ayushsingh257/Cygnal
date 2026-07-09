"""
Cygnal Collaboration APIs
Phase 4: Fetching user notifications, marking them read, and listing team roster users.
"""

from flask import Blueprint, request, jsonify
from auth_middleware import require_auth, get_username
from services.collaboration_service import get_user_notifications, mark_notifications_as_read
from db_utils import get_db_connection

collaboration_bp = Blueprint("collaboration_bp", __name__)

@collaboration_bp.route("/notifications", methods=["GET"])
def fetch_notifications():
    username = get_username()
    if username == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
        
    try:
        notifications = get_user_notifications(username)
        return jsonify({
            "success": True,
            "notifications": notifications
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@collaboration_bp.route("/notifications/read", methods=["POST"])
def read_notifications():
    username = get_username()
    if username == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
        
    data = request.json or {}
    notification_ids = data.get("ids")  # Expect a list of ids, or None for all
    
    try:
        mark_notifications_as_read(username, notification_ids)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@collaboration_bp.route("/roster", methods=["GET"])
def get_team_roster():
    """
    Roster route to fetch all users in the system (for assignment selection).
    Secured: Requires a valid authenticated investigator.
    """
    username = get_username()
    if username == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT username, role, department, team FROM users ORDER BY username ASC;")
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for r in rows:
            users.append({
                "username": r[0],
                "role": r[1],
                "department": r[2],
                "team": r[3]
            })
            
        return jsonify({
            "success": True,
            "users": users
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
