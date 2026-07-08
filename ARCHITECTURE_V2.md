# Cygnal Architecture v2: AI Investigation Platform Blueprint

This document defines the technical architecture for the evolved Cygnal platform (v1.5 through v5.0). It guides database schema adjustments, backend service design, and frontend layout modifications to support visual knowledge graphs, multi-agent orchestrations, and external integrations.

---

## 🏗️ 1. Logical Architecture overview

```
                         ┌────────────────────────────────────────────────────────┐
                         │                    Next.js Client                      │
                         │    App Router + Zustand Auth + Tailwind CSS 4.x         │
                         │    Interactive SVG Knowledge Graph & Timeline HUD      │
                         └───────────────────────────┬────────────────────────────┘
                                                     │ HTTP / WebSockets
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             Flask API Gateway                                           │
│                                                                                                         │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌───────────────────┐   ┌────────────────┐  │
│  │   Auth & RBAC Registry │   │ Case Management & Vault  │   │  Scanner Engine   │   │  AI Copilot    │  │
│  │   /api/auth/*         │   │ /api/cases/*             │   │  /api/scanners/*  │   │  /api/ai/*     │  │
│  └───────────┬───────────┘   └────────────┬─────────────┘   └─────────┬─────────┘   └───────┬────────┘  │
└──────────────│────────────────────────────│───────────────────────────│─────────────────────│───────────┘
               │                            │                           │                     │
               ▼                            ▼                           ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Service Integration Bus                                           │
│                                                                                                         │
│  ┌────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Auto IOC Extractor     │  │ Threat Intel Engine      │  │ AI Timeline Builder│  │ Knowledge Graph │  │
│  └────────────────────────┘  └──────────────────────────┘  └────────────────────┘  └─────────────────┘  │
│  ┌────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Evidence Relations     │  │ SIEM / EDR Webhook Ingest│  │ Plugin SDK Core    │  │ Task Orchestrator│  │
│  └────────────────────────┘  └──────────────────────────┘  └────────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘
                                            │ Celery Tasks
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     Asynchronous Worker Queue                                           │
│                                Celery Workers + Redis Message Broker                                    │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘
                                            │ Read / Write
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         Data Persistence Layer                                          │
│                                 PostgreSQL (Relational Storage)                                         │
│                                   MinIO / S3 (Evidence Blobs)                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 2. Evolved System Modules

### 1. AI Investigation Copilot
*   **Purpose:** Serve as the investigator's primary AI assistant by understanding natural language requests, retrieving contextual investigation data through the RAG engine, extracting indicators from user prompts, proposing investigation plans, requesting analyst approval, and coordinating the Investigation Orchestrator.
*   **Responsibility:** Receives queries, converts them into search/SQL commands, pulls context from matched cases, processes reasoning, and returns structured markdown summaries with recommended actions.
*   **Inputs:** `prompt` (string), `case_id` (string, optional), `user_context` (JWT claims).
*   **Outputs:** Markdown-formatted analytical response, list of matched database reference links.
*   **API Endpoints:**
    *   `POST /api/copilot/message` (Session-bound contextual chat)
    *   `POST /api/copilot/approve` (Generates next-step action plan)
    The Copilot intentionally reuses the existing RAG engine and Investigation Orchestrator rather than duplicating scanner execution logic.
*   **Database Interactions:** Reads `cases`, `timeline`, `evidence`, `lookups`, `threat_intel` tables.
*   **Relationships:** Integrates directly with the Knowledge Graph and Timeline Builder to update visual components in the user interface.

### 2. Automatic IOC Extractor
*   **Purpose:** Automatically parses unstructured uploads (e.g. raw email files, logs, case descriptions) to identify potential indicators of compromise.
*   **Responsibility:** Scans input text or binary streams for IPv4/IPv6 patterns, domains, URLs, email addresses, and SHA-256/MD5 hashes.
*   **Inputs:** Raw text, raw email buffer (`.eml`), or document stream (`.pdf`, `.txt`, `.docx`).
*   **Outputs:** JSON array of extracted IOCs categorized by type, alongside confidence indicators.
*   **API Endpoints:**
    *   `POST /api/cases/<case_id>/extract-iocs` (Extracts IOCs from case metadata or documents)
*   **Database Interactions:** Inserts resolved indicators into a `case_indicators` table.
*   **Relationships:** Unlocks automated scanning loops by prompting the investigator to execute scans on detected targets.

### 3. Automatic IOC Correlation & Threat Intel Engine
*   **Purpose:** Cross-references extracted IOCs against internal lookups history and external threat feeds.
*   **Responsibility:** Query local threat intelligence cache and outbound APIs (VirusTotal, AbuseIPDB) to score severity and confidence levels.
*   **Inputs:** IOC value (string), IOC type (IP, domain, hash).
*   **Outputs:** Severity score (Critical / High / Medium / Low), enrichment payload (geolocation, ASN, malicious count).
*   **API Endpoints:**
    *   `POST /api/intel/enrich`
*   **Database Interactions:** Reads and writes to `threat_intel` and `lookups`.

### 4. Knowledge Graph Service
*   **Purpose:** Maps the relationships between cases, evidence nodes, indicators, and investigators.
*   **Responsibility:** Computes node-link positions for graph visualizers.
*   **Inputs:** `case_id` (string).
*   **Outputs:** JSON structure containing lists of `nodes` (id, label, group, severity) and `edges` (source, target, relationship_type).
*   **API Endpoints:**
    *   `GET /api/cases/<case_id>/graph`
*   **Database Interactions:** Performs joins across `cases`, `evidence`, `lookups`, and `case_indicators`.
*   **Relationships:** Serves the frontend React visualization component.

### 5. Evidence Relationship Engine
*   **Purpose:** Infers correlations between different uploaded evidence files.
*   **Responsibility:** Evaluates matches such as matching checksums, identical author tags in metadata, matching domains found in parsed logs, or shared threat indicators.
*   **Inputs:** Evidence identifiers (`evidence_id`).
*   **Outputs:** JSON correlation matrix showing similarity weight (0-100) and matching parameters.
*   **API Endpoints:**
    *   `GET /api/evidence/correlations`
*   **Database Interactions:** Queries the `evidence` and `lookups` tables.

### 6. AI Timeline Builder
*   **Purpose:** Translates raw, chaotic event streams into a readable chronological security story.
*   **Responsibility:** Aggregates logs, manual analyst notes, uploaded files, and scan results, sorting them chronologically and generating high-level executive narrative headers.
*   **Inputs:** `case_id` (string).
*   **Outputs:** Structured JSON timeline track split into chronological phase headers (e.g. Delivery, Execution, Persistence).
*   **API Endpoints:**
    *   `GET /api/cases/<case_id>/timeline/chronology`
*   **Database Interactions:** Queries `timeline` and `lookups` tables.

### 7. Autonomous Task Orchestrator (Investigation Orchestrator)
*   **Purpose:** Automatically classify input targets, build multi-tool scan plans, and coordinate parallel scanner execution loops.
*   **Responsibility:** Classifies input formats (IP, domain, URL, hash, email, file, text), builds dependency lists, triggers parallel test-client routing calls on background worker threads, updates real-time progress state, and updates the case timeline/graph.
*   **Inputs:** Target value string, input format (optional), Case ID (optional).
*   **Outputs:** Job status ID, dynamic target format, execution progress percentage, completed scans checklist.
*   **API Endpoints:**
    *   `POST /api/investigations/start` (Starts background scan pipeline)
    *   `GET /api/investigations/<job_id>` (Retrieves telemetry progress status)
    *   `GET /api/investigations/<job_id>/results` (Compiles lookups output payload)
*   **Database Interactions:** Reads/writes `investigation_jobs`, inserts `timeline` events, creates `cases` dynamically.

### 8. Plugin SDK & Marketplace
*   **Purpose:** Enables third-party developers to expand scanners and integrations without editing core code.
*   **Responsibility:** Exposes a unified API interface (`ScannerInterface`, `TIInterface`) and dynamically loads third-party plugins based on YAML manifests.
*   **Database Interactions:** Reads active plugin records from `plugins` table.

---

## 🗄️ 3. Database Schema Evolutions (PostgreSQL Target)

To transition to v2, the database schema will shift from SQLite to PostgreSQL, adding tables to track plugins, jobs, and extracted indicators.

```sql
-- Extracted Indicators Table
CREATE TABLE case_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    indicator_value TEXT NOT NULL,
    indicator_type VARCHAR(50) NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'url', 'hash', 'email')),
    confidence_score INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evidence Correlations Map
