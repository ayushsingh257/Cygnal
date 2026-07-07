# REST API Documentation

This document catalogs the REST API endpoints available in the Flask backend.

## 🔐 1. Authentication
- **`POST /api/register`**
  - Payload: `{ "username", "password", "role", "department", "team" }`
  - Success Response (200): `{ "success": true, "token": "JWT_STRING", "user": { "username", "role" } }`
- **`POST /api/login`**
  - Payload: `{ "username", "password" }`
  - Success Response (200): `{ "success": true, "token": "JWT_STRING", "user": { "username", "role" } }`

## 📁 2. Cases Management
- **`GET /api/cases`**
  - Headers: `Authorization: Bearer <JWT>`
  - Success Response (200): `{ "success": true, "cases": [ { "id", "case_number", "title" } ] }`
- **`POST /api/cases`**
  - Headers: `Authorization: Bearer <JWT>`
  - Payload: `{ "title", "description", "severity", "department" }`
  - Success Response (200): `{ "success": true, "case": { "id", "case_number" } }`
- **`POST /api/cases/<case_id>/timeline`**
  - Headers: `Authorization: Bearer <JWT>`
  - Payload: `{ "event_type", "description", "metadata" }`
  - Success Response (200): `{ "success": true }`
- **`POST /api/cases/<case_id>/evidence`**
  - Headers: `Authorization: Bearer <JWT>`
  - Payload: Form data with `file` key upload.
  - Success Response (200): `{ "success": true, "evidence": { "id", "filename", "file_hash" } }`

## 🛡️ 3. Threat Intelligence Scanners
- **`POST /api/header-scan`**
  - Headers: `Authorization: Bearer <JWT>`
  - Payload: `{ "url": "https://example.com" }`
  - Success Response (200): `{ "success": true, "task_id": "TASK_UUID" }`
- **`GET /api/task/<task_id>`**
  - Success Response (200): `{ "success": true, "task": { "status": "complete", "progress": 100, "result": {...} } }`

## 📊 4. Reports Compiler
- **`POST /api/reports`**
  - Headers: `Authorization: Bearer <JWT>`
  - Payload: `{ "title", "description", "content", "case_id" }`
  - Success Response (200): `{ "success": true, "report": { "id", "share_token" } }`
- **`GET /api/reports/share/<token>`**
  - Success Response (200): `{ "success": true, "report" }`
