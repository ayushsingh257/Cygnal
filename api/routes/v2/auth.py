from flask import Blueprint, request, jsonify
import logging
from jwt_utils import create_token
from auth_utils import add_user, verify_user, get_user_role
from database import get_user_id

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/register", methods=["POST"])
def register_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided."}), 400
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"success": False, "error": "All fields are required."}), 400

        # Enforce administrative default role for Ayush Singh
        role = "admin" if username == "Ayush Singh" else "analyst"
        success = add_user(username, password, role)
        if not success:
            return jsonify({"success": False, "error": "User already exists."}), 409

        user_id = get_user_id(username)
        token = create_token({"id": user_id, "username": username, "role": role})
        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "user": {"id": user_id, "username": username, "role": role},
            "token": token
        })
    except Exception as e:
        logging.error(f"Registration error: {e}")
        return jsonify({"success": False, "error": "Registration failed."}), 500


@auth_bp.route("/login", methods=["POST"])
def login_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No credentials provided."}), 400
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"success": False, "error": "Username and password are required."}), 400

        valid = verify_user(username, password)
        if not valid:
            return jsonify({"success": False, "error": "Invalid credentials."}), 401

        role = get_user_role(username)
        user_id = get_user_id(username)
        token = create_token({"id": user_id, "username": username, "role": role})
        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {"id": user_id, "username": username, "role": role},
            "token": token
        })
    except Exception as e:
        logging.error(f"Login error: {e}")
        return jsonify({"success": False, "error": "Login failed."}), 500
