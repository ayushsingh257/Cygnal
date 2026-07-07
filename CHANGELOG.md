# Cygnal — Changelog

All notable changes to Cygnal are documented in this file. Cygnal follows a development era model where each era represents a fully verified, production-ready feature package.

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