CREATE TABLE evidence_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    target_evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    correlation_reason TEXT NOT NULL,
    weight INTEGER NOT NULL CHECK (weight BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Background Job Tracking Table (Orchestrator)
CREATE TABLE investigation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    input_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    current_scanner VARCHAR(100) DEFAULT 'None',
    total_scanners INTEGER DEFAULT 0,
    completed_scanners TEXT DEFAULT '[]',
    scanner_statuses TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user VARCHAR(100) NOT NULL
);

```

---

## 🚀 4. Enterprise Architecture Scalability Plan

### Step A: Database Isolation
Migrate database calls to utilize an ORM layer (SQLAlchemy / Prisma) supporting a PostgreSQL target database. Local SQLite runs remain supported via environment variable toggles.

### Step B: Queue Separation (Celery & Redis)
Move scan tasks from the in-memory Python `ThreadPoolExecutor` to distributed Celery workers. The main Flask process immediately returns a Celery `task_id` to the frontend for non-blocking UI states.

### Step C: Containerization (Docker Compose)
Coordinate services using a Docker Compose setup:
1.  `frontend`: Next.js production build container.
2.  `backend`: Flask REST API gateway container.
3.  `celery-worker`: Distributed execution worker.
4.  `redis`: Message broker and task state cache.
5.  `postgres`: Primary database container.
6.  `minio`: S3-compatible local blob store container for evidence files.
