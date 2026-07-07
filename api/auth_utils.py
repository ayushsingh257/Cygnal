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
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if users table is populated
        cursor.execute("SELECT COUNT(*) FROM users;")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("[SEED] Seeding administrator node...")
            # Create default admin
            admin_pw_hash = hash_password("Duster@2004")
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, department, team, created_at)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (
                "Ayush Singh", 
                admin_pw_hash, 
                "admin", 
                "Security Operations", 
                "Triage", 
                datetime.utcnow().isoformat() + "Z"
            ))
            conn.commit()
            
        conn.close()
    except Exception as e:
        print("[AUTH_UTILS INIT EXCEPTION]", str(e))
