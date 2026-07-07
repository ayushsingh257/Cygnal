# Cygnal Competitive Analysis & Market Positioning

This document evaluates the operational workflows of Cygnal against existing security platforms, highlighting how Cygnal stands out as a dedicated investigation layer.

---

## 🆚 1. Operational Workflow Comparison

We compare platforms based on the user experience during investigation triage:

| Dimension | Ingestion Platforms (Splunk, Microsoft Sentinel) | Threat Intel catalogs (OpenCTI, MISP) | SOAR & Case Managers (TheHive, Cortex) | Cygnal AI Workspace |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Goal** | Raw log collection & real-time alerts. | Indicator database cataloging. | Automated playbook response and containment. | **Accelerating investigator understanding & documentation.** |
| **Typical Workflow** | Queries logs -> exports CSV -> manual lookups. | Uploads indicators -> links relationships in graph -> no case status. | Trigger alert -> execute playbook -> manually compile case status. | **Ingest alert -> auto-extract and scan -> view visual timeline -> compile report.** |
| **Tab-switching count**| Very High (often requires opening 5+ different lookup tabs). | Medium (focused on graph pivots). | High (SOAR panels are detached from scanners UI). | **Zero (unified case dashboard).** |
| **Forensic Custody** | None. Logs are archived, but uploaded files have no signature seals. | None. Files are cataloged, but not signed. | Basic file tracking, but no cryptographically sealed audit trail. | **SHA-256 custody seals on all evidence uploads.** |
| **AI Integration** | Chatbots that summarize generic KQL/SPL queries. | Basic taxonomy tagging. | Playbook generation scripts. | **SQLite RAG engine that reads actual case and lookup history.** |

---

## 🔎 2. Detailed Competitor Workflows vs. Cygnal

### 1. Microsoft Sentinel / Splunk (SIEMs)
*   **Their Workflow:** An analyst opens a SIEM dashboard, sees a suspicious logon alert, writes KQL/SPL queries to fetch host logs, copy-pastes IP addresses into external WHOIS/reputation websites, and manually enters notes in an external ticketing tool.
*   **The Cygnal Advantage:** Cygnal does not ingest the raw logs. Instead, Sentinel/Splunk routes the alert to Cygnal. The analyst immediately sees the extracted indicators, enriched threat intelligence, chronological timeline, and a single RAG chat panel to query the context, eliminating the need to write complex query languages or navigate separate lookup pages.

### 2. TheHive / Cortex (SOAR & Incident Case Management)
*   **Their Workflow:** TheHive registers incident cases. When indicators are added, Cortex executes automated playbooks to enrich them. However, playbooks must be built manually, and the interface is heavy and designed around complex administrative routing rather than rapid analyst reading.
*   **The Cygnal Advantage:** Cygnal provides an intuitive, high-speed, local-first user experience. Rather than building complex orchestration playbooks, the AI Copilot and dynamic Task Orchestrator handle sweeps out-of-the-box, providing a visual Knowledge Graph and automatic chronology summaries without configuration overhead.

### 3. OpenCTI / MISP (Threat Intelligence Platforms)
*   **Their Workflow:** Investigators use OpenCTI to model complex threat actor networks and map relations between campaigns and malware families. While powerful for long-term intelligence modeling, it is not an investigation workspace for triage and forensics evidence custody.
*   **The Cygnal Advantage:** Cygnal unifies the threat intelligence graph with active case management. The SVG graph in Cygnal specifically charts the relations *inside the current investigation case* (evidence, lookup logs, matched cases), providing actionable context instead of global threat intelligence database records.
