# Cygnal Technology Stack Matrix (v4.0)

This document catalogs the technologies, libraries, and frameworks utilized across the Cygnal platform.

---

## 💻 Frontend Technology Stack

| Layer / Concern | Technology | Version | Description |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | 16.2.10 | Server-side rendering, static generation, API proxies |
| **UI Library** | React | 19.0.0 | Component rendering engine |
| **Language** | TypeScript | 5.x | Strict type safety across all components and API contracts |
| **Styling Engine** | TailwindCSS | 4.x | Utility-first responsive design tokens and dark mode |
| **Icons** | Lucide React | 0.500+ | Modern cybersecurity and UI iconography |
| **Animations** | Framer Motion | 12.x | Micro-animations, page transitions, and status indicators |
| **State Management**| Zustand | 5.x | Lightweight global store for authentication and user sessions |
| **WebSockets** | Socket.IO Client | 4.x | Real-time presence, chat, and autonomic agent telemetry |
| **Particles Engine**| @tsparticles/react | 3.x / 4.x | Canvas particle background effects on marketing views |

---

## ⚙️ Backend Technology Stack

| Layer / Concern | Technology | Version | Description |
|---|---|---|---|
| **API Gateway** | Flask | 3.x | Lightweight, modular WSGI microframework |
| **WSGI Async Server**| Gevent | 24.x | High-concurrency greenlet coroutine server |
| **Real-Time Engine** | Flask-SocketIO | 5.x | WebSocket broadcast manager with Redis Pub/Sub backend |
| **Background Tasks** | Celery | 5.x | Distributed background task queue with Redis broker |
| **Language** | Python | 3.11+ / 3.13 | Core backend business logic and AI engines |
| **Authentication** | PyJWT | 2.10+ | HS256 JWT creation, verification, and JTI tracking |
| **Password Security**| bcrypt | 4.x | Adaptive cryptographic password hashing |
| **MFA TOTP** | pyotp | 2.9+ | RFC 6238 Time-Based One-Time Password generator |
| **Data Encryption** | cryptography (Fernet)| 44.x | Symmetric key encryption for stored API tokens |

---

## 🗄️ Persistence & Infrastructure

| Layer / Concern | Technology | Version | Description |
|---|---|---|---|
| **Primary Database** | PostgreSQL | 15+ | Production relational database with connection pooling |
| **Embedded DB** | SQLite | 3.x | Local development and CI/CD fallback |
| **Cache & Pub/Sub** | Redis | 7.x | L1 cache, sliding rate limit storage, and Socket.IO Pub/Sub |
| **Containerization** | Docker & Compose | 3.8+ | Multi-container production deployment topology |
| **CI / CD** | GitHub Actions | v4 | Automated Python compile, pytest runner, and Next.js build |
