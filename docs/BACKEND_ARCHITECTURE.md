# Backend Architecture Specification

The backend service is constructed in Python using Flask. It exposes REST API routes mounted under `/api`.

## ⚙️ Flask Setup & Middleware
- **Main Entrypoint:** `api/backend.py`. Loads environment variables, configures logging rotation, and handles CORS routing rules.
- **Blueprint Separation:**
  - `routes/v2/auth.py`: Handles login, registration, password recoveries.
  - `routes/v2/scanners.py`: Coordinates scanning dispatches and task logs check.
  - `routes/v2/cases.py`: Registers incident files, comments, and reports compilation.
  - `routes/v2/admin.py`: Coordinates RBAC overrides configurations.
- **Request Interceptors:** `@scanners_bp.before_request` hook validates token coordinates and queries the permissions rules engine before initiating scanner tasks.

## 🧵 Multi-Threaded Task Coordinator (`task_manager.py`)
To prevent blocking Flask processes during slow scanner sweeps (like port scans, DNS audits):
- **Queue Implementation:** Spawns a background daemon thread per request.
- **Track Status:** Returns a unique `task_id` containing progress keys (e.g. 10%, 50%, 100%) stored in an in-memory dictionary.
- **API Access:** Exposes GET `/api/task/<task_id>` to return status payloads.
