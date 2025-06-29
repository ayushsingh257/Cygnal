# Cygnal OSINT Reconnaissance Framework

## Introduction

Cygnal is an open-source intelligence (OSINT) platform engineered for deep surface analysis, digital threat investigation, and metadata-driven reconnaissance. The system integrates passive scanning, content inspection, reverse image indexing, and forensic logging to assist analysts in profiling digital assets with precision. Designed for cybersecurity professionals, digital forensics teams, and intelligence analysts, Cygnal prioritizes modularity, ethical compliance, and verifiable reporting.

## Motivation

In contemporary threat landscapes, adversaries increasingly obfuscate their infrastructure behind ephemeral domains, evasive headers, and minimal WHOIS footprints. Cygnal addresses this challenge by turning surface-level digital exposure—headers, contact data, domain records, images—into actionable intelligence, captured in a reproducible and structured format.

## Technical Overview

Cygnal consists of a Next.js 14 frontend and a Flask-based backend. The platform follows modular microservice-style principles for each recon tool, supporting separation of concerns, ease of extension, and secure access control via JWT authentication and role-based privileges.

---

## ✅ Current Capabilities (As of Phase 28)

Cygnal includes the following tools:

- **Security Header Analysis**
  Detection of misconfigured or missing HTTP security headers.

- **WHOIS Record Extraction**
  Passive profiling of domain registration, ownership, and expiration.

- **Website Screenshot Capture**
  Full-page rendering via Selenium for visual archiving.

- **Metadata Recon Tool**
  Extraction of embedded EXIF, DOCX, and PDF metadata (author, device, creation time).

- **Reverse Image Search (Offline)**
  AI-based similarity detection using OpenAI CLIP and FAISS for visual correlation.

- **Email Exposure Scanner**
  - Static Regex-based scan of visible email addresses.
  - Subpage crawler for recursive page scanning.
  - JavaScript-rendered extraction using headless Chrome.
  - Trust model scoring based on source context.

- **🛡️ Malware Scanner (Hybrid Analysis Integration)** *(Phase 27)*
  Enables secure file-based malware scanning via [Hybrid Analysis](https://www.hybrid-analysis.com/):
  - Verdict (malicious/suspicious/clean)
  - Threat family and score
  - Environment used during sandboxing
  - Automatically logs to Audit Viewer and Visual Dashboard

- **🌐 IP Reputation Tracker (AbuseIPDB Integration)** *(Phase 28)*
  Perform passive abuse reputation lookup using [AbuseIPDB](https://www.abuseipdb.com/):
  - Abuse Score (0–100)
  - Total abuse reports and timestamps
  - ISP, Country, Domain, and Usage Type
  - Auto-logged to Visual Dashboard + Audit Trail

  **🔐 Requirements**
  Set the API key via:

  - PowerShell:
    ```powershell
    $env:ABUSEIPDB_API_KEY="your_api_key"
    ```

  - Linux/macOS:
    ```bash
    export ABUSEIPDB_API_KEY=your_api_key
    ```

  > Note: If the API key is missing, the tool fails gracefully with error messaging.

- **PDF Report Generator**
  Full PDF snapshot of analyst results with branding and timestamps (Phase 17).

- **User Authentication**
  JWT-secured login with role-based access (Admin, Analyst, Viewer).

- **Analyst Session Logs**
  Per-tool session logging with export and inspection.

- **Audit Trail Logging**
  - File-based logs
  - Syslog export
  - AWS CloudWatch integration
  - SQLite mirroring for analytics

- **Visual Dashboard (Phase 26)**
  - Tool Usage Frequency (bar graph)
  - Tool Usage Timeline (multi-line chart)
  - Tool Usage (Last 5 Days)
  - Admin-only access
  - Auto-update via session logs

---

## System Architecture

**Frontend:**
Next.js 14, Zustand, TailwindCSS, modular dynamic imports.

**Backend:**
Python + Flask, modular routes, JWT auth, logging, audit trail.

**Storage:**
- `audit_logs/`: JSON logs per scan
- `lookup_logs.db`: SQLite audit trail (Phase 24)
- `session_logs/`: Structured per-session JSON data
- `screenshots/`, `temp_upload/`: Runtime output

---

## Phase Overview

### Phase 1–16: Core Recon Tools
- Header Scanner
- WHOIS Lookup
- Screenshot Capture
- Email Exposure Scanner
- Metadata Extraction (EXIF/PDF/DOCX)
- Reverse Image Search (CLIP+FAISS)
- Session Logging + Audit Viewer
- UI overhaul with Tailwind + Next.js
- Authentication, RBAC, PDF reporting

### Phase 17–20: Reporting & Auth
- JWT-secured routes
- PDF Snapshot Reports
- Admin/Analyst separation
- Persistent session history

### Phase 21–24: Audit & Logging
- Syslog & CloudWatch export
- SQLite-based audit mirroring
- IP, User, Tool, Input, Result
- Queryable logs for dashboards

### Phase 26: Visual Dashboard
- Admin-only analytics view
- Tool frequency + timeline charts
- JSON viewer for raw audit events

### Phase 27: Malware Scanner
- Hybrid Analysis integration
- Threat score + sandbox verdicts
- Graceful fallback if key is not set
- Audit logs and dashboard support

### Phase 28: IP Reputation Tracker
- AbuseIPDB-based passive IP reputation check
- Displays score, reports, ISP, and location
- Logs to audit trail and dashboard
- Graceful failure if key is not set

---

## Sample Outputs

**Header Scanner**
[+] Content-Security-Policy: Present
[-] X-Frame-Options: Missing

**WHOIS Lookup**
Domain: cyberpulse.in
Registrar: GoDaddy
Created: 2024-06-24
Country: IN

**Metadata Extraction**
Tool: Canva
Author: Ayush Singh
Created: 2024-06-20T12:44:22Z

**Reverse Image Match**
Path: reference_images/shoe.png
Confidence: 92.31%

**Malware Scanner (Hybrid Analysis)**
Verdict: malicious
Threat Score: 85
Environment: Windows 10 64-bit

**IP Reputation Lookup**
IP: 45.227.254.19
Abuse Score: 100/100
Total Reports: 1867
Last Reported: 2025-06-25T13:12:49Z
Country: LT
ISP: XWIN UNIVERSAL LTD
Usage Type: Hosting/Data Center

---

## Installation

# Clone
git clone https://github.com/ayushsingh257/Cygnal.git
cd Cygnal

# Backend
cd api
pip install -r requirements.txt
python backend.py

# Frontend
cd ../frontend
npm install
npm run dev

Licensing & Ethics
Cygnal is released under the MIT License (© 2025 Ayush Singh Kshatriya).
It is intended for lawful and ethical cybersecurity investigations. Unauthorized use against external infrastructure is discouraged and may violate legal statutes.

Contact
Ayush Singh Kshatriya
Cybersecurity Researcher & OSINT Analyst
GitHub: @ayushsingh257
LinkedIn: linkedin.com/in/ayush-singh-kshatriya