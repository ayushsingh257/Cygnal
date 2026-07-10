from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db_utils import get_db_connection
from auth_utils import hash_password, check_password
from jwt_utils import decode_token, create_token
from rate_limit import rate_limit_auth
from auth_middleware import require_auth, require_role
from log_utils import log_auth_event

from services.identity import (
    get_identity_provider,
    map_groups_to_role,
    create_user_session,
    refresh_user_session,
    revoke_user_session,
    revoke_all_user_sessions,
    get_active_sessions,
    create_service_account,
    authenticate_service_account
)

auth_bp = Blueprint("auth_bp", __name__)

SELF_REGISTER_ROLES = {"analyst", "intern"}
ALL_VALID_ROLES = {"admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"}

# ─── Regular Authentication ───────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
@rate_limit_auth
def register():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing registration payload."}), 400
        
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    requested_role = data.get("role", "analyst").strip()
    
    if requested_role not in SELF_REGISTER_ROLES:
        return jsonify({
            "success": False,
            "error": "Self-registration is only permitted for 'analyst' or 'intern' roles."
        }), 403

    role = requested_role
    department = data.get("department", "Security Operations").strip()
    team = data.get("team", "Triage").strip()

    org_name = data.get("organization_name", "").strip()
    tenant_id = 1

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify organization exists if specified
        if org_name:
            cursor.execute("SELECT id FROM tenants WHERE name = ?;", (org_name,))
            t_row = cursor.fetchone()
            if not t_row:
                conn.close()
                return jsonify({
                    "success": False,
                    "error": f"Organization '{org_name}' is not registered. Please contact your administrator."
                }), 400
            tenant_id = t_row[0]

        cursor.execute("SELECT username FROM users WHERE username = ?;", (username,))
        if cursor.fetchone():
            conn.close()
            log_auth_event("register.local", "failed", username, request.remote_addr, {"reason": "User already exists"})
            return jsonify({"success": False, "error": "Investigator node already exists."}), 409

        hashed = hash_password(password)
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, department, team, created_at, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (username, hashed, role, department, team, datetime.now(timezone.utc).isoformat() + "Z", tenant_id))
        
        conn.commit()
        conn.close()

        # Track session in db
        session_data = create_user_session(username, role, request.remote_addr, request.headers.get("User-Agent", ""))
        
        # Write audit log
        from routes.v2.admin import write_audit_log
        write_audit_log("user.register", username, target=username, ip_address=request.remote_addr)
        log_auth_event("register.local", "success", username, request.remote_addr)

        return jsonify({
            "success": True,
            "token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "user": {
                "username": username,
                "role": role,
                "department": department,
                "team": team
            }
        })
    except Exception as e:
        log_auth_event("register.local", "error", username, request.remote_addr, {"error": str(e)})
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
            log_auth_event("login.local", "failed", username, request.remote_addr, {"reason": "Invalid user"})
            return jsonify({"success": False, "error": "Investigator credentials not validated."}), 401

        pwd_hash, role, dept, team = row
        if not check_password(password, pwd_hash):
            log_auth_event("login.local", "failed", username, request.remote_addr, {"reason": "Invalid password"})
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

        # Generate database-backed session
        session_data = create_user_session(username, role, request.remote_addr, request.headers.get("User-Agent", ""))
        
        # Write audit log
        from routes.v2.admin import write_audit_log
        write_audit_log("user.login", username, target=username, ip_address=request.remote_addr)
        log_auth_event("login.local", "success", username, request.remote_addr)

        return jsonify({
            "success": True,
            "token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "user": {
                "username": username,
                "role": role,
                "department": dept,
                "team": team
            }
        })
    except Exception as e:
        log_auth_event("login.local", "error", username, request.remote_addr, {"error": str(e)})
        return jsonify({"success": False, "error": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout(current_user):
    username = current_user.get("username", "unknown")
    jti = current_user.get("jti")
    
    if jti:
        revoke_user_session(jti)
        
    # Write audit log
    from routes.v2.admin import write_audit_log
    write_audit_log("user.logout", username, target=username, ip_address=request.remote_addr)
    log_auth_event("logout", "success", username, request.remote_addr)

    return jsonify({"success": True, "message": "Session terminated successfully."})


# ─── Session Management & Token Control ───────────────────────────────────────

@auth_bp.route("/auth/token/refresh", methods=["POST"])
def refresh():
    data = request.get_json() or {}
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        return jsonify({"success": False, "error": "Refresh token required."}), 400

    try:
        ip = request.remote_addr
        user_agent = request.headers.get("User-Agent", "")
        session_data = refresh_user_session(refresh_token, ip, user_agent)
        
        decoded = decode_token(session_data["access_token"])
        username = decoded.get("username") if decoded else "unknown"
        
        log_auth_event("token.refresh", "success", username, ip)
        return jsonify({"success": True, **session_data})
    except Exception as e:
        log_auth_event("token.refresh", "failed", "unknown", request.remote_addr, {"error": str(e)})
        return jsonify({"success": False, "error": str(e)}), 401


@auth_bp.route("/auth/logout/all", methods=["POST"])
@require_auth
def logout_everywhere(current_user):
    username = current_user.get("username")
    revoke_all_user_sessions(username)
    
    from routes.v2.admin import write_audit_log
    write_audit_log("user.logout_all", username, target=username, ip_address=request.remote_addr)
    log_auth_event("logout.all", "success", username, request.remote_addr)
    
    return jsonify({"success": True, "message": "All active sessions revoked successfully."})


@auth_bp.route("/auth/sessions", methods=["GET"])
@require_auth
def list_sessions(current_user):
    username = current_user.get("username")
    sessions = get_active_sessions(username)
    return jsonify({"success": True, "sessions": sessions})


# ─── Federated SSO Integration (OIDC & SAML) ──────────────────────────────────

@auth_bp.route("/auth/sso/login/<provider>", methods=["GET"])
def sso_login(provider):
    redirect_uri = request.args.get("redirect_uri", "").strip()
    state = request.args.get("state", "").strip()
    if not redirect_uri:
        return jsonify({"success": False, "error": "redirect_uri query parameter required."}), 400
        
    try:
        prov = get_identity_provider(provider)
        url = prov.get_login_url(redirect_uri, state)
        return jsonify({"success": True, "url": url})
    except KeyError:
        return jsonify({"success": False, "error": f"Identity provider '{provider}' not configured."}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/auth/sso/callback/<provider>", methods=["POST"])
def sso_callback(provider):
    data = request.get_json() or {}
    code = data.get("code") or data.get("SAMLResponse")
    redirect_uri = data.get("redirect_uri")
    state = data.get("state")

    if not code or not redirect_uri:
        log_auth_event(f"sso.callback.{provider}", "failed", "unknown", request.remote_addr, {"reason": "Missing parameters"})
        return jsonify({"success": False, "error": "code/SAMLResponse and redirect_uri required."}), 400

    try:
        prov = get_identity_provider(provider)
        profile = prov.handle_callback(code, redirect_uri, state)
        
        # Map dynamic group to internal Cygnal role
        role = map_groups_to_role(provider, profile.groups)
        
        # Zero Trust JIT Provisioning check
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT role, department, team FROM users WHERE username = ?;", (profile.username,))
        user_row = cursor.fetchone()
        
        if not user_row:
            # Create user dynamically
            dept = "SSO Federated Identity"
            team = "Enterprise Team"
            # Prevent privilege escalation: check if they are mapped to admin, otherwise clamp
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, department, team, created_at)
                VALUES (?, 'SSO_FEDERATED_KEY', ?, ?, ?, ?);
            """, (profile.username, role, dept, team, datetime.now(timezone.utc).isoformat() + "Z"))
            
            # Map external identity link
            cursor.execute("""
                INSERT INTO user_identities (id, username, provider, external_id, linked_at)
                VALUES (?, ?, ?, ?, ?);
            """, (str(uuid.uuid4()), profile.username, provider, profile.external_id, datetime.now(timezone.utc).isoformat() + "Z"))
            
            conn.commit()
            
            from routes.v2.admin import write_audit_log
            write_audit_log("user.jit_provision", profile.username, target=profile.username, ip_address=request.remote_addr, details={"provider": provider, "role": role})
        else:
            role = user_row[0]  # if user already exists locally, preserve local DB role policies
            
        conn.close()

        # Issue active session
        session_data = create_user_session(profile.username, role, request.remote_addr, request.headers.get("User-Agent", ""))
        
        from routes.v2.admin import write_audit_log
        write_audit_log("user.sso_login", profile.username, target=profile.username, ip_address=request.remote_addr, details={"provider": provider})
        log_auth_event(f"sso.login.{provider}", "success", profile.username, request.remote_addr)

        return jsonify({
            "success": True,
            "token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "user": {
                "username": profile.username,
                "role": role,
                "email": profile.email
            }
        })
    except Exception as e:
        log_auth_event(f"sso.login.{provider}", "failed", "unknown", request.remote_addr, {"error": str(e)})
        return jsonify({"success": False, "error": f"SSO callback authentication failed: {str(e)}"}), 401


# ─── Service Accounts (Client Credentials Flow) ───────────────────────────────

@auth_bp.route("/auth/oauth/token", methods=["POST"])
@rate_limit_auth
def oauth_token():
    """Headless service account OAuth2 token handler."""
    grant_type = request.form.get("grant_type") or request.json.get("grant_type") if request.is_json else None
    client_id = request.form.get("client_id") or request.json.get("client_id") if request.is_json else None
    client_secret = request.form.get("client_secret") or request.json.get("client_secret") if request.is_json else None

    if not client_id or not client_secret:
        # Basic Auth header fallback support
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Basic "):
            try:
                import base64
                decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
                client_id, client_secret = decoded.split(":", 1)
            except Exception:
                pass

    if grant_type != "client_credentials":
        return jsonify({"error": "unsupported_grant_type", "error_description": "Only client_credentials is supported."}), 400

    if not client_id or not client_secret:
        return jsonify({"error": "invalid_client", "error_description": "client_id and client_secret required."}), 401

    token = authenticate_service_account(client_id, client_secret)
    if not token:
        log_auth_event("service_account.auth", "failed", client_id, request.remote_addr)
        return jsonify({"error": "invalid_client", "error_description": "Invalid client credentials."}), 401

    log_auth_event("service_account.auth", "success", client_id, request.remote_addr)
    return jsonify({
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 3600
    })


# ─── Admin SSO & Service Account Configurations ────────────────────────────────

@auth_bp.route("/admin/service-accounts", methods=["POST"])
@require_auth
@require_role("admin")
def admin_create_sa(current_user):
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    scopes = data.get("scopes", [])
    expires_in_days = data.get("expires_in_days", 30)

    if not name or not scopes:
        return jsonify({"success": False, "error": "name and scopes required."}), 400

    try:
        res = create_service_account(name, scopes, expires_in_days, current_user["username"])
        
        from routes.v2.admin import write_audit_log
        write_audit_log("service_account.create", current_user["username"], target=res["client_id"], ip_address=request.remote_addr)
        
        return jsonify({"success": True, **res}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/admin/sso/mappings", methods=["POST"])
@require_auth
@require_role("admin")
def add_sso_mapping(current_user):
    data = request.get_json() or {}
    provider = data.get("provider", "").strip()
    external_group = data.get("external_group_name", "").strip()
    internal_role = data.get("internal_role", "").strip()

    if not provider or not external_group or not internal_role:
        return jsonify({"success": False, "error": "provider, external_group_name, and internal_role required."}), 400

    if internal_role not in ALL_VALID_ROLES:
        return jsonify({"success": False, "error": f"Invalid internal role. Allowed: {ALL_VALID_ROLES}"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO directory_group_mappings (provider, external_group_name, internal_role, created_at)
            VALUES (?, ?, ?, ?);
        """, (provider, external_group, internal_role, datetime.now(timezone.utc).isoformat() + "Z"))
        conn.commit()
        conn.close()

        from routes.v2.admin import write_audit_log
        write_audit_log("sso_mapping.create", current_user["username"], target=external_group, ip_address=request.remote_addr)

        return jsonify({"success": True, "message": "Directory group mapping registered successfully."}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/admin/sso/mappings", methods=["GET"])
@require_auth
@require_role("admin")
def get_sso_mappings(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, provider, external_group_name, internal_role, created_at FROM directory_group_mappings;")
        rows = cursor.fetchall()
        conn.close()

        mappings = []
        for r in rows:
            mappings.append({
                "id": r[0],
                "provider": r[1],
                "external_group_name": r[2],
                "internal_role": r[3],
                "created_at": r[4]
            })
        return jsonify({"success": True, "mappings": mappings})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── Admin Users Patch & Create override ──────────────────────────────────────

@auth_bp.route("/admin/users/<username>", methods=["PATCH"])
@require_auth
@require_role("admin", "soc_manager", "director")
def patch_user(username, current_user):
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing patch payload."}), 400

    dept = data.get("department")
    team = data.get("team")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
        """, (username, hashed, role, department, team, datetime.now(timezone.utc).isoformat() + "Z"))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"User '{username}' created with role '{role}'.",
            "user": {"username": username, "role": role, "department": department, "team": team}
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": f"User creation failed: {str(e)}"}), 500
