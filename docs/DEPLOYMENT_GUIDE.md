# Cygnal Production Deployment & Operations Guide (v4.0)

This guide details the deployment architecture, configuration parameters, and orchestration steps for running Cygnal in enterprise containerized environments.

---

## 🏗️ Production Topology (Docker Compose)

Cygnal is organized as a multi-container architecture using Docker Compose:

```
                          [ Client Browser / SIEM Webhooks ]
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼ (Port 3001)                                 ▼ (Port 5000)
        ┌─────────────────────┐                       ┌─────────────────────┐
        │  cygnal_frontend    │                       │   cygnal_backend    │
        │  (Next.js 16 Node)  │ ──(API Proxy Rewrites)─► (Flask Gevent WSGI)│
        └─────────────────────┘                       └──────────┬──────────┘
                                                                 │
                                     ┌───────────────────────────┼───────────────────────────┐
                                     ▼                           ▼                           ▼
                          ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
                          │      cygnal_db      │     │    cygnal_redis     │     │cygnal_celery_worker │
                          │   (PostgreSQL 15)   │     │    (Redis 7 PubSub) │     │ (Background Scans)  │
                          └─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## ⚙️ Environment Configuration (`.env`)

Copy `.env.example` to `.env` in the root workspace directory before starting:

```ini
# --- Database Configuration ---
POSTGRES_USER=cygnal_admin
POSTGRES_PASSWORD=your_super_secret_postgres_password_here
POSTGRES_DB=cygnal_prod
DATABASE_URL=postgresql://cygnal_admin:your_super_secret_postgres_password_here@db:5432/cygnal_prod

# --- Redis & Celery Background Queue ---
REDIS_URL=redis://redis:6379/0
USE_CELERY=true

# --- Cryptographic Security Keys ---
JWT_SECRET=generate_a_cryptographically_secure_random_64_char_secret_key_here
CYGNAL_WEBHOOK_SECRET=generate_a_secure_webhook_secret_key_for_siem_ingest_here
CYGNAL_FERNET_KEY=base64_32byte_fernet_key_for_encrypting_provider_api_tokens

# --- Initial Admin Account Provisioning ---
CYGNAL_ADMIN_USERNAME=admin
CYGNAL_ADMIN_PASSWORD=your_initial_admin_bootstrap_password_here

# --- Network & Ports ---
PORT=5000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
NEXT_PUBLIC_API_URL=http://localhost:5000

# --- Threat Intelligence Provider Keys (Optional) ---
VIRUSTOTAL_API_KEY=
ABUSEIPDB_API_KEY=
SHODAN_API_KEY=
OTX_API_KEY=
CENSYS_API_ID=
CENSYS_API_SECRET=
```

---

## 🚀 Running via Docker Compose

### 1. Build and Launch Containers
```bash
docker-compose up -d --build
```

### 2. Verify Container Health
```bash
docker-compose ps
```
All containers (`cygnal_db`, `cygnal_redis`, `cygnal_backend`, `cygnal_celery_worker`, `cygnal_frontend`) should report healthy states.

### 3. Verify Health Endpoints
- **Liveness Probe**: `curl http://localhost:5000/api/health`
- **Readiness Probe**: `curl http://localhost:5000/api/ready`
- **Frontend UI**: Open `http://localhost:3001` in your browser.

---

## 💻 Local Developer Setup (Bare Metal)

### Backend (Python 3.11+)
```bash
cd api
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # Linux/macOS

pip install -r ../requirements.txt
python backend.py          # Starts Gevent WSGI on port 5000
```

### Frontend (Node.js 20+)
```bash
cd frontend
npm install
npm run dev -- -p 3001     # Starts Next.js development server on port 3001
```

---

## 🔐 Enterprise Secrets Management (GCP Secret Manager / HashiCorp Vault)

Cygnal v4.0 supports dynamic runtime secrets injection and automated rotation via pluggable providers:

### 1. Provider Selection (`SECRET_PROVIDER`)
Set `SECRET_PROVIDER` in your environment or orchestrator (Kubernetes / ECS / Cloud Run):
- `env`: Local environment variables / `.env` files (Development / Test only).
- `gcp`: Google Cloud Secret Manager (Production GCP / GKE).
- `vault`: HashiCorp Vault KV v2 (Production Multi-Cloud / On-Premise).

