import os
import re
import sqlite3
import threading
from typing import Any, Dict, Optional
from urllib.parse import urlparse, parse_qs

# ─── Database Configuration & Supabase Resolution ────────────────────────────
def resolve_db_config() -> Dict[str, Any]:
    """
    Resolves PostgreSQL / Supabase connection parameters from environment.
    Priority:
    1. SUPABASE_DATABASE_URL
    2. DATABASE_URL
    3. Discrete SUPABASE_DB_* variables:
       - SUPABASE_DB_HOST
       - SUPABASE_DB_PORT (default: 5432 or 6543)
       - SUPABASE_DB_NAME (default: postgres)
       - SUPABASE_DB_USER (default: postgres)
       - SUPABASE_DB_PASSWORD
       - SUPABASE_DB_SSLMODE (default: require)
    """
    db_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    
    if db_url.strip():
        parsed = urlparse(db_url.strip())
        qs = parse_qs(parsed.query)
        
        username = parsed.username or ""
        password = parsed.password or ""
        database = parsed.path[1:] if parsed.path.startswith("/") else parsed.path
        hostname = parsed.hostname or ""
        port = parsed.port or 5432
        
        # Determine SSL mode: default to 'require' for cloud Supabase
        sslmode = qs.get("sslmode", [None])[0]
        if not sslmode:
            if hostname and ("supabase.co" in hostname or "supabase.com" in hostname):
                sslmode = "require"
            else:
                sslmode = "prefer"
                
        is_supabase = bool(hostname and ("supabase.co" in hostname or "supabase.com" in hostname))
        is_pooler = bool(port == 6543 or "pgbouncer=true" in db_url.lower() or "pooler.supabase.com" in (hostname or ""))
        
        return {
            "is_pg": True,
            "is_supabase": is_supabase,
            "is_pooler": is_pooler,
            "host": hostname,
            "port": port,
            "database": database,
            "user": username,
            "password": password,
            "sslmode": sslmode,
            "raw_url": db_url
        }
        
    # Discrete parameters fallback
    host = os.getenv("SUPABASE_DB_HOST")
    if host and host.strip():
        port = int(os.getenv("SUPABASE_DB_PORT", "5432").strip() or 5432)
        database = os.getenv("SUPABASE_DB_NAME", "postgres").strip()
        user = os.getenv("SUPABASE_DB_USER", "postgres").strip()
        password = os.getenv("SUPABASE_DB_PASSWORD", "").strip()
        sslmode = os.getenv("SUPABASE_DB_SSLMODE", "require").strip()
        
        is_supabase = bool("supabase.co" in host or "supabase.com" in host)
        is_pooler = bool(port == 6543 or "pooler.supabase.com" in host)
        
        return {
            "is_pg": True,
            "is_supabase": is_supabase,
            "is_pooler": is_pooler,
            "host": host.strip(),
            "port": port,
            "database": database,
            "user": user,
            "password": password,
            "sslmode": sslmode,
            "raw_url": f"postgresql://{user}:{password}@{host}:{port}/{database}?sslmode={sslmode}"
        }
        
    return {
        "is_pg": False,
        "is_supabase": False,
        "is_pooler": False,
        "host": None,
        "port": None,
        "database": "cygnal.db",
        "user": None,
        "password": None,
        "sslmode": None,
        "raw_url": ""
    }

DB_CONFIG = resolve_db_config()
DATABASE_URL = DB_CONFIG.get("raw_url", "")
DB_PATH = os.path.join(os.path.dirname(__file__), "cygnal.db")

is_pg = DB_CONFIG["is_pg"]
pg_pool = None

