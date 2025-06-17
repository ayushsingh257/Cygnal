# 🛠️ Local Setup for Cygnal

This guide explains how to run the project locally.

---

## 🔧 Backend Setup (Flask API)

```bash
cd api/
python backend.py

Make sure Flask, requests, python-whois, and flask-cors are installed:

pip install flask requests python-whois flask-cors

💻 Frontend Setup (Next.js + Tailwind)
cd frontend/
npm install
npm run dev
Access at: http://localhost:3000/

🧪 Run Tests (Optional)
pytest api/tests/


---

#### 2️⃣ `docs/project-overview.md`

```md
# 📌 Cygnal: OSINT Recon Toolkit

"From surface clues to silent signals" – Cygnal is a powerful OSINT web toolkit that combines:

- 🔎 Header Scanner
- 🌐 WHOIS Lookup
- 📸 Reverse Image Search *(Coming Soon)*
- 🕵️ Metadata Recon *(Coming Soon)*

---

## 🎯 Purpose

Help cyber investigators, analysts, and journalists easily gather public intelligence using a simple UI.

---

## 🔒 Phase 12 Status

✅ Error handling
✅ Input validation
✅ Logging and safe backend
✅ UI/UX polish
✅ Testing framework added
✅ Folder structure cleaned

---

## 🛣️ Roadmap

- Phase 13: Reverse Image Search
- Phase 14: Metadata File Scanner
- Phase 15: Screenshot Website Tool
- Phase 16+: Scan history, export report, auth, user dashboard

---

## 👨‍💻 Built By

**Ayush Singh Kshatriya**
GitHub: [@ayushsingh257](https://github.com/ayushsingh257)
