import os
import sqlite3
from datetime import datetime
import uuid
import json

DB_PATH = "lookup_logs.db"

def init_lookup_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lookups (
                id TEXT PRIMARY KEY,
                timestamp TEXT,
                user TEXT,
                ip TEXT,
                tool TEXT,
                input TEXT,
                result TEXT
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'viewer'))
            );
        """)
        # 🔽 Phase 34: Threat Intel Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threat_intel (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                indicator TEXT NOT NULL,
                type TEXT NOT NULL,
                source TEXT,
                tags TEXT,
                timestamp TEXT DEFAULT (DATETIME('now'))
            );
        """)
        conn.commit()
        conn.close()
        print("[DB] lookup_logs.db initialized.")
    except Exception as e:
        print("[DB ERROR]", str(e))


def insert_lookup_log(user: str, ip: str, tool: str, input_data, result_data):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO lookups (id, timestamp, user, ip, tool, input, result)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            str(uuid.uuid4()),
            datetime.utcnow().isoformat() + "Z",
            user,
            ip,
            tool,
            json.dumps(input_data, ensure_ascii=False),
            json.dumps(result_data, ensure_ascii=False)
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print("[DB INSERT ERROR]", str(e))


# ====== Admin Panel DB Functions (Phase 31) ======

def add_user_to_db(username, password_hash, role="viewer"):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO users (username, password_hash, role)
            VALUES (?, ?, ?);
        """, (username, password_hash, role))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("[DB ADD USER ERROR]", str(e))
        return False

def get_all_users():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT rowid, username, role FROM users;")
        users = cursor.fetchall()
        conn.close()
        return [{"id": u[0], "username": u[1], "role": u[2]} for u in users]
    except Exception as e:
        print("[DB GET USERS ERROR]", str(e))
        return []

def update_user_role(username, new_role):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users SET role = ? WHERE username = ?;
        """, (new_role, username))
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    except Exception as e:
        print("[DB UPDATE ROLE ERROR]", str(e))
        return False

def delete_user_by_username(username):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE username = ?;", (username,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("[DB DELETE USER ERROR]", str(e))
        return False

def get_user_id(username):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT rowid FROM users WHERE username = ?;", (username,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception as e:
        print("[DB GET USER ID ERROR]", str(e))
        return None

def update_user_role_by_id(id, new_role):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users SET role = ? WHERE rowid = ?;
        """, (new_role, id))
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    except Exception as e:
        print("[DB UPDATE ROLE BY ID ERROR]", str(e))
        return False

def get_user_by_id(id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT rowid, username, role FROM users WHERE rowid = ?;", (id,))
        row = cursor.fetchone()
        conn.close()
        return {"id": row[0], "username": row[1], "role": row[2]} if row else None
    except Exception as e:
        print("[DB GET USER BY ID ERROR]", str(e))
        return None

def delete_user_by_id(id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE rowid = ?;", (id,))
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    except Exception as e:
        print("[DB DELETE USER BY ID ERROR]", str(e))
        return False

def get_db_connection():
    conn = sqlite3.connect("cygnal.db")
    conn.row_factory = sqlite3.Row
    return conn
