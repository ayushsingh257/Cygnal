import os
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from db_utils import get_db_connection
from jwt_utils import JWT_SECRET, blocklist_token
from crypto_utils import encrypt_secret, decrypt_secret

ROLE_WEIGHTS = {
    "admin": 100,
    "director": 80,
    "soc_manager": 70,
    "red_lead": 60,
    "blue_lead": 60,
    "analyst": 40,
    "intern": 10
}

def map_groups_to_role(provider: str, groups: list) -> str:
    """
    Dynamically maps external identity group lists to the highest weight internal role.
    Fallback role is 'analyst'.
    """
    if not groups:
        return "analyst"

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Load all mappings for this provider
        cursor.execute(
            "SELECT external_group_name, internal_role FROM directory_group_mappings WHERE provider = ?;",
            (provider,)
        )
        mappings = cursor.fetchall()
        conn.close()
        
        if not mappings:
            return "analyst"

        matched_roles = []
        for row in mappings:
            group_name = row[0]
            role = row[1]
            if group_name in groups:
                matched_roles.append(role)
        
        if not matched_roles:
            return "analyst"

        # Select the role with the maximum privilege level/weight
        best_role = max(matched_roles, key=lambda r: ROLE_WEIGHTS.get(r, 0))
        return best_role
    except Exception as e:
        print("[ROLE MAP ERROR]", str(e))
        return "analyst"


def create_user_session(username: str, role: str, ip_address: str, user_agent: str) -> dict:
    """
    Generates a secure access token and rotated refresh token.
    Stores session metadata in database.
    """
    now = datetime.now(timezone.utc)
    
    access_jti = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())
    
    access_expiry = now + timedelta(hours=1)
    refresh_expiry = now + timedelta(days=14)

    # Fetch tenant_id for multi-tenancy context
    tenant_id = 1
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT tenant_id FROM users WHERE username = ?;", (username,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0] is not None:
            tenant_id = int(row[0])
    except Exception:
        pass
    
    # Access Token Payload
    access_payload = {
        "username": username,
        "role": role,
        "tenant_id": tenant_id,
        "type": "access",
        "jti": access_jti,
        "iat": now,
        "exp": access_expiry
    }
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm="HS256")
    
    # Refresh Token Payload
    refresh_payload = {
        "username": username,
        "tenant_id": tenant_id,
        "type": "refresh",
        "jti": refresh_jti,
        "iat": now,
        "exp": refresh_expiry
    }
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm="HS256")
    encrypted_refresh = encrypt_secret(refresh_token)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_sessions (jti, refresh_jti, username, ip_address, user_agent, is_revoked, last_seen_at, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?);
        """, (
            access_jti,
            refresh_jti,
            username,
            ip_address,
            user_agent,
            now.isoformat() + "Z",
            now.isoformat() + "Z"
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print("[SESSION CREATE EXCEPTION]", str(e))
        
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 3600
    }


def refresh_user_session(refresh_token: str, ip_address: str, user_agent: str) -> dict:
    """
    Validates a refresh token, verifies session activity, and returns new access/refresh tokens.
    Implements Refresh Token Rotation (RTR).
    """
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ValueError("Refresh token expired.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid refresh token.")

    if payload.get("type") != "refresh":
        raise ValueError("Token is not a refresh token.")

    refresh_jti = payload.get("jti")
    username = payload.get("username")

    # Fetch active session using refresh_jti
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT jti, is_revoked, username FROM user_sessions WHERE refresh_jti = ?;
    """, (refresh_jti,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise ValueError("Active session not found.")
        
    old_access_jti, is_revoked, db_username = row[0], row[1], row[2]
    
    if is_revoked == 1:
        # Revocation breach detection (OAuth 2.1): if a revoked refresh token is presented,
        # revoke all sessions of the user immediately as it indicates potential theft.
        cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE username = ?;", (db_username,))
        conn.commit()
        conn.close()
        raise ValueError("Session revoked. Possible token theft detected. Revoking all active sessions.")

    # Fetch user role
    cursor.execute("SELECT role FROM users WHERE username = ?;", (username,))
    user_row = cursor.fetchone()
    role = user_row[0] if user_row else "analyst"

    now = datetime.now(timezone.utc)
    access_jti = str(uuid.uuid4())
    new_refresh_jti = str(uuid.uuid4())
    
    access_expiry = now + timedelta(hours=1)
    refresh_expiry = now + timedelta(days=14)

    # Issue new access/refresh tokens
    access_payload = {
        "username": username,
        "role": role,
        "type": "access",
        "jti": access_jti,
        "iat": now,
        "exp": access_expiry
    }
    new_access_token = jwt.encode(access_payload, JWT_SECRET, algorithm="HS256")
    
    refresh_payload = {
        "username": username,
        "type": "refresh",
        "jti": new_refresh_jti,
        "iat": now,
        "exp": refresh_expiry
    }
    new_refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm="HS256")
    
    # Blocklist old access token JTI immediately
    blocklist_token(old_access_jti, 3600)

    # Update sessions store with new keys (rotating the tokens)
    cursor.execute("""
        UPDATE user_sessions 
        SET jti = ?, refresh_jti = ?, ip_address = ?, user_agent = ?, last_seen_at = ?
        WHERE refresh_jti = ?;
    """, (
        access_jti,
        new_refresh_jti,
        ip_address,
        user_agent,
        now.isoformat() + "Z",
        refresh_jti
    ))
    conn.commit()
    conn.close()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "expires_in": 3600
    }


def revoke_user_session(jti: str):
    """Revokes a specific session by access JTI."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Mark session as revoked
        cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE jti = ?;", (jti,))
        conn.commit()
        conn.close()
        
        # Add access JTI to blocklist
        blocklist_token(jti, 3600)
    except Exception as e:
        print("[REVOCATION EXCEPTION]", str(e))


def revoke_all_user_sessions(username: str):
    """Revokes all sessions of a specific user (Logout Everywhere)."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT jti FROM user_sessions WHERE username = ? AND is_revoked = 0;", (username,))
        jtis = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE username = ?;", (username,))
        conn.commit()
        conn.close()
        
        for jti in jtis:
            blocklist_token(jti, 3600)
    except Exception as e:
        print("[LOGOUT ALL EXCEPTION]", str(e))


def get_active_sessions(username: str) -> list:
    """Returns a list of active sessions for the user."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT jti, ip_address, user_agent, created_at, last_seen_at 
            FROM user_sessions 
            WHERE username = ? AND is_revoked = 0;
        """, (username,))
        rows = cursor.fetchall()
        conn.close()
        
        sessions = []
        for r in rows:
            sessions.append({
                "jti": r[0],
                "ip_address": r[1],
                "user_agent": r[2],
                "created_at": r[3],
                "last_seen_at": r[4]
            })
        return sessions
    except Exception as e:
        print("[GET SESSIONS EXCEPTION]", str(e))
        return []
