# 🛠️ Local Setup for Cygnal

This guide explains how to run the project locally.

---

## 🔧 Backend Setup (Flask API)

```bash
cd api
pip install -r ../requirements.txt
python backend.py
```

Backend runs on `http://localhost:5000`.

---

## 💻 Frontend Setup (Next.js + Tailwind)

```bash
cd frontend
npm ci
npm run dev
```

Access at: `http://localhost:3001/`

> Port 3000 is reserved for the independent CCGP project. Cygnal uses port 3001.

---

## 🧪 Run Tests

```bash
cd api
pytest tests/ -v
```

---

## 🚀 Production Deployment

See [walkthrough.md](../walkthrough.md) for Vercel configuration and split-stack deployment notes.
