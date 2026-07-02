# 📡 Cygnal 2.0 — Enterprise-Grade, AI-Powered Cybersecurity & OSINT Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![Next.js Version](https://img.shields.io/badge/Next.js-15.0-black.svg)](https://nextjs.org)

**Cygnal 2.0** is an open-source intelligence (OSINT), digital forensics (DFIR), and Security Operations Center (SOC) investigation platform. Powered by cooperative Multi-Agent AI orchestration, passive/active asset reconnaissance, and relational cyber knowledge graphs, Cygnal transforms raw digital signals (WHOIS, headers, passive DNS, screenshots, open ports, reputation checks, and sandbox results) into verified evidence and actionable cases.

---

## 🎯 The Vision
Cygnal 2.0 bridges the gap between raw data collection and cognitive threat analysis. By equipping cybersecurity professionals with a team of cooperative, specialized AI agents, the platform automates complex investigation workflows. No more clicking between separate browser extensions and tools—input an indicator once, and let the agents trace, map, and write the report.

---

## 🚀 Key Features

*   **🕵️ Cooperative Multi-Agent AI**: Specialized, autonomous AI agents (Recon, Threat Intel, Malware, Forensics, SOC Analyst) cooperatively investigate targets and execute platform scanners.
*   **🌐 Attack Surface Mapper**: Automated discovery of subdomains, open ports, SSL configurations, DNS records, MX, SPF, DMARC, ASN, CDN, and WAF details.
*   **🔌 Dynamic Plugin Architecture**: Modular integrations for external threat intelligence providers (VirusTotal, AbuseIPDB, GreyNoise, Shodan, Censys, AlienVault, URLScan, Have I Been Pwned).
*   **📊 Live SOC Dashboard**: Real-time scan monitoring, global IP geolocations heatmap, running background jobs tracker, incident statistics, and a weighted threat score meter.
*   **📂 Case & Evidence Management**: Structured investigation cases with secure file storage, cryptographic hash integrity tracking (SHA-256), and automated timeline reconstruction.
*   **🧠 RAG & Local Vector Storage**: Query past cases, scanned metadata, and attached reports through a local vector search engine (Qdrant/ChromaDB).
*   **⚡ Asynchronous Job Execution**: Heavyweight network sweeps (Nmap/Masscan) and headless web rendering managed via background task workers with live progress metrics.
*   **🛡️ Secure Audit Trails**: Append-only auditing backed by SQLite, mirroring actions to local logs, syslog (UDP 514), and AWS CloudWatch.

---

## 🏛️ System Architecture

```
                       ┌────────────────────────┐
                       │    Security Analyst    │
                       └───────────┬────────────┘
                                   │ Ctrl+K / UI / Chat
                                   ▼
                       ┌────────────────────────┐
                       │  Next.js 15 Frontend   │
                       └───────────┬────────────┘
                                   │ /api Proxy Rewrite
                                   ▼
                       ┌────────────────────────┐
                       │   Flask API Server     │
                       └───────────┬────────────┘
         ┌─────────────────────────┼────────────────────────┐
         ▼                         ▼                        ▼
┌──────────────────┐      ┌──────────────────┐     ┌─────────────────┐
│Background Worker │      │Multi-Agent Core  │     │ Databases       │
│(Async Job Queue) │      │(Ollama/GPT/Gem)  │     │(SQLite/ChromaDB)│
└──────────────────┘      └────────┬─────────┘     └─────────────────┘
                                   │ Runs Scanners
                                   ▼
                  ┌─────────────────────────────────┐
                  │ Scanners, Headless Chrome, Port │
                  │ Sweeps, External Plugin Feeds  │
                  └─────────────────────────────────┘
```

---

## 🧱 Technology Stack

*   **Frontend**: Next.js 15 (App Router), React 19, Zustand, Tailwind CSS v4.0 + Custom CSS Modules, Chart.js, Leaflet Geo-Maps.
*   **Backend**: Flask (Python 3), Flask-Executor, bcrypt, pyjwt.
*   **Forensics & Scanners**: Headless Chrome (Selenium), python-whois, python-nmap, PyMuPDF, python-docx, Pillow, FAISS + CLIP.
*   **Storage**: SQLite (Structured relational DB) + ChromaDB / Qdrant (Vector Database).

---

## 📁 Project Structure

```
Cygnal/
├── api/                       # Flask Backend Services
│   ├── routes/v2/             # Blueprint APIs (auth, admin, scanners)
│   ├── plugins/               # External TI & Scan Plugins
│   ├── database.py            # SQLite schema models
│   ├── backend.py             # App entry point
│   ├── audit_logger.py        # Audit Trail Logging
│   └── requirements.txt       # Python Dependencies
├── frontend/                  # Next.js Frontend
│   ├── app/                   # App Router pages (admin, auth, dashboard)
│   ├── components/            # UI components and tools
│   ├── store/                 # Zustand state stores
│   ├── next.config.ts         # Next.js configurations & proxy rewrites
│   └── package.json           # Node Dependencies
├── docs/                      # Documentation
├── driver/                    # Headless web binaries (chromedriver.exe)
├── screenshots/               # Stored target captures
└── docker-compose.yml         # Container configuration
```

---

## 🛠️ Installation & Configuration

### Prerequisites
- Python 3.9+
- Node.js 18+
- Nmap / Masscan (for active port scanning)

### 1. Set Up Environment Variables
Create a `.env` file in the `/api` directory:
```env
JWT_SECRET=your_secret_key
JWT_EXPIRY=3d
ABUSEIPDB_API_KEY=your_key
VIRUSTOTAL_API_KEY=your_key
HYBRID_API_KEY=your_key
```

### 2. Configure Local Ports
> [!IMPORTANT]
> **Port 3000 is permanently reserved** for the independent project **CCGP (Cyber Complaint Governance Platform)**.
> Cygnal 2.0 is configured to run on port **3001** for the frontend and port **5000** for the backend. Do not interfere with CCGP.

### 3. Run Backend
```bash
cd api
pip install -r requirements.txt
python backend.py
```
*Backend API will run on `http://localhost:5000`.*

### 4. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend interface will run on `http://localhost:3001`.*

---

## 🤝 Contributing
Contributions are welcome! Please refer to the [ROADMAP.md](ROADMAP.md) to see planned features and milestones.
1. Fork the repository and create your feature branch.
2. Ensure code conforms to python PEP8 and React typescript standards.
3. Verify that changes do not affect port reservation standards.
4. Submit a Pull Request with a clear description of changes.

---

## 📄 License
Cygnal is released under the [MIT License](LICENSE) (© 2025-2026 Ayush Singh Kshatriya).

It is intended for lawful and ethical digital investigations. Unauthorized active scans against external target infrastructures are discouraged.
