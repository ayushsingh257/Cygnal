# Product Feature Specifications

This document defines the functional behavior and criteria for the core features in Cygnal v1.0.

## 💼 1. Case Files Workspace & Custody Ledger
The Cases worksheet coordinates incident investigations.
- **Incident Creation:** Users input titles, descriptions, and severities. Generates a case number (e.g. `CYG-2026-0001`).
- **Forensic Evidence Uploads:** Users attach forensic files to a case. The backend calculates a SHA-256 hash immediately. The file is saved in `api/uploads/` and a metadata entry is written to the `evidence` table.
- **Chronological Timeline:** Logs event additions (e.g. `evidence_uploaded`, `comment_added`) to establish a chronological chain of custody.

## 📊 2. A4 Reports Compiler & Sharing View
The Reports Compiler aggregates metrics into a formal document.
- **A4 Preview Grid:** Renders report pages in a clean, vertical format that mimics physical A4 sheets.
- **Print Styles:** Uses media CSS rules to hide headers, sidebars, and control buttons during printing (`window.print()`).
- **Public Share Links:** Generates sharing links using unique tokens (e.g. `/reports/share/TOKEN_UUID`). This allows unauthenticated external users (like clients or auditors) to view the read-only reports template.

## 💬 3. SQLite RAG AI Copilot
The AI Assistant provides real-time containment tips.
- **Data Indexing:** The backend parses active case profiles, evidence records, lookups, and threat logs when a query is submitted.
- **Keyword Correlation:** Automatically detects indicators like IPs, domains, hashes, and case IDs to gather related context records.
- **Report Generation:** Generates a structured analysis with recommended next steps based on the correlated database records.
