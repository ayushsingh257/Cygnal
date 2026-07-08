<div align="center">

# CYGNAL

### The AI-Powered Investigation Workspace for Security Teams

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-green?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-lightblue?style=flat-square&logo=sqlite)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-79%2F79%20Passing-brightgreen?style=flat-square)](#-testing)


**Cygnal turns raw cyber evidence into complete investigations in minutes—not hours.** It unifies disparate OSINT threat lookup resources, forensics evidence vaulting, visual relationship graph charting, and AI timeline narration into a single workspace window.

[Mission & Vision](#-mission-and-vision) · [Features](#-core-capabilities) · [Architecture](#-system-architecture) · [Quick Start](#-quick-start)

</div>

---

## 📋 Table of Contents
- [What is Cygnal?](#-what-is-cygnal)
- [Why Cygnal?](#-why-cygnal)
- [Who Should Use Cygnal?](#-who-should-use-cygnal)
- [Core Capabilities](#-core-capabilities)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [AI Copilot Workflows](#-ai-copilot-workflows)
- [Unified Security Sensors](#-unified-security-sensors)
- [Folder Structure](#-folder-structure)
- [Quick Start](#-quick-start)
- [Testing](#-testing)
- [Product Constitution (Guardrails)](#-product-constitution-guardrails)

---

## 🔍 What is Cygnal?

Cygnal is the **AI-powered investigation workspace** that sits directly above your log collection and endpoint detection systems. When an alert triggers, security analysts copy-paste indicators across dozens of browser tabs. Cygnal replaces this fragmented workflow with a unified console. It automatically parses files and alerts, dispatches parallel scanner engines, links evidence nodes visually, and compiles cryptographically signed reports.

**Cygnal is not a SIEM, nor is it an EDR.** It is the cognitive pane that helps investigators understand, track, and document incidents.

---

## 💡 Why Cygnal?

### The Core Problem: The "Tab Tax"
When a security alert triggers, investigators are forced to switch between:
- WHOIS registers and DNS utilities in the browser.
- External IP reputation lookups and CVE threat dictionaries.
- Command-line tools for document metadata and binary checks.
- Separate spreadsheets for case timelines.
- Document templates for forensic reporting.

This context-switching increases investigator fatigue and results in a high **Mean Time to Investigate (MTTI)**.

### The Cygnal Solution
Cygnal unifies the entire investigation workflow into a single window:
1.  **Ingest:** Upload an alert file (`.eml`, `.txt`) or ingest an event via SIEM webhook.
2.  **Auto-Extract:** Regular expression engines extract IPs, domains, hashes, and files automatically.
3.  **Enrich:** Targeted background scanners (DNS, WHOIS, IP Reputation, HTTP Headers) run in parallel.
4.  **Visualize:** The SVG Knowledge Graph highlights how evidence matches similar case histories.
5.  **Compile:** The AI Timeline Narrator drafts the chronology, preparing a signed A4 PDF report for human review.

---

## 👥 Who Should Use Cygnal?

-   **SOC Analysts:** Rapidly triage alerts forwarded from SIEM tools (Splunk, Microsoft Sentinel).
-   **DFIR Responders:** Secure chain-of-custody signatures on files with local SHA-256 seals.
-   **Threat Hunters:** Trace correlation lines across threat datasets using visual link graphs.
-   **Compliance Officers:** Generate audit reports showing chronological log tracks.

---

## ✨ Core Capabilities

### 🧠 AI Investigation Copilot
-   **SQLite RAG Engine:** Ask questions in natural language about cases, timeline events, and scanner logs.
-   **Multi-Agent Pipeline:** Simulates parallel agent loops (OSINT, Malware, Custody, Compiler) to construct incident files.
-   **Chronological Narrator:** Turns chaotic event logs into a readable threat story automatically.

### 🤖 Autonomous Investigation Orchestrator
-   **Target Auto-Detection:** Dynamically parses formats (URLs, domains, IPs, files, email headers, hashes, free-text) to configure lookup dispatches.
-   **Parallel Execution Planning:** Schedules relevant tools concurrently using internal test routing pools to eliminate context-switching.
-   **Job Progress Dashboard:** Interactive HUD sidebar with progress bars, elapsed timer, completed checkpoints, and live visual graph updates.

### 🔒 Cryptographic Vault & Timeline

-   **SHA-256 Custody Seals:** Evidence files receive unique hashes on upload. Records are immutable and logged.
-   **Chronological timeline ledger:** Tracks all case activities with analyst attribution.
-   **SVG IOC Link Graph:** Visually maps relationships between cases, indicators, and files.

### 🛰️ Unified Security Sensors (10 Modules)
-   **Domain & Host Intel:** WHOIS registrar check, DNS A/MX/NS/TXT records.
-   **Forensic File Checks:** Metadata parser (EXIF/GPS/PDF), Malware scanner (hash audit, warnings).
-   **Web & Messaging Triage:** HTTP security headers checker, Email header hop analyzer, Screenshot scraper.
-   **Threat Lookup:** IP reputation database, CVE/IOC intelligence correlation.

---

## 🏗️ System Architecture

Cygnal separates logical components to allow for modular scaling:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│    DashboardShell Component  •  Zustand Session Store       │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP /api/* Proxy
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Flask API Blueprint                      │
│ auth_bp • cases_bp • scanners_bp • ai_bp • investigations_bp │
└─────────────────────────────┬───────────────────────────────┘

                              │ SQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SQLite Database                         │
│                      api/cygnal.db                          │
└─────────────────────────────────────────────────────────────┘
```

-   **API Proxy:** Next.js proxies `/api/*` routes to Flask port 5000 in development, eliminating CORS issues.
-   **Database:** A single `cygnal.db` SQLite file holds the system records.

---

## 🗄️ Database Schema

The database uses 8 normalized tables:
-   `users` — Credentials and RBAC registry (bcrypt hash, role assignment).
-   `cases` — Incident case files ledger.
-   `timeline` — Chronological event track records.
-   `evidence` — Files with SHA-256 hash custody signatures.
-   `lookups` — Auditing registry tracking all scanner execution runs.
-   `threat_intel` — Database tracking threat signatures.
-   `reports` — Forensics case report catalog.
-   `tool_permissions` — Scanner permission rules mapping employee/department overrides.

---

## 🔄 AI Copilot Workflows

Cygnal's RAG system runs queries against your local SQLite database without sending raw incident logs to public cloud LLMs:

```
  Analyst Question
         │
         ▼
  Extract entities (IPs, Case IDs, Hashes)
         │
         ▼
  Query SQLite tables (Cases, Lookups, Timeline)
         │
         ▼
  Assemble Context
         │
         ▼
  Heuristics Engine (Format summary markdown report)
```

---

## 🛰️ Unified Security Sensors

| Sensor | Category | Purpose | API Route |
| :--- | :--- | :--- | :--- |
| **WHOIS Lookup** | OSINT | Checks registrar ownership and registration dates. | `POST /api/scanners/whois` |
| **DNS Intelligence** | OSINT | Resolves A, MX, NS, and TXT records. | `POST /api/scanners/dns` |
| **HTTP Headers** | Forensics | Analyzes server security configurations. | `POST /api/scanners/headers` |
| **Email Analyzer** | Forensics | Validates SPF/DKIM/DMARC routing hops. | `POST /api/scanners/email-headers` |
| **IP Reputation** | Threat Intel | Checks ASN networks and threat status. | `POST /api/scanners/ip-reputation` |
| **Metadata Extractor** | Forensics | Parses EXIF metadata and GPS locations. | `POST /api/scanners/metadata` |
| **Malware Scanner** | Threat Intel | Runs file hash validation against signatures. | `POST /api/scanners/malware` |
| **Screenshot Scraper**| OSINT | Scrapes webpage text and technology stack. | `POST /api/scanners/screenshot` |
| **Reverse Image** | Forensics | Computes image hashes and flags warnings. | `POST /api/scanners/reverse-image` |
| **Threat Intel** | Threat Intel | enrich indicators and auto-detect CVE profiles. | `POST /api/scanners/threat-intel` |

---

## 📁 Folder Structure

```
cygnal/
├── api/                          # Flask Backend
│   ├── backend.py                # App gateway & blueprint routes registry
│   ├── database.py               # Database schemas and migration logic
│   ├── db_utils.py               # Unified Database abstractor (SQLite & PostgreSQL)
│   ├── task_utils.py             # Dynamic Task router (Celery or Threading)
│   ├── celery_app.py             # Celery application configuration & tasks
│   ├── auth_utils.py             # bcrypt hashing and seeding script
│   ├── jwt_utils.py              # HS256 token creation and verification
│   ├── routes/
│   │   └── v2/                   # Blueprints (auth, cases, scanners, ai, reports, copilot, mfa)
│   └── tests/                    # Backend pytest suite (79 tests)
│
├── frontend/                     # Next.js Workspace
│   ├── app/                      # Routes (cases, chat, scanners, analytics, copilot, settings, login)
│   ├── components/               # App layout shell and custom dashboard graphs
│   └── store/                    # Zustand auth token persistence
│
├── docker-compose.yml            # Multi-service production compose orchestration
├── docs/                         # Specifications suite
└── requirements.txt              # Python library dependencies
```

---

## ⚡ Quick Start

### Option A: Docker Compose (Production Setup)
You can run the entire Cygnal platform including the PostgreSQL database, Redis broker, Celery worker, backend API, and Next.js frontend with a single command:
```bash
docker-compose up --build
```
Once initialized, access the Next.js cockpit at `http://localhost:3000`.

### Option B: Local Development (Manual Setup)

#### 1. Initialize Python Backend
```bash
# Navigate to the workspace and create a virtual environment
python -m venv venv

# Activate venv (Windows PowerShell)
.\venv\Scripts\activate

# Install libraries
pip install -r requirements.txt

# Start the gateway server (Port 5000)
python api/backend.py
```
*Note: In local development mode without Docker/PostgreSQL, the system automatically falls back to an SQLite database file (`api/cygnal.db`) and local background threading.*

#### 2. Start Frontend Server
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server (Port 3001)
npm run dev
```

### Initial Credentials
*   **Username:** `Ayush Singh`
*   **Password:** `Duster@2004`

---

## 🧪 Testing

Cygnal includes a pytest-based backend test suite:
```bash
cd api
..\venv\Scripts\activate
pytest tests/ -v
```

---

## 🛑 Product Constitution (Guardrails)

To remain the best AI Investigation Workspace, Cygnal does **not** support:
*   Real-time SIEM log collection.
*   Active endpoint process blocking (EDR).
*   Automatic remediation or containment scripts.

*Every feature must directly reduce the time required to complete a security investigation.*
