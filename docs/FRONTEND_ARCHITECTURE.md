# Cygnal Frontend Architecture Specification (v4.0)

The Cygnal frontend is built on **Next.js 16.2+ (App Router)**, **React 19**, **TypeScript 5**, and **TailwindCSS 4**, offering an ultra-responsive, glassmorphic cybersecurity operational console.

---

## 🧭 Page Routing Structure (`frontend/app/` — 40 Routes)

```
frontend/app/
├── page.tsx                  # Marketing landing page with hero, live preview, particle effects
├── layout.tsx                # Global HTML wrapper, dark theme, and Sonner toast provider
├── globals.css               # Design tokens, CSS variables, glassmorphism utilities
│
├── login/                    # Login page with TOTP MFA verification gate
├── register/                 # Self-registration (restricted to analyst/intern)
├── forgot-password/          # Password recovery workflow
├── email-verification/       # Email activation workflow
├── sso-callback/             # OAuth/OIDC/SAML token callback handler
│
├── dashboard/                # Central SOC dashboard with live metrics & quick actions
├── cases/                    # Incident case workspace (evidence, timeline, SVG graph, locks, chat)
├── copilot/                  # Split-panel AI Investigation Copilot workspace
├── agents/                   # Autonomous multi-agent pipeline monitoring console
├── alerts/                   # SIEM alert triage board with takeover controls
├── analytics/                # Role-tailored analytics cockpit & triage charts
├── chat/                     # RAG database assistant chat interface
├── reports/                  # A4-printable forensic report compiler
│   └── share/[token]/        # Public verification view for sealed forensic reports
│
├── scanners/                 # Unified 10-sensor operational launcher
│   ├── dns/                  # DNS record lookup
│   ├── email-headers/        # Email routing hop & SPF/DKIM/DMARC validator
│   ├── headers/              # HTTP security headers auditor
│   ├── ip-reputation/        # IP ASN & abuse checker
│   ├── malware/              # File hash malware validator
│   ├── metadata/             # Document & image EXIF metadata extractor
│   ├── reverse-image/        # Image perceptual hash validator
│   ├── screenshot/           # Webpage scraper & tech stack detector
│   ├── threat-intel/         # Multi-feed threat intel & CVE search
│   └── whois/                # Domain registrar lookup
│
├── settings/                 # Workspace settings & TOTP MFA configuration
├── profile/                  # User identity & operational badge card
├── profile-setup/            # First-login profile completion wizard
├── welcome/                  # New user onboarding welcome screen
├── admin/                    # Administrative user management & tenant provisioning
│   └── audit/                # Cryptographic audit log viewer
│
├── about/                    # Platform mission & engineering principles
├── contact/                  # Enterprise support & security contact
├── privacy/                  # GDPR/CCPA privacy policy
├── terms/                    # Platform terms of service
├── cookie-policy/            # Cookie & tracking declaration
└── security/                 # Vulnerability disclosure & security posture policy
```

---

## 🎨 Design System & UI Components

1. **State Management**:
   - `useAuthStore.ts` (Zustand) manages session tokens, user profiles, and persistent local storage synchronization.

2. **Real-Time WebSockets**:
   - Integrated Socket.IO client in `DashboardShell.tsx` synchronizes case lease locks, user presence, notifications, and live autonomic agent logs.

3. **Data Visualization**:
   - Custom SVG Force-Directed Knowledge Graph for entity correlation.
   - SVG Area and Bar charts in Analytics for triage metrics.
   - 7-Stage Chronological Timeline accordion with AI narrative summaries.
