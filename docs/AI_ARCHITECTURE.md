# Cygnal AI Architecture & Zero-Data-Leakage Privacy Framework

## 🧠 Overview & AI Philosophy
Cygnal incorporates an enterprise-grade artificial intelligence architecture designed for high-assurance cybersecurity operations. It balances powerful autonomous investigation capabilities, semantic retrieval-augmented generation (RAG), and deterministic Copilot reasoning with strict **Zero-Data-Leakage AI Privacy Controls**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            User / SOC Analyst Input                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AIPrivacyGateway (Phase 7 Privacy Layer)                  │
│                                                                             │
│  1. Sensitive Data Detection Engine (Regex + Rule Matrix)                   │
│     - PII: Emails, Phone Numbers, IPv4 Addresses, Government IDs (SSN)      │
│     - Secrets: API Keys (OpenAI, AWS, GitHub), JWTs, Passwords, Private Keys│
│     - Telemetry: Internal Hostnames, Case Identifiers, Evidence IDs         │
│                                                                             │
│  2. Strict Credential Zero-Leakage Interceptor                              │
│     - Blocks outbound transmission of CRITICAL secrets to external models   │
│                                                                             │
│  3. Data Masking & Tokenization Engine                                      │
│     - Irreversible Redaction: john.doe@acme.com ➔ j***@acme.com              │
│     - Reversible Tokenization: <CYGNAL_SAN_TOKEN_001_API_KEY> (Internal)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         Sanitized Prompt / Context
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Cygnal AI Reasoning & RAG Engine                       │
│                                                                             │
│  - Intent Classifier (INVESTIGATE, EXPLAIN, SUMMARIZE, RECOMMEND, ANSWER)   │
│  - Vector Database & Semantic Search (128-dim TF-IDF Unit Normalized)       │
│  - Multi-Agent Orchestrator Loop & Autonomous SOC Playbooks                 │
│  - Vector Record Privacy Metadata (privacy_filtered, masking_applied)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                          Raw Model Response Stream
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AIPrivacyGateway: Response Sanitizer                      │
│                                                                             │
│  - Scans model output for accidental leakage of credentials or PII          │
│  - Redacts sensitive artifacts before presentation                          │
│  - Logs unalterable audit event to ai_privacy_events table                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Sanitized Response to Client                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Core Privacy Components

### 1. `SensitiveDataDetector` (`api/services/ai_privacy/detector.py`)
Performs multi-pass pattern scanning across input prompts and generated responses:
- **API Keys & Credentials**: `sk-[A-Za-z0-9_-]{20,}`, `AKIA...`, `ghp_...`, `Bearer eyJ...`, `password=...`.
- **Private Keys**: `-----BEGIN RSA PRIVATE KEY-----`.
- **Personal Identifiable Information (PII)**: Emails (`j***@domain`), Phones (`***-***-1234`), SSNs (`***-**-6789`).
- **Network Boundaries**: Private RFC 1918 IPv4 ranges (`10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`).

### 2. `MaskingEngine` (`api/services/ai_privacy/masking.py`)
Supports dual masking strategies:
- **Irreversible Redaction**: Used before sending data to third-party or public AI providers (OpenAI, Gemini, Anthropic). Replaces secrets with `[REDACTED_API_KEY]`, `[REDACTED_TOKEN]`, `[REDACTED_PASSWORD]`.
- **Reversible Tokenization**: Used for internal sovereign model execution, substituting tokens (`<CYGNAL_SAN_TOKEN_001_API_KEY>`) and maintaining encrypted session token maps.

### 3. `AIPrivacyGateway` (`api/services/ai_privacy/sanitizer.py`)
Centralized security gate enforcing:
- `sanitize_prompt()`: Intercepts raw prompts, blocks critical secrets in strict external mode, and sanitizes PII.
- `sanitize_response()`: Scans AI completions to prevent model hallucinations from leaking internal infrastructure details.
- `sanitize_for_embedding()`: Sanitizes text prior to vectorization in `vector_records`.

### 4. `AIPrivacyAudit` (`api/services/ai_privacy/audit.py`)
Persists all privacy lifecycle events into the `ai_privacy_events` database table:
- `PROMPT_SANITIZED`
- `SECRET_BLOCKED`
- `PII_MASKED`
- `RESPONSE_REDACTED`
- `EMBEDDING_SANITIZED`

---

## 🔒 Threat Model & Compliance Alignment

| Threat | Mitigation Mechanism | Compliance Standard |
|---|---|---|
| **Outbound Credential Leakage** | Strict AI Gateway blocking and redaction before external API calls | SOC 2 Type II (CC6.1), ISO 27001 |
| **Cross-Tenant Context Mixing** | Tenant ID binding and PostgreSQL Native Row-Level Security (RLS) | ISO 27001 (A.18.1), GDPR Art. 32 |
| **PII Contamination in Vector Store** | Pre-embedding sanitization and SHA-256 original text hashing | GDPR Art. 17, ISO 27701 |
| **Model Output Hallucination Leaks** | Output response scanning and post-generation redaction | NIST AI RMF, EU AI Act |
| **Prompt Injection Exploitation** | Intent verification, structured parameter extraction, and IOC boundary typing | OWASP Top 10 for LLM Applications |
