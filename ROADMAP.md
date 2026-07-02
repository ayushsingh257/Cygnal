# 🗺️ Cygnal 2.0 — Master Engineering Roadmap

This document serves as the living master engineering roadmap for **Cygnal 2.0**. It charts the complete architectural evolution of the platform from its humble beginnings as a local reconnaissance tool into an enterprise-grade, cooperative Multi-Agent AI security operations and OSINT workspace.

---

## 🎯 The Cygnal 2.0 Vision

In modern cyber investigations and digital forensics, analysts waste crucial time switching between disconnected security scanners, manually copy-pasting indicator parameters, and trying to correlate relationships across domain histories, open ports, EXIF tags, and malware sandbox reports.

Cygnal 2.0 eliminates this friction by unifying these tools under a **persistent, graph-based case management workspace**. An autonomous orchestrator of specialized AI agents acts as a cooperative investigative team, executing scans, analyzing evidence, mapping relationships, and writing forensics documentation in real-time.

---

## 🏛️ The 20 Pillars of Cygnal 2.0

These twenty engineering pillars guide the construction and feature set of Cygnal 2.0:

### 1. Multi-Agent AI Orchestration
Instead of a single text-based chatbot, deploy specialized, cooperative AI agents with distinct tool access:
- **Recon Agent**: Dispatches active/passive network sweeps and scans.
- **Malware Analysis Agent**: Submits binaries to sandboxes, parses payload verdicts.
- **Threat Intelligence Agent**: Queries external feeds and tracks indicator reputation.
- **Report Writing Agent**: Collects analyst actions and formats forensic writeups.
- **Forensics & Incident Response Agents**: Inspects network artifacts, PCAPs, and logs.

### 2. AI Workflow Automation
One input (e.g., a suspicious URL/IP) prompts the orchestrator to automatically construct and trigger the optimal sequence of passive WHOIS, DNS mapping, header security verification, and reputation fusions without manual step-by-step triggers.

### 3. Attack Surface Mapper
Given a target root domain, discover and list: subdomains, open ports, SSL configurations, DNS (MX, SPF, DMARC, TXT), ASNs, CDNs, WAF presence, and technology fingerprints to produce a vulnerability heatmap.

### 4. Custom AI Report Writer
Generate tailored intelligence deliverables on-demand:
- **Executive Summary** for risk leadership.
- **Technical Report** showing raw configuration metrics.
- **SOC Alert Report** detailing threat priorities and triage flags.
- **Law Enforcement Forensics Report** proving hash integrity and chronological chain of custody.

### 5. Chronological Investigation Timeline
An interactive visual flow showing exactly how an investigation unfolded (e.g., WHOIS lookup ➔ passive DNS resolves ➔ AbuseIPDB trigger ➔ screenshot capture ➔ file upload ➔ analyst annotation ➔ AI verdict).

### 6. IOC Correlation Engine
Compute relationships between indicators (IP addresses, domains, registration emails, nameservers, file hashes, SSL certificate serials, ASNs) to surface infrastructure connections automatically.

### 7. Modular Plugin Marketplace
A standardized API structure under `/plugins` allowing community developers to easily add new scanners (e.g. AlienVault OTX, Shodan, Censys, URLScan, Have I Been Pwned) by creating small, isolated Python modules.

### 8. Contextual AI Tool Recommendations
A real-time guidance system. If the reputation scanner flags an IP, the AI assistant alerts the analyst with a recommended next-step lookup (e.g., "High abuse confidence. Recommended action: run Shodan port sweep and geolocation map").

### 9. Unified Threat Intelligence Fusion
Consolidate telemetry from VirusTotal, AbuseIPDB, GreyNoise, Shodan, and Hybrid Analysis into a single, weighted **Global Threat Index** (0-100 score).

### 10. Live SOC & Incident Dashboard
An operations dashboard showing a live active scan queue, background job states, world threat heatmaps, IOC statistics, active analyst cases, and system threat levels.

### 11. Asynchronous Task Architecture
Migrate heavyweight scans (nmap, headless Chrome, and sandbox wait states) into background execution queues (using Flask-Executor or Celery/Redis) with real-time percentage progress tracking on the UI.

### 12. Local Vector Database Integration
Utilize local vector storage (ChromaDB or Qdrant) to embed and index all case notes, scanned results, and indicator data.

