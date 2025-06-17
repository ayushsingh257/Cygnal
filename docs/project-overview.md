# 🛰️ Cygnal - OSINT Reconnaissance Toolkit

**From surface clues to silent signals.**

Cygnal is a modern Open Source Intelligence (OSINT) toolkit that allows analysts to gather insights from domains, headers, metadata, and screenshots — all from a sleek, web-based interface.

---

## 🚀 Core Features

| Feature               | Status  | Description |
|-----------------------|---------|-------------|
| 🔎 Header Scanner      | ✅      | Check if security headers like `CSP`, `HSTS`, etc. are present. |
| 🌐 WHOIS Lookup        | ✅      | Retrieve registrar, expiry, and owner data from a domain. |
| 🖼️ Screenshot Tool     | ⏳      | Visual snapshot of a given URL. *(Planned)* |
| 🧠 Metadata Recon      | ⏳      | Extract EXIF and other metadata from uploaded images. *(Planned)* |
| 🧩 Reverse Image Search| ⏳      | OSINT reverse image engine. *(Planned)* |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Flask (Python 3)
- **Tools**: WHOIS library, Requests, React Hooks
- **Planned**: Docker, CI/CD with GitHub Actions, login system

---

## 🧱 Architecture

[ Next.js Frontend ] → calls → [ Flask API ] → runs → [ Scanners (requests, whois, metadata) ]


- Both run locally or can be containerized.
- Cross-Origin enabled for seamless dev (`flask_cors`).

---

## 📈 Roadmap

Cygnal is currently at **Phase 12 of 30**, focusing on production hardening and polishing. Key upcoming milestones include:

- ✅ Phase 13: Reverse Image Search
- ✅ Phase 14: Metadata Upload & Parse
- 🧪 Phase 16: PDF Report Export
- 🔐 Phase 18: Auth System
- 🚀 Phase 27: Docker + Deploy

See full roadmap in [`phases.md`](./phases.md)

---

## 👥 Author

Built by **Ayush Singh Kshatriya**
[LinkedIn](https://linkedin.com/in/ayushsingh257) | [GitHub](https://github.com/ayushsingh257)

---

## 🧪 Try It Locally

1. `cd frontend/` → `npm install` → `npm run dev`
2. `cd api/` → `python backend.py`
