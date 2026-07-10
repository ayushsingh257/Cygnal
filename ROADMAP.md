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
  Cygnal v5.0 (Commercial) ◄───── Cygnal v4.5 (Plugin SDK) ◄───── Cygnal v4.0 (Intelligence)
   • Hosted SaaS Billing          • Plugin Marketplace            • OIDC / SAML 2.0 / Entra ID
   • Cloud HSM Signatures         • Scanners & Connectors SDK     • OSINT & Threat Intel Connectors
                                                                  • Vector DB RAG & SOAR Engine
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

### 🟢 Cygnal v2.0: Enterprise-Grade Workspace Hardening [Complete]
*   **Purpose:** Harden the platform for deployment inside enterprise security zones and data centers.
*   **Business Value:** Meets compliance requirements for concurrent multi-user load, data replication, and single sign-on (SSO/MFA) credentials.
*   **Technical Goals:** Replace SQLite with PostgreSQL for production, install distributed Celery background worker tasks, add TOTP Multi-Factor Authentication (MFA), and configure dynamic task routing.
*   **Architecture Changes:** Decouple database writes using a PostgreSQL backend via unified `db_utils.py`; configure Celery workers with a Redis broker and fallback threading adapter.
*   **Database Changes:** Implement dynamic SQLite-PostgreSQL compatibility layer, and add TOTP MFA credential store columns.
*   **Backend Work:** Migrate raw database connections to dynamic pool; deploy setup/verify endpoints and login MFA checks.
*   **Frontend Work:** Create MFA setup panel on Settings screen and MFA verify card on Login page.
*   **AI Improvements:** AI RAG dynamically queries PostgreSQL/SQLite databases via connection pooling context.
*   **Testing Requirements:** Integration tests verifying dynamic query formatting, custom DialectCursor checks, and MFA challenge loops (79/79 passing).
*   **Deployment Requirements:** Multi-container Docker Compose configuration (`db`, `redis`, `celery_worker`, `backend`, `frontend`).
*   **Success Criteria:** Complete container builds and seamless SQLite to PostgreSQL toggling.
*   **Dependencies:** docker, redis, celery, psycopg2, pyotp.
*   **Expected Users:** Corporate security operations, compliance officers, and IT administrators.
*   **Workspace Alignment:** Provides the scalability, reliability, and security credentials required for production environments.

---

### 🟢 Cygnal v2.5: Collaborative Security Cockpit [Complete]
*   **Purpose:** Enable multiple security analysts to investigate incident cases together in real-time.
*   **Business Value:** Eliminates duplicate work, improves information sharing during high-stress alerts, and speeds up analyst shift handoffs.
*   **Technical Goals:** Integrate WebSocket server connections, implement case locking, and establish comment registries.
*   **Architecture Changes:** Add a WebSocket routing layer (Flask-SocketIO) to broadcast case changes, comments, and lease lock states.
*   **Database Changes:** Add `case_locks` and `comments` tables.
*   **Backend Work:** Broadcast case status, lock lease updates, and new analyst comments in real-time to active WebSocket clients.
*   **Frontend Work:** Implement live collaborative indicators, case lease lock panels, and live chat threads.
*   **AI Improvements:** AI monitors active comment threads to inject summary tips.
*   **Testing Requirements:** Integration tests verifying concurrent lock acquisition, lease releases, and comments posting (passing).
*   **Success Criteria:** Case changes sync to concurrent browser windows in under 200 milliseconds.
*   **Expected Users:** Multi-analyst SOC teams and shift leads.
*   **Workspace Alignment:** Transforms Cygnal from an isolated console into a team cockpit.

---

### 🟢 Cygnal v3.0 / v3.5: Connected Integrations & Agentic Loops [Complete]
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

### 🟣 Cygnal v4.0: Enterprise Intelligence & AI Operations Platform [Complete]
*   **Purpose:** Transform Cygnal into a genuine enterprise-grade SOC, DFIR, and AI Investigation platform.
*   **Business Value:** Lowers MTTI for enterprise SOCs through automated correlation, compliant custody tracking, federated IAM, and multi-agent SOAR playbooks.
*   **Technical Goals:** Implement SAML/Entra ID SSO, STIX/TAXII threat intel connectors, a vector-database backed RAG, horizontal socket synchronization via Redis Pub/Sub, and strict cryptographic chain-of-custody signatures.
*   **Architecture Changes:** Shift permanently to a PostgreSQL-first multi-tenant design; integrate Redis Pub/Sub channels for WebSocket synchronization across load-balanced nodes; establish centralized logging with correlation IDs.
*   **Database Changes:** Add `audit_logs` migration schema, vector search tables (`pgvector`), `organizations`/`tenants`, `playbooks`, and `evidence_chain_signatures` tables.
*   **Backend Work:** OIDC/SAML authentication paths; integration connectors for VirusTotal, Shodan, AbuseIPDB, Censys, GreyNoise, AlienVault OTX, MISP, ThreatFox, URLHaus; a workflow engine for playbook executions.
*   **Frontend Work:** SSO gateway login, interactive Playbook Builder (drag-and-drop workflow graphs), tenant administration panel, compliance reports download, and detailed worker queues monitoring dials.
*   **AI Improvements:** Semantic case memory search; multi-agent coordination with automated plan validation; dynamic confidence scoring on threat indicators; automated investigation timeline narrative summaries.
*   **Expected Users:** Security Operations Managers, Enterprise Compliance Officers, and Tier 3 DFIR Investigators.
*   **Workspace Alignment:** Unifies threat intelligence feeds, federated identity, compliance logs, and autonomous agent loops into a single enterprise-ready pane.

---

### 🟣 Cygnal v4.5: Extensible Plugin SDK
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
