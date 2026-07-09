from flask import Blueprint, request, jsonify
from datetime import datetime
from db_utils import get_db_connection
from auth_utils import hash_password, check_password
from jwt_utils import create_token, decode_token
from rate_limit import rate_limit_auth
from auth_middleware import require_auth, require_role

auth_bp = Blueprint("auth_bp", __name__)

# Roles that any user may self-assign during public registration.
# Privileged roles (admin, director, soc_manager, red_lead, blue_lead) require
# an admin to create the account via POST /api/admin/users/create.
SELF_REGISTER_ROLES = {"analyst", "intern"}
ALL_VALID_ROLES = {"admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"}

@auth_bp.route("/register", methods=["POST"])
@rate_limit_auth
def register():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing registration payload."}), 400
        
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    # C-01 FIX: Self-registration silently clamps role to 'analyst'.
    # Any attempt to self-assign a privileged role is rejected.
    requested_role = data.get("role", "analyst").strip()
    if requested_role not in SELF_REGISTER_ROLES:
        return jsonify({
            "success": False,
            "error": "Self-registration is only permitted for 'analyst' or 'intern' roles. "
                     "Contact your administrator to create accounts with elevated roles."
        }), 403

    role = requested_role  # safe: already validated above
    department = data.get("department", "Security Operations").strip()
    team = data.get("team", "Triage").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if username exists
        cursor.execute("SELECT username FROM users WHERE username = ?;", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Investigator node already exists."}), 409

        hashed = hash_password(password)
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (username, hashed, role, department, team, datetime.utcnow().isoformat() + "Z"))
        
        conn.commit()
        conn.close()

        payload = {"username": username, "role": role}
        token = create_token(payload)

        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "username": username,
                "role": role,
                "department": department,
                "team": team
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Registration failed: {str(e)}"}), 500



@auth_bp.route("/login", methods=["POST"])
@rate_limit_auth
def login():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing login credentials."}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash, role, department, team FROM users WHERE username = ?;", (username,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "error": "Investigator credentials not validated."}), 401

        pwd_hash, role, dept, team = row
        if not check_password(password, pwd_hash):
            return jsonify({"success": False, "error": "Investigator credentials not validated."}), 401

        # Check MFA challenge requirement
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT mfa_enabled FROM users WHERE username = ?;", (username,))
        mfa_row = cursor.fetchone()
        conn.close()
        mfa_enabled = mfa_row[0] if mfa_row else 0

        if mfa_enabled:
            return jsonify({
                "success": True,
                "mfa_required": True,
                "username": username,
                "message": "Multi-Factor Authentication challenge required."
            })

        payload = {"username": username, "role": role}
        token = create_token(payload)

        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "username": username,
                "role": role,
                "department": dept,
                "team": team
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout(current_user):
    """
    C-03 FIX: Invalidate the current JWT by adding its JTI to the revocation blocklist.
    The token remains cryptographically valid until its natural expiry, but decode_token()
    will reject it on every subsequent request.
    """
    from datetime import datetime, timezone
    from jwt_utils import blocklist_token, JWT_SECRET
    import jwt as _jwt

    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    try:
        # Decode without blocklist check (we are revoking it now)
        raw = _jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        jti = raw.get("jti")
        exp = raw.get("exp", 0)
        if jti:
            remaining_ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 1)
            blocklist_token(jti, remaining_ttl)
    except Exception:
        pass  # Token already expired or malformed — still return success

    return jsonify({"success": True, "message": "Session terminated successfully."})


@auth_bp.route("/admin/users/<username>", methods=["PATCH"])
@require_auth
@require_role("admin", "soc_manager", "director")
def patch_user(username, current_user):
    """Update a user's profile fields. Requires admin/soc_manager/director role."""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing patch payload."}), 400

    dept = data.get("department")
    team = data.get("team")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build dynamic updates
        updates = []
        params = []
        if dept is not None:
            updates.append("department = ?")
            params.append(dept)
        if team is not None:
            updates.append("team = ?")
            params.append(team)

        if not updates:
            conn.close()
            return jsonify({"success": False, "error": "Nothing to update."}), 400

        params.append(username)
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE username = ?;", params)
        conn.commit()
        
        # Retrieve updated user details
        cursor.execute("SELECT role, department, team FROM users WHERE username = ?;", (username,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "error": "User not found."}), 404

        role, updated_dept, updated_team = row
        return jsonify({
            "success": True,
            "user": {
                "username": username,
                "role": role,
                "department": updated_dept,
                "team": updated_team
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/admin/users/create", methods=["POST"])
@require_auth
@require_role("admin")
def admin_create_user(current_user):
    """
    C-01 FIX: Admin-only endpoint to create accounts with any role.
    Only users with the 'admin' JWT role may call this endpoint.
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload."}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "analyst").strip()
    department = data.get("department", "Security Operations").strip()
    team = data.get("team", "Triage").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required."}), 400

    if role not in ALL_VALID_ROLES:
        return jsonify({"success": False, "error": f"Invalid role. Valid roles: {', '.join(sorted(ALL_VALID_ROLES))}"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE username = ?;", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "User already exists."}), 409

        hashed = hash_password(password)
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (username, hashed, role, department, team, datetime.utcnow().isoformat() + "Z"))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"User '{username}' created with role '{role}'.",
            "user": {"username": username, "role": role, "department": department, "team": team}
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": f"User creation failed: {str(e)}"}), 500
