import pyotp
from flask import Blueprint, request, jsonify
from jwt_utils import decode_token, create_token
from db_utils import get_db_connection
from datetime import datetime

mfa_bp = Blueprint("mfa_bp", __name__)

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def get_token():
    return request.headers.get("Authorization", "").replace("Bearer ", "")

@mfa_bp.route("/auth/mfa/setup", methods=["POST"])
def mfa_setup():
    """Generates MFA TOTP secret for the active investigator."""
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Unauthorised session token."}), 401
        
    # Generate TOTP secret
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=user, issuer_name="Cygnal Workspace")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE username = ?;", (secret, user))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500
    conn.close()
    
    return jsonify({
        "success": True,
        "secret": secret,
        "provisioning_uri": provisioning_uri
    })

@mfa_bp.route("/auth/mfa/verify", methods=["POST"])
def mfa_verify():
    """Verifies and enables TOTP MFA using the 6-digit verification code."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    code = data.get("code", "").strip()
    
    if user == "unknown":
        # Check if they passed target username directly for login challenge
        username = data.get("username", "").strip()
    else:
        username = user
        
    if not username or not code:
        return jsonify({"success": False, "error": "Username and verification code are required."}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT mfa_secret, mfa_enabled, role, department, team FROM users WHERE username = ?;", (username,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "User not found."}), 404
            
        secret, enabled, role, dept, team = row
        if not secret:
            conn.close()
            return jsonify({"success": False, "error": "MFA has not been set up for this user."}), 400
            
        totp = pyotp.TOTP(secret)
        if not totp.verify(code):
            conn.close()
            return jsonify({"success": False, "error": "Invalid verification code."}), 401
            
        if not enabled:
            cursor.execute("UPDATE users SET mfa_enabled = 1 WHERE username = ?;", (username,))
            conn.commit()
            
        conn.close()
        
        # Issue full session token
        payload = {"username": username, "role": role}
        token = create_token(payload)
        
        return jsonify({
            "success": True,
            "message": "MFA verification complete.",
            "token": token,
            "user": {
                "username": username,
                "role": role,
                "department": dept,
                "team": team
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500
