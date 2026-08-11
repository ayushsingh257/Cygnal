# Cygnal Feature Specifications & Capabilities Catalog (v4.0)

This catalog details the functional capabilities, input/output contracts, and operating modes across all Cygnal modules.

---

## 🎯 1. Security Sensor Scanners (10 Modules)

1. **WHOIS Lookup (`/api/scanners/whois`)**:
   - Queries registrar, creation/expiration dates, nameservers, registrant data, and DNSSEC status.
   - Calculates domain registration age risk score.

2. **DNS Intelligence (`/api/scanners/dns`)**:
   - Resolves A, AAAA, MX, TXT, NS, and CNAME records.
   - Evaluates SPF, DMARC, and DKIM security records.

3. **HTTP Header Auditor (`/api/scanners/headers`)**:
   - Inspects 10 critical security headers (HSTS, CSP, X-Frame-Options, Permissions-Policy, etc.).
   - Computes web posture hygiene grade (A+ through F).

4. **Email Routing Hop Analyzer (`/api/scanners/email-headers`)**:
   - Parses RFC 822 email headers, extracts Received hop timestamps, IPs, and relays.
   - Visualizes MTA transit path and flags suspicious intermediate gateways.

5. **IP Reputation & Geolocation (`/api/scanners/ip-reputation`)**:
   - Correlates IP address against ASN registries, country codes, and abuse databases.

6. **File & Image Metadata Extractor (`/api/scanners/metadata`)**:
   - Extracts EXIF data (GPS coordinates, camera model) from images.
   - Parses author, editing history, and creation timestamps from PDF and DOCX files.

7. **Malware Hash Validator (`/api/scanners/malware`)**:
   - Matches MD5, SHA-1, and SHA-256 hashes against known malware signatures.

8. **Screenshot Scraper & Tech Detector (`/api/scanners/screenshot`)**:
   - Captures rendered webpage screenshots in headless mode.
   - Identifies web server technologies, CMS frameworks, and frontend libraries.

9. **Reverse Image Correlator (`/api/scanners/reverse-image`)**:
   - Computes perceptual image hash (dHash) to correlate duplicate or modified imagery.

10. **Threat Intelligence & CVE Search (`/api/scanners/threat-intel`)**:
    - Queries CVE vulnerability registries and multi-feed threat intelligence databases.

---

## 🤖 2. Cognitive AI & Multi-Agent Investigation

1. **AI Copilot (`/api/copilot/message`)**:
   - 5-intent classifier (`INVESTIGATE_TARGET`, `EXPLAIN_CASE`, `SUMMARIZE_FINDINGS`, `RECOMMEND_NEXT_STEPS`, `ANSWER_QUESTION`).
   - Pure-Python 128-D TF-IDF vector database with cosine-similarity RAG.
   - Structured markdown response format (Executive Summary, IOCs, Reasoning, Confidence, Recommended Actions).

2. **Human-in-the-Loop Approval Gate (`/api/copilot/approve`)**:
   - Formulates multi-step investigation action plans and requires explicit analyst confirmation before launching child scanners.

3. **Autonomic Agent Loop (`/api/services/agent.py`)**:
   - Ingests inbound SIEM alerts, creates case dossiers, parses threat entities, dispatches sensors, and logs reasoning steps.

4. **Analyst Takeover (`/api/webhooks/alerts/<id>/take-over`)**:
   - Interruption gate allowing analysts to halt autonomous agent loops and assume manual control.

---

## 📁 3. Incident Management & Evidence Vault

1. **Case Dossier Management (`/api/cases`)**:
   - Collision-resistant case numbering (`CYG-YYYY-HEX`).
   - Real-time 30-second lease locking to prevent collaborative write collisions.
   - Collaborative case chat feed synchronized over WebSockets.

2. **Forensic Evidence Vault (`/api/cases/<id>/evidence`)**:
   - Streaming file upload with real-time SHA-256 checksum generation.
   - Chain of custody tracking and immutable upload audit events.

3. **Interactive SVG Knowledge Graph (`/api/cases/<id>/graph`)**:
   - Force-directed visual link graph correlating cases, evidence files, and Indicators of Compromise (IOCs).

4. **7-Stage Chronological Timeline Narrator (`/api/cases/<id>/timeline/chronology`)**:
   - Aggregates lifecycle events into 7 distinct incident response phases with AI narrative summaries.

5. **Sealed Forensic Reports (`/api/reports`)**:
   - A4-printable forensic report generator with shareable verification tokens.
