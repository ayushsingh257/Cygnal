import sqlite3
import bcrypt
from datetime import datetime

DB_PATH = "users.db"

# Create users.db if it doesn't exist
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def add_user(email, password):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    try:
        c.execute("INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)", 
                  (email, hashed.decode(), datetime.utcnow().isoformat()))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def verify_user(email, password):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE email = ?", (email,))
    row = c.fetchone()
    conn.close()
    if row:
        return bcrypt.checkpw(password.encode(), row[0].encode())
    return False
