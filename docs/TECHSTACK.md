# Cygnal Technology Stack

This document specifies the official technology stack utilized by Cygnal v4.0.

## 💻 Frontend Ecosystem
- **Core Framework:** Next.js (v16.2.10) utilizing App Router.
- **Language:** TypeScript (v5.x).
- **Styling Engines:** Tailwind CSS (v4.x) combined with standard CSS variables for theme parameters.
- **State Management Store:** Zustand (v5.0.14) for persistent client state in `localStorage`.
- **UI Component Utilities:** Lucide React (icons), React Hot Toast (notifications), Socket.io-client (WebSockets).
- **Charting Engine:** Chart.js with React-Chartjs-2 for analytics widgets.

## 🐍 Backend Ecosystem
- **Core Framework:** Flask (v3.0+) python micro-framework.
- **Language:** Python (v3.13+).
- **Environment Management:** Virtual Environment (`venv`).
- **Cryptographic Security:** PyJWT (v2.8+) for token handshakes, Bcrypt (v4.1+) for hashing, PyOTP (v2.9+) for multi-factor authentication.
- **Network Requests:** Requests (v2.31+) for scanning dispatches.
- **Task Broker / Worker Queue:** Celery (v5.x) and Redis (v7.x) (with local thread fallback).

## 🗄️ Relational Database & Caching
- **Engine:** PostgreSQL (production), SQLite3 (local fallback).
- **Database Driver:** `psycopg2-binary` (PG), `sqlite3` (built-in).
- **Data Isolation:** Middleware-extracted thread-local `tenant_id` context with automatic SQL query rewriter.
- **Cache / PubSub Broker Store:** Redis (v7.x) using `redis-py` client. Employs Redis Pub/Sub for Socket.IO synchronization, and L1 threat-intel caching with socket-timeout (500ms) circuit breakers.

## 🧪 Testing Suite
- **Backend Testing Framework:** Pytest (v8.2+) running unit API tests.
- **Frontend Testing Utility:** Playwright / Browser Subagent for walkthroughs.

## ⚙️ Build and Tooling
- **Package Manager:** npm (v10+) for frontend dependencies, pip for python packages.
- **Deployment Platform:** Vercel (frontend static pages export), Docker/Gunicorn (backend Flask servers).

