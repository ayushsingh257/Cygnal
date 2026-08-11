# Cygnal Backend Architecture Specification (v4.0)

The Cygnal backend is built on **Python 3.11+ / Flask 3.x** using an asynchronous **Gevent WSGI server**, designed for concurrent investigation workflows, real-time WebSockets, and background task dispatching.

---

## 🏛️ Directory Structure (`api/`)

```
api/
├── backend.py               # Flask application entrypoint & middleware registration
├── database.py              # Schema definitions (26 tables) & migration engine
├── db_utils.py              # PostgreSQL / SQLite dialect abstractor & connection pool
├── task_utils.py            # Dynamic task dispatcher (Celery or ThreadPool fallback)
├── celery_app.py            # Celery 5 task worker definitions & Redis broker config
├── socket_app.py            # Flask-SocketIO broadcast server with Redis Pub/Sub manager
├── auth_middleware.py       # @require_auth, @require_role, tenant context resolution
├── auth_utils.py            # bcrypt password hashing & credential verification
├── jwt_utils.py             # HS256 JWT creation, validation & JTI tracking
├── crypto_utils.py          # Cryptography Fernet encryption for provider credentials
├── rate_limit.py            # Sliding-window rate limiter (Redis Sorted Sets + memory fallback)
├── log_utils.py             # Structured JSON logging formatter
├── Dockerfile               # Multi-stage production container image
│
├── routes/
│   └── v2/                  # 12 Modular REST API Blueprints
│       ├── admin.py         # System health, metrics, tenants, audit log
│       ├── ai.py            # Heuristic RAG engine & vector stats
│       ├── auth.py          # /login, /register, /logout, profile
│       ├── cases.py         # Case CRUD, evidence, timeline, locks, graph, comments
│       ├── collaboration.py # User notifications, read status, roster
│       ├── copilot.py       # AI Copilot message, plan approval, summary
│       ├── investigations.py# Background scanner job status & polling
│       ├── mfa.py           # TOTP MFA setup, QR-code, verify
│       ├── reports.py       # Sealed forensic report lifecycle & share tokens
│       ├── scanners.py      # 10 security sensor scanner modules
│       ├── threat_intel.py  # Multi-feed enrichment & STIX/TAXII
│       └── webhooks.py      # SIEM webhook receiver, payload hashing, takeover
│
└── services/                # Core Business Logic & Algorithms
    ├── agent.py             # Autonomic agent execution loop
    ├── cache_service.py     # L1 Redis cache with 500ms circuit breaker
    ├── collaboration_service.py # Notification queues
    ├── copilot.py           # Intent classifier, plan builder, confidence scorer
    ├── extraction_pipeline.py # 14-entity regex IOC extractor
    ├── orchestrator.py      # Target classifier & parallel scanner coordinator
    ├── parser_registry.py   # Splunk, Sentinel & Generic SIEM parsers
    ├── vector_service.py    # 128-D TF-IDF Vectorizer & Cosine Similarity RAG
    ├── identity/            # Entra ID, SAML 2.0, Service Accounts, Session Manager
    └── threat_intel/        # VT, AbuseIPDB, Shodan, OTX, Censys, MISP, STIX/TAXII
```

---

## 🛡️ Security Middleware

1. **Security Headers**:
   - `Content-Security-Policy`: Restricts scripts, styles, and frames.
   - `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
   - `X-Frame-Options`: `DENY`.
   - `X-Content-Type-Options`: `nosniff`.
   - `Referrer-Policy`: `strict-origin-when-cross-origin`.

2. **Correlation ID Tracing**:
   - Injects `X-Correlation-ID` header on every request/response for end-to-end distributed log tracing.

3. **Sliding-Window Rate Limiting**:
   - Protects sensitive authentication routes against brute-force and dictionary attacks (5 requests / 5 minutes).
