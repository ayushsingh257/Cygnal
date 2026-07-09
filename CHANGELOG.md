# Cygnal — Changelog

All notable changes to Cygnal are documented in this file. Cygnal follows a development era model where each era represents a fully verified, production-ready feature package.

---

## [v3.5.0-RC1] — 2026-07-09 — Production Hardening & Security Remediation (v3.5)

### Added
- **Authentication & Authorization Hardening** — Restricted user registration (`/api/register`) to low-privilege roles, introduced an admin-only seeding endpoint (`POST /api/admin/users/create`), secured websocket room join events with JWT verification, and consolidated access checking into a reusable `@require_role` decorator.
- **Session Security** — Added JWT ID (`jti`) claims to all tokens, and created a blocklist check in middleware coupled with a `/api/logout` endpoint backed by Redis/in-memory cache.
- **Enterprise Operations** — Implemented sliding window rate limiting via Redis Sorted Sets (with memory fallback). Standardized database-backed audit logging (`api/routes/v2/admin.py`) for administrative queries (`GET /api/admin/audit`). Configured Flask request limits (`MAX_CONTENT_LENGTH`) to 10MB to protect against heap-exhaustion attacks.
- **Reliability & Scaling** — Resolved concurrency race conditions on case numbering by generating collision-resistant strings (year + random suffix). Provided live `/api/health` and `/api/ready` monitoring routes. Unified threat regex extractors into a single `ioc_pipeline` registry.
- **Automated Verification** — Scaled unit tests from 88 to 98 green tests, establishing robust regression checks for the complete security layer.

---

## [v3.0.0-RC1] — 2026-07-08 — Connected Integrations & Agentic Loops (v3.0 / v3.5)

### Added
- **Pluggable SIEM Ingestion Gateway (`api/routes/v2/webhooks.py`)** — Created `/api/webhooks/siem` endpoint authenticated via `X-Cygnal-Webhook-Key` header matching `CYGNAL_WEBHOOK_SECRET`. Performs forensic payload integrity checks by generating SHA-256 hashes (`payload_hash`) of raw payloads upon receipt.
- **Pluggable SIEM Parser Registry (`api/services/parser_registry.py`)** — Designed a pluggable provider registry matching inbound alerts to standard schemas. Features concrete parsers for `SplunkParser` (expects fields in `result`), `SentinelParser` (expects fields in `properties`), and `GenericParser` fallback with auto-detection fingerprints.
- **Modular IOC Extraction Pipeline (`api/services/extraction_pipeline.py`)** — Refactored threat extraction into a pipeline of specialized entity extractors: `IPv4Extractor` (filtering RFC1918), `IPv6Extractor`, `DomainExtractor`, `URLExtractor` (stripping trailing punctuation), `EmailExtractor`, `FileHashExtractor` (MD5/SHA1/SHA256), and `CVEExtractor`.
- **Autonomic Agent Loop Engine (`api/services/agent.py`, `api/celery_app.py`)** — Engineered background loop processors (Celery and thread fallback) that auto-create cases, assign severity, extract threat indicators, schedule scanner dispatches, and log reasoning chains.
- **Analyst Interruption "Take Over" Gate (`api/routes/v2/webhooks.py`)** — Added `/api/webhooks/alerts/<id>/take-over` to interrupt background execution, update status to failed (Needs Analyst), and transfer manual control to the analyst.
- **Real-Time WebSocket Rooms (`api/socket_app.py`)** — Added client events `join_alert` and `leave_alert` allowing analysts to monitor real-time autonomic agent steps and threat indicators.
- **Alert Triage Board (`frontend/app/alerts/page.tsx`)** — Built a triage dashboard featuring alert status badges (Queued, Running, Completed, Needs Analyst), raw payload inspector, dynamic IOC list, payload integrity validation status, and inline takeover controls.
- **Dynamic Multi-Agent Console (`frontend/app/agents/page.tsx`)** — Refactored multi-agent interface to stream live webhook agent logs or fall back to simulated pipeline checks if accessed directly.
- **Webhooks & Ingest Integration Tests (`api/tests/test_webhooks.py`)** — Created test suite covering SIEM parsing, pipeline extractions, API ingestion auth, paginated queries, and takeover aborts. All 88 tests passing.

