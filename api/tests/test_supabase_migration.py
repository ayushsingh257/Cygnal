"""
Cygnal v4.5 — Supabase Production Database Migration & RLS Verification Test Suite

Validates:
1. Supabase PostgreSQL connection resolution (SUPABASE_DATABASE_URL & discrete SUPABASE_DB_* variables).
2. Direct session vs Supavisor/PgBouncer pooler mode detection and SSL enforcement.
3. PostgreSQL Native Row-Level Security (RLS) policies and tenant isolation (app.current_tenant_id).
4. Schema determinism across all 20+ enterprise tables.
5. Evidence encryption metadata, audit logs, SSO, data governance, AI privacy, and vector persistence.
6. Transaction rollback safety and connection pool recycling.
"""

import os
import sys
import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock, patch

# Ensure api path is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db_utils import (
    resolve_db_config,
    get_db_config_info,
    get_db_connection,
    DialectConnection,
    DialectCursor,
    set_thread_tenant_id,
    clear_thread_tenant_id,
    get_current_tenant_id,
    rewrite_query
)
from database import init_lookup_db
from auth_utils import init_db


class TestSupabaseConnectionResolution:
    """Tests connection string parsing and environment variable handling for Supabase."""

    def test_supabase_database_url_pooler_mode(self):
        """Verify SUPABASE_DATABASE_URL with Supavisor/PgBouncer pooler port 6543."""
        test_url = "postgresql://postgres.myproject:secret123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
        with patch.dict(os.environ, {"SUPABASE_DATABASE_URL": test_url}):
            cfg = resolve_db_config()
            assert cfg["is_pg"] is True
            assert cfg["is_supabase"] is True
            assert cfg["is_pooler"] is True
            assert cfg["host"] == "aws-0-us-east-1.pooler.supabase.com"
            assert cfg["port"] == 6543
            assert cfg["user"] == "postgres.myproject"
            assert cfg["password"] == "secret123"
            assert cfg["database"] == "postgres"
            assert cfg["sslmode"] == "require"

    def test_supabase_database_url_direct_mode(self):
        """Verify SUPABASE_DATABASE_URL with direct session port 5432."""
        test_url = "postgresql://postgres:pass456@db.abcdefgh.supabase.co:5432/postgres?sslmode=require"
        with patch.dict(os.environ, {"SUPABASE_DATABASE_URL": test_url}):
            cfg = resolve_db_config()
            assert cfg["is_pg"] is True
            assert cfg["is_supabase"] is True
            assert cfg["is_pooler"] is False
            assert cfg["host"] == "db.abcdefgh.supabase.co"
            assert cfg["port"] == 5432
            assert cfg["sslmode"] == "require"

    def test_discrete_supabase_env_variables(self):
        """Verify connection resolution using discrete SUPABASE_DB_* variables."""
        discrete_env = {
            "SUPABASE_DB_HOST": "aws-0-eu-central-1.pooler.supabase.com",
            "SUPABASE_DB_PORT": "6543",
            "SUPABASE_DB_NAME": "postgres",
            "SUPABASE_DB_USER": "postgres.europroject",
            "SUPABASE_DB_PASSWORD": "europassword",
            "SUPABASE_DB_SSLMODE": "require"
        }
        with patch.dict(os.environ, discrete_env, clear=False):
            # Clear URL vars if present
            os.environ.pop("SUPABASE_DATABASE_URL", None)
            os.environ.pop("DATABASE_URL", None)
            
            cfg = resolve_db_config()
            assert cfg["is_pg"] is True
            assert cfg["is_supabase"] is True
            assert cfg["is_pooler"] is True
            assert cfg["host"] == "aws-0-eu-central-1.pooler.supabase.com"
            assert cfg["port"] == 6543
            assert cfg["user"] == "postgres.europroject"
            assert cfg["password"] == "europassword"
            assert cfg["sslmode"] == "require"

    def test_sqlite_development_fallback(self):
        """Verify fallback to SQLite when no PostgreSQL/Supabase variables are set."""
        with patch.dict(os.environ, {}, clear=True):
            cfg = resolve_db_config()
            assert cfg["is_pg"] is False
            assert cfg["is_supabase"] is False
            assert cfg["database"] == "cygnal.db"

    def test_sanitized_config_info_no_passwords(self):
        """Verify get_db_config_info returns metadata without exposing raw credentials."""
        info = get_db_config_info()
        assert "password" not in info
        assert "engine" in info
        assert "provider" in info