def init_pg_pool():
    """Initializes PostgreSQL connection pool with cloud keepalives and SSL."""
    global pg_pool, is_pg
    if not is_pg:
        return None
    try:
        from psycopg2.pool import ThreadedConnectionPool
        
        connect_kwargs = {
            "user": DB_CONFIG["user"],
            "password": DB_CONFIG["password"],
            "host": DB_CONFIG["host"],
            "port": DB_CONFIG["port"],
            "database": DB_CONFIG["database"],
            "connect_timeout": 15,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5
        }
        
        if DB_CONFIG["sslmode"]:
            connect_kwargs["sslmode"] = DB_CONFIG["sslmode"]
            
        pg_pool = ThreadedConnectionPool(1, 20, **connect_kwargs)
        provider_name = "Supabase Managed PostgreSQL" if DB_CONFIG["is_supabase"] else "PostgreSQL"
        pool_mode = "Supavisor/PgBouncer Pooler" if DB_CONFIG["is_pooler"] else "Direct Session"
        print(f"[DB_UTILS] Initialized {provider_name} ({pool_mode}) connection pool successfully.")
        return pg_pool
    except Exception as e:
        print("[DB_UTILS] Failed to initialize PostgreSQL connection pool, falling back to SQLite:", str(e))
        is_pg = False
        return None

if is_pg:
    init_pg_pool()

def get_db_config_info() -> Dict[str, Any]:
    """Returns a sanitized summary of database engine and connection status."""
    if is_pg and pg_pool:
        return {
            "engine": "supabase" if DB_CONFIG["is_supabase"] else "postgresql",
            "provider": "Supabase Managed PostgreSQL" if DB_CONFIG["is_supabase"] else "PostgreSQL",
            "host": DB_CONFIG["host"],
            "port": DB_CONFIG["port"],
            "database": DB_CONFIG["database"],
            "ssl": bool(DB_CONFIG["sslmode"]),
            "sslmode": DB_CONFIG["sslmode"],
            "is_pooler": DB_CONFIG["is_pooler"],
            "pool_active": True
        }
    return {
        "engine": "sqlite",
        "provider": "SQLite Embedded",
        "path": DB_PATH,
        "pool_active": False
    }

class DialectCursor:
    def __init__(self, cursor, is_pg_mode):
        self.cursor = cursor
        self.is_pg = is_pg_mode

    def execute(self, sql, params=None):
        if self.is_pg:
            # 1. Replace placeholder ? with %s
            sql = sql.replace("?", "%s")
            
            # 2. Translate SQLite date/time functions to PostgreSQL
            sql = re.sub(r"DATETIME\('now'\)", "CURRENT_TIMESTAMP", sql, flags=re.IGNORECASE)
            sql = re.sub(r"DATETIME\(\s*'now'\s*\)", "CURRENT_TIMESTAMP", sql, flags=re.IGNORECASE)
            
            # 3. Translate SQLite AUTOINCREMENT and other dialects for initial setup
            sql = re.sub(r"AUTOINCREMENT", "GENERATED BY DEFAULT AS IDENTITY", sql, flags=re.IGNORECASE)
            
            # 4. Handle PRAGMA checks translation if executed directly
            if "PRAGMA table_info" in sql:
                table_name = re.findall(r"table_info\((.*?)\)", sql, re.IGNORECASE)
                if table_name:
                    tbl = table_name[0].strip().replace("'", "").replace('"', "")
                    # Query PG information_schema to return column names in format mimicking sqlite table_info:
                    # SQLite PRAGMA table_info returns rows: (cid, name, type, notnull, dflt_value, pk)
                    sql = """
                        SELECT 0 as cid, column_name as name, data_type as type, 
                               CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
                               column_default as dflt_value,
                               CASE WHEN column_name = 'id' THEN 1 ELSE 0 END as pk
                        FROM information_schema.columns 
                        WHERE table_name = %s;
                    """
                    params = (tbl,)

        if params is not None:
            if not isinstance(params, (tuple, list)):
                params = (params,)
            self.cursor.execute(sql, params)
        else:
            self.cursor.execute(sql)
        return self

    def executemany(self, sql, params_list):
        if self.is_pg:
            sql = sql.replace("?", "%s")
            sql = re.sub(r"DATETIME\('now'\)", "CURRENT_TIMESTAMP", sql, flags=re.IGNORECASE)
        self.cursor.executemany(sql, params_list)
        return self

    def execute_tenant(self, sql, params=None, tenant_id=None):
        """Explicit tenant-aware execution wrapper with PostgreSQL RLS and dialect rewriting."""
        if tenant_id is None:
            tenant_id = get_current_tenant_id()
        if self.is_pg:
            try:
                self.cursor.execute("SET LOCAL app.current_tenant_id = %s;", (str(tenant_id),))
            except Exception:
                pass
        sql, params = rewrite_query(sql, params, tenant_id)
        return self.execute(sql, params)

    def executemany_tenant(self, sql, params_list, tenant_id=None):
        """Explicit tenant-aware batch execution wrapper with PostgreSQL RLS and dialect rewriting."""
        if tenant_id is None:
            tenant_id = get_current_tenant_id()
        if self.is_pg:
            try:
                self.cursor.execute("SET LOCAL app.current_tenant_id = %s;", (str(tenant_id),))
            except Exception:
                pass
        
        sample_params = params_list[0] if params_list else None
        rewritten_sql, _ = rewrite_query(sql, sample_params, tenant_id)
        
        new_params_list = []
        for params in params_list:
            _, new_params = rewrite_query(sql, params, tenant_id)
            new_params_list.append(new_params)
            
        return self.executemany(rewritten_sql, new_params_list)

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self.cursor, name)

