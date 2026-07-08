# Cygnal Product Evolution Roadmap: Version Series

This document maps the version-based product evolution of Cygnal, detailing how the platform transforms from the v1.0 baseline into a highly scalable, collaborative, AI-integrated security command center.

---

## 🗺️ Product Evolution Pipeline

```
  Cygnal v1.0 (Baseline) ──────► Cygnal v1.5 (Autonomous) ─────► Cygnal v2.0 (Enterprise)
   • Unified console              • AI Copilot / Auto-IOC         • PostgreSQL & Celery/Redis
   • 10 Local Scanners            • Interactive SVG Graph         • SAML / SSO / MFA
   • Local SQLite RAG Chat        • Narrated AI Timelines         • Docker & Kubernetes
   
                                             │
                                             ▼
  Cygnal v5.0 (Commercial) ◄───── Cygnal v4.0 (Plugin SDK) ◄───── Cygnal v3.0 / v3.5 (Connected)
   • Hosted SaaS Billing          • Plugin Marketplace            • SIEM/EDR Inbound Webhooks
   • Cloud HSM Signatures         • Scanners & Connectors SDK     • Autonomic AI Agent Loops
```

---

## 🎛️ Detailed Version Specifications

### 🟢 Cygnal v1.0: Core Forensics & OSINT Engine
*   **Purpose:** Provide a single local workspace for incident triaging, running basic scanners, and tracking evidence file custody hashes.
*   **Business Value:** Eliminates the initial chaos of switching between separate scanner utilities and text files to organize incident logs.
*   **Technical Goals:** Establish a modular Flask REST API, Next.js app layout, SQLite database instance, and JWT/bcrypt credentials security.
*   **Architecture Changes:** Monolith Flask backend using local file storage for uploads; API routing proxied by Next.js app server.
*   **Database Changes:** Tables for users, cases, timeline, evidence, lookups, threat_intel, reports, and tool_permissions.
*   **Backend Work:** REST routes for CRUD operations on cases, timeline event creation, scanner tasks, and basic PDF compilation.
*   **Frontend Work:** Authenticated shell with role-filtered sidebar links, cases worksheet, scanners dashboard, and telemetry charts.
*   **AI Improvements:** Heuristic-driven SQLite RAG chat parses references to case numbers, IPs, and file hashes.
*   **Testing Requirements:** Backend tests using python-pytest verifying CRUD operations, token generation, and scanner outputs.
*   **Deployment Requirements:** Run Flask and Node servers concurrently on a local developer workstation.
*   **Success Criteria:** 36/36 unit tests passing; clean production Next.js builds.
*   **Dependencies:** Python standard libraries, Next.js 16.2.
*   **Expected Users:** Local SOC analysts and digital forensics investigators.
*   **Workspace Alignment:** Delivers the initial telemetry ingestion panel and case timeline log structure.

---

### 🟢 Cygnal v1.5: Autonomous Investigation Workspace [Sprints 1-4B Complete]

*   **Purpose:** Make investigations automatic by extracting and enriching indicators of compromise (IOCs) without manual user intervention, and providing AI-powered investigation guidance through a natural-language Copilot interface.
*   **Business Value:** Minimizes Mean Time to Investigate (MTTI) by automatically correlating evidence, orchestrating parallel scans, and providing structured investigation guidance that replaces manual tool-switching.
*   **Technical Goals:** Implement regex-based entity parsers, relationship graph APIs, narrative timeline builders, parallel execution orchestrators, and an intelligent AI Copilot with intent classification and structured response generation.
*   **Architecture Changes:** Addition of regex services, SVG node layout engines, thread-pooled orchestrator, and AI Copilot intent + RAG engine (`api/services/copilot.py`).
*   **Database Changes:** Addition of `case_indicators`, `evidence_relations`, and `investigation_jobs` tables.
*   **Backend Work:** `POST /api/cases/<id>/extract-iocs`, `GET /api/cases/<id>/graph`, `/api/investigations/*`, `POST /api/copilot/message`, `POST /api/copilot/approve`, `GET /api/copilot/summary/<case_id>`.
*   **Frontend Work:** SVG graph layouts, vertical timeline stages, live job progress dashboards, and the AI Copilot split-panel investigation workspace (`/copilot`).
*   **AI Improvements:** Intent classification engine, IOC extraction from free text, structured investigation report generation, confidence scoring, and human-in-the-loop approval gate before orchestration.
*   **Testing Requirements:** Tests verifying IOC extractor accuracy, graph relation assembly, parallel job states, intent classification, plan building, and API endpoint correctness.
*   **Success Criteria:** ✅ 78/78 backend tests passing. Auto-extraction >90% recall. Live job progress updated in real-time. All structured responses include 5+ investigation sections.
*   **Dependencies:** exifread, dnspython.
*   **Expected Users:** SOC analysts, DFIR investigators, Threat Hunters, and Incident Responders.
*   **Workspace Alignment:** Automates context gathering, dispatches parallel scans, dynamically updates knowledge graphs, and provides AI-guided investigation planning that keeps the investigator in control.


---