---

## [v2.5.1-Security] — 2026-07-08 — Security Hardening Review & Remediation

### Added
- **Authentication Checks on Protected Routes** — Enforced token validation checks on all protected case, copilot, investigation, and scanner endpoints. Any unauthenticated requests now return `401 Unauthorized`.
- **API Request Rate Limiting (`api/rate_limit.py`)** — Implemented an in-memory rate limiter protecting public authentication `/login` and `/register` endpoints against brute-force guessing and dictionary attacks. Standardized bypass checks for the pytest automation harness.
- **Secure HTTP Headers Middleware (`api/backend.py`)** — Added a global `@app.after_request` handler enforcing standard security headers: `CSP`, `HSTS` (max-age 1 year), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Fail-Fast Configuration Verification (`api/jwt_utils.py` & `api/auth_utils.py`)** — Prevented application startup if the critical `JWT_SECRET` environment variable is not defined, protecting token signatures. Shifted admin account credentials configuration out of source files to secure environment variables (`CYGNAL_ADMIN_USERNAME` and `CYGNAL_ADMIN_PASSWORD`).
- **Production CORS Integration** — Configured dynamic CORS origin verification from the environment variables `CORS_ORIGINS` to prevent wildcard origin exposures in production.

---

## [v2.5.0-RC1] — 2026-07-08 — Collaborative Security Cockpit v2.5

### Added
- **Real-Time WebSocket Server (`api/socket_app.py`, `api/backend.py`)** — Configured a high-performance Flask-SocketIO broadcast server backing WebSocket channels. Enables analysts to subscribe to rooms matching specific cases.
- **Case Comments API (`api/routes/v2/cases.py`)** — Added routes (`GET /api/cases/<id>/comments`, `POST /api/cases/<id>/comments`) to fetch and save collaborative comments, broadcasting new notes to Socket.IO channels.
- **Case Edit Lease Locking (`api/routes/v2/cases.py`)** — Implemented temporary 30-second locks (`POST /api/cases/<id>/lock`, `POST /api/cases/<id>/unlock`, `GET /api/cases/<id>/lock`) allowing analysts to exclusively lock cases for editing. Broadcasts dynamic lock and unlock states.
- **Interactive Collaborative HUD Panel (`frontend/app/cases/page.tsx`)** — Built a real-time header banner detailing case locking status (Locked, Unlocked, Locked by You).
- **Live Comments Chat Pane (`frontend/app/cases/page.tsx`)** — Embedded an interactive chat feed in case workspace views receiving dynamic WebSockets comments broadcasts.
- **Updated Landing Page (`frontend/app/page.tsx`)** — Expanded platform documentation cards highlighting version 2.5 real-time chat, case lease locking, multi-factor auth, dynamic task adapter pools, and container composition.

---

## [v2.0.0-RC1] — 2026-07-08 — Enterprise-Grade Workspace Hardening v2.0

### Added
- **Unified Database Abstractor (`api/db_utils.py`)** — Dynamic connection factory routing database operations to PostgreSQL pools in production or falling back to SQLite locally. Transparent SQL dialect translation handles placeholders (`?` ➔ `%s`), datetime functions (`DATETIME('now')` ➔ `CURRENT_TIMESTAMP`), primary keys, and schema inspection (PRAGMA ➔ information_schema).
- **Celery & Redis Task Dispatcher (`api/celery_app.py`, `api/task_utils.py`)** — Standardized background Celery tasks backed by Redis with transparent fallback routing to local in-memory Threads if queue brokers are not active.
- **Time-Based One-Time Password MFA (`api/routes/v2/mfa.py`)** — Added setup, QR-code provisioning URL generation, and verification endpoints using `pyotp`.
- **MFA Login Challenge (`api/routes/v2/auth.py`)** — Added check to block standard session token generation for MFA-enabled accounts, forcing redirect redirect challenges.
- **MFA Setup Settings Panel (`frontend/app/settings/page.tsx`)** — Created an interactive configurations block displaying secret keys and code verification forms to enable MFA.
- **MFA Login Challenge Form (`frontend/app/login/page.tsx`)** — Built a glassmorphic verification card requiring the 6-digit TOTP token to validate authentications.
- **Docker Orchestration Configs (`api/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`)** — Engineered multi-stage Dockerfiles for optimized production images and composed db/redis/worker/api/frontend configurations.
- **MFA Authentication Test Suite (`api/tests/test_auth.py`)** — Expanded test runner coverage checking MFA setup, TOTP code verify matching, and challenge login loops. All passing (79/79 passing).

