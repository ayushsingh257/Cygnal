import sqlite3
import bcrypt
from datetime import datetime

DB_PATH = "cygnal_users.db"  # consistent with your backend

# Initialize the user DB with username + email
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# Register a new user
def add_user(email, username, password):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    try:
        c.execute("INSERT INTO users (email, username, password, created_at) VALUES (?, ?, ?, ?)",
                  (email, username, hashed.decode(), datetime.utcnow().isoformat()))
        conn.commit()
        return True 
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


# Verify user credentials (by username)
def verify_user(username, password):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()

    if row:
        return bcrypt.checkpw(password.encode(), row[0].encode())
    return False
