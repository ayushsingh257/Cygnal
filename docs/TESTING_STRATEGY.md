# Cygnal Automated Testing & Quality Assurance Strategy (v4.0)

Cygnal enforces a multi-tier testing strategy to ensure 100% regression safety across backend APIs, identity integrations, AI engines, and frontend rendering.

---

## 🧪 Testing Pyramid

```
┌─────────────────────────────────────────────────────────────┐
│             Frontend Production Build (Next.js)             │
│                40/40 Routes Prerendered Cleanly             │
├─────────────────────────────────────────────────────────────┤
│             Integration & API Route Test Suite              │
│                15 Test Modules (172 Pytest Items)           │
├─────────────────────────────────────────────────────────────┤
│             Core Algorithms & Unit Tests                    │
│   (128-D TF-IDF, Regex IOC Extractor, Dialect Translators)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Backend Test Suite Catalog (`api/tests/` — 172 Items)

| Test Suite | Items | Focus Area |
|---|---|---|
| `test_ai.py` | 3 | Heuristic RAG engine & vector stats endpoint |
| `test_ai_phase3.py` | 11 | 128-D TF-IDF vector database, cosine similarity, case indexing |
| `test_audit_health.py` | 7 | `/api/health`, `/api/ready`, and database-backed audit log query |
| `test_auth.py` | 7 | Registration, login, MFA TOTP challenge, and JTI session revocation |
| `test_cases.py` | 4 | Case CRUD, evidence SHA-256 hashing, timeline, and lease locking |
| `test_collaboration_phase4.py` | 5 | User notifications, read status flags, roster, and Socket presence |
| `test_copilot.py` | 33 | 5-intent classifier, plan builder, validation checks, structured format |
| `test_extractor.py` | 5 | 14-entity regex extraction accuracy, SVG graph, and timeline stages |
| `test_identity_phase1.py` | 4 | Microsoft Entra ID, SAML 2.0, Service Accounts, Session Manager |
| `test_orchestrator.py` | 4 | Target classification, parallel execution loops, and status polling |
| `test_phase5_enterprise.py` | 4 | Tenant isolation, onboarding, metrics, and circuit breaker cache |
| `test_reports.py` | 1 | Sealed forensic report lifecycle and public share token resolution |
| `test_scanners.py` | 26 | 10 security sensor dispatches (WHOIS, DNS, Headers, etc.) |
| `test_threat_intel_phase2.py` | 50 | Multi-provider enrichment, STIX/TAXII parser, and connector config |
| `test_webhooks.py` | 8 | SIEM webhook ingestion, SHA-256 payload integrity, analyst takeover |

---

## 🚀 Running Automated Tests

### Run Full Pytest Suite
```bash
cd api
pytest tests/ -v
```

### Run Frontend Production Build Verification
```bash
cd frontend
npm run build
```
