# Cygnal Enterprise Database Architecture Specification (v4.0)

Cygnal utilizes a unified, enterprise-grade database architecture engineered to operate seamlessly with **Supabase-hosted PostgreSQL** (managed production default with connection pooling, native Row-Level Security, and automated backups) as well as self-hosted PostgreSQL and **SQLite 3** (embedded zero-setup development fallback) via the `db_utils.py` dialect abstractor.

---

## 🏗️ Architecture & Dialect Translation

Database access is abstracted through `api/db_utils.py`, providing:
1. **Thread-Safe Connection Pooling**: PostgreSQL connections managed through `psycopg2.pool.ThreadedConnectionPool`.
2. **Transparent Dialect Mapping**: Automatic parameter translation (`?` placeholders in queries dynamically mapped to `%s` for PostgreSQL), function normalization (`DATETIME('now')` converted to `CURRENT_TIMESTAMP`), and schema introspection (`PRAGMA table_info` mapped to `information_schema.columns`).
3. **Multi-Tenant Context Binding**: Injected `tenant_id` context binding guaranteeing organization-level data segregation across 13 core tables.

```
┌──────────────────────────────────────────────────────────┐
│                   Flask API Blueprints                   │
└────────────────────────────┬─────────────────────────────┘
                             │
                  [ db_utils.py Abstractor ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Supabase Managed PostgreSQL ]    [ SQLite 3 Local ]
   (Production / Cloud Run / Pooler)  (Development / CI)
```

---

## 🗄️ Database Tables Schema (26 Tables)

### 1. Multi-Tenant Core & Organizations

#### `tenants`
Stores organizational tenant workspaces and configuration profiles.
```sql
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    retention_days INTEGER DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tenants_slug ON tenants(slug);
```

