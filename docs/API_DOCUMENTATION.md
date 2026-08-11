# Cygnal REST & WebSocket API Specification (v4.0)

This document catalogs all RESTful API endpoints, request/response contracts, authentication headers, and real-time WebSocket events provided by the Cygnal backend.

---

## 🔐 Global Request Headers & Authentication

All protected API endpoints require an Authorization bearer token:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
X-Correlation-ID: <UUID_V4>
X-Tenant-ID: <INTEGER_TENANT_ID> (Optional override for multi-tenant admins)
```

### Response Envelope Format
Successful responses return HTTP 200 with standard JSON formatting:
```json
{
  "success": true,
  "data": { ... }
}
```
Error responses return standard HTTP error codes (400, 401, 403, 404, 429, 500):
```json
{
  "success": false,
  "error": "Descriptive human-readable error explanation."
}
```

---

## 📋 Modular Blueprint Endpoints

### 1. Authentication Blueprint (`auth_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/register` | Register new user account (restricted to analyst/intern) | No (Rate Limited) |
| `POST` | `/api/login` | Authenticate user credentials, returns JWT or MFA challenge | No (Rate Limited) |
| `POST` | `/api/logout` | Revoke active JWT `jti` in session revocation blocklist | Yes |
| `GET` | `/api/profile` | Retrieve profile of authenticated investigator node | Yes |
| `POST` | `/api/profile/setup` | Update department, team, and operational avatar | Yes |

---

### 2. Multi-Factor Authentication Blueprint (`mfa_bp`) — `/api/mfa`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/mfa/setup` | Generate TOTP secret and QR provisioning URI (`pyotp`) | Yes |
| `POST` | `/api/mfa/verify` | Verify 6-digit TOTP code and enable MFA on account | Yes |
| `POST` | `/api/mfa/challenge` | Complete MFA login challenge and receive session JWT | No (Temporary Token) |

---

### 3. Incident Cases Blueprint (`cases_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/cases` | List all tenant incident cases | Yes |
| `POST` | `/api/cases` | Create new incident case dossier (`CYG-YYYY-HEX`) | Yes |
| `GET` | `/api/cases/<case_id>` | Get complete case dossier, evidence files, and timeline | Yes |
| `PATCH` | `/api/cases/<case_id>` | Update status, severity, title, or assignee | Yes |
| `DELETE` | `/api/cases/<case_id>` | Delete case dossier and associated records | Yes (`@require_role`) |
| `POST` | `/api/cases/<case_id>/timeline` | Add manual event to case chronological ledger | Yes |
| `GET` | `/api/cases/<case_id>/timeline/chronology` | Get 7-stage aggregated AI timeline with narrative | Yes |
| `POST` | `/api/cases/<case_id>/evidence` | Upload forensic evidence file with SHA-256 hash | Yes |
| `GET` | `/api/cases/<case_id>/graph` | Retrieve nodes and links for SVG Knowledge Graph | Yes |
| `POST` | `/api/cases/<case_id>/extract-iocs` | Run automated 14-entity regex extraction on evidence | Yes |
| `GET` | `/api/cases/<case_id>/lock` | Check active lease lock status on case | Yes |
| `POST` | `/api/cases/<case_id>/lock` | Acquire 30-second exclusive edit lease lock | Yes |
| `POST` | `/api/cases/<case_id>/unlock` | Release active edit lease lock | Yes |
| `GET` | `/api/cases/<case_id>/comments` | Retrieve live comments feed for case | Yes |
| `POST` | `/api/cases/<case_id>/comments` | Post collaborative comment and broadcast via Socket.IO | Yes |
| `POST` | `/api/cases/<case_id>/assign` | Assign case to investigator and trigger notification | Yes |

---

### 4. Security Sensor Scanners Blueprint (`scanners_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/scanners/whois` | Domain registrar and registrant lookup | Yes (`whois` policy) |
| `POST` | `/api/scanners/dns` | DNS record lookup (A, AAAA, MX, TXT, NS, CNAME) | Yes (`dns` policy) |
| `POST` | `/api/scanners/headers` | HTTP security headers and CSP auditor | Yes (`headers` policy) |
| `POST` | `/api/scanners/email-headers` | Email routing hop analyzer & SPF/DKIM/DMARC check | Yes (`email_headers` policy) |
| `POST` | `/api/scanners/ip-reputation` | IP ASN, geolocation, and abuse reputation score | Yes (`ip_reputation` policy) |
| `POST` | `/api/scanners/metadata` | Document (PDF/DOCX) & image EXIF metadata parser | Yes (`metadata` policy) |
| `POST` | `/api/scanners/malware` | File hash malware signature validator | Yes (`malware` policy) |
| `POST` | `/api/scanners/screenshot` | Webpage screenshot capture and tech stack detect | Yes (`screenshot` policy) |
| `POST` | `/api/scanners/reverse-image` | Perceptual hash and image source correlation | Yes (`reverse_image` policy) |
| `POST` | `/api/scanners/threat-intel` | Threat intelligence and CVE lookup | Yes (`threat_intel` policy) |

---

### 5. Autonomous Investigations Blueprint (`investigations_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/investigations/start` | Launch asynchronous multi-scanner investigation job | Yes |
| `GET` | `/api/investigations/<job_id>` | Poll investigation job status and progress percentage | Yes |
| `GET` | `/api/investigations/<job_id>/results` | Fetch aggregated scanner results from completed job | Yes |

---

