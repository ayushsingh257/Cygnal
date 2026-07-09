# System Architecture Specification

This document maps the architectural design and system components interaction within Cygnal v3.5.

## 🧱 Component Block Design

```
                     ┌────────────────────────┐
                     │   Next.js Client UI    │
                     └──────────┬─────────────┘
                                │ (HTTP REST / WebSockets)
                                ▼
                     ┌────────────────────────┐
                     │    Flask Web API       │
                     │  (Blueprints Router)   │
                     └────┬──────────────┬────┘
                          │              │
       (Sync CRUD)        ▼              ▼  (Async Celery Task / SocketIO)
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

### 2. Session Revocation & Rate Limiting
- **Redis Rate Limiter:** Protects auth and webhook entrypoints using a sliding window window on Redis Sorted Sets.
- **Token Blocklist:** Maintains JWT IDs (`jti`) in a Redis cache blocklist to invalidate active user sessions instantly upon `/api/logout`.

### 3. Persistent Compliance Auditing
- Administrative actions, modifications to tool permissions overrides, and authentication failures write structured records to the db-backed `audit_log` repository, accessible via `/api/admin/audit` to compliance officers.

---
See [ARCHITECTURE_V2.md](file:///c:/Users/Ayush/OneDrive/Desktop/Cygnal/ARCHITECTURE_V2.md) for full architecture blueprints.
