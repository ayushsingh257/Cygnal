# System Architecture Specification

This document maps the architectural design and system components interaction within Cygnal v4.0.

## 🧱 Component Block Design

```
                     ┌────────────────────────┐
                     │   Next.js Client UI    │
                     └──────────┬─────────────┘
                                │ (HTTP REST / WebSockets)
                                ▼
                     ┌────────────────────────┐
                     │    Flask Web API       │ <─── [Health Metrics API]
                     │  (Blueprints Router)   │
                     └────┬──────────────┬────┘
                          │              │
       (Sync CRUD)        ▼              ▼  (Async Celery Task / SocketIO PubSub)
             ┌──────────────┐          ┌───────────────────────────┐
             │ SQLite / PG  │          │   Celery Broker (Redis)   │
             │ (Data Store) │          │  (with In-Memory Fallback)│
             └──────────────┘          └─────────────┬─────────────┘
                                                     │
                                                     ▼
                                       ┌───────────────────────────┐
                                       │   Task Worker Processes   │
                                       │ (Autonomic Agent Engine)  │
                                       └─────────────┬─────────────┘
                                                     │
                                                     ▼
                                       ┌───────────────────────────┐
                                       │   IOC Extraction Pipeline │
                                       │  (Unified Extractor Registry)│
                                       └───────────────────────────┘
```

## 🔄 Enterprise Lifecycle Workflows

### 1. Webhook Alert Ingestion & Agent Loop
1. **SIEM Webhook:** External alerts from Splunk or Sentinel POST raw payloads to `/api/webhooks/siem` signed with a secure `X-Cygnal-Webhook-Key`.
2. **Payload Hash & Ingestion:** The gateway computes a SHA-256 hash (`payload_hash`), stores it in `inbound_alerts`, and schedules a background Celery/Thread worker.
3. **Autonomic Agent Loop:** The worker creates an investigation case, parses data, runs the unified `ioc_pipeline` to extract Indicators of Compromise, triggers security scanners, and updates the live workspace via WebSockets.
4. **Analyst Take-Over:** An analyst can halt active autonomic loops via `/api/webhooks/alerts/<id>/take-over` to assume manual triage.

### 2. Multi-Tenancy & Data Isolation
- **Tenant Context:** Flask request middleware extracts `tenant_id` from JWT validation payloads and binds it to Flask's `g` context.
- **Query Rewriting:** Database interactions automatically rewrite SQL statements via `rewrite_query` to scope table records by the active `tenant_id`.
- **Preemption & SSO:** Strict registration mappings match users automatically to pre-onboarded domains (e.g., enterprise domain or invite code validation) instead of creating self-defined organizations.

### 3. High Availability Redis Synchronisation & L1/L2 Caching
- **Redis Pub/Sub Sync:** Active WebSocket events (cases, chats, notifications, agent logs) broadcast across multiple nodes utilizing Redis Pub/Sub synchronization.
- **Circuit Breaker Caching:** Employs L1 Redis Cache and L2 SQLite/PG fallback. Built-in socket timeouts (500ms) and error latching temporarily bypass Redis to maintain zero-stall request cycles when Redis is down.

### 4. Continuous Health & Metrics Monitoring
- **Metrics Ingress:** Endpoint `/api/health/metrics` computes CPU and Memory usage, tracking active DB connections and active Redis statuses for dashboard metrics.

---
See [ARCHITECTURE_V2.md](file:///c:/Users/Ayush/OneDrive/Desktop/Cygnal/ARCHITECTURE_V2.md) for full architecture blueprints.