---

## [v1.5.0-RC1] — 2026-07-08 — Autonomous Investigation Workspace v1.5 Sprints

### Added
- **Sprint 4B: AI Investigation Copilot**
  - **Backend: `api/services/copilot.py`** — Built the full Copilot intelligence engine: 5-intent classifier (`INVESTIGATE_TARGET`, `EXPLAIN_CASE`, `SUMMARIZE_FINDINGS`, `RECOMMEND_NEXT_STEPS`, `ANSWER_QUESTION`), IOC extractor from free text (IPv4, IPv6, URL, domain, email, SHA-256/MD5/SHA-1, CVE), investigation plan builder with per-IOC scanner recommendations, confidence scoring engine, and 5 structured markdown response formatters (each including Executive Summary, IOCs, Reasoning, Confidence, Recommended Actions).
  - **Backend: `api/routes/v2/copilot.py`** — Added `POST /api/copilot/message` (intent + RAG + structured response), `POST /api/copilot/approve` (human-in-the-loop approval gate that invokes the Sprint 4A Orchestrator service functions directly), and `GET /api/copilot/summary/<case_id>` (post-investigation auto-summary).
  - **Backend: `api/backend.py`** — Registered `copilot_bp` blueprint routing under `/api` prefix.
  - **Frontend: `frontend/app/copilot/page.tsx`** — Built the AI Investigation Copilot workspace: split-panel layout with chat thread (left) and live status/workflow panel (right). Features IOC chip display, structured markdown renderer, inline Investigation Plan approval card, live JobProgressHUD with animated progress bar, post-completion auto-summary trigger, and 6 quick-action suggestion chips.
  - **Frontend: `frontend/components/DashboardShell.tsx`** — Added "AI Investigation Copilot" navigation entry pointing to `/copilot`.
  - **Tests: `api/tests/test_copilot.py`** — Created 33-test suite covering intent classification (7), IOC extraction (7), plan building (5), pipeline processing (4), structured format enforcement (1), and API endpoint validation (9). All 33 passing.
  - **Total test coverage: 78/78 passing** after Sprint 4B.

- **Sprint 4A: Autonomous Investigation Orchestrator**
  - **Backend: `api/services/orchestrator.py`** — Built the orchestrator service logic: input target format auto-classifier, parallel scanner planner, thread pooled background execution workers, and automatic timeline/graph callbacks.
  - **Backend: `api/routes/v2/investigations.py`** — Added `POST /api/investigations/start`, `GET /api/investigations/<job_id>`, and `GET /api/investigations/<job_id>/results` endpoints.
  - **Backend: `api/database.py`** — Updated database initialization schemas to create `investigation_jobs` tracking table.
  - **Backend: `api/backend.py`** — Registered `investigations_bp` blueprint routing under `/api` prefix.
  - **Frontend: `app/cases/page.tsx`** — Integrated the live Progress Dashboard HUD panel showing elapsed timer, active pipeline step, progress bars, scanners checklist, and auto-updating Knowledge Graph/Timeline.
  - **Tests: `api/tests/test_orchestrator.py`** — Created integration test suite verifying classification, execution plans, and polling endpoints (45/45 passing).