class DialectConnection:
    def __init__(self, conn, is_pg_mode, pool=None):
        self.conn = conn
        self.is_pg = is_pg_mode
        self.pool = pool

    def set_tenant_context(self, tenant_id: int):
        """Sets PostgreSQL session-level tenant parameter for native Row-Level Security."""
        if self.is_pg:
            try:
                cur = self.conn.cursor()
                cur.execute("SET LOCAL app.current_tenant_id = %s;", (str(tenant_id),))
                cur.close()
            except Exception as e:
                print("[DB_UTILS] Failed to set tenant context:", str(e))

    def cursor(self):
        return DialectCursor(self.conn.cursor(), self.is_pg)

    def commit(self):
        try:
            self.conn.commit()
        except Exception:
            pass

    def rollback(self):
        try:
            self.conn.rollback()
        except Exception:
            pass

    def close(self):
        if self.is_pg and self.pool:
            try:
                # Reset tenant context parameter before recycling connection to pool
                try:
                    cur = self.conn.cursor()
                    cur.execute("RESET app.current_tenant_id;")
                    cur.close()
                except Exception:
                    pass
                self.pool.putconn(self.conn)
            except Exception:
                try:
                    self.conn.close()
                except Exception:
                    pass
        else:
            try:
                self.conn.close()
            except Exception:
                pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()

def get_db_connection(tenant_id: int = None):
    if tenant_id is None:
        tenant_id = get_current_tenant_id()
    if is_pg and pg_pool:
        try:
            conn = pg_pool.getconn()
            conn.autocommit = False
            dconn = DialectConnection(conn, True, pg_pool)
            dconn.set_tenant_context(tenant_id)
            return dconn
        except Exception as e:
            print("[DB_UTILS] Failed to get connection from pool, trying direct connection:", str(e))
    
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    return DialectConnection(conn, False)

# ─── Multi-Tenancy Context & Query Rewriter Helpers ──────────────────────────
_thread_local = threading.local()

def set_thread_tenant_id(tenant_id: int):
    """Sets tenant_id on active background thread."""
    _thread_local.tenant_id = tenant_id

def clear_thread_tenant_id():
    """Removes tenant_id from thread local context."""
    if hasattr(_thread_local, "tenant_id"):
        del _thread_local.tenant_id

def get_current_tenant_id() -> int:
    """Resolves the current tenant context from thread local or flask.g context."""
    if hasattr(_thread_local, "tenant_id"):
        return _thread_local.tenant_id
    from flask import has_request_context, g
    if has_request_context():
        if hasattr(g, "tenant_id") and g.tenant_id is not None:
            return g.tenant_id
    return 1

