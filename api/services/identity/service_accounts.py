import os
import uuid
import secrets
import bcrypt
from datetime import datetime, timezone, timedelta
import jwt
from db_utils import get_db_connection
from jwt_utils import JWT_SECRET
from crypto_utils import encrypt_secret

def create_service_account(name: str, scopes: list, expires_in_days: int, creator: str) -> dict:
    """
    Creates a new service account, generates client ID and secret.
    Saves the hashed secret to database and returns the plain secret (shown only once).
    """
    client_id = f"sa_{secrets.token_hex(16)}"
    client_secret_plain = secrets.token_hex(32)
    
    # Hash client secret using bcrypt
    salt = bcrypt.gensalt()
    client_secret_hash = bcrypt.hashpw(client_secret_plain.encode("utf-8"), salt).decode("utf-8")
    
    now = datetime.now(timezone.utc)
    now_str = now.replace(tzinfo=None).isoformat() + "Z"
    expires_at = now + timedelta(days=expires_in_days)
    expires_at_str = expires_at.replace(tzinfo=None).isoformat() + "Z"
    
    scopes_str = ",".join(scopes)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO service_accounts (client_id, client_secret_hash, name, scopes, expires_at, is_active, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?);
        """, (
            client_id,
            client_secret_hash,
            name,
            scopes_str,
            expires_at_str,
            creator,
            now_str
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print("[SERVICE ACCOUNT CREATE EXCEPTION]", str(e))
        raise e
        
    return {
        "client_id": client_id,
        "client_secret": client_secret_plain,
        "name": name,
        "scopes": scopes,
        "expires_at": expires_at.isoformat() + "Z"
    }

def authenticate_service_account(client_id: str, client_secret: str) -> str | None:
    """
    Validates client credentials and generates a scoped service account token.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT client_secret_hash, name, scopes, expires_at, is_active 
            FROM service_accounts WHERE client_id = ?;
        """, (client_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
            
        secret_hash, name, scopes_str, expires_at_str, is_active = row[0], row[1], row[2], row[3], row[4]
        
        if is_active != 1:
            return None
            
        # Verify expiration
        now = datetime.now(timezone.utc)
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        if now > expires_at:
            return None
            
        # Verify secret hash
        if not bcrypt.checkpw(client_secret.encode("utf-8"), secret_hash.encode("utf-8")):
            return None
            
        # Create token
        token_payload = {
            "username": f"service_account:{name}",
            "role": "service",
            "scope": scopes_str,
            "jti": str(uuid.uuid4()),
            "iat": now,
            "exp": now + timedelta(hours=1)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        return token
    except Exception as e:
        print("[SERVICE ACCOUNT AUTH EXCEPTION]", str(e))
        return None
