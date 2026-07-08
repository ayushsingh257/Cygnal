import os
import sqlite3
from datetime import datetime
import uuid
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "cygnal.db")

def init_lookup_db():
    """
    Initializes all database tables for Cygnal v1.0.
    Ensures safe schema structure without wiping existing data.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Lookups history table
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
        
        # 2. Users registry table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin', 'director', 'soc_manager', 'red_lead', 'blue_lead', 'analyst', 'intern')),
                department TEXT,
                team TEXT,
                created_at TEXT
            );
        """)
        
        # 3. Threat Intel indicators feed table
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
        
        # 4. Incident Cases table
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
                updated_at TEXT DEFAULT (DATETIME('now')),
                assigned_to TEXT,
                department TEXT
            );
        """)
        
        # 5. Evidence files table
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
        
        # 6. Chronological Case Timeline events table
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
        
        # 7. Tool Permissions Policy overrides table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tool_permissions (
                id TEXT PRIMARY KEY,
                target_type TEXT NOT NULL CHECK (target_type IN ('employee', 'department', 'team')),
                target_name TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                allowed INTEGER NOT NULL CHECK (allowed IN (0, 1)),
                created_by TEXT,
                created_at TEXT DEFAULT (DATETIME('now'))
            );
        """)
        
        # 8. Reports document templates table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT (DATETIME('now')),
                content TEXT NOT NULL,
                case_id TEXT,
                share_token TEXT UNIQUE,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE SET NULL
            );
        """)
        
        # 9. Case Indicators table (Sprint 1)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS case_indicators (
                id TEXT PRIMARY KEY,
                case_id TEXT,
                indicator_value TEXT NOT NULL,
                indicator_type TEXT NOT NULL,
                confidence_score INTEGER DEFAULT 100,
                severity TEXT DEFAULT 'medium',
                created_at TEXT,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_case_indicators_case_id ON case_indicators(case_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_case_indicators_value ON case_indicators(indicator_value);")

        # 10. Evidence Relations table (Sprint 1)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evidence_relations (
                id TEXT PRIMARY KEY,
                source_evidence_id TEXT NOT NULL,
                target_evidence_id TEXT NOT NULL,
                correlation_reason TEXT NOT NULL,
                weight INTEGER DEFAULT 50,
                created_at TEXT,
                FOREIGN KEY(source_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
                FOREIGN KEY(target_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_relations_source ON evidence_relations(source_evidence_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_relations_target ON evidence_relations(target_evidence_id);")

        # 11. Autonomous Investigation Jobs table (Sprint 4A)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS investigation_jobs (
                id TEXT PRIMARY KEY,
                case_id TEXT,
                target TEXT NOT NULL,
                input_type TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
                progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
                current_scanner TEXT DEFAULT 'None',
                total_scanners INTEGER DEFAULT 0,
                completed_scanners TEXT DEFAULT '[]',
                scanner_statuses TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                user TEXT NOT NULL,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigation_jobs_case ON investigation_jobs(case_id);")

        # SAFE MIGRATION ROUTINE checks

        cursor.execute("PRAGMA table_info(users);")
        user_cols = [row[1] for row in cursor.fetchall()]
        if "department" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN department TEXT;")
        if "team" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN team TEXT;")
        if "created_at" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN created_at TEXT;")

        cursor.execute("PRAGMA table_info(cases);")
        case_cols = [row[1] for row in cursor.fetchall()]
        if "assigned_to" not in case_cols:
            cursor.execute("ALTER TABLE cases ADD COLUMN assigned_to TEXT;")
        if "department" not in case_cols:
            cursor.execute("ALTER TABLE cases ADD COLUMN department TEXT;")

        conn.commit()
        conn.close()
    except Exception as e:
        print("[DATABASE INIT EXCEPTION]", str(e))

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
        print("[DB LOG EXCEPTION]", str(e))

def check_tool_allowed(user: str, tool_name: str) -> bool:
    """
    Validates if user can dispatch a scanner based on database policies overrides.
    Hierarchy: Admin allowed -> User override -> Team override -> Dept override -> Default allowed
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Admin is always allowed
        cursor.execute("SELECT role, department, team FROM users WHERE username = ?;", (user,))
        user_info = cursor.fetchone()
        if not user_info:
            conn.close()
            return True # default allowed
        
        role, dept, team = user_info
        if role == "admin":
            conn.close()
            return True
            
        # 1. Check direct user override
        cursor.execute("""
            SELECT allowed FROM tool_permissions 
            WHERE target_type = 'employee' AND target_name = ? AND tool_name = ?;
        """, (user, tool_name))
        row = cursor.fetchone()
        if row is not None:
            conn.close()
            return bool(row[0])
            
        # 2. Check team override
        if team:
            cursor.execute("""
                SELECT allowed FROM tool_permissions 
                WHERE target_type = 'team' AND target_name = ? AND tool_name = ?;
            """, (team, tool_name))
            row = cursor.fetchone()
            if row is not None:
                conn.close()
                return bool(row[0])
                
        # 3. Check department override
        if dept:
            cursor.execute("""
                SELECT allowed FROM tool_permissions 
                WHERE target_type = 'department' AND target_name = ? AND tool_name = ?;
            """, (dept, tool_name))
            row = cursor.fetchone()
            if row is not None:
                conn.close()
                return bool(row[0])
                
        conn.close()
        return True # default allowed
    except Exception as e:
        print("[PERM QUERY EXCEPTION]", str(e))
        return True