### 13. Retrieval-Augmented Generation (RAG)
Enable the AI assistant to reference past investigations, historical audit trails, uploaded forensics documents, and cybersecurity frameworks before suggesting actions.

### 14. Session-Scoped Investigation Memory
Keep agent conversations isolated per case to ensure that the context of one investigation does not leak into or pollute search prompts of another.

### 15. AI Evidence Analyzer
Upload PCAPs, logs, PDF, DOCX, or ZIP files. The AI extracts text, indexes IPs/hashes, identifies anomalies, and generates security breakdowns automatically.

### 16. Keyboard Command Palette
A `Ctrl + K` overlay on the frontend permitting keyboard-first command executions (e.g., `/scan target.com`, `/case open 12`, `/recommendations`).

### 17. Persistent Cyber Knowledge Graph
Represent every digital artifact as a node in an SQLite-backed relation graph (IP ➔ Resolves To ➔ Domain ➔ Registrant ➔ Email).

### 18. Enterprise Authentication & SSO
Transition local authentication to secure standard JWT sessions with refresh tokens, role-based controls (Viewer, Analyst, Admin), and optional SSO integrations (OAuth, Entra ID, LDAP).

### 19. API-First Architecture (v2 API)
Ensure the Next.js app communicates through a standard, documented JSON schema under `/api/v2/...` facilitating developer integration.

### 20. Premium UI/UX Redesign
Overhaul the initial workspace layout into a premium, immersive dark-themed dashboard using glassmorphism, responsive canvas-based charts, spatial visualizations, and modern micro-animations.

---

## 📅 Implementation Phases & Status

Below is the status of the development milestones.

| Phase | Milestone | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Master Documentation** | Write Cygnal 2.0 specs, separate README & ROADMAP. | ✅ Completed |
| **Phase 1** | **Architectural Hardening** | Modularize Flask routes, consolidate SQLite DBs, fix hardcoded ports. | ✅ Completed |
| **Phase 2** | **Asynchronous Job Queues** | Implement task executors, progress trackers, and Live SOC dashboard. | 🛠️ In Progress |
| **Phase 3** | **Case & Evidence System** | Create Case CRUD, SHA-256 evidence logs, and timeline mapping. | 📅 Planned |
| **Phase 4** | **Plugin & Threat Fusion** | Create `/plugins` architecture, integrate threat index calculations. | 📅 Planned |
| **Phase 5** | **Multi-Agent AI & RAG** | Setup vector database, deploy Ollama/GPT routing, agent workflows. | 📅 Planned |
| **Phase 6** | **Attack Surface & Graph** | Implement automated subdomain sweeps, build relation link graphs. | 📅 Planned |
| **Phase 7** | **Evidence & Report AI** | PCAP/doc entity extractions, multi-template report compiler. | 📅 Planned |
| **Phase 8** | **Enterprise Auth & CLI** | Integrate OAuth logins and `Ctrl+K` command palettes. | 📅 Planned |
| **Phase 9** | **Premium UI/UX Redesign** | Immersive cyber workspace styling, animations, and charts polish. | 📅 Planned |

---

## 🛠️ Detailed Progress Log

### Phase 1: Architectural Hardening & API Proxy Cleanup (Completed)
- **Backend Blueprints**: Refactored the monolithic `backend.py` into modular python files located under `api/routes/v2/` (`auth.py`, `admin.py`, `scanners.py`).
- **Unified DB**: Pointers in `auth_utils.py`, `database.py`, and `intel_bridge.py` now write to a single consolidated database file: `cygnal.db`.
- **Proxy Endpoints**: Removed all hardcoded `http://localhost:5000` URLs from Next.js component files (`AuditTrailViewer.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `IPReputationTool.tsx`, `MetadataTool.tsx`, `PassiveDNSLookup.tsx`, `ScreenshotTool.tsx`) so that communications route cleanly via Next.js proxy rewrite mapping rules.
- **Port Isolation**: Reconfigured `frontend/package.json` to launch Next.js dev server on port `3001` to prevent port collisions with other independent projects (specifically CCGP running on port `3000`).
- **Input Sanitization**: Hardened `port_scanner.py` input logic to validate domain structures and block potential option injection payloads.

### Phase 2: Asynchronous Job Queues & Live SOC Dashboard (Current)
- *Next Steps*: Integrate background executor threads in Flask, write percentage progress polling routes, and construct the Live SOC workspace panel.