### 🟡 Cygnal v2.0: Enterprise-Grade Workspace Hardening
*   **Purpose:** Harden the platform for deployment inside enterprise security zones and data centers.
*   **Business Value:** Meets compliance requirements for concurrent multi-user load, data replication, and single sign-on (SSO) credentials.
*   **Technical Goals:** Replace SQLite with PostgreSQL, install distributed Celery background worker tasks, and set up Docker configs.
*   **Architecture Changes:** Decouple database writes using a PostgreSQL backend; configure Celery workers with a Redis broker.
*   **Database Changes:** Enforce transaction-safe locking mechanisms and index target audit logs.
*   **Backend Work:** Migrate raw SQL queries to an ORM model (SQLAlchemy/Prisma); configure Celery tasks for all 10 scanners.
*   **Frontend Work:** Update Next.js loading screens with custom skeleton states and support multi-factor auth (MFA) entry forms.
*   **AI Improvements:** AI RAG uses PostgreSQL full-text search indexes to fetch and correlate matching cases across thousands of records.
*   **Testing Requirements:** Integration tests verifying Celery task progress tracking and database locking during multi-user writes.
*   **Deployment Requirements:** Multi-container Docker Compose configuration (`postgres`, `redis`, `celery-worker`, `backend`, `frontend`).
*   **Success Criteria:** Zero database lockups under concurrent write loads; task queuing latency under 1 second.
*   **Dependencies:** docker, redis, celery, psycopg2.
*   **Expected Users:** Corporate security operations, compliance officers, and IT administrators.
*   **Workspace Alignment:** Provides the scalability and access controls required for real-world production environments.

---

### 🟠 Cygnal v2.5: Collaborative Security Cockpit
*   **Purpose:** Enable multiple security analysts to investigate incident cases together in real-time.
*   **Business Value:** Eliminates duplicate work, improves information sharing during high-stress alerts, and speeds up analyst shift handoffs.
*   **Technical Goals:** Integrate WebSocket server connections, implement case locking, and establish comment registries.
*   **Architecture Changes:** Add a WebSocket routing layer (e.g., Flask-SocketIO or FastAPI WebSockets) to broadcast case changes.
*   **Database Changes:** Add `case_locks` and `case_comments` tables.
*   **Backend Work:** Broadcast case status, timeline logs, and analyst assignments in real-time to active WebSocket clients.
*   **Frontend Work:** Implement live collaborative indicators, pop-up change toast notifications, case editing locks, and chat threads.
*   **AI Improvements:** AI monitors active comment threads to inject summary tips: *"Another analyst recently completed a metadata extraction on similar hashes; click here to link findings."*
*   **Testing Requirements:** Mock WebSocket connection testing to verify message broadcasts.
*   **Success Criteria:** Case changes sync to concurrent browser windows in under 200 milliseconds.
*   **Expected Users:** Multi-analyst SOC teams and shift leads.
*   **Workspace Alignment:** Transforms Cygnal from an isolated console into a team cockpit.

---

### 🔴 Cygnal v3.0 / v3.5: Connected Integrations & Agentic Loops
*   **Purpose:** Automatically ingest alerts from SIEMs and let AI coordinate scans.
*   **Business Value:** Connects Cygnal to enterprise telemetry sources, allowing alerts to flow and trigger investigations automatically.
*   **Technical Goals:** Create webhook endpoints for inbound alerts and implement autonomic AI agent decision engines.
*   **Architecture Changes:** Add webhook ingestion gateway services and agent execution routers.
*   **Database Changes:** Add `inbound_alerts` and `agent_logs` tables.
*   **Backend Work:** Parse Splunk/Sentinel webhook formats; register autonomous AI loops that evaluate indicators and schedule Celery scans.
*   **Frontend Work:** Setup alert triage boards, agent log terminal panels, and playbook correlation views.
*   **AI Improvements:** AI decides which scanners to launch based on alert patterns, running DNS/WHOIS/Threat Intel dynamically.
*   **Success Criteria:** Inbound SIEM alert is auto-investigated and populated with graphs and timelines within 60 seconds.
*   **Expected Users:** Lead Incident Responders and automated SOC operations managers.
*   **Workspace Alignment:** Removes manual steps from alert creation to completed investigation.

---

### 🟣 Cygnal v4.0: Extensible Plugin SDK
*   **Purpose:** Enable developers to write custom scanners, AI agents, and integrations.
*   **Business Value:** Drives rapid feature growth and ecosystem support by letting the community maintain niche security connectors.
*   **Technical Goals:** Define abstract base classes (`ScannerInterface`, `TIInterface`), design plugin manifest files, and build a local registry.
*   **Architecture Changes:** Setup dynamic import loaders in the Flask backend to register plugin routes from directories.
*   **Database Changes:** Add `plugins` registration table.
*   **Backend Work:** Expose standard parameters for plugins; construct validation engines for plugin manifests.
*   **Frontend Work:** Build a Plugin Store UI where users can enable or disable community extensions.
*   **AI Improvements:** AI parses custom plugin capabilities to recommend relevant actions: *"You enabled Shodan Plugin; would you like me to scan?"*
*   **Expected Users:** Security developers, DevOps engineers, and custom integrations teams.
*   **Workspace Alignment:** Keeps the core codebase lightweight and clean.

---

### 🟤 Cygnal v5.0: Commercial Cloud SaaS
*   **Purpose:** Host Cygnal as a multi-tenant cloud application.
*   **Business Value:** Provides an easy, zero-setup option for SMBs and organizations.
*   **Technical Goals:** Implement multi-tenant schema isolation, integrate payment systems, and utilize HSM for evidence encryption.
*   **Architecture Changes:** Scale services via Kubernetes cluster sets; configure MinIO/S3 for cloud evidence file assets.
*   **Database Changes:** Add `organizations`, `billing`, and `tenant_settings` tables.
*   **Backend Work:** Tenant routing controls; Stripe billing integration webhooks.
*   **Frontend Work:** Add Billing HUD, Organization Settings, and SaaS subscription selectors.
*   **Testing Requirements:** Penetration testing and automated multi-tenant data leakage checks.
*   **Success Criteria:** Complete tenant data isolation; scalable Kubernetes autoscaling.
*   **Expected Users:** SMBs, managed service providers (MSPs), and corporate teams.
*   **Workspace Alignment:** Expands Cygnal into a global cloud SaaS product.