- **Sprint 3: AI Investigation Timeline**

  - **Backend: `api/routes/v2/cases.py`** — Added `GET /api/cases/<case_id>/timeline` endpoint aggregating case details, evidence uploads, IOC extractions, threat intel tags, relations, Notes, and scan histories into 7 stages.
  - **AI Engine: Heuristic Narration Service** — Automatically compiles natural language narative summaries for each stage using verified data context without external API dependencies.
  - **Frontend: `app/cases/page.tsx`** — Interactive stages accordion timeline using Lucide icons, metadata badges, timestamps, expand/collapse toggles, and AI Narrator summary panels.
  - **Tests: `api/tests/test_extractor.py`** — Added `test_get_case_timeline_stages` integration test.

- **Sprint 2: Interactive SVG Knowledge Graph**
  - **Backend: `api/routes/v2/cases.py`** — Added `GET /api/cases/<case_id>/graph` endpoint returning case, evidence, indicators, and cross-case evidence correlations.
  - **Frontend: `app/cases/page.tsx`** — Fully implemented high-performance SVG link graph using a custom client-side Force-Directed Layout, search filters, zoom/pan controls, neighbor highlighting, and live HUD overlays.
  - **Tests: `api/tests/test_extractor.py`** — Added `test_get_case_graph` integration test checking graph retrieval.
- **Sprint 1: Automatic IOC Extraction Engine**
  - **Backend: `api/services/extractor.py`** — Added regex-based parser supporting all 14 entity patterns (IPv6, registry paths, process names, system domains, and hashes).
  - **Backend: `api/routes/v2/cases.py`** — Implemented `POST /api/cases/<case_id>/extract-iocs` returning parsed entities, and linking timeline events.
  - **Backend: `api/database.py`** — Created SQLite tables `case_indicators` and `evidence_relations` with index optimizations.
  - **Tests: `api/tests/test_extractor.py`** — Added 3 integration and unit tests for extractor service and routes.

---

## [Era 5] — 2026-07-07 — Analytics, Reports & AI RAG Workspace


### Added
- **Backend: `api/routes/v2/ai.py`** — SQLite-context RAG engine that correlates user prompts against live cases, timeline events, evidence hashes, and scanner logs. Returns structured investigator analysis reports.
- **Backend: `api/routes/v2/reports.py`** — Full forensic report lifecycle: create, list, retrieve by ID, and publicly share via UUID token.
- **Backend: `api/backend.py`** — Registered `ai_bp` and `reports_bp` blueprints under `/api` prefix.
- **Frontend: `app/chat/page.tsx`** — RAG AI Chat Workspace with terminal-style message bubbles, suggestion chips, and real-time RAG database correlation queries.
- **Frontend: `app/agents/page.tsx`** — Multi-Agent AI Orchestrator simulating 4 parallel pipeline agents (OSINT Recon, Malware Analysis, Custody Auditor, Executive Compiler) with log streaming and summary blocks.
- **Frontend: `app/reports/page.tsx`** — A4-printable forensic reports compiler with case association, share token generation, print stylesheet injection, and report history registry.
- **Frontend: `app/reports/share/[token]/page.tsx`** — Public, auth-free sealed report preview with evidence SHA-256 hash verification and chain of custody signatures.
- **Frontend: `app/analytics/page.tsx`** — Role-tailored analytics cockpit with custom SVG bar charts (scans by tool), SVG area/line charts (7-day triage trends), and HUD telemetry stat cards.
- **Frontend: `app/admin/page.tsx`** — Admin registry: user creation form and active investigator node listing.
- **Frontend: `app/admin/audit/page.tsx`** — System auditing ledger displaying cryptographic operation logs in a tabular dashboard.
- **Frontend: `app/profile/page.tsx`** — Investigator node profile card showing role, department, team, and verification status.
- **Frontend: `app/settings/page.tsx`** — Node configuration settings with API key reveal toggle and scan interval control.
- **Frontend: `components/ui/sparkles.tsx`** — Linarui-inspired Sparkles particle background component using `@tsparticles/react` v4 `ParticlesProvider` pattern. Displays on homepage bottom section.
- **Frontend: `components/ui/particle-loader.tsx`** — Canvas rising-particle loading screen with conic spotlight sweeps in Cygnal brand palette.
- **Frontend: `app/login/page.tsx`** — Complete redesign to Cygnal deep-teal/green/ice-teal brand: glassmorphic card, gradient action button, and `#091413` background.
- **Frontend: `app/register/page.tsx`** — Complete redesign matching login design language; removed all "Sentinel" references.
- **Frontend: `app/page.tsx`** — Added Sparkles validation banner section at homepage bottom: "Trusted by Global Intelligence Units" with SOC 2, FIPS 140-3, ISO 27001, and Common Criteria badges.
- **Tests: `api/tests/test_ai.py`** — 3 tests: prompt validation, RAG case correlation, multi-agent pipeline structure.
- **Tests: `api/tests/test_reports.py`** — 1 lifecycle test covering create, list, retrieve, and public share token.
- **npm: `@tsparticles/react`, `@tsparticles/slim`, `@tsparticles/engine`** — Installed particle animation dependencies.

