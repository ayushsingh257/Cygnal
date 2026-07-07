# Cygnal Feature Dependency Graph & Implementation Strategy

This document establishes the optimal implementation order for the Cygnal platform features. It defines dependencies to ensure the engineering team builds foundational data stores and API gateway components before exposing high-level visualization and AI orchestrations.

---

## 🗺️ 1. Dependency Flowchart

```
┌─────────────────────────────────────────────────────────┐
│              FOUNDATIONAL DATA STRATEGY                 │
│   Database Schemas (SQLite) -> Target PostgreSQL Migration│
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  DATA PARSING ENGINE                    │
│   Auto-IOC Extraction Engine  •  Evidence Vault API     │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│   KNOWLEDGE GRAPH     │         │  AI TIMELINE BUILDER  │
│   Case SVG relations  │         │  Chronology compiler  │
└───────────┬───────────┘         └───────────┬───────────┘
            │                                 │
            └────────────────┬────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│                AI INVESTIGATION COPILOT                 │
│   Contextual RAG Chat  •  Task Orchestrator Queue       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               INTEGRATIONS & WEBHOOKS                   │
│   SIEM Connectors (Splunk, Microsoft Sentinel)          │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    COLLABORATION                        │
│   Case Lock  •  Multi-analyst live WebSockets           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 2. Feature Implementation Parameters

The optimal implementation matrix sorts features by architectural requirements:

| Feature | Pre-requisites | Priority | Complexity | Est. Effort (Hours) | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Migration** | SQLite Schema | ⭐⭐⭐⭐ | Medium | 24h | Low |
| **Auto-IOC Extractor** | DB Schemas | ⭐⭐⭐⭐⭐ | Low | 12h | Low |
| **Knowledge Graph API** | IOC Extractor | ⭐⭐⭐⭐⭐ | Medium | 16h | Medium |
| **AI Timeline Builder** | DB Schemas | ⭐⭐⭐⭐⭐ | Medium | 16h | Low |
| **AI Copilot (RAG)** | Timeline Builder | ⭐⭐⭐⭐⭐ | High | 32h | High |
| **Task Orchestrator** | Celery + Redis | ⭐⭐⭐⭐ | Medium | 20h | Medium |
| **SIEM Webhooks Ingest**| Task Orchestrator | ⭐⭐⭐⭐ | Low | 12h | Low |
| **Live Collaboration** | WebSockets | ⭐⭐⭐ | High | 40h | High |
| **Plugin Marketplace** | Core interfaces | ⭐⭐⭐ | High | 48h | High |

---

## ⚠️ 3. Risk Definitions & Mitigation Strategies

### 1. High-Complexity AI RAG Hallucinations (AI Copilot)
*   **Risk:** The RAG engine returns incorrect containment instructions or incorrectly links threat IP metrics because it misses local database context.
*   **Mitigation:** Enforce strict prompt schemas. The LLM must receive system instructions restricting its answers to the context JSON arrays provided from the local database. If no matches are found, it must output a standardized *"No local correlations found"* template.

### 2. Live Graph Rendering Latency (Knowledge Graph)
*   **Risk:** When cases contain hundreds of indicators, rendering the link graph in React causes client-side page freezing.
*   **Mitigation:** Limit nodes count per query. Embody a pagination or filter-by-relevance scheme (e.g. only display nodes with severity higher than medium). Utilize lightweight custom SVG nodes instead of heavy 3D canvas libraries.

### 3. Background Task Race Conditions (Task Orchestrator)
*   **Risk:** Multiple background scans write to the same case timeline simultaneously, leading to database lockups or duplicate events.
*   **Mitigation:** Use a database transaction queue (e.g., Celery serialized tasks with Postgres transaction locks) to serialize database write routines.
