import os
import sqlite3
from datetime import datetime
import uuid
import json

DB_PATH = "lookup_logs.db"

def init_lookup_db():
    """
    Create the lookup table if it doesn't exist.
    """
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
        conn.commit()
        conn.close()
        print("[DB] lookup_logs.db initialized.")
    except Exception as e:
        print("[DB ERROR]", str(e))


def insert_lookup_log(user: str, ip: str, tool: str, input_data, result_data):
    """
    Insert a new lookup event into the database.
    """
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