### 6. AI Copilot Blueprint (`copilot_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/copilot/message` | Process prompt via 5-intent classifier and RAG | Yes |
| `POST` | `/api/copilot/approve` | Human-in-the-loop approval gate to execute plans | Yes |
| `GET` | `/api/copilot/summary/<case_id>` | Auto-generate executive case wrap-up summary | Yes |

---

### 7. AI RAG Assistant Blueprint (`ai_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/ai/query` | Heuristic RAG query against database context | Yes |
| `GET` | `/api/ai/vector/stats` | Vector record count and vocabulary index stats | Yes |

---

### 8. Forensic Reports Blueprint (`reports_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/reports` | List all compiled forensic reports | Yes |
| `POST` | `/api/reports` | Compile A4-printable forensic report and share token | Yes |
| `GET` | `/api/reports/<report_id>` | Get report details by ID | Yes |
| `GET` | `/api/reports/share/<token>` | Public auth-free sealed forensic report preview | No |

---

### 9. SIEM Webhooks Blueprint (`webhooks_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/webhooks/siem` | Ingest raw SIEM alert (Splunk, Sentinel, Generic) | `X-Cygnal-Webhook-Key` |
| `GET` | `/api/webhooks/alerts` | Query inbound alerts feed with status filters | Yes |
| `GET` | `/api/webhooks/alerts/<alert_id>` | Get alert details, parsed IOCs, and agent logs | Yes |
| `POST` | `/api/webhooks/alerts/<alert_id>/take-over` | Analyst manual takeover of autonomic agent | Yes |

---

### 10. Threat Intelligence Blueprint (`threat_intel_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/threat-intel/enrich` | Multi-provider indicator enrichment (VT, AbuseIPDB) | Yes |
| `GET` | `/api/threat-intel/feeds` | Query STIX/TAXII threat feed indicators | Yes |
| `GET` | `/api/threat-intel/connectors` | List provider connector statuses and configs | Yes (`admin` only) |
| `POST` | `/api/threat-intel/connectors` | Configure provider API keys (Fernet encrypted) | Yes (`admin` only) |

---

### 11. Collaboration Blueprint (`collaboration_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/notifications` | Fetch unread and recent user notifications | Yes |
| `POST` | `/api/notifications/read` | Mark specific or all notifications as read | Yes |
| `GET` | `/api/roster` | List all active users for assignment selection | Yes |

---

### 12. Administration & System Monitoring Blueprint (`admin_bp`) — `/api`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service liveness probe | No |
| `GET` | `/api/ready` | Database & Redis readiness probe | No |
| `GET` | `/api/admin/monitoring` | Live CPU, memory, and database pool metrics | Yes (`admin` only) |
| `GET` | `/api/admin/audit` | Paginated database-backed audit log query | Yes (`admin` only) |
| `GET` | `/api/admin/users` | List all platform users and roles | Yes (`admin` only) |
| `POST` | `/api/admin/users/create` | Explicitly provision high-privilege account | Yes (`admin` only) |
| `GET` | `/api/admin/tenants` | List all tenant organizations | Yes (`admin` only) |
| `POST` | `/api/admin/tenants` | Onboard new organizational tenant | Yes (`admin` only) |
| `GET` | `/api/admin/permissions` | Query tool policy overrides | Yes (`admin` only) |
| `POST` | `/api/admin/permissions` | Set employee, team, or department override | Yes (`admin` only) |

---

### 13. Data Governance & Automated Retention Blueprint (`governance_bp`) — `/api/governance`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/governance/policies` | List all tenant retention policies | Yes |
| `POST` | `/api/governance/policies` | Create or update retention lifecycle policy | Yes (`admin`, `director`) |
| `DELETE` | `/api/governance/policies/<id>` | Delete retention lifecycle policy | Yes (`admin`, `director`) |
| `POST` | `/api/governance/classify` | Assign or update sensitivity label for a resource | Yes |
| `GET` | `/api/governance/retention/status` | Evaluate retention status (supports `dry_run=true`) | Yes |
| `POST` | `/api/governance/retention/enforce` | Execute automated lifecycle purge / archive pass | Yes (`admin`, `director`) |
| `GET` | `/api/governance/deletion/history` | Query cryptographic destruction ledger | Yes |
| `GET` | `/api/governance/compliance/report` | Generate comprehensive regulatory compliance audit report | Yes |

---

## ⚡ WebSocket Real-Time Events (Flask-SocketIO)

Cygnal connects over Socket.IO (with Redis Pub/Sub multi-node scaling):

### Client ➔ Server Events
- `join_case` `{ "case_id": "UUID", "token": "JWT" }` — Join case collaboration room.
- `leave_case` `{ "case_id": "UUID" }` — Leave case room.
- `typing_status` `{ "case_id": "UUID", "is_typing": true }` — Broadcast typing indicator.
- `join_alert` `{ "alert_id": "UUID", "token": "JWT" }` — Join live autonomic agent room.
- `leave_alert` `{ "alert_id": "UUID" }` — Leave agent room.

### Server ➔ Client Broadcasts
- `presence_update` — List of active investigators in the case room.
- `typing_update` — Investigator typing status.
- `case_locked` — Lease lock acquired `{ "case_id": "UUID", "locked_by": "username" }`.
- `case_unlocked` — Lease lock released `{ "case_id": "UUID" }`.
- `new_comment` — Collaborative note posted to case feed.
- `agent_log` — Live autonomic agent reasoning step or tool execution.
- `alert_updated` — Alert status change (`running`, `completed`, `failed`).
- `notification` — Direct user notification push.
