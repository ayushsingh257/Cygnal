# Cygnal v1.5 Master Engineering Specification

**Document Version:** 1.5.0-SPEC  
**Author:** Lead Product & Principal Systems Architect  
**Status:** DRAFT (Awaiting Execution Approval)  
**Target Release:** Cygnal v1.5 (Autonomous Investigation Workspace)  

---

## 📋 Table of Contents
1. [Section 1: Product Goal](#section-1-product-goal)
2. [Section 2: End-to-End User Journey](#section-2-end-to-end-user-journey)
3. [Section 3: Database Design](#section-3-database-design)
4. [Section 4: Backend Design](#section-4-backend-design)
5. [Section 5: Frontend Design](#section-5-frontend-design)
6. [Section 6: AI Investigation Copilot](#section-6-ai-investigation-copilot)
7. [Section 7: Automatic IOC Extraction](#section-7-automatic-ioc-extraction)
8. [Section 8: Knowledge Graph](#section-8-knowledge-graph)
9. [Section 9: AI Timeline](#section-9-ai-timeline)
10. [Section 10: Evidence Relationship Engine](#section-10-evidence-relationship-engine)
11. [Section 11: Background Task Orchestration](#section-11-background-task-orchestration)
12. [Section 12: Testing Strategy](#section-12-testing-strategy)
13. [Section 13: Definition of Done](#section-13-definition-of-done)
14. [Section 14: Implementation Sprints](#section-14-implementation-sprints)
15. [Section 15: Non-Functional Requirements](#section-15-non-functional-requirements)

---

## Section 1: Product Goal

Cygnal is the **AI-powered Investigation Workspace** designed to turn raw cyber evidence into complete, documented, and visualized investigations in minutes instead of hours. 

### Why Cygnal Exists & The Problems It Solves
Modern SOC teams are overwhelmed by alert volume and tool fragmentation. Security analyst workflows are broken by the **"Tab Tax"**—the constant context-switching required to extract indicators of compromise (IOCs) from an alert and query separate tools for WHOIS information, DNS telemetry, IP reputation, file metadata, and malware categorization. This results in:
*   **High Mean Time to Investigate (MTTI):** Hours are wasted copy-pasting values between windows and writing documentation.
*   **Inconsistent Case Documentation:** Timelines and notes are manually written, leading to gaps in compliance and audit trails.
*   **Split Evidence Custody:** Files, hashes, and lookups are scattered across multiple tools, making it difficult to maintain chain-of-custody.

### Workflow-Based Positioning

Cygnal is designed to sit directly above your existing security stack:

```
┌────────────────────────────────────────────────────────────────┐
│                   Unified Security Monitoring                  │
│       Splunk  •  Microsoft Sentinel  •  Elastic  •  EDR        │
└───────────────────────────────┬────────────────────────────────┘
                                │ Pushes Security Alerts
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                  AI Investigation Workspace                    │
│                            Cygnal                              │
└───────────────────────────────┬────────────────────────────────┘
                                │ Pulls Threat Context
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                   OSINT & Digital Forensics                    │
│    VirusTotal  •  AbuseIPDB  •  WHOIS  •  Internal Vault       │
└────────────────────────────────────────────────────────────────┘
```

Rather than replacing your log stores or endpoint agents, Cygnal serves as the dedicated *investigation layer* that connects these tools together.

*   **Splunk / Sentinel / QRadar (SIEMs):** Excellent log aggregators, but poorly optimized for compiling narratives, tracking evidence custody, or running ad-hoc OSINT queries in a unified workspace.
*   **TheHive / Cortex (SOAR):** Highly complex case trackers that treat visual graphs, OSINT lookups, and AI narration as separate, external modules.
*   **OpenCTI / MISP (TIPs):** Threat intelligence catalogs that lack active incident ticket workspaces or cryptographically signed evidence registers.
*   **Velociraptor / Security Onion:** Forensics collectors and network monitors that lack case narrative builders and high-level collaborative layouts.

---

## Section 2: End-to-End User Journey

The following diagram maps the step-by-step user journey from alert ingestion to case resolution:

```
  [1] Webhook / EML Upload
            │
            ▼
  [2] Automated Case Initialization
            │
            ▼
  [3] Dynamic IOC Extraction & Enrichment
            │
            ▼
  [4] SVG Link Graph & Relationship Mapping
            │
            ▼
  [5] Chronological AI Timeline Compilation
            │
            ▼
  [6] Report Verification & Resolution
```

### Step 1: Alert Ingestion
*   **Trigger:** A SIEM webhook receives a high-severity alert, or an analyst uploads a raw phishing email (`suspicious.eml`) into the workspace.
*   **API Called:** `POST /api/cases/ingest`
*   **Database Action:** Creates an unassigned case status row in the `cases` table.

### Step 2: Automated Case Initialization
*   **Trigger:** The UI redirects to `/cases/[case_id]`.
*   **UI State:** Shows a loading skeleton screen while the extraction engine processes the raw input text and attachments.
*   **API Called:** `POST /api/cases/<case_id>/extract-iocs`
*   **Database Action:** Saves all extracted indicators (IPs, domains, hashes, URLs) into the `case_indicators` table.

### Step 3: Dynamic IOC Extraction & Enrichment
*   **Trigger:** The analyst views the extraction card listing identified entities and clicks *"Approve and Investigate All"*.
*   **UI State:** Displays task meters showing enrichment progress for each indicator.
*   **API Called:** `POST /api/orchestrator/run`
*   **Database Action:** Pushes task states to the `job_logs` table. Launches parallel background Celery queries for WHOIS, DNS, and IP Reputation.

### Step 4: SVG Link Graph & Relationship Mapping
*   **Trigger:** Scanners finish execution.
*   **UI State:** The Graph panel renders an SVG network visualization.
*   **API Called:** `GET /api/cases/<case_id>/graph`
*   **Action:** Displays lines linking the case node to indicator nodes, flagging similar cases that share identical IP or file hash nodes.

### Step 5: Chronological AI Timeline Compilation
*   **Trigger:** The analyst scrolls to the Timeline workspace.
*   **UI State:** Renders a vertical chronology detailing the attack lifecycle stages.
*   **API Called:** `GET /api/cases/<case_id>/timeline/chronology`
*   **Database Action:** Queries the `timeline` and `lookups` tables to generate narrative headers.

### Step 6: Report Verification & Resolution
*   **Trigger:** The analyst clicks *"Compile Forensics Report"*.
*   **UI State:** Renders an A4 preview layout containing case metadata, evidence signature tables, timeline steps, and the visual link graph.
*   **API Called:** `POST /api/reports`
*   **Database Action:** Saves the report metadata and generates a share token. The case status is set to `closed` in the database.

---

## Section 3: Database Design

To transition to v2, the SQLite schema will be upgraded to support PostgreSQL with custom indexing and relationship constraints:

```
                  ┌─────────────────┐
                  │      cases      │
                  └────────┬────────┘
                           │ 1
                           │
                           │ *
                 ┌─────────┴─────────┐
                 │  case_indicators  │
                 └─────────┬─────────┘
                           │ *
                           │
                           │ 1
                  ┌────────┴────────┐
                  │     lookups     │
                  └─────────────────┘
```

### New Tables Schema

#### 1. `case_indicators`
Stores indicators extracted from files or alerts linked to a specific case.
```sql
CREATE TABLE case_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    indicator_value TEXT NOT NULL,
    indicator_type VARCHAR(50) NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'url', 'hash', 'email', 'cve', 'mitre_tactic', 'mitre_technique', 'hostname', 'filepath', 'process', 'username')),
    confidence_score INTEGER NOT NULL DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX idx_case_indicators_case_id ON case_indicators(case_id);
CREATE INDEX idx_case_indicators_value ON case_indicators(indicator_value);
```

#### 2. `evidence_relations`
Maps inferred relationship lines between evidence items across different cases.
```sql
CREATE TABLE evidence_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_evidence_id UUID NOT NULL,
    target_evidence_id UUID NOT NULL,
    correlation_reason VARCHAR(255) NOT NULL,
    weight INTEGER NOT NULL DEFAULT 50 CHECK (weight BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    FOREIGN KEY (target_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_relations_source ON evidence_relations(source_evidence_id);
CREATE INDEX idx_evidence_relations_target ON evidence_relations(target_evidence_id);
```

#### 3. `job_logs`
Tracks background scanner orchestration runs managed by Celery.
```sql
CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) UNIQUE NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    scanner_name VARCHAR(100) NOT NULL,
    target VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE INDEX idx_job_logs_task_id ON job_logs(task_id);
CREATE INDEX idx_job_logs_case_id ON job_logs(case_id);
```

#### 4. `case_locks`
Enables collaborative locking of cases to prevent conflicts when multiple analysts are editing.
```sql
CREATE TABLE case_locks (
    case_id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
    locked_by VARCHAR(100) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. `case_comments`
Tracks comment threads posted by investigators inside a case.
```sql
CREATE TABLE case_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_comments_case_id ON case_comments(case_id);
```

---

## Section 4: Backend Design

### API Specifications

#### 1. Entity Parser
*   **Method:** `POST`
*   **Endpoint:** `/api/cases/<case_id>/extract-iocs`
*   **Payload:**
    ```json
    {
      "text": "Phishing mail originating from 192.168.1.50 contacting bad-domain.ru",
      "evidence_id": "optional-uuid-reference"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "case_id": "case-uuid",
      "extracted_count": 2,
      "indicators": [
        {"value": "192.168.1.50", "type": "ip", "severity": "medium", "confidence": 100},
        {"value": "bad-domain.ru", "type": "domain", "severity": "high", "confidence": 95}
      ]
    }
    ```
*   **Error Handling:**
    - `400 Bad Request` if `text` is empty.
    - `404 Not Found` if `case_id` does not match any database record.

#### 2. Knowledge Graph Generator
*   **Method:** `GET`
*   **Endpoint:** `/api/cases/<case_id>/graph`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "nodes": [
        {"id": "case-uuid", "label": "CYG-2026-0001", "group": "case", "val": 15},
        {"id": "ip-uuid", "label": "192.168.1.50", "group": "ip", "val": 10}
      ],
      "edges": [
        {"source": "case-uuid", "target": "ip-uuid", "relation": "indicator"}
      ]
    }
    ```

#### 3. AI Timeline builder
*   **Method:** `GET`
*   **Endpoint:** `/api/cases/<case_id>/timeline/chronology`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "case_id": "case-uuid",
      "timeline": [
        {
          "time": "2026-07-07T08:01:00Z",
          "title": "Email Received",
          "description": "Phishing attachment ingress trace logged in vault.",
          "phase": "Delivery"
        }
      ]
    }
    ```

#### 4. Background Task Orchestrator
*   **Method:** `POST`
*   **Endpoint:** `/api/orchestrator/run`
*   **Payload:**
    ```json
    {
      "case_id": "case-uuid",
      "indicators": [
        {"value": "bad-domain.ru", "type": "domain"}
      ]
    }
    ```
*   **Response (202 Accepted):**
    ```json
    {
      "success": true,
      "tasks": [
        {"task_id": "celery-task-uuid", "target": "bad-domain.ru", "scanner": "whois"}
      ]
    }
    ```

---

## Section 5: Frontend Design

### Evolved Interface Layouts

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  CYGNAL                                                                👤 Ayush Singh  │
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ 📊 Dashboard      │ CASE PROFILE: CYG-2026-0001                                        │
│ 📁 Cases          ├───────────────────────────────────┬────────────────────────────────┤
│ 🛰️ Scanners       │ ┌───────────────────────────────┐ │ ┌────────────────────────────┐ │
│ 💬 AI Copilot     │ │        Knowledge Graph        │ │ │        AI Copilot          │ │
│ ⚙️ Settings        │ │  (SVG node-link network map)  │ │ │  (Real-time RAG chat HUD)  │ │
│                   │ └───────────────────────────────┘ │ └────────────────────────────┘ │
│                   ├───────────────────────────────────┼────────────────────────────────┤
│                   │ ┌───────────────────────────────┐ │ ┌────────────────────────────┐ │
│                   │ │      Timeline Chronology      │ │ │      Evidence Vault        │ │
│                   │ │   (Vertical timeline tracks)  │ │ │ (SHA-256 custody seals)    │ │
│                   │ └───────────────────────────────┘ │ └────────────────────────────┘ │
└───────────────────┴───────────────────────────────────┴────────────────────────────────┘
```

### Visual Specifications

*   **Layout:** Responsive grid system using CSS Grid layouts to adapt to varying display resolutions.
*   **Color Palette:** Strict dark-teal branding (`#091413`, `#285A48`, `#408A71`, `#B0E4CC`).
*   **Glassmorphism styling:** Cards utilize `backdrop-filter: blur(12px) saturate(180%)` with a border color of `rgba(64, 138, 113, 0.2)`.
*   **Animations:** Smooth 200ms transitions for button hover states, sidebar expansions, and panel overlays.
*   **Skeleton Loaders:** Renders gray glassmorphic pulses during state fetches instead of static loading spinners.
*   **Empty States:** Centered icons displaying helpful diagnostic suggestions (e.g. *"No indicators extracted yet. Upload files or enter metadata text to populate the workspace"*).

---

## Section 6: AI Investigation Copilot

### Reasoning Engine Workflow

```
   Analyst Query
         │
         ▼
  Extract entity references
         │
         ▼
  Retrieve local SQLite records (Cases, Evidence, Lookups)
         │
         ▼
  Build deterministic prompt context
         │
         ▼
  Run localized heuristics engine (Formatting & summary checks)
         │
         ▼
  Output formatted markdown response
```

### Retrieval-Augmented Generation (RAG) Strategy
To prevent hallucination, the Copilot reads actual data arrays from the local database before formatting responses:
1.  **Extract Entities:** Parses the prompt for identifiers like case numbers (`CYG-YYYY-XXXX`), IP addresses, domain names, or SHA-256 hashes.
2.  **Database Lookup:** Automatically queries relational tables for matching records based on the extracted entities.
3.  **Context Construction:** Compiles database query results into a structured JSON payload.
4.  **Prompt Engineering:** Injects the JSON payload directly into the system prompt context:
    ```
    System: You are the Cygnal AI Copilot. You must base your findings strictly on this context:
    [Context JSON]
    If the context is empty, respond that no local correlations were found. Do not speculate on network details not listed in the context.
    ```

### Confidence Score Calculation
Case severity and analyst confidence metrics are calculated using deterministic weightings:
$$\text{Confidence Score} = \text{Base Value} + \text{Evidence Weight} + \text{Scan Score}$$

*   **Base Value:** 40% if the indicator is matched against the local threat database.
*   **Evidence Weight:** +30% if the indicator appears in a cryptographically signed evidence document.
*   **Scan Score:** +30% if active lookup checks (DNS, WHOIS) confirm a valid resolution.

---

## Section 7: Automatic IOC Extraction

The extraction engine parses unstructured data to identify indicators using regex and file metadata:

```
             ┌─────────────────────────┐
             │   Unstructured Upload   │
             └────────────┬────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
 ┌─────────────────────┐     ┌─────────────────────┐
 │    Regex Sweeper    │     │  Metadata Extractor │
 └──────────┬──────────┘     └──────────┬──────────┘
            │                           │
            └─────────────┬─────────────┘
                          ▼
             ┌─────────────────────────┐
             │   Resolved Indicators   │
             └─────────────────────────┘
```

### Regular Expression Index

| Indicator Type | Regex Pattern Group |
| :--- | :--- |
| **IPv4 Address** | `\b(?:(?:25[0-5]\|2[0-4][0-9]\|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]\|2[0-4][0-9]\|[01]?[0-9][0-9]?)\b` |
| **IPv6 Address** | `\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b` |
| **Domain** | `\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b` |
| **URL** | `https?://[^\s/$.?#].[^\s]*` |
| **Email Address** | `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b` |
| **SHA-256 Hash** | `\b[A-Fa-f0-9]{64}\b` |
| **MD5 Hash** | `\b[A-Fa-f0-9]{32}\b` |
| **SHA-1 Hash** | `\b[A-Fa-f0-9]{40}\b` |
| **CVE Identifier**| `\bCVE-\d{4}-\d{4,7}\b` |
| **MITRE Tactic** | `\bTA\d{4}\b` |
| **MITRE Technique**| `\bT\d{4}(?:\.\d{3})?\b` |

### System Integration Pipeline
1.  **Ingestion:** The analyst uploads files (e.g. email draft, packet logs) or inputs incident text notes.
2.  **Entity Parsing:** The extraction engine parses text blocks and runs regular expression pattern checks.
3.  **Metadata Extraction:** Document scanners extract strings from file author fields, software tags, and image coordinates.
4.  **Database Storage:** The parsed indicators list is populated inside the `case_indicators` table and rendered in the frontend.

---

## Section 8: Knowledge Graph

The case dashboard includes an interactive node-link network map to help visualize evidence relationships:

```
    [Investigator]
          │
      assigned
          ▼
       [Case] ◄─── uploads ─── [Evidence]
          │
       detects
          ▼
     [Indicator] ◄─── targets ─── [Lookups]
```

### Node Specifications

*   **Case Node:** Main node showing case details. Color: Teal (`#285A48`), size: 16px.
*   **Evidence Node:** Represents files uploaded to the vault. Color: Cyan (`#408A71`), size: 12px.
*   **Indicator Node:** Represents IPs, domains, hashes, and email addresses. Color: Ice Green (`#B0E4CC`), size: 10px.
*   **Threat Actor / Malware Node:** Represents flagged threats. Color: Amber (`#F59E0B`), size: 12px.
*   **Investigator Node:** Represents the analyst assigned to the case. Color: Gray (`#9CA3AF`), size: 10px.

### Interaction Model

*   **Hover Behavior:** Displays a popup card containing the node name, type, classification, and creation date.
*   **Click Action:** Centers the node and filters the list of cases to display similar items containing that node value.
*   **Filtering:** Allows investigators to toggle node layers (e.g. show/hide investigators, show/hide reputation details).
*   **Performance:** Renders up to 200 nodes using lightweight inline SVG objects.

---

## Section 9: AI Timeline

The timeline chronologically charts the lifecycle stages of the investigation:

```
  08:01 Ingress Detection  ──►  08:03 Entity Parsing  ──►  08:05 Scan Enrichment
  • Phishing EML Vaulted       • IPs/Domains Extracted      • reputation returns clean
```

### Timeline Generation Logic
1.  **Query database records:** Pulls case metadata, database logs, and scan histories chronologically.
2.  **Consolidate events:** Deduplicates events that occur within the same minute.
3.  **Phase Mapping:** Groups events into security phases based on metadata (e.g. delivery, execution).
4.  **Narrative Synthesis:** Generates text summaries detailing each chronological step of the investigation.

---

## Section 10: Evidence Relationship Engine

The relationship engine automatically maps correlations between files uploaded to the custody vault:

```
  [Evidence A: invoice.pdf]  ◄─── shares domain ───►  [Evidence B: payload.exe]
  (Author tag: test-actor)                            (Author tag: test-actor)
```

### Core Relations Rules

*   **Duplicate Signatures:** Compares file hashes to identify copies of files uploaded across different cases.
*   **Shared Indicators:** Flags files that reference the same IPs, URLs, or command domains.
*   **Metadata Matches:** Correlates files sharing matching author tags, software watermarks, or creation dates.
*   **Co-occurrence Analysis:** Flags files that are consistently uploaded together during similar incident responses.

---

## Section 11: Background Task Orchestration

Task queues are managed asynchronously to keep the user interface responsive during heavy scanner runs:

```
    [Flask Gateway]
           │
     1. dispatch task
           ▼
    [Redis Broker]
           │
     2. poll queue
           ▼
    [Celery Worker]  ─── 3. save updates ───►  [DB / Event Bus]
```

*   **Task Queuing:** Celery runs background tasks, while Redis manages the queue.
*   **Failure Handling:** Automatically retries tasks on timeout, up to 3 times.
*   **Real-time Progress Updates:** Pushes task progress states (Pending / Running / Success / Failed) to the client using WebSockets or SSE (Server-Sent Events).
*   **Graceful Timeouts:** Terminates scanner jobs after 30 seconds to prevent resource exhaustion.

---

## Section 12: Testing Strategy

We run automated checks across the codebase to ensure system health and verify updates:

### Automated Testing Matrix

```
┌────────────────────────────────────────────────────────┐
│                      pytest Suite                      │
│   Unit Tests  •  Integration Tests  •  Regression      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Playwright Suite                     │
│   UI Layout Checks  •  Routing  •  State Preservation  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    OWASP ZAP Audits                    │
│   API Rate Limits  •  SQLi  •  Broken Auth Checks      │
└────────────────────────────────────────────────────────┘
```

*   **Unit Testing:** Tests functions in isolation, such as regular expression extraction matching and token verification.
*   **Integration Testing:** Tests workflows end-to-end (e.g., verifying case creation triggers timeline logs and graph node creation).
*   **UI Testing:** Uses Playwright to verify page routing, loading states, and graph rendering.
*   **Performance Testing:** Simulates load to verify database response times and concurrent write operations.
*   **Security Testing:** Scans endpoints to verify permission controls and JWT signature validation.

---

## Section 13: Definition of Done

Each feature must satisfy strict quality criteria before being marked as done:

### Verification Checklist

#### 1. Automatic IOC Extractor
*   ✓ Correctly parses IPs, domains, hashes, URLs, and emails.
*   ✓ Saves parsed indicators to the `case_indicators` table.
*   ✓ Updates the visual Knowledge Graph.
*   ✓ Renders timeline log entries.
*   ✓ Passes unit and integration tests.

#### 2. SVG Knowledge Graph
*   ✓ Dynamic SVG graph scales and positions nodes based on case relationships.
*   ✓ Hover interactions display details without page lag.
*   ✓ Node filters function correctly.
*   ✓ Loads in under 2 seconds.

#### 3. AI Timeline
*   ✓ Chronologically compiles case events.
*   ✓ Renders summaries accurately.
*   ✓ Layout scales on mobile viewports.

---

## Section 14: Implementation Sprints

### Evolved Project Schedule

```
  Sprint 1 (DB & Parser) ────► Sprint 2 (Graph Visuals) ────► Sprint 3 (Chronology Narrator)
   • PostgreSQL & Migrations   • API node compilation        • Timeline stage categorizer
   • Regex Extractors          • SVG Graph components        • Summary text renderer
   
                                         │
                                         ▼
  Sprint 5 (Hardening) ◄───── Sprint 4 (AI Integration) ◄────
   • Playwright End-to-End     • Local RAG prompts
   • Performance Profiling     • Task Orchestrator triggers
```

### Sprint Details

#### Sprint 1: Foundational Schemas & Ingest Parser
*   **Goal:** Configure PostgreSQL tables and add the regular-expression based IOC extraction engine.
*   **Affected Files:** `api/database.py`, `api/routes/v2/cases.py`, `[NEW] api/services/extractor.py`.
*   **Deliverables:** Database migration scripts and functional `POST /api/cases/<id>/extract-iocs` API.

#### Sprint 2: Knowledge Graph Integration
*   **Goal:** Build the backend relationship graph service and frontend SVG component.
*   **Affected Files:** `api/routes/v2/cases.py`, `[NEW] frontend/app/cases/[id]/graph.tsx`.
*   **Deliverables:** Graph node-link API and responsive SVG graph visualization.

#### Sprint 3: Chronological AI Timeline
*   **Goal:** Build the narrative timeline generator and timeline HUD component.
*   **Affected Files:** `api/routes/v2/cases.py`, `[NEW] frontend/app/cases/[id]/timeline.tsx`.
*   **Deliverables:** API rendering sorted, narrative chronology cards.

#### Sprint 4: Copilot AI RAG Integration
*   **Goal:** Deploy the local RAG prompts context builder and Celery task orchestrator.
*   **Affected Files:** `api/routes/v2/ai.py`, `api/backend.py`.
*   **Deliverables:** RAG AI Chat page, multi-agent status views, and background Celery scheduler.

#### Sprint 5: Testing & Production Audit
*   **Goal:** Run unit, integration, and UI tests to verify platform performance and security.
*   **Affected Files:** `api/tests/*`, `frontend/playwright.config.ts`.
*   **Deliverables:** Test runs passing; production-ready container builds.

---

## Section 15: Non-Functional Requirements

*   **API Response Times:** Critical API requests (e.g. auth checks, case lookups) must resolve in under 100 milliseconds.
*   **Graph Load Performance:** SVG graphs containing up to 200 nodes must load and render in under 2 seconds.
*   **Security Controls:** Enforce encryption for sensitive values, implement token rotation, and require HTTPS.
*   **PostgreSQL Migration Compatibility:** Database queries must avoid SQLite-specific queries, ensuring a smooth transition to PostgreSQL.
*   **Containerization Support:** Ensure all backend and frontend components build cleanly in Docker containers.