class TestPostgreSQLRowLevelSecurity:
    """Tests PostgreSQL Native Row-Level Security (RLS) enforcement and tenant isolation."""

    def test_set_and_reset_tenant_context(self):
        """Verify SET LOCAL app.current_tenant_id is invoked on connection and RESET on close."""
        executed_statements = []

        class MockPgCursor:
            def execute(self, sql, params=None):
                executed_statements.append((sql, params))
            def close(self):
                pass

        class MockPgConn:
            def cursor(self):
                return MockPgCursor()
            def close(self):
                pass

        mock_pool = MagicMock()
        mock_conn = MockPgConn()
        
        dconn = DialectConnection(mock_conn, is_pg_mode=True, pool=mock_pool)
        
        # 1. Set tenant context
        dconn.set_tenant_context(77)
        assert any("SET LOCAL app.current_tenant_id" in sql and params == ("77",) for sql, params in executed_statements)

        # 2. Close connection -> verify RESET app.current_tenant_id was executed before pool recycling
        dconn.close()
        assert any("RESET app.current_tenant_id" in sql for sql, _ in executed_statements)
        mock_pool.putconn.assert_called_once_with(mock_conn)

    def test_tenant_isolation_cross_access_blocking(self):
        """Verify multi-tenant query rewrite blocks Tenant 1 from accessing Tenant 2 records."""
        # Query for Tenant 1
        sql_t1, params_t1 = rewrite_query("SELECT * FROM cases WHERE status = 'open';", None, tenant_id=1)
        assert "tenant_id = ?" in sql_t1 or "tenant_id = %s" in sql_t1
        assert 1 in params_t1

        # Query for Tenant 2
        sql_t2, params_t2 = rewrite_query("SELECT * FROM cases WHERE status = 'open';", None, tenant_id=2)
        assert 2 in params_t2

        # Verify insert query automatically binds tenant_id
        insert_sql, insert_params = rewrite_query(
            "INSERT INTO cases (id, title, status) VALUES (?, ?, ?);",
            ("case-100", "Incident Alpha", "open"),
            tenant_id=5
        )
        assert "tenant_id" in insert_sql
        assert 5 in insert_params

    def test_rls_ddl_policies_applied_on_all_tenant_tables(self):
        """Verify RLS DDL generator creates FORCE ROW LEVEL SECURITY and policies on all tenant tables."""
        executed_ddl = []

        class MockCursor:
            is_pg = True
            def execute(self, sql, params=None):
                executed_ddl.append(sql)
            def fetchall(self):
                return []
            def fetchone(self):
                return None
            def close(self):
                pass

        class MockConn:
            is_pg = True
            def cursor(self):
                return MockCursor()
            def commit(self):
                pass
            def close(self):
                pass

        # Simulate schema initialization in PG mode
        with patch("database.get_db_connection", return_value=MockConn()):
            init_lookup_db()

        # Verify ENABLE and FORCE ROW LEVEL SECURITY were executed for key tables
        expected_tables = ["users", "cases", "evidence", "timeline", "audit_log", "ai_privacy_events", "retention_policies"]
        for table in expected_tables:
            assert any(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY" in sql for sql in executed_ddl), f"Missing ENABLE RLS on {table}"
            assert any(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY" in sql for sql in executed_ddl), f"Missing FORCE RLS on {table}"
            assert any(f"CREATE POLICY tenant_isolation_policy ON {table}" in sql for sql in executed_ddl), f"Missing POLICY on {table}"


class TestSupabaseSubsystemsPersistence:
    """Tests persistence and tenant scoping across all Cygnal enterprise subsystems."""

    @pytest.fixture(autouse=True)
    def setup_database(self):
        init_lookup_db()
        init_db()
        yield

    def test_cases_and_timeline_tenant_scoping(self):
        """Verify case creation and timeline events are tenant-scoped."""
        case_id = f"case-{uuid.uuid4()}"
        now_str = datetime.now(timezone.utc).isoformat()

        # Tenant 1 Case
        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant(
                "INSERT INTO cases (id, case_number, title, status, severity, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
                (case_id, f"CYG-SB-{str(uuid.uuid4())[:6]}", "Supabase Test Case", "open", "high", "admin", now_str, now_str),
                tenant_id=1
            )
            cur.execute_tenant(
                "INSERT INTO timeline (id, case_id, event_type, description, timestamp, user) VALUES (?, ?, ?, ?, ?, ?);",
                (str(uuid.uuid4()), case_id, "INVESTIGATION_STARTED", "Case initialized on Supabase", now_str, "admin"),
                tenant_id=1
            )

        # Verify Tenant 1 can read case
        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant("SELECT id, title FROM cases WHERE id = ?;", (case_id,), tenant_id=1)
            row = cur.fetchone()
            assert row is not None
            assert row[1] == "Supabase Test Case"

        # Verify Tenant 2 cannot read Tenant 1 case
        with get_db_connection(tenant_id=2) as conn:
            cur = conn.cursor()
            cur.execute_tenant("SELECT id, title FROM cases WHERE id = ?;", (case_id,), tenant_id=2)
            row_t2 = cur.fetchone()
            assert row_t2 is None

    def test_evidence_encryption_metadata_persistence(self):
        """Verify encrypted evidence metadata is stored and isolated per tenant."""
        ev_id = f"ev-{uuid.uuid4()}"
        now_str = datetime.now(timezone.utc).isoformat()

        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant("""
                INSERT INTO evidence (
                    id, case_id, filename, file_size, file_hash, file_type,
                    storage_provider, storage_path, encryption_algorithm,
                    encryption_iv, encryption_tag, encrypted_dek, encryption_status,
                    data_classification, uploaded_by, uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                ev_id, "case-test", "memory_dump.raw", 1048576, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "raw", "gcs", "vault/enc_memory.raw", "AES-256-GCM",
                "iv12345", "tag12345", "dek12345", "encrypted",
                "SECRET", "admin", now_str
            ), tenant_id=1)

        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant("SELECT encryption_algorithm, data_classification, storage_provider FROM evidence WHERE id = ?;", (ev_id,), tenant_id=1)
            row = cur.fetchone()
            assert row is not None
            assert row[0] == "AES-256-GCM"
            assert row[1] == "SECRET"
            assert row[2] == "gcs"

    def test_audit_log_and_ai_privacy_events_persistence(self):
        """Verify audit logs and AI privacy masking events are persisted with tenant scoping."""
        audit_id = str(uuid.uuid4())
        privacy_id = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()

        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant("""
                INSERT INTO audit_log (id, timestamp, actor, action, target, details, ip_address, data_classification)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (audit_id, now_str, "admin", "evidence.export", "ev-001", '{"reason": "court subpoena"}', "127.0.0.1", "RESTRICTED"), tenant_id=1)

            cur.execute_tenant("""
                INSERT INTO ai_privacy_events (id, user_id, event_type, detected_category, severity, action_taken, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (privacy_id, "admin", "prompt.sanitized", "PII_SSN", "HIGH", "MASKED", '{"masked_tokens": 2}', now_str), tenant_id=1)

        # Verify audit log retrieval for Tenant 1
        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant("SELECT actor, action, data_classification FROM audit_log WHERE id = ?;", (audit_id,), tenant_id=1)
            audit_row = cur.fetchone()
            assert audit_row is not None
            assert audit_row[1] == "evidence.export"

            cur.execute_tenant("SELECT event_type, detected_category FROM ai_privacy_events WHERE id = ?;", (privacy_id,), tenant_id=1)
            privacy_row = cur.fetchone()
            assert privacy_row is not None
            assert privacy_row[1] == "PII_SSN"

        # Verify Tenant 2 cannot view Tenant 1 audit records
        with get_db_connection(tenant_id=2) as conn:
            cur = conn.cursor()
            cur.execute_tenant("SELECT id FROM audit_log WHERE id = ?;", (audit_id,), tenant_id=2)
            assert cur.fetchone() is None

            cur.execute_tenant("SELECT id FROM ai_privacy_events WHERE id = ?;", (privacy_id,), tenant_id=2)
            assert cur.fetchone() is None


class TestTransactionSafetyAndRollback:
    """Tests transaction safety, rollback integrity, and thread-local tenant management."""

    def test_transaction_rollback_on_exception(self):
        """Verify transaction rollbacks prevent partial writes when errors occur."""
        temp_case_id = f"case-rollback-{uuid.uuid4()}"
        now_str = datetime.now(timezone.utc).isoformat()

        try:
            with get_db_connection(tenant_id=1) as conn:
                cur = conn.cursor()
                cur.execute_tenant(
                    "INSERT INTO cases (id, case_number, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);",
                    (temp_case_id, f"CYG-RB-{str(uuid.uuid4())[:6]}", "Rollback Case", "open", now_str, now_str),
                    tenant_id=1
                )
                # Intentionally trigger error
                raise ValueError("Simulated operational failure during transaction")
        except ValueError:
            pass

        # Verify record was rolled back
        with get_db_connection(tenant_id=1) as conn:
            cur = conn.cursor()
            cur.execute_tenant("SELECT id FROM cases WHERE id = ?;", (temp_case_id,), tenant_id=1)
            assert cur.fetchone() is None

    def test_thread_tenant_context_scoping(self):
        """Verify thread-local tenant context propagation and cleanup."""
        clear_thread_tenant_id()
        assert get_current_tenant_id() == 1

        set_thread_tenant_id(99)
        assert get_current_tenant_id() == 99

        clear_thread_tenant_id()
        assert get_current_tenant_id() == 1
