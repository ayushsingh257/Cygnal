import os
import sqlite3
import bcrypt
from datetime import datetime
from database import DB_PATH

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def init_db():
    """
    Seeds default admin accounts if users table is empty.
    
    SECURITY: Admin credentials MUST be provided via environment variables,
    never hardcoded in the source code.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if users table is populated
        cursor.execute("SELECT COUNT(*) FROM users;")
        count = cursor.fetchone()[0]
        
        if count == 0:
            # Check if admin credentials are provided via environment
            admin_username = os.getenv("CYGNAL_ADMIN_USERNAME")
            admin_password = os.getenv("CYGNAL_ADMIN_PASSWORD")
            
            if admin_username and admin_password:
                print("[SEED] Seeding administrator node from environment variables...")
                admin_pw_hash = hash_password(admin_password)
                cursor.execute("""
                    INSERT INTO users (username, password_hash, role, department, team, created_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (
                    admin_username, 
                    admin_pw_hash, 
                    "admin", 
                    "Security Operations", 
                    "Triage", 
                    datetime.utcnow().isoformat() + "Z"
                ))
                conn.commit()
            else:
                print("[SEED] No admin credentials in environment variables. Skipping user seeding.")
                print("[SEED] To seed an admin user, set CYGNAL_ADMIN_USERNAME and CYGNAL_ADMIN_PASSWORD.")
            
        conn.close()
    except Exception as e:
        print("[AUTH_UTILS INIT EXCEPTION]", str(e))
