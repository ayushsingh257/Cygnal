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


# ─── Enterprise SSO Federation Endpoints (Phase 5) ───────────────────────────

_sso_states: dict[str, float] = {}

@auth_bp.route("/auth/sso/providers", methods=["GET"])
def get_sso_providers():
    """Returns the list of active Enterprise SSO providers."""
    providers = [
        {"id": "entra_id", "name": "Microsoft Entra ID", "type": "oidc", "icon": "windows", "enabled": True},
        {"id": "google", "name": "Google Workspace", "type": "oidc", "icon": "google", "enabled": True},
        {"id": "okta", "name": "Okta SSO", "type": "oidc", "icon": "shield", "enabled": True},
        {"id": "saml", "name": "SAML 2.0 Enterprise", "type": "saml", "icon": "lock", "enabled": True}
    ]
    return jsonify({
        "success": True,
        "providers": providers
    })


@auth_bp.route("/auth/sso/login/<provider_name>", methods=["GET"])
def sso_login_initiate(provider_name):
    """Initiates Enterprise SSO login and returns the redirect URL."""
    try:
        provider = get_identity_provider(provider_name)
    except KeyError:
        return jsonify({"success": False, "error": f"Provider '{provider_name}' is not supported."}), 400

    redirect_uri = request.args.get("redirect_uri") or f"{request.host_url.rstrip('/')}/sso-callback"
    state = str(uuid.uuid4())
    _sso_states[state] = datetime.now(timezone.utc).timestamp()

    # Prune old states older than 15 minutes
    now_ts = datetime.now(timezone.utc).timestamp()
    for s in list(_sso_states.keys()):
        if now_ts - _sso_states[s] > 900:
            _sso_states.pop(s, None)

    tenant_id = request.args.get("tenant_id", 1, type=int)
    login_url = provider.get_login_url(redirect_uri=redirect_uri, state=state, tenant_id=tenant_id)

    return jsonify({
        "success": True,
        "url": login_url,
        "login_url": login_url,
        "provider": provider.provider_name,
        "state": state
    })


@auth_bp.route("/auth/sso/callback/<provider_name>", methods=["POST"])
def sso_callback_handler(provider_name):
    """
    Handles SSO IdP callback with authorization code or SAMLResponse.
    Validates identity, extracts directory groups, maps to Cygnal RBAC role,
    auto-provisions user record, and creates a secure authenticated session.
    """
    try:
        provider = get_identity_provider(provider_name)
    except KeyError:
        return jsonify({"success": False, "error": f"Provider '{provider_name}' is not supported."}), 400

    data = request.get_json() or {}
    code = data.get("code") or data.get("SAMLResponse") or data.get("token")
    if not code:
        return jsonify({"success": False, "error": "Missing authorization code or SAMLResponse in callback."}), 400

    state = data.get("state")
    redirect_uri = data.get("redirect_uri") or f"{request.host_url.rstrip('/')}/sso-callback"
    tenant_id = data.get("tenant_id", 1)

    try:
        # 1. IdP Callback validation & Profile Extraction
        profile = provider.handle_callback(code, redirect_uri=redirect_uri, state=state, tenant_id=tenant_id)
        
        # 2. RBAC Group Mapping
        assigned_role = provider.map_roles(profile.groups, tenant_id=tenant_id)

        # 3. User Upsert / Provisioning in Cygnal database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT role, department, team, tenant_id FROM users WHERE username = ?;", (profile.username,))
        existing_user = cursor.fetchone()

        now_str = datetime.now(timezone.utc).isoformat() + "Z"

        if existing_user:
            # Update user role if changed by IdP
            user_dept = existing_user[1] or "Corporate Identity"
            user_team = existing_user[2] or "SSO"
            resolved_tenant = existing_user[3] or tenant_id
            cursor.execute("""
                UPDATE users
                SET role = ?, department = ?, team = ?
                WHERE username = ?;
            """, (assigned_role, user_dept, user_team, profile.username))
        else:
            # Auto-provision new enterprise user
            dummy_hash = hash_password(str(uuid.uuid4()))
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, department, team, created_at, tenant_id)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (profile.username, dummy_hash, assigned_role, "Corporate Identity", "SSO", now_str, tenant_id))
            resolved_tenant = tenant_id

        # 4. Record SSO session
        session_record_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO sso_sessions (id, user_id, provider, session_id, tenant_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (session_record_id, profile.username, provider.provider_name, str(uuid.uuid4()), resolved_tenant, now_str))

        conn.commit()
        conn.close()

        # 5. Create authenticated session tokens
        session_data = create_user_session(
            username=profile.username,
            role=assigned_role,
            ip_address=request.remote_addr or "127.0.0.1",
            user_agent=request.headers.get("User-Agent", "SSO-Client"),
            tenant_id=resolved_tenant
        )

        log_auth_event(
            f"sso.login.{provider.provider_name}",
            "success",
            profile.username,
            request.remote_addr,
            {"role": assigned_role, "groups": profile.groups, "email": profile.email}
        )

        return jsonify({
            "success": True,
            "token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "user": {
                "username": profile.username,
                "email": profile.email,
                "role": assigned_role,
                "tenant_id": resolved_tenant,
                "groups": profile.groups,
                "provider": provider.provider_name
            }
        })
    except PermissionError as perm_err:
        log_auth_event(f"sso.login.{provider_name}", "rejected", "unknown", request.remote_addr, {"error": str(perm_err)})
        return jsonify({"success": False, "error": str(perm_err)}), 403
    except Exception as e:
        log_auth_event(f"sso.login.{provider_name}", "error", "unknown", request.remote_addr, {"error": str(e)})
        return jsonify({"success": False, "error": f"SSO Authentication failed: {str(e)}"}), 400


