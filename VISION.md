# Cygnal Vision Statement and Constitution

## 🎯 1. Mission & Vision

### Mission
**Cygnal turns raw cyber evidence into complete investigations in minutes—not hours.**

### Vision
To become the world's premier AI-powered **Investigation Workspace** for Security Operations Centers (SOC), Digital Forensics and Incident Response (DFIR) teams, threat hunters, and security researchers.

Cygnal sits above security telemetry platforms, acting as a unified cognitive investigation layer that automatically transforms raw cyber evidence into explainable investigations through autonomous orchestration, visual evidence correlation, AI-assisted reasoning, and investigator-guided decision making.

Rather than functioning as a collection of independent cybersecurity tools, Cygnal operates as a complete investigation workspace where evidence collection, enrichment, analysis, correlation, reporting, and AI assistance occur inside a single workflow.
---

## 🚫 2. Product Guardrails: What Cygnal Is and Is Not

To maintain focus and avoid bloat, Cygnal has strict functional boundaries. Every feature proposal must align with these guardrails.

| What Cygnal IS | What Cygnal IS NOT |
| :--- | :--- |
| **An Investigation Workspace** that unifies evidence, context, and intelligence analysis. | **A SIEM Replacement.** We do not ingest or parse gigabytes of raw system logs in real-time. |
| **A Forensics Custody Vault** that secures evidence integrity via SHA-256 signatures. | **An EDR / Active Response Agent.** We do not deploy endpoint agents to block processes or isolate hosts. |
| **An OSINT & Telemetry Aggregator** executing targeted on-demand queries. | **A Vulnerability / Network Scanner.** We do not run automated vulnerability assessments or continuous port sweeps. |
| **An AI Investigation Workspace** autonomous orchestration, contextual analysis, visual correlation, and investigator-guided AI assistance. | **A Generic Chatbot.** We do not host generic conversational LLM models unrelated to case data. |
| **A Timeline & Report Compiler** that automates documentation for human review. | **A Generic Ticketing System.** We do not track IT helpdesk requests or non-security issues. |

### The Core Question
Every proposed feature must answer:
> **"Does this feature directly reduce the time required for a human security investigator to understand, document, and report an incident?"**

If the answer is no, the feature must be rejected or delegated to an external plugin/integration.

---

## 👥 3. Target Users & Expected Workflows

Cygnal is built specifically for security professionals who perform deep analytical and forensics tasks:

### 1. Tier 2/3 SOC Analysts
*   **Need:** Fast triage of alerts forwarded from the SIEM.
*   **Workflow:** Receives an alert containing indicators of compromise (IOCs) -> Creates a Cygnal case -> Runs targeted metadata/IP reputation/header scans -> Extracts findings to the case timeline -> Resolves alerts.

### 2. Digital Forensics Investigators (DFIR)
*   **Need:** Immutable chain-of-custody tracking for binary evidence, system artifacts, and document metadata.
*   **Workflow:** Uploads evidence binaries to the Case Custody Vault -> Computes immutable SHA-256 signatures -> Runs reverse-image or metadata extractions -> Builds case timeline -> Compiles A4 reports for legal/executive submission.

### 3. Threat Hunters
*   **Need:** Pivot points across disparate threat intelligence sources.
*   **Workflow:** Investigates a specific threat actor campaign -> Uses the SVG IOC Link Graph to visualize correlations -> Dispatches RAG queries to identify matching indicator trends.

### 4. Incident Response Leads
*   **Need:** Rapid synthesis of an active intrusion to guide containment strategies.
*   **Workflow:** Orchestrates parallel multi-agent AI scripts to collect context -> Reviews AI timeline summaries -> Approves forensic reports to guide executive decision-making.

---

## 📅 4. Long-Term Goals (3–5 Years)

1.  **Zero-Tab Triage:** Eliminate the need for analysts to open multiple browser tabs for threat lookup utilities.
2.  **Autonomous Evidence Synthesis:** Turn raw, unstructured files (emails, binaries, images) into a structured case profile automatically upon upload.
3.  **Ubiquitous Integration:** Establish Cygnal as the standard investigation pane inside SIEMs (Splunk, Microsoft Sentinel) and EDR systems (CrowdStrike, Microsoft Defender).
4.  **Community-Driven Sensor Ecosystem:** Power a rich plugin store where third-party providers build and maintain their own ingestion connectors and scanners.

---

## 💡 5. Core Principles