def rewrite_query(sql: str, params: Any, tenant_id: int) -> tuple[str, Any]:
    """Helper to transform query schemas dynamically for tenant isolation."""
    tenant_tables = {
        "users", "cases", "evidence", "notifications", "inbound_alerts",
        "comments", "timeline", "case_indicators",
        "evidence_relations", "investigation_jobs", "tool_permissions",
        "reports", "vector_records", "audit_log",
        "identity_providers", "directory_group_mappings", "sso_sessions",
        "retention_policies", "deletion_records", "ai_privacy_events"
    }
    
    words = set(re.findall(r"\b\w+\b", sql.lower()))
    target_tables = tenant_tables.intersection(words)
    if not target_tables:
        return sql, params
        
    sql_strip = sql.strip()
    has_semicolon = sql_strip.endswith(";")
    if has_semicolon:
        sql_strip = sql_strip[:-1].strip()
        
    sql_lower = sql_strip.lower()

    # Only rewrite standard DML commands
    if not (sql_lower.startswith("select") or 
            sql_lower.startswith("update") or 
            sql_lower.startswith("delete") or 
            sql_lower.startswith("insert")):
        orig_sql = sql_strip
        if has_semicolon:
            orig_sql += ";"
        return orig_sql, params
    
    # 1. Insert statements
    if sql_lower.startswith("insert into"):
        match = re.search(r"insert\s+into\s+(\w+)\s*\((.*?)\)\s*values\s*\((.*?)\)", sql_lower, re.DOTALL)
        if match:
            table_name = match.group(1)
            if table_name in tenant_tables:
                orig_match = re.search(r"insert\s+into\s+(\w+)\s*\((.*?)\)\s*values\s*\((.*?)\)", sql_strip, re.IGNORECASE | re.DOTALL)
                orig_table, cols_str, vals_str = orig_match.groups()
                
                new_cols = cols_str.strip() + ", tenant_id"
                
                placeholder = "?"
                if "%s" in vals_str:
                    placeholder = "%s"
                elif ":" in vals_str:
                    placeholder = ":tenant_id"
                
                new_vals = vals_str.strip() + f", {placeholder}"
                
                new_sql = f"INSERT INTO {orig_table} ({new_cols}) VALUES ({new_vals})"
                if has_semicolon:
                    new_sql += ";"
                
                if params is None:
                    new_params = (tenant_id,)
                elif isinstance(params, dict):
                    new_params = params.copy()
                    new_params["tenant_id"] = tenant_id
                elif isinstance(params, tuple):
                    new_params = params + (tenant_id,)
                elif isinstance(params, list):
                    new_params = list(params) + [tenant_id]
                else:
                    new_params = (params, tenant_id)
                return new_sql, new_params

    # 2. Select, Update, Delete statements
    clauses = ["order by", "group by", "limit", "offset"]
    split_pos = len(sql_strip)
    for c in clauses:
        pos = sql_lower.find(c)
        if pos != -1:
            split_pos = min(split_pos, pos)
            
    main_query = sql_strip[:split_pos].strip()
    tail_query = sql_strip[split_pos:].strip()
    
    main_lower = main_query.lower()
    
    placeholder = "?"
    if "%s" in main_query:
        placeholder = "%s"
    elif ":" in main_query:
        placeholder = ":tenant_id"
        
    num_placeholders_in_main = main_query.count("?") if placeholder == "?" else main_query.count("%s")
    
    if re.search(r"\bwhere\b", main_lower):
        new_main = main_query + f" AND tenant_id = {placeholder}"
    else:
        new_main = main_query + f" WHERE tenant_id = {placeholder}"
        
    new_sql = new_main
    if tail_query:
        new_sql += " " + tail_query
        
    if has_semicolon:
        new_sql += ";"
        
    if params is None:
        new_params = (tenant_id,)
    elif isinstance(params, dict):
        new_params = params.copy()
        new_params["tenant_id"] = tenant_id
    elif isinstance(params, (tuple, list)):
        params_list = list(params)
        params_list.insert(num_placeholders_in_main, tenant_id)
        new_params = tuple(params_list) if isinstance(params, tuple) else params_list
    else:
        if num_placeholders_in_main == 0:
            new_params = (tenant_id, params)
        else:
            new_params = (params, tenant_id)
            
    return new_sql, new_params