### 2. Google Cloud Secret Manager Setup
1. Enable Secret Manager API: `gcloud services enable secretmanager.googleapis.com`
2. Configure Service Account with `roles/secretmanager.secretAccessor`.
3. Set environment variables:
   ```bash
   SECRET_PROVIDER=gcp
   GCP_PROJECT_ID=your-gcp-project-id
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-credentials.json
   ```
4. Create secrets in GCP Secret Manager matching required keys: `JWT_SECRET`, `JWT_SECRET_CURRENT`, `DATABASE_URL`, `CYGNAL_MASTER_KEK`.

### 3. HashiCorp Vault KV v2 Setup
1. Enable KV v2 secrets engine: `vault secrets enable -path=secret kv-v2`
2. Store secrets: `vault kv put secret/cygnal/JWT_SECRET value="..."`
3. Configure environment variables:
   ```bash
   SECRET_PROVIDER=vault
   VAULT_ADDR=https://vault.internal.corp:8200
   VAULT_TOKEN=s.yourProductionVaultToken
   VAULT_MOUNT_POINT=secret
   VAULT_PATH_PREFIX=cygnal
   ```

### 4. Zero-Downtime JWT Secret Rotation Workflow
To rotate JWT signing keys without logging out active users:
1. Push new key to `JWT_SECRET_CURRENT`.
2. Move previous key to `JWT_SECRET_PREVIOUS`.
3. Configure `JWT_ROTATION_GRACE_HOURS=24` (default: 24h).
4. New logins receive tokens signed with `JWT_SECRET_CURRENT`; existing tokens signed with `JWT_SECRET_PREVIOUS` continue to validate for 24 hours.

---

## 🗄️ Automated Data Governance & Retention Worker

Cygnal v4.0 includes an automated background retention lifecycle scheduler that scans managed entities, evaluates sensitivity policies, and executes cryptographic destruction or archival.

### 1. Cron / Kubernetes CronJob Deployment
To trigger automated retention passes on a recurring schedule (e.g. daily at midnight UTC):

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cygnal-retention-worker
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: retention-worker
            image: cygnal-backend:v4.0
            command: ["python", "-c", "from services.governance.scheduler import RetentionScheduler; RetentionScheduler.run_lifecycle_cycle(dry_run=False)"]
            envFrom:
            - secretRef:
                name: cygnal-secrets
          restartPolicy: OnFailure
```

### 2. Environment Configurations
- `RETENTION_SCHEDULER_ENABLED`: Enables automated cron passes (`true`/`false`, default: `true`).
- `RETENTION_DRY_RUN`: Runs evaluation in simulation mode (`true`/`false`, default: `false`).
- `STORAGE_PROVIDER`: Active evidence storage driver (`local`, `s3`, `gcs`) for automated object purges.

---

## 🛡️ AI Privacy & Zero-Data-Leakage Configuration

The AI Privacy Gateway operates by default on all incoming prompts, RAG context lookups, and model completions.

### Environment Controls
- `AI_PRIVACY_STRICT_SECRETS`: Rejects outbound requests containing critical credentials (`true`/`false`, default: `true`).
- `AI_PRIVACY_MASKING_PROVIDER`: Primary outbound model classification (`external` / `internal`, default: `external`).
- `AI_PRIVACY_AUDIT_ENABLED`: Enforces immutable audit logging to `ai_privacy_events` (`true`/`false`, default: `true`).

---

## 🔒 Production Hardening Checklist

1. **Production Startup Verification**: When `ENVIRONMENT=production`, Cygnal rejects startup if mandatory keys (`JWT_SECRET`, `CYGNAL_MASTER_KEK`) are missing or using default placeholders.
2. **Enforce HTTPS / TLS**: Terminate TLS at a reverse proxy (Nginx / Cloudflare / AWS ALB) with strict HSTS headers enabled.
3. **Database Backups**: Schedule automated daily pg_dump backups of PostgreSQL volume `pgdata`.
4. **Rate Limit Tuning**: Configure `api/rate_limit.py` sliding-window thresholds according to your organization's traffic capacity.
5. **Secret Access Audit Logging**: Secret access events are tracked in runtime memory logs without ever revealing secret plaintext.
6. **Cryptographic Proof Ledger**: Audit logs and `deletion_records` verification hashes are immutable and should be backed up with append-only permissions.
7. **AI Privacy Gateway**: Ensure `AI_PRIVACY_STRICT_SECRETS=true` in production to prevent unintended cloud credential disclosures.



