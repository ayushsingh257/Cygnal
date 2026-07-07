# Cygnal v1.0 — Cooperative Digital Forensics & Incident Response Cockpit

Cygnal is an enterprise-grade cooperative security operations and incident response platform. It unifies network diagnostics, passive threat intelligence lookup engines, document forensics extraction utilities, and audit compliance logging trails into a shared collaborative workspace.

## 🚀 Key Value Propositions
- **Unified Security Multi-Sensor:** Aggregates 10 specialized intelligence collection tools inside a single console.
- **Persistent Compliance Audit Ledger:** Seals incident case modifications and file evidence uploads under cryptographic custody regulations.
- **Dynamic RBAC Policies:** Restricts scanner execution triggers based on role hierarchy or team assignments.
- **RAG AI Assistant Copilot:** Analyzes localized database records to suggest immediate containment and mitigation steps.

## 🛠️ Repository Quick Start

### 1. Backend Service Initialization
The backend server runs on Python utilizing Flask.
```bash
# Navigate to the workspace and initialize python virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run server on port 5000
python api/backend.py
```

### 2. Frontend Development Server
The frontend is a Next.js 15.3 workspace.
```bash
# Install NPM dependencies
npm install

# Launch compiler server on port 3001
npm run dev
```

## 📂 Core Folder Mapping
- `/api`: Python Flask blueprints, services, database wrappers, tests, and task managers.
- `/frontend`: Next.js workspace app routes, React components, state stores, styling configs.
- `/docs`: Markdown specification documents detailing technical architecture and guidelines.

---
*Cygnal © 2026. Distributed under the MIT License.*
