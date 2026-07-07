# Cygnal v1.5 Implementation Plan: Autonomous Investigation Workspace

This plan outlines the code-level implementation details to transition the Cygnal platform from a manual scanner engine (v1.0) into the autonomous, AI-powered security workspace (v1.5).

---

## 🛠️ Phase 1: Dynamic IOC Extraction & Enrichment

### 1. Backend Service: Entity Parser (`api/services/extractor.py`)
Add regex-based and heuristic-based parsers to extract indicators of compromise (IOCs) from text inputs.

*   **File Target:** `[NEW] api/services/extractor.py`
*   **Logical Implementation:**
    ```python
    import re

    IP_PATTERN = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
    DOMAIN_PATTERN = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b'
    URL_PATTERN = r'https?://[^\s/$.?#].[^\s]*'
    SHA256_PATTERN = r'\b[A-Fa-f0-9]{64}\b'
    EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'

    def extract_iocs(text: str) -> dict:
        return {
            "ips": list(set(re.findall(IP_PATTERN, text))),
            "domains": list(set(re.findall(DOMAIN_PATTERN, text))),
            "urls": list(set(re.findall(URL_PATTERN, text))),
            "hashes": list(set(re.findall(SHA256_PATTERN, text))),
            "emails": list(set(re.findall(EMAIL_PATTERN, text)))
        }
    ```

### 2. API Endpoint: Extract & Store (`api/routes/v2/ai.py`)
Add an endpoint to run extraction and save resolved indicators to the database.

*   **API Endpoint:** `POST /api/cases/<case_id>/extract-iocs`
*   **Payload:** `{"text": "..."}` or `{"evidence_id": "..."}`
*   **Actions:**
    1.  Fetch text description of the case or read file bytes of evidence document.
    2.  Run `extract_iocs()`.
    3.  Save matches to the `case_indicators` table.
    4.  Return payload showing indicators list.

---

## 📊 Phase 2: Interactive SVG Knowledge Graph

### 1. Database Table: `case_indicators`
Create a database table mapping resolved indicators to cases.

*   **File Target:** `api/database.py` (Add inside `init_lookup_db()`)
    ```sql
    CREATE TABLE IF NOT EXISTS case_indicators (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        indicator_value TEXT NOT NULL,
        indicator_type TEXT NOT NULL,
        confidence_score INTEGER DEFAULT 100,
        created_at TEXT,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
    ```

### 2. Backend Graph API (`api/routes/v2/cases.py`)
Compile the relationship nodes and edges network structure.

*   **API Endpoint:** `GET /api/cases/<case_id>/graph`
*   **Return Payload Schema:**
    ```json
    {
      "success": true,
      "nodes": [
        {"id": "case-uuid", "label": "CYG-2026-0001", "group": "case", "val": 15},
        {"id": "ip-uuid", "label": "185.220.101.1", "group": "ip", "val": 10},
        {"id": "file-uuid", "label": "payload.exe", "group": "evidence", "val": 10}
      ],
      "edges": [
        {"source": "case-uuid", "target": "ip-uuid", "relation": "associated_indicator"},
        {"source": "case-uuid", "target": "file-uuid", "relation": "uploaded_evidence"}
      ]
    }
    ```

### 3. Frontend Visualization: SVG Graph (`frontend/app/cases/[id]/graph.tsx`)
Create an interactive node link component using custom inline SVG coordinates to display the graph inside the case dashboard without third-party canvas blockers.

*   **Features:**
    - Visual rendering of case metadata relationships.
    - Hover-reveal tooltips for node details.
    - Node grouping (cases, scanners, evidence, indicators) using distinct brand colors.

---

## ⏰ Phase 3: AI Timeline Narrative Builder

### 1. Backend Service: Chronology Builder (`api/services/timeline_narrator.py`)
Translate the raw case logs and scanner history entries into a structured markdown timeline story.

*   **API Endpoint:** `GET /api/cases/<case_id>/timeline/chronology`
*   **Logic:**
    1.  Query the `timeline` table for case creation, file uploads, and modifications.
    2.  Query the `lookups` table for matching indicators scan results linked to the case.
    3.  Sort chronologically.
    4.  Assemble into groups (Initial Entry, OSINT Recon, Asset Analysis, Findings).
    5.  Draft narrative subtitles via local heuristic summarizer (e.g. *"Target IP was audited against threat feeds, returning suspicious classification"*).

### 2. Frontend Layout: Visual Timeline HUD (`frontend/app/cases/[id]/timeline.tsx`)
A vertical line interface detailing each step of the investigation, decorated with threat flags, signature checks, and AI summaries.

---

## 🧪 Phase 4: Test & Verification Strategy

### 1. Backend Unit Tests
Add 4 new unit test structures inside `api/tests/` to verify v1.5 API endpoints:

```python
# test_ai_v1_5.py
def test_ioc_extraction(client):
    # Verify entity parser extracts IPs/hashes correctly from text payloads
    pass

def test_case_graph_endpoint(client):
    # Verify GET /api/cases/<id>/graph schema structure integrity
    pass

def test_timeline_chronology(client):
    # Verify chronology builder parses events sorted chronologically
    pass
```

### 2. Local Verification Commands
1.  **Run backend unit tests:**
    ```bash
    cd api
    venv/bin/pytest tests/ -v
    ```
2.  **Verify frontend builds:**
    ```bash
    cd frontend
    npm run build
    ```
