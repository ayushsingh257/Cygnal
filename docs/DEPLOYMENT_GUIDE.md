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

## 🔒 Production Hardening Checklist

1. **Change Default Secrets**: Never deploy with example `JWT_SECRET`, `CYGNAL_WEBHOOK_SECRET`, or `CYGNAL_ADMIN_PASSWORD`.
2. **Enforce HTTPS / TLS**: Terminate TLS at a reverse proxy (Nginx / Cloudflare / AWS ALB) with strict HSTS headers enabled.
3. **Database Backups**: Schedule automated daily pg_dump backups of PostgreSQL volume `pgdata`.
4. **Rate Limit Tuning**: Configure `api/rate_limit.py` sliding-window thresholds according to your organization's traffic capacity.
