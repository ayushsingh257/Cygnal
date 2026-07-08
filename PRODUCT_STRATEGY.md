# Cygnal Product Strategy: The Autonomous Security Workspace

This document outlines the market positioning, competitive advantages, user experience design philosophy, and metrics definitions that guide the evolution of Cygnal.

---

## 🧭 1. Market Positioning & Core Narrative

### The Core Problem: Alert Fatigue & Ingestion Chaos
Security teams do not lack logs; they lack time. Analysts spend up to 70% of their triage windows copy-pasting indicators (IPs, hashes, domains) between separate threat feeds, WHOIS check pages, DNS query tools, and case files. This "tab tax" increases the Mean Time to Investigate (MTTI), introduces room for errors in evidence tracking, and results in analyst burnout.

### The Cygnal Solution: The Unified Workspace Layer
Cygnal does not collect or archive raw logs like a SIEM, nor does it block endpoint execution like an EDR. Instead, it sits directly above them as the **Investigation Workspace**. Cygnal is the unified interface where raw cyber evidence is turned into complete, cryptographically verified investigations in minutes.

```
┌─────────────────────────────────────────────────────────────┐
│                       Investigation Layer                   │
│                            Cygnal                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Reads/Correlates
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            SIEM / EDR Telemetry & Alerts Ingestion          │
│        Splunk   •   Sentinel   •   Defender   •   Elastic   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 2. Key User Workflows

### The Zero-Tab Autonomous Investigation Workflow

```
[1] alert ingest (Webhook / EML Upload)
       │
       ▼
[2] Auto-Extract IOCs (Automatic Regex & Entity Parsing)
       │
       ▼
[3] Investigation Orchestrator (Parallel dispatches and progress bar tracking)
       │
       ▼

[4] Map evidence relationships (Knowledge Graph compilation)
       │
       ▼
[5] Narrate chronology (AI Timeline Generator splits into phases)
       │
       ▼
[6] Review & Compile (Investigator signs off on A4 Forensic PDF)
```

1.  **Alert Ingest:** An analyst uploads an incident file (`.eml`, `.txt`) or an alert comes via SIEM webhook.
2.  **Auto-Extract IOCs:** Cygnal automatically extracts IPs, domains, hashes, and files, prompting the user: *"I identified 3 indicators and 1 attachment. Investigate all?"*
3.  **Orchestrated Scans:** The Investigation Orchestrator dispatches parallel background checks (WHOIS, DNS, IP reputation, metadata, malware, headers, screenshots) concurrently, tracking execution states inside a real-time progress dashboard.

4.  **Visualize Context:** The Knowledge Graph visualizes relations between indicators, prior lookups history, and similar cases automatically.
5.  **Narrate Chronology:** The AI Timeline Builder drafts a natural language timeline of the security event.
6.  **Verify & Close:** The analyst reviews, downloads the sealed A4 forensic report, and marks the case resolved.

---

## 📦 3. Tiered Feature Access Model

Cygnal's long-term sustainability relies on a model split across Community, Enterprise, and Premium Cloud tiers, supported by an open Plugin Marketplace.

| Core Platform (Community) | Enterprise Edition (Self-Hosted) | Premium Cloud (SaaS) | Plugin Marketplace |
| :--- | :--- | :--- | :--- |
| Single-investigator console | Multi-analyst case assignment | Hosted multi-tenant architecture | Community search plugins |
| 10 built-in scanners | Role-based case locking | Global Threat Intel enrichment API | Custom report templates |
| SQLite relational database | PostgreSQL target support | Cloud HSM evidence sealing | Third-party SIEM connectors |
| Local SHA-256 vault | SAML / SSO authentication | Managed database backups | Advanced visualization hooks |
| Local RAG AI Copilot | System Auditing Ledger | Dedicated customer support | Custom agent scripts |

---

## ⚖️ 4. Workflow-Based Competitive Positioning

We do not compete on features; we compete on workflow efficiency.

*   **Sentinel / Splunk:** Excellent for log ingestion and correlation rules. Terrible for case note narrative building, evidence chain-of-custody tracking, and threat lookup workspace coordination. Cygnal is the panel that analysts open to investigate an alert forwarded from Sentinel/Splunk.
*   **TheHive / Cortex:** Powerful SOAR case management. However, they are heavy, complex to configure, and treat AI and visual link graphs as separate external dependencies. Cygnal integrates the graph, scanners, and AI copilot out-of-the-box in a lightweight workspace.
*   **OpenCTI / MISP:** Excellent threat intelligence catalogs. Poor at managing actual evidence files, tracking case lifecycle statuses, and generating executive reports.

---

## 📈 5. Product Metrics & KPIs

We validate our strategy using clear engagement indicators:

1.  **MTTI Reduction Rate:** Target a 75% reduction in investigation duration compared to manual tool switching.
2.  **Analyst Task Focus Metric:** Time spent inside a single Cygnal screen without switching tabs or context.
3.  **Extraction Recall Rate:** The accuracy of the IOC extractor in identifying threat parameters within raw text inputs.
4.  **API Integration Latency:** Background Celery scan execution time must average less than 15 seconds.