### Fixed
- `.strip()` → `.trim()` in `app/chat/page.tsx` (Python method used in TypeScript).
- `initParticlesEngine` import: Updated `sparkles.tsx` to use `ParticlesProvider` initialization API required by `@tsparticles/react` v4.x.

### Verified
- **Backend:** `pytest tests -v` — **36/36 PASSED**, 0 failures.
- **Frontend:** `next build` — **Compiled successfully**, 31 routes generated, 0 TypeScript errors.
- **Git:** Committed `49df629`, pushed to `origin/main`.

---

## [Era 4] — 2026-07-06 — Multi-Sensor Engine & Policy Overrides

### Added
- 10 investigation scanner endpoints: WHOIS, HTTP Headers, Metadata Extractor, DNS Intelligence, Email Header Analyzer, IP Reputation, Malware Scanner, Screenshot Capture, Reverse Image Search, Threat Intelligence.
- `api/routes/v2/scanners.py` — Multi-sensor backend with lookup log persistence.
- `api/database.py` — `tool_permissions` table for per-employee/team/department scanner policy overrides.
- `frontend/app/scanners/` — 11-page scanner directory with per-tool dedicated modules, severity badges, confidence indicators, timeline attachment, and export controls.
- **Tests:** `tests/test_scanners.py` — 22/22 passing.

---

## [Era 3] — 2026-07-05 — Case Ledger, Timeline & SOC Dashboard

### Added
- `api/routes/v2/cases.py` — Incident case CRUD, timeline event logger, SHA-256 evidence upload and custody vault.
- `frontend/app/dashboard/page.tsx` — SOC Operations Hub with health score ring, stat cards, scanner module status grid, and activity feed.
- `frontend/app/cases/page.tsx` — Investigation workspace with timeline ledger, evidence vault, and IOC SVG link graph.
- `frontend/components/DashboardShell.tsx` — Role-filtered sidebar navigation with icon links, user role badge, and Cygnal logo.
- `frontend/app/globals.css` — Complete enterprise design system: glassmorphism tokens, badge variants, data table styles, animations.
- **Tests:** `tests/test_cases.py` — 3/3 passing.

---

## [Era 2] — 2026-07-04 — Identity Registry & Authentication

### Added
- `api/database.py` — SQLite schema initializer for all platform tables.
- `api/jwt_utils.py` — HS256 JWT token generation and decode.
- `api/auth_utils.py` — bcrypt password hashing, admin seeding, and database initialization.
- `api/routes/v2/auth.py` — Registration, login, profile update, password change endpoints.
- `frontend/app/login/page.tsx` — Investigator login interface.
- `frontend/app/register/page.tsx` — New node registration form.
- `frontend/store/useAuthStore.ts` — Zustand auth store with localStorage JWT persistence.
- **Tests:** `tests/test_auth.py` — 3/3 passing.

---

## [Era 1] — 2026-07-03 — System Design Specifications

### Added
- `README.md` — Project overview, feature list, and setup guide.
- `ROADMAP.md` — Era-based development roadmap with status indicators.
- `docs/` — API specification, user role matrix, database schema, implementation phases.
- `TECHSTACK.md` — Technology stack documentation.
- `.env.example` — Environment variable reference.
- `requirements.txt` — Python backend dependencies.
