import sqlite3
import bcrypt
from datetime import datetime
from jwt_utils import decode_token  # ✅ Added

DB_PATH = "lookup_logs.db"  # ✅ Use unified DB now

def init_db():
    """
    Initializes the users table (called from backend on startup).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'viewer'))
        );
    """)
    conn.commit()
    conn.close()

def add_user(username, password, role="analyst"):
    """
    Add a user to the users table.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        cursor.execute("""
            INSERT INTO users (username, password_hash, role)
            VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash;
        """, (username, hashed_pw, role))
        conn.commit()
        return True
    except Exception as e:
        print("[AUTH ADD USER ERROR]", str(e))
        return False
    finally:
        conn.close()

def verify_user(username, password):
    """
    Verify if username and password match.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return bcrypt.checkpw(password.encode(), row[0].encode())
    return False

def get_user_role(username):
    """
    Return user's role (admin, analyst, viewer) or None.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

# ✅ NEW: Used in admin panel routes to verify the token and return payload
def verify_token(token):
    """
    Decodes and verifies a JWT token.
    Returns payload or None if invalid.
    """
    try:
        return decode_token(token)
    except:
        return None
