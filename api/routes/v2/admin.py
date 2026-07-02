from flask import Blueprint, request, jsonify
import logging
import os
import json
from jwt_utils import decode_token
from auth_utils import verify_token
from database import get_all_users, update_user_role, delete_user_by_username
from intel_bridge import query_intel_bridge
from audit_logger import audit_log

admin_bp = Blueprint("admin_bp", __name__)

def verify_admin_role(req):
    """Helper to verify that the request is authenticated and user is an admin."""
    auth_header = req.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "admin":
        return None
    return payload

@admin_bp.route("/admin/users", methods=["GET"])
def get_users():
    try:
        payload = verify_admin_role(request)
        if not payload:
            return jsonify({"success": False, "error": "Unauthorized. Admins only."}), 403

        users = get_all_users()
        return jsonify({"success": True, "users": users})
    except Exception as e:
        logging.error(f"Error fetching users: {e}")
        return jsonify({"success": False, "error": "Failed to fetch users"}), 500


@admin_bp.route("/admin/users/<username>", methods=["PATCH"])
def update_user(username):
    try:
        payload = verify_admin_role(request)
        if not payload:
            return jsonify({"success": False, "error": "Unauthorized"}), 403

        if payload.get("username") == username:
            return jsonify({"success": False, "error": "You cannot change your own role"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing parameters"}), 400
        new_role = data.get("role")
        if new_role not in ["admin", "analyst", "viewer"]:
            return jsonify({"success": False, "error": "Invalid role"}), 400

        success = update_user_role(username, new_role)
        if success:
            return jsonify({"success": True, "message": "User role updated"})
        else:
            return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        logging.error(f"Error updating user role: {e}")
        return jsonify({"success": False, "error": "Failed to update role"}), 500


@admin_bp.route("/admin/users/<username>", methods=["DELETE"])
def delete_user(username):
    try:
        payload = verify_admin_role(request)
        if not payload:
            return jsonify({"success": False, "error": "Unauthorized"}), 403

        if payload.get("username") == username:
            return jsonify({"success": False, "error": "You cannot delete yourself"}), 400

        if username == "Ayush Singh":
            return jsonify({"success": False, "error": "Cannot delete primary admin"}), 400

        success = delete_user_by_username(username)
        if success:
            return jsonify({"success": True, "message": "User deleted"})
        else:
            return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting user: {e}")
        return jsonify({"success": False, "error": "Failed to delete user"}), 500


@admin_bp.route("/get-audit-logs", methods=["GET"])
def get_audit_logs():
    try:
        payload = verify_admin_role(request)
        if not payload:
            return jsonify({"success": False, "error": "Access denied. Admins only."}), 403

        audit_path = "audit_logs/audit_log.json"
        if not os.path.exists(audit_path):
            return jsonify({"success": True, "logs": []})

        with open(audit_path, "r", encoding="utf-8") as f:
            logs = [json.loads(line) for line in f if line.strip()]

        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        logging.error(f"Failed to fetch audit logs: {e}")
        return jsonify({"success": False, "error": "Failed to fetch audit logs"}), 500


@admin_bp.route("/intel-bridge", methods=["POST"])
def custom_intel_bridge():
    try:
        payload = verify_admin_role(request)
        if not payload:
            return jsonify({"success": False, "error": "Access denied. Admins only."}), 403

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing parameters"}), 400
        indicator = data.get("indicator", "").strip()
        if not indicator:
            return jsonify({"success": False, "error": "Missing threat indicator"}), 400

        user = payload.get("username", "unknown")
        ip = request.remote_addr
        result = query_intel_bridge(indicator, user, ip)

        # Log audit event
        audit_log("Intel Bridge", user, {"indicator": indicator}, result)

        return jsonify({"success": True, "result": result})
    except Exception as e:
        logging.error(f"Intel Bridge lookup failed: {e}")
        return jsonify({"success": False, "error": f"Intel Bridge lookup failed: {str(e)}"}), 500