### Design Principles
*   **Immersive, Low-Cognitive Layouts:** Dark, high-contrast, glassmorphic HUDs reduce eye strain during extended night-shift operations.
*   **Single-Context Workspaces:** Minimize navigation changes. All data related to a case (evidence, timeline, scans, AI chat, graph) must exist within a single dashboard pane.
*   **Visual Data over Tables:** Prioritize visual networks (SVG graphs, timeline tracks) over paginated spreadsheets wherever correlation is required.

### Engineering Principles
*   **Zero-Dependency Core:** Keep the core engine decoupled from specific external commercial vendors. Use interface wrappers for scanners and databases.
*   **Strict Security Defaults:** Force cryptography at ingest (e.g., SHA-256 for files, bcrypt for credentials, HS256/RS256 for JWTs). Audit-log all read/write actions on the platform.
*   **Local-First Resilience:** Ensure the application can run offline, on isolated private subnets, or inside air-gapped environments.

### AI Principles
*   **Investigator-in-the-Loop:** AI does not make execution decisions. AI analyzes, correlates, and suggests. Humans review, approve, and contain.
*   **Deterministic RAG Context:** No hallucinated facts. The AI must strictly base its summaries on verified database rows, logs, and evidence hashes. 
*   **Explainable Reasoning:** The AI must outline *how* it arrived at its correlation (e.g., matching a domain because it appeared in lookups for a specific case).
* **Human Approval for Autonomous Actions:** The AI may recommend and prepare investigations automatically, but execution of investigation plans must remain subject to explicit analyst approval unless organizational policies allow otherwise.

---

## 📈 6. Success Metrics

To verify if Cygnal is achieving its mission, the platform tracks:

*   **Mean Time to Triage (MTTRt):** The speed at which an analyst can collect WHOIS, DNS, IP reputation, and headers context for an indicator. Target: `< 30 seconds`.
*   **Mean Time to Investigate (MTTI):** The duration from case creation to report compilation. Target: `< 15 minutes`.
*   **Tool-Switching Count:** The number of separate platform boundaries an investigator crosses during triage. Target: `1` (Cygnal only).
*   **Evidence Signature Integrity Rate:** Zero occurrences of untracked or modified evidence hash records in closed cases.
* **Autonomous Investigation Adoption:** Percentage of investigations initiated through the AI Copilot and Investigation Orchestrator instead of manual scanner execution.

---

## 🗺️ 7. Product Evolution Roadmap (v1.0 – v5.0)

Cygnal evolves in clean version milestones, balancing new cognitive capabilities with enterprise production upgrades.

```
  Cygnal v1.0 (Baseline) ──────► Cygnal v1.5 (Autonomous) ─────► Cygnal v2.0 (Enterprise)
   • Unified console              • AI Copilot / Auto-IOC         • PostgreSQL & Celery/Redis
   
                                             │
                                             ▼
  Cygnal v5.0 (Commercial) ◄───── Cygnal v4.5 (Plugin SDK) ◄───── Cygnal v4.0 (Intelligence)
   • Hosted SaaS Billing          • Plugin Marketplace            • OIDC / SAML / Entra ID
                                                                  • Vector DB & SOAR Engine
```

*   **v1.0 (Finished):** Local execution console, SQLite schema, 10 scanners, timeline ledger, custom SVG charts.
*   **v1.5 (Finished):** Autonomous Investigation Workspace (Auto-IOC Extraction, Investigation Orchestrator, Visual Knowledge Graph, AI Timeline Stages, and AI Copilot).
*   **v2.0 (Finished):** Production migration to PostgreSQL, Celery/Redis background task queues, multi-factor auth (MFA), and system Docker orchestration.
*   **v2.5 (Finished):** Real-time multi-analyst workspaces, comment threads, case locking.
*   **v3.0 (Finished):** SIEM/EDR connector webhooks for Splunk, Microsoft Sentinel, and Elastic.
*   **v3.5 (Current):** Autonomous AI analyst routing, containment tips compiler, pre-run forensics packaging.
*   **v4.0 (Enterprise Intelligence):** Entra ID/OIDC SSO, STIX/TAXII threat intel feeds, vector search & SOAR playbook orchestrator.
*   **v4.5 (Plugin SDK):** Community plugin marketplace, manifest schemas for external scanners.
*   **v5.0 (Commercial):** Hosted multi-tenant cloud SaaS, billing organizations, cloud HSM evidence integration.