# ─── SSO Admin Management Endpoints ──────────────────────────────────────────

@auth_bp.route("/auth/sso/admin/providers", methods=["GET"])
@require_auth
@require_role("admin")
def list_admin_sso_providers(current_user):
    """Lists configured IdPs for the current tenant."""
    tenant_id = current_user.get("tenant_id", 1)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, provider_type, provider_name, metadata_url, client_id, allowed_domains, enabled, created_at
        FROM identity_providers WHERE tenant_id = ?;
    """, (tenant_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r[0],
            "provider_type": r[1],
            "provider_name": r[2],
            "metadata_url": r[3],
            "client_id": r[4],
            "allowed_domains": r[5],
            "enabled": bool(r[6]),
            "created_at": r[7]
        })
    return jsonify({"success": True, "providers": results})


@auth_bp.route("/auth/sso/admin/providers", methods=["POST"])
@require_auth
@require_role("admin")
def create_admin_sso_provider(current_user):
    """Configures a new IdP for the current organization."""
    tenant_id = current_user.get("tenant_id", 1)
    data = request.get_json() or {}
    
    p_type = data.get("provider_type", "").strip().lower()
    p_name = data.get("provider_name", "").strip()
    meta_url = data.get("metadata_url", "").strip()
    client_id = data.get("client_id", "").strip()
    allowed_domains = data.get("allowed_domains", "").strip()

    if not p_type or not p_name:
        return jsonify({"success": False, "error": "Provider type and name are required."}), 400

    record_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat() + "Z"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO identity_providers (id, tenant_id, provider_type, provider_name, metadata_url, client_id, allowed_domains, enabled, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?);
    """, (record_id, tenant_id, p_type, p_name, meta_url, client_id, allowed_domains, now_str))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Provider '{p_name}' configured successfully.", "id": record_id})


@auth_bp.route("/auth/sso/admin/mappings", methods=["GET"])
@require_auth
@require_role("admin")
def list_admin_group_mappings(current_user):
    """Lists directory group-to-role mappings for the current tenant."""
    tenant_id = current_user.get("tenant_id", 1)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, provider_group, cygnal_role, provider, created_at
        FROM directory_group_mappings WHERE tenant_id = ?;
    """, (tenant_id,))
    rows = cursor.fetchall()
    conn.close()

    mappings = [{"id": r[0], "provider_group": r[1], "cygnal_role": r[2], "provider": r[3], "created_at": r[4]} for r in rows]
    return jsonify({"success": True, "mappings": mappings})


@auth_bp.route("/auth/sso/admin/mappings", methods=["POST"])
@require_auth
@require_role("admin")
def create_admin_group_mapping(current_user):
    """Adds a directory group-to-role mapping rule."""
    tenant_id = current_user.get("tenant_id", 1)
    data = request.get_json() or {}
    
    group = data.get("provider_group", "").strip()
    role = data.get("cygnal_role", "analyst").strip()
    provider = data.get("provider", "all").strip().lower()

    if not group:
        return jsonify({"success": False, "error": "Directory group name is required."}), 400

    record_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat() + "Z"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO directory_group_mappings (id, tenant_id, provider_group, cygnal_role, provider, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
    """, (record_id, tenant_id, group, role, provider, now_str))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Mapping created: '{group}' -> '{role}'."})

