<div align="center">

# CYGNAL

### The AI-Powered Cybersecurity Investigation & Security Operations Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-green?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-172%2F172%20Passing-brightgreen?style=flat-square)](#-testing--verification)

**Cygnal is an AI-powered cybersecurity investigation and security operations platform combining cybersecurity intelligence, networking analysis, automation, and AI-driven workflows.** It unifies SIEM alert webhooks, multi-sensor threat intelligence, DFIR forensic evidence vaulting, SVG knowledge graph charting, and semantic AI copilot guidance into a single operational cockpit.

[Mission & Vision](#-mission-and-vision) · [Features](#-core-capabilities) · [Architecture](#-system-architecture) · [Quick Start](#-quick-start) · [Roadmap](#-product-evolution--roadmap)

</div>

---

## 📋 Table of Contents
- [What is Cygnal?](#-what-is-cygnal)
- [Mission and Vision](#-mission-and-vision)
- [Who Should Use Cygnal?](#-who-should-use-cygnal)
- [Core Capabilities](#-core-capabilities)
  - [🛡️ Cybersecurity & Threat Intelligence](#-cybersecurity--threat-intelligence)
  - [🌐 Networking & Detection](#-networking--detection)
  - [🧠 Artificial Intelligence & Automation](#-artificial-intelligence--automation)
  - [📁 DFIR & Forensic Evidence Vaulting](#-dfir--forensic-evidence-vaulting)
  - [🏢 Enterprise Infrastructure & Collaboration](#-enterprise-infrastructure--collaboration)
- [🛰️ Unified Security Sensors Matrix](#-unified-security-sensors-matrix)
- [🏗️ System Architecture](#-system-architecture)
- [💻 Technology Stack](#-technology-stack)
- [📁 Directory Structure](#-directory-structure)
- [⚡ Quick Start](#-quick-start)
- [🧪 Testing & Verification](#-testing--verification)
- [🛑 Product Constitution (Guardrails)](#-product-constitution-guardrails)
- [🗺️ Product Evolution & Roadmap](#-product-evolution--roadmap)

---

## 🔍 What is Cygnal?

Cygnal is an **AI-powered cybersecurity investigation and security operations platform** that sits directly above log collection, SIEM, and endpoint detection infrastructure. 

When security alerts trigger, analysts typically copy-paste indicators across dozens of open browser tabs—switching between WHOIS registries, DNS lookups, threat reputation databases, spreadsheets, and document templates. Cygnal eliminates this **"Tab Tax"** by providing a unified operational workspace that automatically ingests alerts, extracts indicators, dispatches parallel security sensors, builds interactive visual knowledge graphs, and generates cryptographically verified forensic reports with AI copilot assistance.

**Cygnal is not a SIEM, nor is it an EDR.** It is the cognitive pane that empowers security teams to understand, investigate, correlate, and document incidents in minutes instead of hours.

---

## 💡 Mission and Vision

### The Problem: The "Tab Tax" & High MTTI
When a security alert triggers, investigators face severe context-switching overhead:
- Querying WHOIS registers and DNS routing utilities in separate browser tabs.
- Cross-referencing IP reputations, CVE dictionaries, and threat feeds manually.
- Running command-line utilities for document metadata and binary checks.
- Maintaining manual spreadsheets for incident timelines.
- Formatting document templates for forensic reporting and executive briefs.

This fragmented workflow leads to investigator burnout, missed correlations, and a high **Mean Time to Investigate (MTTI)**.

### The Cygnal Solution: Unified End-to-End Workflow
1. **Ingest**: Ingest alerts via authenticated SIEM webhooks (Splunk, Microsoft Sentinel, Generic JSON) with SHA-256 payload integrity verification.
2. **Auto-Extract**: Regex parsing pipeline extracts IPs, domains, URLs, emails, hashes, CVEs, registry keys, and process names.
3. **Enrich**: 10 parallel security sensors enrich indicators (DNS, WHOIS, IP Reputation, HTTP Security Headers, Email Routing Hops, Malware Hashes).
4. **Correlate**: A pure-Python 128-D vector database and SVG knowledge graph map evidence relationships across historical cases.
5. **AI Guide**: The AI Copilot classifies investigator intent, builds execution plans, scores indicator confidence, and narrates chronology.
6. **Compile**: Sealed A4-printable forensic reports complete with cryptographic custody seals and public verification share tokens.

---

## 👥 Who Should Use Cygnal?

- **Security Researchers & Analysts**: Perform deep-dive threat lookups, trace indicator correlation lines, and analyze threat actor infrastructure.
- **SOC Teams & Tier 1/2 Analysts**: Triage inbound SIEM alerts rapidly, leverage autonomic agent loops, and execute human "Take Over" interrupts when manual intervention is required.
- **DFIR Responders**: Maintain strict chain-of-custody tracking with local SHA-256 file custody seals and signed forensic reports.
- **Threat Hunters**: Uncover hidden relationships across threat datasets using interactive SVG link graphs and vector similarity search.
- **Security Professionals & Enterprise Admins**: Manage role-based access control (RBAC), enforce tenant data isolation, mandate multi-factor authentication (MFA), and audit system activities.

---

## ✨ Core Capabilities

### 🛡️ Cybersecurity & Threat Intelligence
- **Automated Regex IOC Extraction Pipeline**: Parses 14 entity patterns automatically from raw text, emails, or logs—including IPv4 (filtering RFC1918), IPv6, Domains, URLs, Email Addresses, MD5/SHA1/SHA256 Hashes, CVEs, Registry Paths, and Process Names.
- **Threat Intelligence Enrichment**: Correlates indicators against multi-source threat intelligence feeds (VirusTotal, AbuseIPDB, Shodan, CVE databases) to score maliciousness and ASN risk.
- **Forensic File Integrity**: Computes SHA-256 signatures for raw incoming telemetry and evidence uploads to guarantee evidence custody.
- **Sealed Forensic Reports**: Compiles A4-printable reports with evidence hash tables, timeline stages, analyst notes, and verifiable public share tokens (`/reports/share/[token]`).

### 🌐 Networking & Detection
- **Network Reconnaissance & DNS Intelligence**: Resolves A, MX, NS, and TXT records to map domain infrastructure and mail servers.
- **Email Routing Hop Analyzer**: Inspects email header hops, verifying SPF, DKIM, and DMARC authentication policies to catch spoofed messages.
- **HTTP Security Headers Auditor**: Evaluates web server security postures, checking Content Security Policy (CSP), HSTS, X-Frame-Options, and referrer headers.
- **Pluggable SIEM Ingestion Gateway**: Webhook receiver (`POST /api/webhooks/siem`) authenticated via `X-Cygnal-Webhook-Key` headers. Features concrete parsers for **Splunk** (`SplunkParser`), **Microsoft Sentinel** (`SentinelParser`), and **Generic JSON** alerts.
- **Alert Triage Dashboard (`/alerts`)**: Live operational queue displaying alert statuses (Queued, Running, Completed, Needs Analyst), raw payload inspectors, payload SHA-256 verification, and inline takeover controls.

### 🧠 Artificial Intelligence & Automation
- **Pure-Python 128-Dimensional Vector Database**: Custom, dependency-free vector database indexing case summaries, evidence profiles, and timeline events into 128 security-relevant dimensions with cosine similarity search.
- **Semantic RAG (Retrieval-Augmented Generation)**: Context expansion engine that queries local database context to answer complex analyst prompts without sending raw incident data to third-party cloud LLMs.
- **AI Investigation Copilot (`/copilot`)**: Split-panel workspace featuring 5 intent classifiers (`INVESTIGATE_TARGET`, `EXPLAIN_CASE`, `SUMMARIZE_FINDINGS`, `RECOMMEND_NEXT_STEPS`, `ANSWER_QUESTION`), automated plan generation, confidence scoring engine, and structured Markdown reports. Includes a human-in-the-loop plan approval gate.
- **Multi-Agent Orchestrator**: Coordinates 4 specialized pipeline agents (*OSINT Recon*, *Malware Analysis*, *Custody Auditor*, *Executive Compiler*) with real-time validation checks (DNS availability, Zero-Trust authorization, API key configurations).
- **Autonomic Agent Loop Engine**: Background loop processor (Celery + Threading fallback) that auto-creates cases, extracts IOCs, launches sensor scans, streams Socket.IO logs, and supports analyst "Take Over" interrupts (`POST /api/webhooks/alerts/<id>/take-over`).
- **Dynamic Confidence Scorer**: Re-engineered scoring model factoring Threat Intel verdicts (40%), Vector memory similarity (30%), Custody evidence signatures (20%), and Timeline events (10%).

### 📁 DFIR & Forensic Evidence Vaulting
- **SHA-256 Custody Seals**: Computes cryptographic hashes upon evidence upload. Files are stored with immutable relationship records.
- **Interactive SVG Knowledge Graph**: High-performance client-side Force-Directed Layout mapping relationships between cases, evidence nodes, indicators, and cross-case matches. Includes zoom/pan controls, neighbor highlighting, and search filters.
- **Chronological Timeline Ledger & Narrator**: 7-stage chronological investigation ledger featuring heuristic natural-language narrative summaries for each phase.

### 🏢 Enterprise Infrastructure & Collaboration
- **Real-Time WebSockets Synchronization**: Scales real-time events (alerts, cases, chats, agent logs, presence) across load-balanced Flask server nodes via Redis Pub/Sub.
- **Interactive Case Collaboration**: Live case lease locking (30-second edit locks `POST /api/cases/<id>/lock`) and real-time analyst chat feeds preventing edit collisions.
- **Strict Tenant Isolation**: Context-bound SQL query rewriter (`rewrite_query` in `db_utils.py`) enforcing tenant data boundaries across cases, timelines, evidence, and audit logs.
- **Tenant Onboarding**: Restricted public signup with pre-authenticated domain mapping and verified workspace invite code onboarding (`POST /api/admin/onboard-organization`).
- **TOTP Multi-Factor Authentication (MFA)**: Time-based one-time password security (`pyotp`) with QR code provisioning and challenge gates (`/api/mfa/setup`, `/api/mfa/verify`).
- **RBAC & Tool Permissions**: Role-Based Access Control (`@require_role`) with granular per-employee, team, or department scanner policy overrides (`tool_permissions` table).
- **Circuit Breaker Cache Engine**: Fault-tolerant L1 Redis cache with 500ms connection timeouts and graceful local SQLite/PG fallback.
- **Systems Resource Monitoring API**: Live monitoring endpoint (`GET /api/health/metrics`) reporting CPU, memory, active database connection pools, and Redis link statuses.

---

## 🛰️ Unified Security Sensors Matrix

Cygnal includes 10 integrated security sensors for rapid investigation enrichment:

| Sensor | Category | Description | API Endpoint |
| :--- | :--- | :--- | :--- |
| **WHOIS Lookup** | OSINT / Recon | Queries domain registrar ownership, creation, and expiration dates. | `POST /api/scanners/whois` |
| **DNS Intelligence** | OSINT / Recon | Resolves A, MX, NS, and TXT DNS records for domain mapping. | `POST /api/scanners/dns` |
| **HTTP Headers** | Network / Web | Audits web server security posture and HTTP security headers (CSP, HSTS). | `POST /api/scanners/headers` |
| **Email Hop Analyzer** | Network / Web | Parses email headers, validating SPF, DKIM, and DMARC routing hops. | `POST /api/scanners/email-headers` |
| **IP Reputation** | Threat Intel | Checks IP ASN networks, geolocation, and threat reputation status. | `POST /api/scanners/ip-reputation` |
| **Metadata Extractor** | Forensics | Extracts EXIF metadata, GPS coordinates, and PDF document properties. | `POST /api/scanners/metadata` |
| **Malware Validator** | Threat Intel | Validates file hashes (MD5/SHA1/SHA256) against threat signatures. | `POST /api/scanners/malware` |
| **Screenshot Scraper** | OSINT / Web | Scrapes webpage text content and detects underlying tech stacks. | `POST /api/scanners/screenshot` |
| **Reverse Image Check** | Forensics | Computes visual image hashes (pHash/dHash) and flags warnings. | `POST /api/scanners/reverse-image` |
| **Threat Intel & CVE** | Threat Intel | Auto-detects CVE profiles and enriches indicators from threat databases. | `POST /api/scanners/threat-intel` |

---

## 🏗️ System Architecture

Cygnal is engineered with a modular, scalable architecture separating the client interface, API gateway, service integration bus, worker queues, and persistence layers:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           Next.js App Router                                            │
│                       DashboardShell  •  Zustand Auth Store  •  Tailwind CSS                            │
│                  Interactive SVG Knowledge Graph  •  Copilot Chat  •  Alert Board                       │
└───────────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                                    │ HTTP / WebSockets Proxy
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           Flask API Gateway                                             │
│                                                                                                         │
│  ┌──────────────────────┐   ┌─────────────────────────┐   ┌────────────────────┐   ┌─────────────────┐  │
│  │ Auth & RBAC Registry │   │ Case Management & Vault │   │ Security Sensors   │   │  AI Copilot     │  │
│  │ /api/auth/*          │   │ /api/cases/*            │   │ /api/scanners/*    │   │  /api/copilot/* │  │
│  └──────────┬───────────┘   └────────────┬────────────┘   └─────────┬──────────┘   └────────┬────────┘  │
└─────────────│────────────────────────────│──────────────────────────│───────────────────────│───────────┘
              │                            │                          │                       │
              ▼                            ▼                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        Service Integration Bus                                          │
│                                                                                                         │
│  ┌────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Auto IOC Extractor     │  │ Threat Intel Engine      │  │ AI Timeline Builder│  │ Knowledge Graph │  │
│  └────────────────────────┘  └──────────────────────────┘  └────────────────────┘  └─────────────────┘  │
│  ┌────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ SIEM Webhook Gateway   │  │ 128-D Vector RAG Engine  │  │ Autonomic Loop Engine││ Lease Lock Server│  │
│  └────────────────────────┘  └──────────────────────────┘  └────────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘
                                            │ Celery Tasks / Socket.IO Events
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Asynchronous Worker & Queue                                       │
│                           Celery Workers  •  Redis Pub/Sub Message Broker                               │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘
                                            │ Unified DB Abstractor (db_utils.py)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        Data Persistence Layer                                           │
│                         PostgreSQL (Production) / SQLite (Local Fallback)                               │
│                         Evidence Vault  •  128-D Vector Records  •  Audit Logs                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Frontend Architecture
- **Framework**: Next.js 16.2 (App Router) & React 19
- **Language**: TypeScript 5.x
- **Styling**: Vanilla CSS & TailwindCSS (Custom Dark/Light Enterprise Theme)
- **State Management**: Zustand
- **Real-Time WebSockets**: Socket.IO Client
- **Visualizations**: Custom SVG Force-Directed Layout Graph, Recharts, Framer Motion, `@tsparticles/react`
- **Icons**: Lucide React & React Icons

### Backend Architecture
- **Framework**: Flask 3.x with Gevent WSGI Server
- **Language**: Python 3.11+
- **Database Abstraction**: Custom `db_utils.py` (PostgreSQL 16 in production with automatic local SQLite fallback)
- **Asynchronous Queue**: Celery 5.x with Redis 7.x Broker (fallback to Python ThreadPool)
- **WebSockets**: Flask-SocketIO with Redis Pub/Sub synchronization
- **Security & Auth**: PyJWT (HS256 with JTI blocklist), PyOTP (TOTP MFA), bcrypt password hashing

### AI & Intelligence Engine
- **Vector Database**: Pure-Python 128-Dimensional TF-IDF Vectorizer & Cosine Similarity Search Engine
- **RAG Engine**: SQLite/PostgreSQL Context Retriever
- **Entity Extractor**: Modular Regex Pipeline (`IPv4`, `IPv6`, `Domain`, `URL`, `Email`, `Hash`, `CVE`)
- **Intent Classifier**: 5-Category Rule & Heuristic Intent Engine

---

## 📁 Directory Structure

```
cygnal/
├── api/                          # Flask API Backend
│   ├── backend.py                # App gateway, gevent monkey patch & blueprint registry
│   ├── database.py               # Database schemas, table creation & migrations
│   ├── db_utils.py               # Unified DB abstractor (SQLite & PostgreSQL) & tenant query rewriter
│   ├── task_utils.py             # Dynamic task router (Celery or Threading fallback)
│   ├── celery_app.py             # Celery background tasks configuration
│   ├── socket_app.py             # Socket.IO WebSocket server & room management
│   ├── auth_utils.py             # Password hashing, user seeding & authentication helpers
│   ├── jwt_utils.py              # HS256 JWT token creation, verification & JTI blocklist
│   ├── auth_middleware.py        # Token validation & @require_role RBAC decorators
│   ├── crypto_utils.py          # Fernet encryption & secret management
│   ├── rate_limit.py             # Sliding window rate limiter (Redis + Memory fallback)
│   ├── routes/
│   │   └── v2/                   # Modular Blueprints (auth, cases, scanners, ai, reports,
│   │                             # copilot, mfa, webhooks, admin, threat_intel, collaboration)
│   ├── services/                 # Core engine services (agent, copilot, extractor, orchestrator,
│   │                             # parser_registry, threat_intel)
│   └── tests/                    # Backend pytest suite (172 tests)
│
├── frontend/                     # Next.js Frontend Workspace
│   ├── app/                      # Next.js App Router pages (alerts, analytics, cases, chat,
│   │                             # copilot, dashboard, reports, scanners, settings, admin)
│   ├── components/               # UI components, DashboardShell, MarketingFooter, graphs
│   └── store/                    # Zustand authentication and session stores
│
├── docker-compose.yml            # Multi-container production compose configuration
├── docs/                         # System architecture & specification documents
├── requirements.txt              # Python library dependencies
└── README.md                     # Enterprise platform documentation
```

---

## ⚡ Quick Start

### Option A: Docker Compose (Production Setup)
Deploy the complete Cygnal platform (PostgreSQL 16, Redis 7, Celery Workers, Flask API, and Next.js Frontend) using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/ayushsingh257/Cygnal.git
cd Cygnal

# Create environment configuration file
cp .env.example .env

# Build and start all services
docker-compose up --build
```
Once initialized, access the Cygnal cockpit at `http://localhost:3000`.

---

### Option B: Local Manual Setup (Development Mode)

#### 1. Initialize Python Backend
```bash
# Navigate to the project root
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env configuration file
cp .env.example .env

# Start the Flask API server (Port 5000)
python api/backend.py
```
*Note: In local manual mode without Docker/PostgreSQL, Cygnal automatically uses a local SQLite database (`api/cygnal.db`) and in-memory background threads.*

#### 2. Initialize Next.js Frontend
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server (Port 3000)
npm run dev
```

#### Initial Credentials
- **Investigator Email:** `ayush@cygnal.org`
- **Password:** `Password123!`

---

## 🧪 Testing & Verification

Cygnal includes a comprehensive Pytest suite covering authentication, RBAC, case management, IOC extractions, scanner dispatches, AI copilot workflows, SIEM webhooks, tenant isolation, and health metrics:

```bash
# Run full backend test suite (172 tests)
python -m pytest api/tests -v
```

To run frontend build verification:
```bash
cd frontend
npm run build
```

---

## 🛑 Product Constitution (Guardrails)

To remain a focused, cognitive investigation platform, Cygnal explicitly does **not** perform:
- Continuous high-volume raw SIEM log collection.
- Active endpoint process termination or host isolation (EDR functions).
- Automated unverified containment actions without analyst oversight.

*Every capability in Cygnal is designed to accelerate human cognitive understanding and reduce Mean Time to Investigate (MTTI).*

---

## 🗺️ Product Evolution & Roadmap

### 🟢 Completed Eras
- **v1.0 (Core Engine)**: Monolithic Flask API, Next.js workspace, 10 local security sensors, SQLite storage.
- **v1.5 (Autonomous Workspace)**: Regex IOC extraction pipeline, SVG Knowledge Graph, AI Timeline Narrator, AI Copilot (`/copilot`).
- **v2.0 (Enterprise Hardening)**: Unified DB Abstractor (`db_utils.py` supporting PostgreSQL & SQLite), Celery/Redis tasks, TOTP MFA, Docker Compose orchestration.
- **v2.5 (Collaborative Cockpit)**: Flask-SocketIO WebSockets, live case edit lease locking, real-time analyst comments feed.
- **v3.0 / v3.5 (Connected Integrations)**: SIEM Webhook Gateway (Splunk, Sentinel, Generic JSON), Autonomic Agent Loops, Analyst Takeover controls, Rate Limiting, Security Audit Logging.
- **v4.0 (Enterprise Intelligence & HA)**: Redis Pub/Sub WebSocket synchronization, 128-D Vector DB & Cosine Similarity RAG, Multi-Agent Planning HUD, Tenant-Aware SQL Query Rewriting (`rewrite_query`), Systems Resource Monitoring (`/api/health/metrics`).
- **v4.0 Launch Readiness**: Brand identity redesign, Light/Dark theme support, GRC legal documentation (`/privacy`, `/terms`, `/security`, `/about`, `/contact`), UI/UX hotfix sprint.
- **Supabase Database Migration**: Migrated the production database to Supabase-hosted Managed PostgreSQL with native Row-Level Security (RLS) policies and session pool context cleanup.
- **Test Suite Hardening**: Implemented resilient vault health checks and webhook lifecycle assertions, stabilizing the backend unit tests for zero-flakiness builds.

### 🟣 Upcoming Milestones
- **Cygnal v4.5 (Extensible Plugin SDK)**: Public Plugin SDK (`ScannerInterface`, `TIInterface`), plugin manifest validator, community extension marketplace, dynamic backend plugin loaders.
- **Cygnal v5.0 (Commercial Cloud SaaS)**: Multi-tenant SaaS architecture, Kubernetes auto-scaling, cloud HSM evidence signing, subscription billing integration.

---

<div align="center">

**Cygnal** • Built for Modern Security Teams & Investigators

</div>
