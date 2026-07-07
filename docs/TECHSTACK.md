# Cygnal Technology Stack

This document specifies the official technology stack utilized by Cygnal v1.0.

## 💻 Frontend Ecosystem
- **Core Framework:** Next.js (v15.3+) utilizing App Router.
- **Language:** TypeScript (v5.0+).
- **Styling Engines:** Tailwind CSS (v3.4+) combined with standard CSS variables for theme parameters.
- **State Management Store:** Zustand (v4.5+) for persistent client state in `localStorage`.
- **UI Component Utilities:** Lucide React (icons), React Hot Toast (notifications).
- **Charting Engine:** Chart.js with React-Chartjs-2 for analytics widgets.

## 🐍 Backend Ecosystem
- **Core Framework:** Flask (v3.0+) python micro-framework.
- **Language:** Python (v3.13+).
- **Environment Management:** Python Virtual Environment (`venv`).
- **Cryptographic Security:** PyJWT (v2.8+) for token handshakes, Bcrypt (v4.1+) for hashing.
- **Network Requests:** Requests (v2.31+) for scanning dispatches.

## 🗄️ Relational Database
- **Engine:** SQLite3.
- **Path Location:** `api/cygnal.db`.
- **Persistence Strategy:** Automatic schema migration script checking columns properties on startup.

## 🧪 Testing Suite
- **Backend Testing Framework:** Pytest (v8.1+) running unit API tests.
- **Frontend Testing Utility:** Playwright or Browser Subagent for walkthroughs.

## ⚙️ Build and Tooling
- **Package Manager:** npm (v10+) for frontend dependencies, pip for python packages.
- **Deployment Platform:** Vercel (frontend static pages export), Docker/Gunicorn (backend Flask servers).
