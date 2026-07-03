# Cygnal 2.0 — Phase 3 Walkthrough

This document records the Phase 3 Case & Evidence Management implementation and the repository stabilization work performed before Phase 4.

---

## Phase 3 Deliverables

### Backend (`api/`)

| Component | Location | Description |
| :--- | :--- | :--- |
| Case schema | `database.py` | SQLite tables: `cases`, `evidence`, `timeline` |
| Case API | `routes/v2/cases.py` | CRUD, notes, evidence upload, scan association |
| SHA-256 hashing | `routes/v2/cases.py` | Evidence files hashed on upload for chain-of-custody |
| Timeline events | `database.py` | Auto-logged on case create, status change, notes, evidence, scan link |
| Lookup history | `database.py` + `routes/v2/scanners.py` | `/api/lookups` returns DB scan logs for case association |

### Frontend (`frontend/`)

| Component | Location | Description |
| :--- | :--- | :--- |
| Cases workspace | `app/cases/page.tsx` | Full investigation panel with sidebar case list |
| Navigation | `components/Navbar.tsx` | Case Files link for analysts/admins |
| Evidence upload | `app/cases/page.tsx` | Multipart file upload with timeline refresh |
| Scan association | `app/cases/page.tsx` | Links lookup records from `/api/lookups` to case timeline |
| Status controls | `app/cases/page.tsx` | PATCH status: open → investigating → closed |

---

## API Endpoints (Phase 3)

| Method | Route | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cases` | Analyst/Admin | Create case |
| `GET` | `/api/cases` | Authenticated | List all cases |
| `GET` | `/api/cases/:id` | Authenticated | Case detail + evidence + timeline |
| `PATCH` | `/api/cases/:id/status` | Analyst/Admin | Update case status |
| `POST` | `/api/cases/:id/note` | Analyst/Admin | Add analyst note to timeline |
| `POST` | `/api/cases/:id/evidence` | Analyst/Admin | Upload evidence file (SHA-256 logged) |
| `POST` | `/api/cases/:id/associate-scan` | Analyst/Admin | Link a lookup record to case timeline |
| `GET` | `/api/lookups` | Public | Fetch lookup history from unified DB |

---

## Repository Stabilization (Pre-Phase 4)

The following issues were identified and resolved during the engineering audit:

1. **npm ci lockfile desync** — Root workspace config conflicted with `frontend/package-lock.json`. Fixed by removing broken npm workspaces and regenerating the frontend lockfile.
2. **Async API / sync frontend mismatch** — Phase 2 converted scanners to background tasks, but most frontend tools still expected synchronous responses. All scanner components now use `submitAndPoll()` from `lib/taskPoll.ts`.
3. **Hardcoded backend URLs** — `HeaderScanner.tsx` and `EmailScanner.tsx` still pointed to `127.0.0.1:5000`. Migrated to `/api/*` proxy routes.
4. **Missing `/api/get-intel`** — `IntelViewer.tsx` called a non-existent endpoint. Added to `routes/v2/admin.py`.
5. **Case scan association mismatch** — Cases page fetched `/api/history` (session JSON files) but associate endpoint queried the `lookups` DB table. Cases page now uses `/api/lookups`.
6. **CI pipeline gaps** — Wrong requirements path, no pytest, incomplete py_compile list. CI now installs from root `requirements.txt`, compiles all blueprints, and runs pytest.
7. **Deployment configuration** — No `vercel.json`, hardcoded `localhost:5000` in proxy. Added `frontend/vercel.json` and `CYGNAL_API_URL` environment variable support in `next.config.ts`.
8. **Broken test imports** — Tests imported from `api.backend` module path. Fixed to use relative imports from the `api/` working directory.

---

## Local Verification Checklist

```bash
# Backend (port 5000)
cd api
pip install -r ../requirements.txt
python backend.py

# Frontend (port 3001)
cd frontend
npm ci
npm run dev

# Tests
cd api
pytest tests/ -v
```

Expected results:
- Backend starts on `http://localhost:5000`
- Frontend starts on `http://localhost:3001`
- `/api/*` requests proxy to Flask
- All 9 pytest tests pass
- `npm run build` succeeds in `frontend/`

---

## Deployment Notes

Cygnal 2.0 is a **split-stack** application. Vercel hosts the Next.js frontend only; the Flask API must be deployed separately (e.g. Railway, Render, Fly.io).

### Vercel Settings

| Setting | Value |
| :--- | :--- |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Install Command | `npm ci` |
| Environment Variable | `CYGNAL_API_URL=https://your-flask-backend.example.com` |

Without `CYGNAL_API_URL`, the Next.js proxy defaults to `http://localhost:5000`, which is unreachable from Vercel's build/runtime environment.
