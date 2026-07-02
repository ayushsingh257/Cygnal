import os
import sqlite3
from datetime import datetime
import uuid
import json

DB_PATH = "cygnal.db"

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
        # Case Management tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                case_number TEXT UNIQUE,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT CHECK (status IN ('open', 'investigating', 'closed')) DEFAULT 'open',
                severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
                created_by TEXT,
                created_at TEXT DEFAULT (DATETIME('now')),
                updated_at TEXT DEFAULT (DATETIME('now'))
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evidence (
                id TEXT PRIMARY KEY,
                case_id TEXT,
                filename TEXT NOT NULL,
                file_size INTEGER,
                file_hash TEXT NOT NULL,
                file_type TEXT,
                uploaded_by TEXT,
                uploaded_at TEXT DEFAULT (DATETIME('now')),
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS timeline (
                id TEXT PRIMARY KEY,
                case_id TEXT,
                event_type TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT DEFAULT (DATETIME('now')),
                user TEXT,
                metadata TEXT,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)
        conn.commit()
        conn.close()
        print(f"[DB] {DB_PATH} initialized (including case tables).")
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

# ====== Case Management Database Operations (Phase 3) ======

def insert_case(title, description, severity, created_by):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        case_id = str(uuid.uuid4())
        import random
        case_number = f"CYG-{datetime.utcnow().year}-{random.randint(1000, 9999)}"
        cursor.execute("""
            INSERT INTO cases (id, case_number, title, description, severity, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            case_id,
            case_number,
            title,
            description,
            severity,
            created_by,
            datetime.utcnow().isoformat() + "Z",
            datetime.utcnow().isoformat() + "Z"
        ))
        conn.commit()
        conn.close()
        return case_id
    except Exception as e:
        print("[DB INSERT CASE ERROR]", str(e))
        return None

def get_all_cases():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, case_number, title, description, status, severity, created_by, created_at, updated_at FROM cases ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        conn.close()
        return [{
            "id": r[0], "case_number": r[1], "title": r[2], "description": r[3],
            "status": r[4], "severity": r[5], "created_by": r[6], "created_at": r[7], "updated_at": r[8]
        } for r in rows]
    except Exception as e:
        print("[DB GET ALL CASES ERROR]", str(e))
        return []

def get_case_by_id(case_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, case_number, title, description, status, severity, created_by, created_at, updated_at FROM cases WHERE id = ?;", (case_id,))
        r = cursor.fetchone()
        conn.close()
        if r:
            return {
                "id": r[0], "case_number": r[1], "title": r[2], "description": r[3],
                "status": r[4], "severity": r[5], "created_by": r[6], "created_at": r[7], "updated_at": r[8]
            }
        return None
    except Exception as e:
        print("[DB GET CASE BY ID ERROR]", str(e))
        return None

def get_case_evidence(case_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, case_id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at FROM evidence WHERE case_id = ? ORDER BY uploaded_at DESC;", (case_id,))
        rows = cursor.fetchall()
        conn.close()
        return [{
            "id": r[0], "case_id": r[1], "filename": r[2], "file_size": r[3],
            "file_hash": r[4], "file_type": r[5], "uploaded_by": r[6], "uploaded_at": r[7]
        } for r in rows]
    except Exception as e:
        print("[DB GET EVIDENCE ERROR]", str(e))
        return []

def get_case_timeline(case_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, case_id, event_type, description, timestamp, user, metadata FROM timeline WHERE case_id = ? ORDER BY timestamp DESC;", (case_id,))
        rows = cursor.fetchall()
        conn.close()
        return [{
            "id": r[0], "case_id": r[1], "event_type": r[2], "description": r[3],
            "timestamp": r[4], "user": r[5], "metadata": json.loads(r[6]) if r[6] else None
        } for r in rows]
    except Exception as e:
        print("[DB GET TIMELINE ERROR]", str(e))
        return []

def insert_evidence(case_id, filename, file_size, file_hash, file_type, uploaded_by):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        evidence_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO evidence (id, case_id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            evidence_id,
            case_id,
            filename,
            file_size,
            file_hash,
            file_type,
            uploaded_by,
            datetime.utcnow().isoformat() + "Z"
        ))
        conn.commit()
        conn.close()
        return evidence_id
    except Exception as e:
        print("[DB INSERT EVIDENCE ERROR]", str(e))
        return None

def insert_timeline_event(case_id, event_type, description, user, metadata=None):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        event_id = str(uuid.uuid4())
        metadata_str = json.dumps(metadata) if metadata else None
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            event_id,
            case_id,
            event_type,
            description,
            datetime.utcnow().isoformat() + "Z",
            user,
            metadata_str
        ))
        conn.commit()
        conn.close()
        return event_id
    except Exception as e:
        print("[DB INSERT TIMELINE ERROR]", str(e))
        return None

def update_case_status(case_id, status):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE cases SET status = ?, updated_at = ? WHERE id = ?;
        """, (status, datetime.utcnow().isoformat() + "Z", case_id))
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    except Exception as e:
        print("[DB UPDATE CASE STATUS ERROR]", str(e))
        return False
