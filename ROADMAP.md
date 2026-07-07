# Cygnal Development Roadmap — Version 1.0

Cygnal v1.0 is built incrementally in logical development eras. Each era represents a fully operational package that passes compilation and verification tests before the next era begins.

```
┌────────────────────────────────────────────────────────────────┐
│  ✅  Era 1: Core Documentation & System Design Specifications  │
└───────────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────┐
│  ✅  Era 2: Secure Identity, RBAC Registry & Auth Root Pages   │
└───────────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────┐
│  ✅  Era 3: Case Ledger Workspace, Timeline & SOC Dashboard    │
└───────────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────┐
│  ✅  Era 4: Scanners Multi-Sensor Engine & Policy Overrides    │
└───────────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────┐
│  ✅  Era 5: Analytics, A4 Reports & AI RAG Investigation Chat  │
└────────────────────────────────────────────────────────────────┘
```

---

## 📅 Era Specifications

### ✅ Era 1: System Design Specifications
**Status:** Complete  
**Objectives:** Establish the entire documentation suite mapping product features, security guidelines, UI/UX designs, database models, and API interfaces before any application code is compiled.  
**Deliverables:**
- `README.md`, `ROADMAP.md`, `TECHSTACK.md`, `CHANGELOG.md`
- `/docs` markdown suite: API specs, user roles, implementation phases, architecture

---

### ✅ Era 2: Identity Registry & Authentication
**Status:** Complete  
**Objectives:** Configure SQLite database migration routines, JWT token management, bcrypt password hashing, and all root-level auth pages.  
**Deliverables:**
- Backend: `database.py`, `jwt_utils.py`, `auth_utils.py`, `routes/v2/auth.py`
- Frontend: `/login`, `/register`, `/forgot-password`, `/email-verification`, `/profile-setup`, `/welcome`
- Auth store: `useAuthStore.ts` (Zustand with localStorage persistence)
- Tests: `tests/test_auth.py` — 3/3 passing

---

### ✅ Era 3: Case Ledger Workspace, Timeline & SOC Dashboard
**Status:** Complete  
**Objectives:** Build incident case management API, SHA-256 forensic evidence custody vault, chronological timeline logger, IOC SVG indicator graph, SOC Operations Hub dashboard with stat widgets, and DashboardShell navigation layout.  
**Deliverables:**
- Backend: `routes/v2/cases.py` — Cases CRUD, timeline events, SHA-256 evidence upload
- Frontend: `components/DashboardShell.tsx` — Role-filtered sidebar navigation shell
- Frontend: `app/dashboard/page.tsx` — SOC Operations Hub with stat cards, activity feed, health score ring, scanner module status grid
- Frontend: `app/cases/page.tsx` — Case workspace with timeline ledger, evidence vault, IOC link graph
- CSS: `globals.css` — Complete enterprise design system (tokens, animations, badges, data tables)
- Tests: `tests/test_cases.py` — 3/3 passing (case creation, timeline, SHA-256 upload)
- Branding: All "Sentinel" references replaced with "Cygnal" throughout

---

### ✅ Era 4: Multi-Sensor Engine & Policy Overrides
**Status:** Complete  
**Objectives:** Implement the full suite of 10 investigation scanners, background execution task manager, department/team permission middleware, and per-scanner policy override controls.  
**Planned Scanners:**
- WHOIS Lookup (domain/IP ownership, registrar, creation dates)
- HTTP Header Scanner (security headers, CSP, HSTS analysis)
- Metadata Extractor (EXIF, PDF/Office document properties)
- DNS Intelligence (A, MX, NS, TXT, historical records)
- Email Header Analyzer (routing hops, SPF, DKIM, DMARC)
- IP Reputation (threat feeds, ASN, geolocation, abuse scores)
- Malware Scanner (hash submission, VirusTotal-style result)
- Screenshot Capture (headless browser page archival)
- Reverse Image Search (EXIF + visual fingerprinting)
- Threat Intelligence (IOC correlation, CVE lookup)

---

### ✅ Era 5: Analytics, A4 Reports & AI RAG Investigation Chat
**Status:** Complete — 2026-07-07  
**Objectives:** Role-tailored analytics dashboards, A4-formatted investigation PDF reports, and SQLite-backed RAG AI chat copilot for natural language investigation queries.  
**Deliverables:**
- SVG telemetry visualizations (bar, area, trend charts) per user role — `app/analytics/page.tsx`
- A4 forensic report compiler with letterhead, evidence table, share tokens — `app/reports/page.tsx` + public `share/[token]`
- SQLite RAG AI chat with live database context injection — `app/chat/page.tsx` + `api/routes/v2/ai.py`
- AI case summaries and IOC correlation recommendations via RAG engine
- Multi-agent AI parallel pipeline orchestrator — `app/agents/page.tsx` + `POST /api/ai/agents`
- Sparkles particle homepage validation banner, redesigned Login/Register pages
- Admin cockpit, system audit ledger, profile page, settings page
- Tests: `test_ai.py` + `test_reports.py` — 4 new tests, **36/36 total passing**

---

## 🗂 Feature & Tool Status Matrix

| Feature | Category | Status |
|---|---|---|
| User Registration + JWT Auth | Identity | ✅ Complete |
| Role-Based Access Control (RBAC) | Identity | ✅ Complete |
| Database Schema & Migrations | Core | ✅ Complete |
| Incident Case Management | Investigation | ✅ Complete |
| SHA-256 Evidence Custody Vault | Forensics | ✅ Complete |
| Chronological Timeline Ledger | Investigation | ✅ Complete |
| IOC SVG Link Graph | Visualization | ✅ Complete |
| SOC Operations Hub Dashboard | Dashboard | ✅ Complete |
| Security Health Score | Dashboard | ✅ Complete (mock) |
| DashboardShell Navigation | UX | ✅ Complete |
| WHOIS Lookup Scanner | Scanner | ✅ Complete |
| HTTP Header Scanner | Scanner | ✅ Complete |
| Metadata Extractor | Scanner | ✅ Complete |
| DNS Intelligence | Scanner | ✅ Complete |
| Email Header Analyzer | Scanner | ✅ Complete |
| IP Reputation Feed | Scanner | ✅ Complete |
| Malware File Scanner | Scanner | ✅ Complete |
| Screenshot Capture Tool | Scanner | ✅ Complete |
| Reverse Image Search | Scanner | ✅ Complete |
| Threat Intelligence Lookup | Scanner | ✅ Complete |
| Analytics Dashboards | Reporting | ✅ Complete |
| A4 PDF Report Generator | Reporting | ✅ Complete |
| RAG AI Investigation Chat | AI | ✅ Complete |
| AI Case Summaries | AI | ✅ Complete |
| AI IOC Correlation | AI | ✅ Complete (RAG-linked) |
| Multi-Agent AI Workflows | AI | ✅ Complete |
