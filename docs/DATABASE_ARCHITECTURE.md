# Database Architecture Specification

Cygnal v1.0 uses a relational SQLite database located at `api/cygnal.db`.

## 🗄️ Database Tables Schema

### 1. `users`
Tracks employee accounts and operational locations.
```sql
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'director', 'soc_manager', 'red_lead', 'blue_lead', 'analyst', 'intern')),
    department TEXT,
    team TEXT,
    created_at TEXT
);
```

### 2. `cases`
Incident workspaces folders.
```sql
CREATE TABLE cases (
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
```

### 3. `evidence`
Uploaded forensic files custody ledger.
```sql
CREATE TABLE evidence (
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
```

### 4. `timeline`
Incident activity history.
```sql
CREATE TABLE timeline (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT DEFAULT (DATETIME('now')),
    user TEXT,
    metadata TEXT,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);
```

### 5. `lookups`
Scanner audit logs.
```sql
CREATE TABLE lookups (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    user TEXT,
    ip TEXT,
    tool TEXT,
    input TEXT,
    result TEXT
);
```

### 6. `tool_permissions`
Admin tool policy overrides.
```sql
CREATE TABLE tool_permissions (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('employee', 'department', 'team')),
    target_name TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    allowed INTEGER NOT NULL CHECK (allowed IN (0, 1)),
    created_by TEXT,
    created_at TEXT DEFAULT (DATETIME('now'))
);
```

### 7. `reports`
Compiled PDF/Print-ready summaries.
```sql
CREATE TABLE reports (
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
```

## 🔄 Schema Migration Strategy
The `database.py` entrypoint is invoked by the Flask initialization thread on startup. It runs:
1. `PRAGMA table_info(table_name)` calls to inspect column availability.
2. `ALTER TABLE` statements to inject missing fields (e.g. `department`, `team`, `assigned_to`).
3. Renaming of old tables (e.g., `users` to `users_old`) if structural conversions are required, retaining data without service loss.
