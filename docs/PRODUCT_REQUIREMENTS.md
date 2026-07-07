# Product Requirements Document (PRD)

## 🎯 1. Product Vision & Goals
Cygnal unifies the disjointed activities of security operations and digital forensics. It aggregates 10 threat intelligence tools, registers cryptographic evidence logs, and enables RAG AI natural language checks.

## 👥 2. Target Persona Profile
- **Tier 1 SOC Analyst:** Needs fast, passive threat lookups and an easy path to register findings to an incident case.
- **Incident Responder (DFIR):** Needs a robust custody timeline where uploaded evidence is sealed with SHA-256 signatures immediately.
- **SOC Director:** Needs executive reports and productivity telemetry dashboards.

## 📝 3. Core Feature Requirements

### Unauthenticated Public Marketing Pages
- **Loading Transition:** 4-6 second security scanning loader animation before presenting homepage.
- **Value Sections:** Clearly lists tool capabilities, case timeline logs structure, and target users.

### Root-Level Auth Layouts
- **Paths:** `/login`, `/register`, `/forgot-password`, `/email-verification`, `/profile-setup`, `/welcome`.
- **Experience:** Clean forms, password visibility toggles, code confirmation steps, profile assignment.

### Workspace Shell
- **Aesthetic Sidebar:** Grouped routes, user profile badge, active background tasks indicators, session exit.
- **Breathing Grid:** Max-width containers for viewport content to prevent layout overlap.

### Case Files Worksheet
- **Custody Actions:** Creation, analyst assignment, timeline addition, file uploads with SHA-256 checks.
- **Visual IOC Graph:** Interactive node mapping linking cases, IPs, domains, and hashes.

### Security Multi-Sensors Directory
- **App-Store UI:** Tool cards showing allowed status.
- **Task Managers:** Non-blocking background executors with progress meters.

### RAG AI Copilot
- **Natural Language Querying:** Parses SQLite logs and returns containments tips.
