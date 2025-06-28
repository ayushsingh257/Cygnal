Cygnal OSINT Reconnaissance Framework

Introduction
Cygnal is an open-source intelligence (OSINT) platform engineered for deep surface analysis, digital threat investigation, and metadata-driven reconnaissance. The system integrates passive scanning, content inspection, reverse image indexing, and forensic logging to assist analysts in profiling digital assets with precision. Designed for cybersecurity professionals, digital forensics teams, and intelligence analysts, Cygnal prioritizes modularity, ethical compliance, and verifiable reporting.

Motivation
In contemporary threat landscapes, adversaries increasingly obfuscate their infrastructure behind ephemeral domains, evasive headers, and minimal WHOIS footprints. Cygnal addresses this challenge by turning surface-level digital exposure—headers, contact data, domain records, images—into actionable intelligence, captured in a reproducible and structured format.

Technical Overview
Cygnal consists of a Next.js 14 frontend and a Flask-based backend. The platform follows modular microservice-style principles for each recon tool, supporting separation of concerns, ease of extension, and secure access control via JWT authentication and role-based privileges.

## Current Capabilities (As of Phase 26)
Cygnal includes the following features:

- **Security Header Analysis**: Detection of misconfigured or missing HTTP security headers.
- **WHOIS Record Extraction**: Passive profiling of domain registration, ownership, and expiration.
- **Website Screenshot Capture**: Full-page rendering via Selenium for visual archiving.
- **Metadata Recon Tool**: Extraction of embedded EXIF, DOCX, and PDF metadata (author, device, creation time).
- **Reverse Image Search (Offline)**: AI-based similarity detection using OpenAI CLIP and FAISS for visual correlation.
- **Email Exposure Scanner**:
  - Static Regex-based scan of visible email addresses.
  - Subpage crawler for recursive page scanning.
  - JavaScript-rendered extraction using headless Chrome.
  - Trust model scoring based on source context.
- **PDF Report Generator**: Snapshot of analyst sessions and tool results (Phase 17, postponed).
- **User Authentication**: Role-based access (Admin, Analyst, Viewer) via JWT and bcrypt-secured credentials.
- **Analyst Session Logs**: Structured session-wide tracking with JSON/CSV export.
- **Audit Trail Logging**:
  - File-based JSON audit history.
  - Syslog and AWS CloudWatch forwarding (Phase 23).
  - SQLite database mirroring for audit inspection (Phase 24).
- **Visual Dashboard** *(Phase 26)*:
  - Role-restricted session analytics for admins.
  - Tool usage frequency bar chart.
  - Tool usage timeline (multi-line graph).
  - Last 5 days graph for daily operational review.
  - Smooth animated slide-in visualization.

System Architecture
The architecture follows a clear separation of layers:

Frontend: Next.js 14 (React), Zustand state management, TailwindCSS for responsive UI, dynamic module imports for performance.
Backend: Flask + Python, secured with JWT, modular routes per tool, logging, and tamper-resistant audit trails.

Storage:
audit_logs.json: Append-only audit file
lookup_logs.db: SQLite database (Phase 24)
session_logs/: Tool-wise session artifacts
screenshots/, temp_upload/: Runtime-generated evidence


Phase Overview
Phase 1–16: Core Tools & UI
Security Header Scanner
WHOIS Lookup
Screenshot Tool
Email Scanner (HTML, JS, Crawler)
Metadata Recon (EXIF, PDF, DOCX)
Reverse Image Search (CLIP + FAISS)
Session Log Export
UI redesign (Next.js + Tailwind)
User Authentication
Role-Based Access Control

### Phase 17–20: Reporting and Access Control
- Unified PDF Reporting (Postponed)
- Secure login/register with JWT
- Local session persistence (Zustand)
- Route-level restriction
- Analyst/Admin role enforcement

### Phase 21–24: Logging, Audit & SIEM Prep
- **Phase 21**: Role-based access enforced via frontend/backend JWT parsing
- **Phase 22**: Advanced Email Scanner (with fallback, trust scoring, crawl depth)
- **Phase 23**:
  - File-based JSON audit logs
  - Syslog UDP export (configurable)
  - AWS CloudWatch logging
- **Phase 24**:
  - SQLite database mirroring of audit logs
  - Persistent forensic storage of IP, user, tool, input, and result
  - `check_logs.py` utility for direct inspection (CLI)

### Phase 26 – Visual Analytics Dashboard
The dashboard provides role-gated graphical analytics for audit log review:
- Tool Usage Frequency (Bar Graph)
- Tool Usage Timeline (Multi-line Graph per Tool)
- Tool Usage (Last 5 Days View)
- Automatically updates based on SQLite history
- Admin-only access enforced via route + JWT validation

Sample Output (Tool Snapshots)

Header Scanner
[+] Content-Security-Policy: Present
[-] X-Frame-Options: Missing
[+] Strict-Transport-Security: Present

WHOIS Record
Domain: cyberpulse.in
Registrar: GoDaddy
Creation: 2024-06-24
Country: IN

Metadata Extraction (test.pdf)
Author: Ayush Singh
Created: 2024-06-20T12:44:22Z
Tool: Canva

Reverse Image Search
Match Path: reference_images/shoe.png
Match Confidence: 92.31%

Phase 24 – Persistent Audit Logging (SQLite)
The current phase introduces long-term, queryable audit storage.
All tool events (Header, WHOIS, Metadata, Image, Email) are now mirrored into lookup_logs.db.
The lookups table stores:
timestamp, user, ip, tool, input, result
Logs can be accessed via CLI using check_logs.py or queried programmatically for dashboards.
This ensures tamper-resistant analyst accountability and forensic reproducibility in regulated environments.

Installation
Clone the repository:
git clone https://github.com/ayushsingh257/Cygnal.git
cd Cygnal

Install backend dependencies:
cd api
pip install -r requirements.txt

Start Flask backend:
python backend.py

Run frontend (in separate terminal):
cd frontend
npm install
npm run dev


Licensing & Ethics
Cygnal is licensed under the MIT License (© 2025 Ayush Singh Kshatriya).
This software is intended strictly for lawful, ethical use in intelligence, threat research, and digital forensics. Unauthorized scanning of third-party infrastructure is discouraged and may constitute a legal offense.

Contact
Ayush Singh Kshatriya
Cybersecurity Researcher & OSINT Analyst
GitHub: @ayushsingh257
LinkedIn: linkedin.com/in/ayush-singh-kshatriya