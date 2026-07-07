# System Architecture Specification

This document maps the architectural design and system components interaction within Cygnal.

## 🧱 Component Block Design

```
                     ┌────────────────────────┐
                     │   Next.js Client UI    │
                     └──────────┬─────────────┘
                                │ (HTTP REST / JSON / Multipart)
                                ▼
                     ┌────────────────────────┐
                     │    Flask Web API       │
                     │  (Blueprints Router)   │
                     └────┬──────────────┬────┘
                          │              │
       (Sync CRUD)        ▼              ▼  (Async Spawn)
             ┌──────────────┐          ┌───────────────────────┐
             │ SQLite DB    │          │  Task Manager Queue   │
             │ (cygnal.db)  │          │  (Background Threads) │
             └──────────────┘          └─────────┬─────────────┘
                                                 │
                                                 ▼ (Polled Updates)
                                       ┌───────────────────────┐
                                       │ Security Scanners     │
                                       │ (DNS/Port/Whois/Exif) │
                                       └───────────────────────┘
```

## 🔄 Lifecycle Workflows

### Background Task Execution
1. **Request Dispatch:** Client hits `/api/header-scan` with input parameters.
2. **Worker Spawn:** Flask maps request to `task_manager.submit_task()`, which spins up a background Python thread and returns a unique `task_id` instantly.
3. **Status Polling:** Client starts polling `/api/task/<task_id>` every 1–2 seconds.
4. **Task Completion:** The thread writes the final scan result to the database logs and updates task status to `complete`. The client retrieves the result and terminates polling.

### Permissions Middleware Interceptor
Every scanner execution request passes through the `@scanners_bp.before_request` hook. The server decodes the caller's JWT token, queries `tool_permissions` overrides for target employee/team/department, and returns `403 Forbidden` if blocked.
