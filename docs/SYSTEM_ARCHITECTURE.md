# Cygnal System Architecture Specification (v4.0)

Cygnal is an AI-powered cybersecurity investigation cockpit engineered to eliminate investigator cognitive friction and accelerate Mean Time to Investigate (MTTI).

---

## 🏛️ High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PRESENTATION LAYER (Next.js 16)                               │
│  - 40 App Router Routes (React 19 / TypeScript 5 / TailwindCSS 4)                               │
│  - Interactive SVG Force-Directed Knowledge Graph & 7-Stage Chronological Timeline Narrator     │
│  - Split-Panel AI Copilot Workspace & Live Case Lease Locking Banner                            │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │ HTTPS / WebSocket (Socket.IO)
┌────────────────────────────────────────────────▼────────────────────────────────────────────────┐
│                                   API GATEWAY & MIDDLEWARE LAYER                                │
│  - Flask 3.x with Gevent Async WSGI Server & Strict Security Headers (CSP, HSTS, X-Frame-Options)│
│  - Centralized Auth Middleware (@require_auth, @require_role, JTI Session Revocation Ledger)    │
│  - Sliding-Window Rate Limiting (Redis Sorted Sets) & Correlation ID Tracing                    │
└──────────────────┬─────────────────────────────┬────────────────────────────┬───────────────────┘
                   │                             │                            │
┌──────────────────▼──────────┐   ┌──────────────▼──────────┐   ┌─────────────▼───────────────────┐
│     SECURITY SENSORS        │   │    COGNITIVE AI ENGINE  │   │     INTEGRATIONS & WEBHOOKS     │
│  - 10 Sensor Scanners       │   │  - 128-D TF-IDF Vector  │   │  - Pluggable SIEM Gateway       │
│    (WHOIS, DNS, Headers,    │   │    Database (Pure Py)   │   │    (Splunk, Sentinel, Generic)  │
│     Email, IP Rep, Malware, │   │  - Cosine-Similarity RAG│   │  - 9 Threat Intel Connectors    │
│     Screenshot, Metadata)   │   │  - 5-Intent Classifier  │   │    (VT, AbuseIPDB, Shodan, etc.)│
│  - 14-Entity IOC Extractor  │   │  - Multi-Agent Planner  │   │  - STIX 2.1 / TAXII 2.1 Feeds   │
└──────────────────┬──────────┘   └──────────────┬──────────┘   └─────────────┬───────────────────┘
                   │                             │                            │
┌──────────────────▼─────────────────────────────▼────────────────────────────▼───────────────────┐
│                                   DATA & ASYNC EXECUTION LAYER                                  │
│  - Unified Database Abstractor (`db_utils.py`): PostgreSQL 15 Pool + SQLite 3 Fallback          │
│  - Celery 5 Worker Pool with Redis 7 Broker & ThreadPool Dynamic Fallback                       │
│  - Redis Pub/Sub WebSocket Broadcast Scaling & L1 Cache with 500ms Circuit Breaker              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Architectural Components

### 1. Ingestion Gateway & Autonomic Agent Loop
- **SIEM Ingestion**: Inbound JSON alerts are received via `/api/webhooks/siem`, verified with an HMAC `X-Cygnal-Webhook-Key`, and hashed with SHA-256 for forensic integrity.
- **Pluggable Parsers**: Concrete parsers (`SplunkParser`, `SentinelParser`, `GenericParser`) map raw provider payloads into standardized event schemas.
- **Autonomous Agent Loop**: A background Celery worker parses IOCs, triggers parallel scans, correlates threat intelligence, and logs reasoning chains in real time.
- **Analyst Take-Over Gate**: Analysts can intervene at any step via `/api/webhooks/alerts/<id>/take-over` to transition control from autonomic agents to manual investigation.

### 2. Cognitive AI & 128-D Vector Database
- **Zero-Data-Leakage Guarantee**: 100% pure-Python execution without external cloud LLM API dependencies.
- **128-D TF-IDF Vectorizer**: Indexes case summaries, evidence profiles, and timeline events against a security vocabulary vector space.
- **Cosine-Similarity RAG**: Retrieves historical incident context and surfaces similar past attack vectors to the AI Copilot.
- **Multi-Agent Planner**: Formulates structured, multi-step investigation action plans with verification checks.

### 3. Collaboration & Real-Time Presence
- **Lease Locking**: Exclusive 30-second locks prevent multi-analyst write collisions during active evidence examination.
- **Redis Pub/Sub Sync**: Broadcasts presence, typing indicators, comments, and agent logs across distributed backend nodes.
