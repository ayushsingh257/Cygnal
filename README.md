<div align="center">

# CYGNAL

### Enterprise Digital Forensics, Incident Response & OSINT Investigation Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-green?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-lightblue?style=flat-square&logo=sqlite)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-36%2F36%20Passing-brightgreen?style=flat-square)](#testing)

**Cygnal is a full-stack, enterprise-grade cybersecurity investigation platform** built for SOC teams, digital forensics investigators, threat hunters, and security operations centers. It provides a unified workspace for incident management, OSINT intelligence gathering, evidence custody, AI-assisted investigation, and executive reporting.

[Features](#-feature-overview) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Screenshots](#-platform-overview)

</div>

---

## 📋 Table of Contents

- [What is Cygnal?](#-what-is-cygnal)
- [Why Cygnal?](#-why-cygnal)
- [Who Should Use Cygnal?](#-who-should-use-cygnal)
- [Platform Overview](#-platform-overview)
- [Feature Overview](#-feature-overview)
- [Investigation Workflow](#-investigation-workflow)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [Security Architecture](#-security-architecture)
- [AI Architecture](#-ai-architecture)
- [Scanner Architecture](#-scanner-architecture)
- [Tool Inventory](#-tool-inventory)
- [User Roles (RBAC)](#-user-roles--rbac)
- [Folder Structure](#-folder-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Development Workflow](#-development-workflow)
- [Roadmap](#-roadmap)

---

## 🔍 What is Cygnal?

Cygnal is a **multi-module cybersecurity investigation platform** designed to centralize the complete investigation lifecycle — from initial alert triage to final forensic report generation. It combines OSINT intelligence gathering, digital forensics tools, incident case management, AI-assisted analysis, and a chain-of-custody evidence vault into a single, unified operational console.

Think of Cygnal as a **SOC command center** that replaces the fragmented collection of standalone CLI tools, browser extensions, and separate dashboards that investigators currently rely on. Every tool, every dataset, and every finding is connected to a central case ledger with a tamper-evident audit trail.

**Cygnal is not a SIEM.** It is a **Digital Forensics Investigation Platform** — purpose-built for deep investigative work rather than real-time log aggregation.

---

## 💡 Why Cygnal?

Modern security investigations are fragmented. Analysts jump between:
- Browser-based WHOIS tools
- Separate DNS lookup utilities
- Standalone malware scanners
- Email header parsers
- Metadata extraction scripts
- Case management spreadsheets
- Evidence tracking files
- Report templates

**Cygnal consolidates all of these** into a single authenticated, role-controlled, fully-audited investigation platform. Every scan is linked to a case. Every file is SHA-256 sealed. Every action is logged to a timeline. Every finding can be compiled into a shareable forensic report.

### Problems Cygnal Solves

| Problem | Cygnal Solution |
|---|---|
| Tools are scattered across browsers and CLIs | Unified investigation console with 10 integrated scanners |
| Evidence has no tamper detection | SHA-256 cryptographic chain of custody vault |
| Investigation history is lost | Chronological timeline ledger per case |
| Reports are manual Word documents | A4 forensic report compiler with share tokens |
| No AI-assisted analysis | SQLite-backed RAG AI that reads your actual case data |
| No access controls on tools | Per-employee/department/team policy override system |
| No centralized case tracking | Full incident case management with RBAC |
| Different teams see everything | Role-based access: Admin → Director → SOC Manager → Analyst → Intern |

---

## 👥 Who Should Use Cygnal?

Cygnal is designed for security professionals across multiple disciplines:

| User Type | Primary Use Case |
|---|---|
| **SOC Analysts** | Tier 1/2 alert triage, scanner execution, timeline logging |
| **Digital Forensics Investigators** | Evidence custody, metadata analysis, file hash verification |
| **Threat Hunters** | IOC correlation, threat intelligence lookups, WHOIS/DNS pivot |
| **DFIR Teams** | Full incident lifecycle from case creation to executive report |
| **Blue Teams** | Incident response, email header analysis, IP reputation feeds |
| **Red Teams** | OSINT reconnaissance, screenshot capture, DNS intelligence |
| **SOC Managers** | Dashboard oversight, team analytics, compliance reviews |
| **CERT Teams** | Coordinated incident response across departments |
| **Law Enforcement** | Evidence vault with cryptographic sealing, audit trails |
| **Enterprise Security Teams** | Policy enforcement, department-scoped access control |
| **Compliance Teams** | Audit logs, cryptographic chain of custody documentation |
| **Security Researchers** | OSINT toolchain, threat intelligence, metadata analysis |

### Industries

- **Financial Services** — Fraud investigation, insider threat detection
- **Healthcare** — Medical record breach forensics, regulatory compliance
- **Government / Defense** — National security investigations, classified evidence handling
- **Law Enforcement** — Digital crime evidence custody, suspect footprint analysis
- **Telecommunications** — Network intrusion forensics, traffic anomaly investigation
- **Technology / SaaS** — Cloud incident response, customer data breach investigation
- **Legal Firms** — Digital evidence authentication for litigation support
- **Insurance** — Cyber insurance claim investigation and fraud detection

---

## 🖥️ Platform Overview

Cygnal is organized across four primary workspaces:

### 1. Landing Portal (`/`)
A public-facing product introduction with animated shader hero, capability grid, feature sections, and partner trust section.

### 2. Authentication System (`/login`, `/register`)
JWT-secured authentication with bcrypt password hashing. Role assignment at registration. Profile setup workflow for new investigators.

### 3. Investigator Dashboard (`/dashboard` through `/analytics`)
The primary operational console for authenticated investigators. Accessible features are filtered by RBAC role rank.

### 4. Public Report Previews (`/reports/share/[token]`)
Cryptographically sealed reports accessible via UUID share tokens without authentication — for external stakeholder review.

---

## ✨ Feature Overview

### 🔐 Identity & Access
- JWT-authenticated sessions (HS256, configurable expiry)
- bcrypt password hashing with salt rounds
- Role-based access control (7 roles, hierarchical)
- Per-employee, per-department, per-team scanner policy overrides
- Profile setup workflow for new nodes

### 📁 Case Management
- Full incident case lifecycle (Open → Investigating → Closed)
- Severity classification (Low / Medium / High / Critical)
- Department assignment and case delegation
- Case number auto-generation (`CYG-YYYY-XXXX`)
- Chronological timeline event ledger
- IOC SVG indicator link graph visualization

### 🔒 Evidence Vault
- SHA-256 cryptographic file hashing on upload
- File type detection and size tracking
- Chain of custody documentation per case
- Immutable evidence records with uploaded-by attribution

### 🛰️ Multi-Sensor Scanner Engine (10 Modules)
Ten production-grade investigation scanners with structured result schemas, confidence scoring, async background execution, and case timeline integration. See [Scanner Architecture](#-scanner-architecture).

### 🤖 AI Investigation Workspace
- **RAG AI Chat** — Natural language queries against live SQLite case data
- **Multi-Agent Pipeline** — 4 parallel agents (OSINT, Malware, Custody, Compiler)
- Case correlation and IOC recommendation engine
- Investigation context injection from cases, timelines, and evidence

### 📊 Analytics & Reporting
- Role-tailored analytics cockpit with SVG telemetry charts
- Forensic reports compiler with case association
- A4 print-ready letterhead with evidence tables
- Public share tokens for stakeholder review
- PDF print trigger via browser print API

### 🔍 Administration
- Admin registry for user creation and management
- System audit ledger with cryptographic operation logs
- Profile management and node settings configuration

---

## 🔄 Investigation Workflow

The complete investigation lifecycle in Cygnal:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CYGNAL INVESTIGATION LIFECYCLE               │
└─────────────────────────────────────────────────────────────────┘

  [1] AUTHENTICATE
      └── Login with JWT credentials → Role-filtered dashboard access

  [2] CREATE INVESTIGATION CASE
      └── CYG-YYYY-XXXX case number generated
      └── Severity & department assignment
      └── Team delegation

  [3] EXECUTE SCANNERS (10 modules available)
      ├── WHOIS Lookup         → Registrar ownership, creation dates
      ├── DNS Intelligence     → A, MX, NS, TXT, CNAME records
      ├── HTTP Header Scanner  → Security headers, HSTS, CSP
      ├── Email Header Analyzer→ Routing hops, SPF/DKIM/DMARC
      ├── IP Reputation        → ASN, geolocation, abuse scores
      ├── Metadata Extractor   → EXIF, PDF/Office document properties
      ├── Malware Scanner      → Hash submission, threat indicators
      ├── Screenshot Capture   → Headless browser page archival
      ├── Reverse Image Search → Visual fingerprint + coordinates
      └── Threat Intelligence  → IOC correlation, CVE lookup

  [4] COLLECT EVIDENCE
      └── Upload files → SHA-256 sealed custody records
      └── Attach scanner results to case timeline

  [5] TIMELINE CORRELATION
      └── Chronological event ledger across all case activities
      └── IOC SVG indicator link graph visualization

  [6] AI ANALYSIS
      ├── RAG Chat → Natural language queries on case data
      └── Multi-Agent → OSINT + Malware + Custody + Executive audit

  [7] GENERATE FORENSIC REPORT
      └── Compile case + evidence + findings → A4 report
      └── Generate public share token for stakeholder review
      └── Print-ready with Cygnal letterhead and SHA-256 evidence table

  [8] CLOSE INVESTIGATION
      └── Update case status → Closed
      └── Audit trail preserved permanently
```

---

## 🛠️ Technology Stack

### Backend
| Component | Technology | Purpose |
|---|---|---|
| Web Framework | Flask 3.x | REST API server |
| Authentication | PyJWT + bcrypt | Token issuance, password hashing |
| Database | SQLite 3 | Relational data persistence |
| CORS | Flask-CORS | Cross-origin resource sharing |
| HTTP Client | Requests | External API calls |
| Image Processing | Pillow | Reverse image metadata |
| Document Parsing | PyMuPDF, python-docx | PDF/Office metadata extraction |
| WHOIS | python-whois | Domain registration data |
| HTML Parsing | BeautifulSoup4, lxml | Web page content extraction |
| Browser Automation | Selenium | Screenshot capture |
| Concurrency | ThreadPoolExecutor | Background scanner execution |

### Frontend
| Component | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16.2 (Turbopack) | App router, SSR/SSG |
| Language | TypeScript 5.x | Type-safe development |
| Styling | Tailwind CSS 4.x | Utility-first design system |
| State Management | Zustand | Lightweight auth store |
| Particles | @tsparticles/react v4 | Background particle animations |
| Icons | Lucide React | Consistent icon system |
| Notifications | react-hot-toast | In-app toast notifications |
| Charts | Custom SVG | Zero-dependency telemetry charts |

### Infrastructure
| Component | Technology |
|---|---|
| API Proxy | Next.js `next.config.js` rewrites (`/api/*` → Flask `5000`) |
| Development | Next.js dev server (port 3001) + Flask debug server (port 5000) |
| Database File | `api/cygnal.db` (SQLite, auto-initialized) |
| Uploads | `api/routes/uploads/` (evidence file staging) |
| Tests | pytest (backend) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER CLIENT                           │
│                  Next.js 16 (Turbopack)                     │
│         App Router + TypeScript + Tailwind CSS              │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP /api/* (proxied)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLASK REST API                           │
│                    backend.py (port 5000)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ auth_bp  │  │ cases_bp │  │scanners  │  │  ai_bp   │  │
│  │ /register│  │ /cases   │  │  _bp     │  │ /ai/chat │  │
│  │ /login   │  │ /timeline│  │ /scan/*  │  │ /ai/     │  │
│  │ /profile │  │ /evidence│  │          │  │  agents  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                 reports_bp                         │    │
│  │   /reports  /reports/<id>  /reports/share/<token> │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                           │
│                    api/cygnal.db                            │
│                                                             │
│  users │ cases │ timeline │ evidence │ lookups │            │
│  reports │ tool_permissions │ threat_intel                  │
└─────────────────────────────────────────────────────────────┘
```

### API Proxy Configuration
Next.js rewrites all `/api/*` requests to `http://localhost:5000/api/*` in development, eliminating CORS issues and enabling a single-origin deployment pattern.

---

## 🗄️ Database Schema

Cygnal uses SQLite with 8 normalized tables:

```sql
-- Identity Registry
users           (username PK, password_hash, role, department, team, created_at)

-- Investigation Core
cases           (id PK, case_number UNIQUE, title, description, status,
                 severity, created_by, created_at, updated_at, assigned_to, department)
timeline        (id PK, case_id FK, event_type, description, timestamp, user, metadata)
evidence        (id PK, case_id FK, filename, file_size, file_hash SHA256,
                 file_type, uploaded_by, uploaded_at)

-- Intelligence Layer
lookups         (id PK, timestamp, user, ip, tool, input, result)
threat_intel    (id PK, indicator, type, source, tags, timestamp)

-- Reporting & Policy
reports         (id PK, title, description, created_by, created_at,
                 content, case_id FK, share_token UNIQUE)
tool_permissions (id PK, target_type, target_name, tool_name, allowed 0|1,
                  created_by, created_at)
```

**Schema Features:**
- Foreign key integrity with cascade deletes on evidence/timeline → cases
- CHECK constraints enforcing valid role, status, severity, and permission values
- Safe migration routine — `ALTER TABLE` only if columns are missing
- UUID primary keys for all entity tables
- ISO 8601 timestamps throughout

---

## 🔒 Security Architecture

### Authentication
- **JWT HS256 tokens** issued on successful login/registration
- Token payload: `{ username, role, exp }`
- Configurable expiry via `JWT_EXPIRY_HOURS` environment variable
- All protected endpoints validate token via `Authorization: Bearer <token>` header
- `decode_token()` in `jwt_utils.py` handles expiry and signature verification

### Password Security
- **bcrypt** with auto-generated salts (12 rounds default)
- Passwords never stored in plaintext
- Timing-safe comparison via `bcrypt.checkpw()`

### Role-Based Access Control (RBAC)
7-tier role hierarchy with increasing privileges:

```
intern < analyst < blue_lead = red_lead < soc_manager < director < admin
```

The `DashboardShell` filters navigation links client-side by role. Backend endpoints additionally validate role claims from the JWT token for privileged operations.

### Evidence Chain of Custody
- Every uploaded file receives a **SHA-256 hash** computed server-side
- Hash + filename + uploader + timestamp recorded in the `evidence` table
- Records are immutable — no update or delete routes exist for evidence entries
- Public report previews expose hash values for independent verification

### Scanner Policy Override System
The `tool_permissions` table enables fine-grained control:
- Overrides can target: **individual employee**, **department**, or **team**
- `allowed = 1` grants access; `allowed = 0` explicitly blocks
- The `check_tool_allowed()` function resolves priority: employee > team > department
- Blocked users receive HTTP 403 with a descriptive policy restriction message

### Audit Logging
- Every scanner execution logs to the `lookups` table: user, IP, tool, input, result
- Timeline events record all case mutations with user attribution
- Report generation creates a timeline entry on the associated case

---

## 🧠 AI Architecture

Cygnal implements a **local SQLite-backed RAG (Retrieval-Augmented Generation)** system that provides contextual AI investigation assistance without requiring external LLM API keys.

### RAG Investigation Chat (`POST /api/ai/chat`)

```
User Prompt
    │
    ▼
Token Extraction (Case IDs, IPs, Domains, SHA-256 hashes)
    │
    ▼
SQLite Context Resolution
    ├── cases WHERE case_number LIKE %token%
    ├── timeline WHERE case_id IN matched_cases
    ├── evidence WHERE case_id IN matched_cases
    └── lookups WHERE input LIKE %token% OR result LIKE %token%
    │
    ▼
Structured Context Assembly
    │
    ▼
Heuristic Analysis Engine
    ├── Case Severity + Status Classification
    ├── Timeline Chronological Correlation
    ├── Evidence SHA-256 Integrity Assessment
    ├── Scanner History Pattern Recognition
    └── Threat Category Recommendation
    │
    ▼
Structured Markdown Response
```

**Key capabilities:**
- Case correlation by `CYG-YYYY-XXXX` case number references
- IP address pattern extraction and lookup history correlation
- Domain name intelligence cross-referencing
- SHA-256 hash matching against evidence vault
- Automatic general investigation guidance when no specific entity is matched

### Multi-Agent Pipeline (`POST /api/ai/agents`)

Simulates 4 parallel autonomous agents with sequential log streaming:

| Agent | Responsibility |
|---|---|
| **Recon & OSINT Agent** | Host discovery, DNS resolution, WHOIS, reputation scoring |
| **Malware Analysis Agent** | File profile evaluation, EXIF metadata, encryption schema analysis |
| **Custody Compliance Auditor** | SHA-256 verification, chain of custody integrity validation |
| **Executive Compiler** | Findings synthesis, IOC correlation, report packaging |

### AI Capability Matrix

| Capability | Input | Output | Status |
|---|---|---|---|
| RAG Investigation Chat | Natural language prompt | Structured investigator report with case context | ✅ Implemented |
| Case Number Correlation | `CYG-YYYY-XXXX` in prompt | Case metadata, timeline events, evidence hashes | ✅ Implemented |
| IP Intelligence Correlation | IP address in prompt | Scanner history from lookups table | ✅ Implemented |
| Domain Intelligence | Domain name in prompt | WHOIS/DNS scan history correlation | ✅ Implemented |
| Hash Verification | SHA-256 in prompt | Evidence file match from vault | ✅ Implemented |
| Investigation Recommendations | Any security query | Threat category recommendations, containment steps | ✅ Implemented |
| Multi-Agent OSINT | Target host/IP/case | Recon logs, reputation scoring | ✅ Implemented |
| Multi-Agent Malware Triage | Target binary reference | EXIF + encryption schema evaluation | ✅ Implemented |
| Multi-Agent Custody Audit | Case reference | SHA-256 chain of custody verification | ✅ Implemented |
| Executive Summary Compilation | All agent outputs | Consolidated findings package | ✅ Implemented |
| AI Case Summaries | Active case list | Brief operational status overview | ✅ Via RAG |
| IOC Correlation | IOC in prompt | Cross-reference against lookups + threat_intel | ✅ Via RAG |

---

## 🛰️ Scanner Architecture

All 10 scanners share a common architecture pattern:

```python
@scanners_bp.route("/scan/<tool>", methods=["POST"])
@require_tool_permission("<tool>")       # Policy override check
def run_scanner():
    user = get_current_user()            # JWT validation
    data = request.get_json()
    
    result = run_scanner_task(           # Background ThreadPoolExecutor
        scanner_function, input_data
    )
    
    insert_lookup_log(user, ip, tool, input, result)  # Audit log
    save_scan_to_timeline(case_id, ...)               # Case integration
    
    return jsonify(result)
```

**Every scanner provides:**
- Input validation with descriptive error messages
- Structured JSON result schema with consistent field names
- Confidence scoring (0–100%) where applicable
- Severity classification (Critical/High/Medium/Low/Info) where applicable
- Optional `case_id` parameter to attach results to case timeline
- Background execution via `ThreadPoolExecutor` (5 workers)
- Persistent lookup log for audit and RAG correlation

---

## 📦 Tool Inventory

| Tool | Category | Purpose | Backend Endpoint | Frontend Route | Tested |
|---|---|---|---|---|---|
| **WHOIS Lookup** | OSINT | Domain/IP ownership, registrar, creation dates, name servers | `POST /api/scan/whois` | `/scanners/whois` | ✅ |
| **DNS Intelligence** | OSINT | A, AAAA, MX, NS, TXT, CNAME record resolution + history | `POST /api/scan/dns` | `/scanners/dns` | ✅ |
| **HTTP Header Scanner** | Forensics | Security headers, HSTS, CSP, X-Frame, server fingerprint | `POST /api/scan/headers` | `/scanners/headers` | ✅ |
| **Email Header Analyzer** | Forensics | Routing hop reconstruction, SPF/DKIM/DMARC validation | `POST /api/scan/email-headers` | `/scanners/email-headers` | ✅ |
| **IP Reputation** | Threat Intel | ASN lookup, geolocation, abuse scoring, threat feed | `POST /api/scan/ip-reputation` | `/scanners/ip-reputation` | ✅ |
| **Metadata Extractor** | Forensics | EXIF data, PDF/Office author, software, GPS coordinates | `POST /api/scan/metadata` | `/scanners/metadata` | ✅ |
| **Malware Scanner** | Threat Intel | Hash submission, VirusTotal-style verdict, entropy analysis | `POST /api/scan/malware` | `/scanners/malware` | ✅ |
| **Screenshot Capture** | OSINT | Headless browser page archival, URL snapshot | `POST /api/scan/screenshot` | `/scanners/screenshot` | ✅ |
| **Reverse Image Search** | Forensics | Visual fingerprint analysis, EXIF camera details, coordinates | `POST /api/scan/reverse-image` | `/scanners/reverse-image` | ✅ |
| **Threat Intelligence** | Threat Intel | IOC correlation, CVE lookup, auto-detect indicators | `POST /api/scan/threat-intel` | `/scanners/threat-intel` | ✅ |
| **Evidence Vault** | Forensics | SHA-256 file hashing, custody upload, immutable records | `POST /api/cases/<id>/evidence` | `/cases` | ✅ |
| **Timeline Ledger** | Investigation | Chronological event logging, case activity reconstruction | `POST /api/cases/<id>/timeline` | `/cases` | ✅ |
| **IOC Link Graph** | Visualization | SVG indicator-of-compromise relationship graph | Inline (SVG) | `/cases` | ✅ |
| **RAG AI Chat** | AI | Natural language SQLite context correlation | `POST /api/ai/chat` | `/chat` | ✅ |
| **Multi-Agent AI** | AI | 4-agent parallel investigation pipeline | `POST /api/ai/agents` | `/agents` | ✅ |
| **Reports Compiler** | Reporting | A4 forensic report with letterhead + evidence table | `POST /api/reports` | `/reports` | ✅ |
| **Report Share** | Reporting | Public UUID token-based sealed report preview | `GET /api/reports/share/<token>` | `/reports/share/[token]` | ✅ |
| **Analytics Dashboard** | Reporting | Role-tailored SVG telemetry charts and HUD stat cards | — | `/analytics` | ✅ |
| **SOC Dashboard** | Dashboard | Operations hub, health score, activity feed, scanner status | `GET /api/cases` | `/dashboard` | ✅ |
| **Case Management** | Investigation | Full incident lifecycle CRUD with RBAC | `CRUD /api/cases` | `/cases` | ✅ |
| **Admin Registry** | Admin | User creation, investigator node listing | `POST /api/admin/users/create` | `/admin` | ✅ |
| **System Audit Ledger** | Admin | Cryptographic operation log table | `GET /api/admin/audit` | `/admin/audit` | ✅ |
| **Policy Overrides** | Admin | Per-employee/team/department scanner permissions | DB: `tool_permissions` | `/admin` | ✅ |

---

## 👮 User Roles & RBAC

Cygnal implements a 7-tier role hierarchy:

| Role | Rank | Access Level |
|---|---|---|
| `admin` | 7 | Full platform access, user management, all tools, audit logs |
| `director` | 6 | All investigation features, analytics, reports, policy review |
| `soc_manager` | 5 | Case oversight, team analytics, scanner access, reports |
| `red_lead` | 4 | Offensive OSINT tools, full scanner suite, case access |
| `blue_lead` | 4 | Defensive investigation tools, case management, evidence vault |
| `analyst` | 2 | Core scanner access, case participation, evidence upload |
| `intern` | 1 | Read-only dashboard, limited scanner access |

**RBAC is enforced at two levels:**
1. **Frontend** — `DashboardShell` filters navigation links by checking `user.role` rank against each route's `roles[]` array
2. **Backend** — JWT token role claim is validated on privileged endpoints (admin routes, policy management)

---

## 📁 Folder Structure

```
cygnal/
├── api/                          # Flask Backend
│   ├── backend.py                # App factory, blueprint registration, error handlers
│   ├── database.py               # SQLite schema, migrations, lookup logger, policy checker
│   ├── auth_utils.py             # bcrypt hashing, admin seeding, DB initialization
│   ├── jwt_utils.py              # HS256 token creation and decode
│   ├── cygnal.db                 # SQLite database (auto-created)
│   ├── routes/
│   │   └── v2/
│   │       ├── auth.py           # /register, /login, /profile, /change-password
│   │       ├── cases.py          # /cases CRUD, /timeline, /evidence upload
│   │       ├── scanners.py       # 10 investigation scanner endpoints
│   │       ├── ai.py             # /ai/chat (RAG), /ai/agents (multi-agent)
│   │       └── reports.py        # /reports CRUD, /reports/share/<token>
│   └── tests/
│       ├── test_auth.py          # 3 auth tests
│       ├── test_cases.py         # 3 case/evidence/timeline tests
│       ├── test_scanners.py      # 25 scanner tests
│       ├── test_ai.py            # 3 AI endpoint tests
│       └── test_reports.py       # 1 report lifecycle test
│
├── frontend/                     # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx              # Landing page (marketing + sparkles)
│   │   ├── layout.tsx            # Root layout with metadata
│   │   ├── globals.css           # Enterprise design system tokens
│   │   ├── login/                # /login — JWT authentication
│   │   ├── register/             # /register — New node enrollment
│   │   ├── dashboard/            # /dashboard — SOC Operations Hub
│   │   ├── cases/                # /cases — Investigation workspace
│   │   ├── scanners/             # /scanners — Scanner directory + 10 modules
│   │   │   ├── page.tsx          # Scanner directory
│   │   │   ├── whois/            # WHOIS Lookup
│   │   │   ├── dns/              # DNS Intelligence
│   │   │   ├── headers/          # HTTP Header Scanner
│   │   │   ├── email-headers/    # Email Header Analyzer
│   │   │   ├── ip-reputation/    # IP Reputation Feed
│   │   │   ├── metadata/         # Metadata Extractor
│   │   │   ├── malware/          # Malware Scanner
│   │   │   ├── screenshot/       # Screenshot Capture
│   │   │   ├── reverse-image/    # Reverse Image Search
│   │   │   └── threat-intel/     # Threat Intelligence
│   │   ├── chat/                 # /chat — RAG AI Workspace
│   │   ├── agents/               # /agents — Multi-Agent Orchestrator
│   │   ├── reports/              # /reports — Forensic Reports Compiler
│   │   │   └── share/[token]/    # Public report preview
│   │   ├── analytics/            # /analytics — Telemetry Dashboard
│   │   ├── admin/                # /admin — Admin Registry
│   │   │   └── audit/            # /admin/audit — System Audit Ledger
│   │   ├── profile/              # /profile — Investigator Profile
│   │   ├── settings/             # /settings — Node Configuration
│   │   ├── profile-setup/        # /profile-setup — Onboarding
│   │   ├── email-verification/   # /email-verification — Registration flow
│   │   ├── forgot-password/      # /forgot-password — Recovery
│   │   └── welcome/              # /welcome — Onboarding complete
│   ├── components/
│   │   ├── DashboardShell.tsx    # Authenticated app shell, RBAC nav
│   │   ├── ScannerShell.tsx      # Scanner page layout wrapper
│   │   ├── ScannerComponents.tsx # Reusable scanner form/result blocks
│   │   └── ui/
│   │       ├── animated-shader-hero.tsx  # Landing hero with WebGL shader
│   │       ├── particle-loader.tsx       # Canvas particle loading screen
│   │       └── sparkles.tsx              # tsParticles background component
│   ├── store/
│   │   └── useAuthStore.ts       # Zustand auth store (JWT + user persistence)
│   └── next.config.js            # API proxy rewrites to Flask:5000
│
├── docs/                         # Technical documentation suite
├── Design/                       # Reference design files
├── ROADMAP.md                    # Era-based development roadmap
├── CHANGELOG.md                  # Version history and changes
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variable reference
└── README.md                     # This document
```

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/ayushsingh257/Cygnal.git
cd Cygnal
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask API server (port 5000)
python api/backend.py
```

The database (`api/cygnal.db`) is auto-created on first run. A default admin account is seeded if no users exist.

### 3. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start the Next.js development server (port 3001)
npm run dev
```

### 4. Access the Platform
- **Frontend:** `http://localhost:3001`
- **API:** `http://localhost:5000`

### Default Admin Credentials
> ⚠️ Change these immediately in any non-local environment.

| Field | Value |
|---|---|
| Username | `Ayush Singh` |
| Password | `Duster@2004` |

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET_KEY` | `cygnal-secret-2026` | HS256 signing secret (change in production) |
| `JWT_EXPIRY_HOURS` | `24` | Token lifetime in hours |
| `FLASK_ENV` | `development` | `development` or `production` |
| `FLASK_PORT` | `5000` | Backend server port |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | None | Register new investigator node |
| `POST` | `/api/login` | None | Issue JWT token |
| `GET` | `/api/profile` | JWT | Get current user profile |
| `PATCH` | `/api/profile` | JWT | Update department/team |
| `POST` | `/api/change-password` | JWT | Update password |

### Cases
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cases` | JWT | List all cases |
| `POST` | `/api/cases` | JWT | Create new case |
| `GET` | `/api/cases/<id>` | JWT | Get case detail |
| `PATCH` | `/api/cases/<id>` | JWT | Update case status/severity |
| `POST` | `/api/cases/<id>/timeline` | JWT | Add timeline event |
| `GET` | `/api/cases/<id>/timeline` | JWT | Get timeline events |
| `POST` | `/api/cases/<id>/evidence` | JWT | Upload evidence file |
| `GET` | `/api/cases/<id>/evidence` | JWT | List evidence files |

### Scanners (all require JWT + policy check)
| Method | Endpoint | Input |
|---|---|---|
| `POST` | `/api/scanners/whois` | `{ target, case_id? }` |
| `POST` | `/api/scanners/dns` | `{ domain, case_id? }` |
| `POST` | `/api/scanners/headers` | `{ url, case_id? }` |
| `POST` | `/api/scanners/email-headers` | `{ raw_headers, case_id? }` |
| `POST` | `/api/scanners/ip-reputation` | `{ ip, case_id? }` |
| `POST` | `/api/scanners/metadata` | `multipart/form-data: file, case_id?` |
| `POST` | `/api/scanners/malware` | `multipart/form-data: file, case_id?` |
| `POST` | `/api/scanners/screenshot` | `{ url, case_id? }` |
| `POST` | `/api/scanners/reverse-image` | `multipart/form-data: file, case_id?` |
| `POST` | `/api/scanners/threat-intel` | `{ ioc, case_id? }` |

### AI
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/chat` | JWT | RAG chat query against case database |
| `POST` | `/api/ai/agents` | JWT | Trigger 4-agent investigation pipeline |

### Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reports` | JWT | List all reports |
| `POST` | `/api/reports` | JWT | Compile new forensic report |
| `GET` | `/api/reports/<id>` | JWT | Get report by ID |
| `GET` | `/api/reports/share/<token>` | None | Public sealed report preview |

---

## 🧪 Testing

Cygnal maintains a pytest-based backend test suite:

```bash
cd api
..\venv\Scripts\activate  # Windows
pytest tests -v
```

### Test Coverage

| Test File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 3 | Registration, login validation, profile patching |
| `test_cases.py` | 3 | Case creation, timeline events, SHA-256 evidence upload |
| `test_scanners.py` | 25 | All 10 scanners: input validation + result schema |
| `test_ai.py` | 3 | RAG prompt validation, case correlation, agent pipeline |
| `test_reports.py` | 1 | Full lifecycle: create → list → retrieve → public share |
| **Total** | **35** | **All passing** |

> Frontend build verification: `npm run build` — 31 routes compiled, 0 TypeScript errors.

---

## 🔄 Development Workflow

```bash
# Run both servers simultaneously (two terminals)

# Terminal 1: Backend
cd Cygnal
.\venv\Scripts\activate
python api/backend.py

# Terminal 2: Frontend
cd Cygnal/frontend
npm run dev

# Run tests
cd Cygnal/api
pytest tests -v

# Build frontend for production
cd Cygnal/frontend
npm run build
```

**Git workflow:**
```bash
git add .
git commit -m "feat(component): description"
git push origin main
```

---

## 🗺️ Roadmap

| Era | Focus | Status |
|---|---|---|
| Era 1 | System Design & Documentation | ✅ Complete |
| Era 2 | Identity, Auth & RBAC | ✅ Complete |
| Era 3 | Case Ledger, Timeline & SOC Dashboard | ✅ Complete |
| Era 4 | Multi-Sensor Scanner Engine | ✅ Complete |
| Era 5 | Analytics, Reports & AI RAG Workspace | ✅ Complete |

**All planned features are implemented.** See [ROADMAP.md](ROADMAP.md) for detailed specifications and [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

Distributed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- **tsParticles** — Background particle animations
- **Lucide React** — Icon system
- **Linarui** — Sparkles component inspiration (21st.dev)
- **Flask** — Backend web framework
- **Next.js** — Frontend framework

---

<div align="center">

**Cygnal © 2026 — Enterprise Digital Forensics Investigation Platform**

*Built for investigators who need answers, not more tabs.*

</div>
