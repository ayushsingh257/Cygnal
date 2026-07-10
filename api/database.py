import os
from datetime import datetime
import uuid
import json
from db_utils import get_db_connection, DB_PATH

def init_lookup_db():
    """
    Initializes all database tables for Cygnal v1.0.
    Ensures safe schema structure without wiping existing data.
    """
    try:
        conn = get_db_connection()
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

        # 12. Case Locks table (v2.5)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS case_locks (
                case_id TEXT PRIMARY KEY,
                locked_by TEXT NOT NULL,
                locked_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)

        # 13. Case Comments table (v2.5)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_comments_case ON comments(case_id);")

        # 14. Inbound SIEM Webhooks alerts (v3.0)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inbound_alerts (
                id TEXT PRIMARY KEY,
                external_id TEXT,
                title TEXT NOT NULL,
                source TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT,
                raw_payload TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                parsed_iocs TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('unhandled', 'investigating', 'completed', 'failed')),
                case_id TEXT,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE SET NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_inbound_alerts_case ON inbound_alerts(case_id);")

        # 15. Autonomic AI Agent logs and decisions (v3.0)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_logs (
                id TEXT PRIMARY KEY,
                alert_id TEXT NOT NULL,
                stage TEXT NOT NULL CHECK (stage IN ('ingestion', 'parsing', 'planning', 'execution', 'completion')),
                level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
                message TEXT NOT NULL,
                reasoning TEXT,
                details TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY(alert_id) REFERENCES inbound_alerts(id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_agent_logs_alert ON agent_logs(alert_id);")

        # 16. User Identities (SSO OIDC/SAML integration mapping)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_identities (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                provider TEXT NOT NULL,
                external_id TEXT NOT NULL,
                linked_at TEXT NOT NULL,
                FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_identities_username ON user_identities(username);")

        # 17. User Sessions (session validation, revocation, and tracking)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                jti TEXT PRIMARY KEY,
                refresh_jti TEXT NOT NULL,
                username TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                is_revoked INTEGER DEFAULT 0,
                last_seen_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_username ON user_sessions(username);")

        # 18. Directory Group Mappings (external AD/OIDC group to Cygnal role mappings)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS directory_group_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                external_group_name TEXT NOT NULL,
                internal_role TEXT NOT NULL CHECK (internal_role IN ('admin', 'director', 'soc_manager', 'red_lead', 'blue_lead', 'analyst', 'intern')),
                created_at TEXT NOT NULL
            );
        """)

        # 19. Service Accounts (client credentials flow)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_accounts (
                client_id TEXT PRIMARY KEY,
                client_secret_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                scopes TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_by TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(created_by) REFERENCES users(username) ON DELETE SET NULL
            );
        """)

        # ── Phase 2: Threat Intelligence ──────────────────────────────────────

        # 20. TI Enrichment Cache (stores per-indicator enrichment results with TTL)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ti_enrichment_cache (
                id TEXT PRIMARY KEY,
                indicator TEXT NOT NULL,
                indicator_type TEXT NOT NULL,
                verdict TEXT NOT NULL,
                confidence REAL DEFAULT 0.0,
                tags TEXT,
                provider_results TEXT,
                case_id TEXT,
                requested_by TEXT,
                created_at TEXT NOT NULL
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ti_cache_indicator
            ON ti_enrichment_cache(indicator, indicator_type);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ti_cache_case
            ON ti_enrichment_cache(case_id);
        """)

        # 21. TI IOC Feed (stores imported IOCs from STIX bundles / TAXII feeds)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ti_ioc_feed (
                id TEXT PRIMARY KEY,
                stix_id TEXT,
                indicator TEXT NOT NULL,
                indicator_type TEXT NOT NULL,
                source TEXT,
                verdict TEXT DEFAULT 'unknown',
                confidence REAL DEFAULT 0.0,
                tags TEXT,
                first_seen TEXT,
                last_seen TEXT,
                created_at TEXT NOT NULL
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ti_ioc_indicator
            ON ti_ioc_feed(indicator, indicator_type);
        """)

        # 22. TI Connector Config (provider API keys managed through admin UI)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ti_connector_config (
                provider TEXT PRIMARY KEY,
                is_enabled INTEGER DEFAULT 1,
                updated_by TEXT,
                updated_at TEXT
            );
        """)

        # ── Phase 3: Enterprise AI Platform ───────────────────────────────────

        # 23. Vector Records (stores text embeddings for semantic search memory)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vector_records (
                id TEXT PRIMARY KEY,
                entity_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                text_content TEXT NOT NULL,
                vector_data TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_vector_records_entity 
            ON vector_records(entity_id, entity_type);
        """)

        # ── Phase 4: Enterprise Collaboration Platform ─────────────────────────

        # 24. Notifications Table (stores persistent user notifications)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('assignment', 'comment', 'lock', 'system')),
                is_read INTEGER DEFAULT 0,
                case_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_username 
            ON notifications(username);
        """)



        # ── Phase 5: Enterprise Infrastructure & Multi-Tenancy ────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tenants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );
        """)

        # SAFE MIGRATION ROUTINE checks
        # Seed default organization
        try:
            cursor.execute("SELECT id FROM tenants WHERE id = 1;")
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO tenants (id, name, created_at) VALUES (1, 'Default Organization', ?);",
                    (datetime.now().isoformat() + "Z",)
                )
        except Exception:
            pass

        # Dynamically add tenant_id column to all enterprise tables
        tenant_tables = [
            "users", "cases", "evidence", "notifications", "inbound_alerts",
            "comments", "timeline", "case_indicators",
            "evidence_relations", "investigation_jobs", "tool_permissions",
            "reports", "vector_records"
        ]

        for table in tenant_tables:
            try:
                cursor.execute(f"PRAGMA table_info({table});")
                cols = [row[1] for row in cursor.fetchall()]
                if cols and "tenant_id" not in cols:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN tenant_id INTEGER DEFAULT 1;")
            except Exception as e:
                print(f"[DATABASE MIGRATION EXCEPTION] Table {table}: {str(e)}")

        cursor.execute("PRAGMA table_info(users);")
        user_cols = [row[1] for row in cursor.fetchall()]
        if "department" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN department TEXT;")
        if "team" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN team TEXT;")
        if "created_at" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN created_at TEXT;")
        if "mfa_enabled" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0;")
        if "mfa_secret" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN mfa_secret TEXT;")

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
        conn = get_db_connection()
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
        conn = get_db_connection()
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