#### `users`
Investigator and administrative accounts with RBAC rank roles and MFA credentials.
```sql
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'director', 'soc_manager', 'red_lead', 'blue_lead', 'analyst', 'intern')),
    department TEXT,
    team TEXT,
    mfa_enabled INTEGER DEFAULT 0,
    mfa_secret TEXT,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

#### `user_identities`
Federated identity provider mapping for SSO (Entra ID, SAML 2.0, Google Workspace, Okta).
```sql
CREATE TABLE user_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    groups TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE
);
CREATE INDEX idx_user_identities_provider ON user_identities(provider, provider_user_id);
```

#### `user_sessions`
Active session registry supporting Zero-Trust JWT revocation (`jti` blocklist).
```sql
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    jti TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked INTEGER DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE
);
CREATE INDEX idx_user_sessions_jti ON user_sessions(jti);
```

#### `directory_group_mappings`
Enterprise IdP directory group to internal RBAC role mappings.
```sql
CREATE TABLE directory_group_mappings (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    group_name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `service_accounts`
Machine-to-machine (M2M) API client credentials and scopes for automated ingestion.
```sql
CREATE TABLE service_accounts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL UNIQUE,
    client_secret_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    scopes TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);
```

---

### 2. Incident Cases & Forensics Vault

#### `cases`
Central incident investigation workspace dossiers.
```sql
CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    case_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('open', 'investigating', 'closed')) DEFAULT 'open',
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_to TEXT,
    department TEXT,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_cases_tenant ON cases(tenant_id);
CREATE INDEX idx_cases_status ON cases(status);
```

#### `evidence`
Forensic evidence custody vault tracking file metadata, storage paths, and SHA-256 hashes.
```sql
CREATE TABLE evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL,
    file_type TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);
CREATE INDEX idx_evidence_case ON evidence(case_id);
CREATE INDEX idx_evidence_hash ON evidence(file_hash);
```

#### `timeline`
Immutable chronological audit history of all case lifecycle events.
```sql
CREATE TABLE timeline (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name TEXT NOT NULL,
    metadata TEXT,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);
CREATE INDEX idx_timeline_case ON timeline(case_id);
```

#### `case_indicators`
Extracted Indicators of Compromise (IOCs) correlated with case files.
```sql
CREATE TABLE case_indicators (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    indicator_type TEXT NOT NULL,
    indicator_value TEXT NOT NULL,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);
CREATE INDEX idx_case_indicators_val ON case_indicators(indicator_value);
```

#### `evidence_relations`
Graph edge correlations connecting evidence items, indicators, and cross-case links.
```sql
CREATE TABLE evidence_relations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
```

#### `case_locks`
Real-time 30-second lease locks for collaborative editing conflict resolution.
```sql
CREATE TABLE case_locks (
    case_id TEXT PRIMARY KEY,
    locked_by TEXT NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### `comments`
Real-time investigator chat feed associated with specific incident cases.
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);
```

---

### 3. SIEM Ingestion & Autonomous Agents

#### `inbound_alerts`
Raw SIEM alerts ingested via webhook gateway with SHA-256 payload integrity signatures.
```sql
CREATE TABLE inbound_alerts (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    event_type TEXT,
    severity TEXT NOT NULL,
    payload TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    case_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_inbound_alerts_status ON inbound_alerts(status);
```

#### `agent_logs`
Autonomous reasoning chains and pipeline tool execution steps.
```sql
CREATE TABLE agent_logs (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    thought TEXT,
    observation TEXT,
    status TEXT DEFAULT 'info',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_agent_logs_alert ON agent_logs(alert_id);
```

#### `investigation_jobs`
Asynchronous background scanner batch execution tracking.
```sql
CREATE TABLE investigation_jobs (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    target_type TEXT NOT NULL,
    target_value TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
```

---

### 4. Threat Intelligence & Vector Database

#### `ti_enrichment_cache`
L1 cache for multi-provider threat intelligence enrichment (VirusTotal, AbuseIPDB, Shodan, etc.).
```sql
CREATE TABLE ti_enrichment_cache (
    indicator_hash TEXT PRIMARY KEY,
    indicator_value TEXT NOT NULL,
    indicator_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    raw_response TEXT NOT NULL,
    verdict TEXT NOT NULL,
    reputation_score INTEGER,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### `ti_ioc_feed`
Aggregated threat intelligence indicators from STIX/TAXII, MISP, and URLhaus feeds.
```sql
CREATE TABLE ti_ioc_feed (
    id TEXT PRIMARY KEY,
    indicator_value TEXT NOT NULL,
    indicator_type TEXT NOT NULL,
    threat_type TEXT,
    confidence INTEGER DEFAULT 50,
    source TEXT NOT NULL,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ti_ioc_val ON ti_ioc_feed(indicator_value);
```

#### `ti_connector_config`
Encrypted provider API credentials and rate limit rules.
```sql
CREATE TABLE ti_connector_config (
    provider_name TEXT PRIMARY KEY,
    is_enabled INTEGER DEFAULT 0,
    api_key_encrypted TEXT,
    rate_limit_per_minute INTEGER DEFAULT 60,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `vector_records`
128-dimensional pure-Python TF-IDF term frequency vectors for semantic RAG search.
```sql
CREATE TABLE vector_records (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    text_content TEXT NOT NULL,
    vector_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_vector_records_tenant ON vector_records(tenant_id, entity_type);
```

---

### 5. Security Policies, Auditing & Reports

#### `lookups`
Operational scanner execution history and input/output telemetry.
```sql
CREATE TABLE lookups (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name TEXT NOT NULL,
    ip_address TEXT,
    tool TEXT NOT NULL,
    input TEXT NOT NULL,
    result TEXT NOT NULL
);
```

#### `tool_permissions`
Granular tool policy overrides (Employee, Team, Department level).
```sql
CREATE TABLE tool_permissions (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('employee', 'department', 'team')),
    target_name TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    allowed INTEGER NOT NULL CHECK (allowed IN (0, 1)),
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
```

#### `reports`
Forensic case reports with cryptographic share tokens for external verification.
```sql
CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
    share_token TEXT UNIQUE,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
```

#### `notifications`
Real-time user assignment and system collaboration notifications.
```sql
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    case_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON notifications(username, is_read);
```

#### `audit_log`
Database-backed administrative compliance and security event ledger.
```sql
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    target TEXT,
    details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    data_classification TEXT DEFAULT 'CONFIDENTIAL'
);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, timestamp);
```

---

### 7. Data Governance & Automated Retention Lifecycles (Phase 6)

#### `retention_policies`
Tenant-scoped lifecycle retention rules defining automated archival and deletion schedules by resource type and sensitivity classification.
```sql
CREATE TABLE retention_policies (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('cases', 'evidence', 'reports', 'audit_logs', 'vector_records')),
    classification_level TEXT NOT NULL CHECK (classification_level IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'TOP_SECRET')),
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    action_after_expiry TEXT NOT NULL CHECK (action_after_expiry IN ('ARCHIVE', 'DELETE', 'ANONYMIZE')),
    enabled INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_retention_policies_tenant ON retention_policies(tenant_id, resource_type, classification_level);
```

#### `deletion_records`
Permanent, unalterable ledger of cryptographic destruction certificates generated whenever a data object is purged.
```sql
CREATE TABLE deletion_records (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    deletion_reason TEXT NOT NULL,
    deleted_by TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verification_hash TEXT NOT NULL
);
CREATE INDEX idx_deletion_records_tenant ON deletion_records(tenant_id, deleted_at);
```

#### Data Classification Schema Fields
Every managed entity (`cases`, `evidence`, `reports`, `audit_log`, `vector_records`) includes standardized classification metadata:
- `data_classification TEXT DEFAULT 'INTERNAL'/'CONFIDENTIAL'` (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET)
- `classification_reason TEXT` (Audit justification for the assigned sensitivity)
- `classified_by TEXT` (Username or service account that assigned the label)
- `classified_at TEXT` (ISO 8601 UTC timestamp of classification)

---

### 8. AI Privacy & Zero-Data-Leakage Masking (Phase 7)

#### `ai_privacy_events`
Tenant-scoped immutable ledger tracking intercepted secrets, masked PII, prompt sanitizations, and model response redactions.
```sql
CREATE TABLE ai_privacy_events (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('PROMPT_SANITIZED', 'SECRET_BLOCKED', 'PII_MASKED', 'RESPONSE_REDACTED', 'EMBEDDING_SANITIZED')),
    detected_category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    action_taken TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ai_privacy_events_tenant ON ai_privacy_events(tenant_id, timestamp);
CREATE INDEX idx_ai_privacy_events_type ON ai_privacy_events(event_type);
```

#### `vector_records` Privacy Protection Fields
The `vector_records` table incorporates pre-embedding sanitization metadata:
- `privacy_filtered INTEGER DEFAULT 0` (1 if passed through AI Privacy Gateway)
- `masking_applied INTEGER DEFAULT 0` (1 if PII or credentials were masked)
- `original_hash TEXT` (SHA-256 fingerprint of original text prior to sanitization)

---

## 🔄 Schema Migration Engine

The `database.py` initialization process runs idempotently on backend startup:
1. **Dialect Detection**: Identifies whether the active connection is PostgreSQL or SQLite.
2. **Dynamic Column Verification**: Inspects table metadata to verify missing columns and applies `ALTER TABLE ADD COLUMN` safely.
3. **Index Creation**: Ensures all B-Tree indexes exist for high-frequency queries.
4. **Seed Provisioning**: Inserts default admin credentials and tenant boundaries if the database is unpopulated.


