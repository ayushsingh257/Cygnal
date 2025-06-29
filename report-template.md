# 🛰️ Cygnal Intelligence Report Template  
*Analyst Name:* Ayush Singh Kshatriya  
*Session ID:* [Auto-Generated UUID]  
*Date:* {{DATE}}  
*System Version:* Cygnal v31.0  
*Environment:* Authenticated Analyst (Admin Privileges Enabled)  

---

## 📌 Executive Summary

This report summarizes the findings and operations performed using the Cygnal OSINT and Reconnaissance Framework. The session was conducted in a controlled environment with full tool access. Below is a phase-wise log of executed tools, target inputs, results, and strategic insights.

---

## 🔍 Phase-wise Tool Usage

---

## 🔒 Phase 1: Security Header Scan
- **Tool:** HeaderScanner  
- **Target URL:** {{TARGET_URL}}  
- **Result:** Missing Headers (CSP, XFO, Permissions-Policy)  
- **Risk Level:** Elevated  
- **Recommendation:** Set security headers via server/middleware.

---

## 🔗 Phase 2: Redirect Chain Tracing  
- **Tool:** RedirectAnalyzer  
- **Target URL:** {{REDIRECT_URL}}  
- **Result:** Final redirect endpoint resolved  
- **Redirection Depth:** {{DEPTH}}  
- **Use Case:** Detect chained/phishing redirects.

---

## 🌐 Phase 3: WHOIS Domain Intelligence  
- **Tool:** WhoisLookup  
- **Domain:** {{DOMAIN}}  
- **Registrar:** {{REGISTRAR}}  
- **Created On:** {{CREATION_DATE}}  
- **Country:** {{REG_COUNTRY}}  
- **Insight:** {{INSIGHT}}

---

## ✉️ Phase 4: Email Header Forensics  
- **Tool:** EmailHeaderAnalyzer  
- **Sender IP:** {{SENDER_IP}}  
- **Auth Checks:** SPF/DKIM/DMARC Status: ✅ Passed / ❌ Failed  
- **Verdict:** {{VERDICT}}  

---

## 🖼️ Phase 5: Screenshot Capture  
- **Tool:** ScreenshotTool  
- **Target:** {{TARGET_URL}}  
- **Result:** Screenshot saved as `{{FILENAME}}`  
- **Purpose:** Capture volatile web content

---

## 🧠 Phase 6: Reverse Image Search (Online)  
- **Engine:** Google Lens  
- **Input:** {{IMAGE_FILENAME}}  
- **Match Found:** {{MATCH_RESULT}}  
- **Use Case:** Deepfake tracing / identity correlation

---

## 🔍 Phase 7: Email Leak & Crawler  
- **Tool:** EmailScanner  
- **Target Site:** {{SITE_URL}}  
- **Emails Found:** {{EMAILS_FOUND}}  
- **Insight:** {{LEAK_INSIGHT}}

---

## 📄 Phase 8: Metadata Extraction  
- **Tool:** MetadataRecon  
- **Files Scanned:** {{FILES}}  
- **Findings:**  
  - Author: {{AUTHOR}}  
  - Created: {{CREATION_DATE}}  
  - Software Used: {{SOFTWARE}}

---

## 📥 Phase 9: Report Generation  
- **Feature:** PDF/Markdown Export Engine  
- **Modules Included:** Header, WHOIS, Metadata, Screenshot  
- **Purpose:** Documentation, evidence archival

---

## ⚙️ Phase 10: Frontend Framework Upgrade  
- **Tech Stack:** Next.js 14 + TailwindCSS  
- **Result:** Mobile-ready, clean responsive UI

---

## ⚙️ Phase 11: Backend Tool Integration  
- **Framework:** Flask  
- **APIs Connected:** /header-scan, /whois-lookup, /metadata  
- **Outcome:** Full frontend-backend sync

---

## ⚠️ Phase 12: Input Validation & UX Hardening  
- **Coverage:** URL, domain, email, file  
- **Handling:** Safe fallback, error prompts, exception-free backend  
- **Result:** Secure, robust input validation

---

## 📸 Phase 13: Web Screenshot Automation  
- **Tech:** Selenium + ChromeDriver  
- **Storage:** `/screenshots/`  
- **Use:** For legal evidence, comparison

---

## 📑 Phase 14: Multi-file Metadata Recon  
- **Files:** Resume_Ayush.pdf, Resume_Soumya.docx  
- **Insights:** Canva detected, author tags retained

---

## 🧬 Phase 15: Reverse Image AI (Offline)  
- **Tool:** OpenAI CLIP + FAISS  
- **Input:** {{INPUT_IMG}}  
- **Match:** {{MATCH_IMG}} @ {{SIMILARITY}}%  
- **Use Case:** Fake detection without cloud reliance

---

## 💡 Phase 15.5: Reverse Image UI Upgrade  
- **Feature:** Frontend image preview, % match  
- **Benefit:** Better analyst interpretation

---

## 🎨 Phase 16: UI/UX Design Overhaul  
- **Improved Areas:** Hero, Navbar, Responsiveness  
- **Frameworks:** TailwindCSS, animations

---

## 🧾 Phase 18: Session Logging  
- **Data Stored:** Tool, Input, Result, Timestamp  
- **Format:** JSON, CSV  
- **Use:** Evidence, audit trail

---

## 🔐 Phase 19: Authentication System  
- **Security:** bcrypt hashed, login enforced  
- **State:** Session-local login for tool access

---

## 🛡️ Phase 20: Route Guarding  
- **Auth Mode:** JWT  
- **Verification:** Both frontend and backend  
- **Edge Case Handling:** Expiry, logout

---

## 🧑‍⚖️ Phase 21: Role-Based Access Control  
- **Roles:** Admin / Analyst  
- **Enforced On:** Tool access, panel entry  
- **Future Plan:** Dynamic role management

---

## 🕷️ Phase 22: Advanced Email Scanning  
- **Features:** JS fallback, subpage crawling  
- **Depth:** Up to 10 internal links  
- **Purpose:** Find deeply hidden contact points

---

## 📡 Phase 23: Audit Logging  
- **Outputs:**  
  - `audit_logs/audit_log.json`  
  - Syslog 514  
  - AWS CloudWatch  
- **Format:** Append-only  
- **Use:** SIEM integration, compliance

---

## 💾 Phase 24: Persistent Audit Storage  
- **DB:** SQLite (`lookup_logs.db`)  
- **Table:** `lookups`  
- **Access:** CLI, Admin UI  
- **Graph Integration:** ✅

---

## 📊 Phase 26: Visual Dashboard  
- **Components:**  
  - Tool Frequency (Bar)  
  - Usage Timeline (Multi-line)  
  - Rolling 5-day Usage  
- **Access:** Admin Only  
- **Rendering:** SSR-compatible, animated

---

## 🦠 Phase 27: Malware Scanner  
- **API:** Hybrid Analysis  
- **Mode:** File Upload → Verdict Parsing  
- **Fallback:** Handles invalid API keys  
- **Frontend:** Disclaimer-aware toggle  
- **Status:** Operational, audit-logged

---

## 🌍 Phase 28: IP Reputation Tracker  
- **API:** AbuseIPDB  
- **Targets:** {{IP_LIST}}  
- **Insight:** Confirmed abuse report parsing  
- **Logging:** Visual + Audit + Session  
- **Use:** Bulletproof host detection

---

## 🧭 Phase 29: Passive DNS Lookup  
- **API:** VirusTotal Passive DNS  
- **Target Domain:** {{DOMAIN}}  
- **Records:** {{NUM_RECORDS}}, {{IP_RESULTS}}  
- **Temporal Info:** First Seen: {{DATE}}, Last Seen: {{DATE}}  
- **Use Case:** IP-domain pivoting

---

## 🔌 Phase 30: Port Scanner  
- **Tools:** Nmap + Masscan  
- **Target:** {{HOSTNAME}}  
- **Open Ports:** 22, 80, 443, 8080  
- **Mode:** Quick/Full  
- **Note:** Admin/Root required in some environments  
- **Logging:** ✅ Admin / Dashboard / History  

---

## 🧑‍💼 Phase 31: Admin Panel (User Management & Role Assignment)

**Admin Panel Features:**
- User List View with roles
- Role Assignment UI (Admin / Analyst)
- Secure JWT-based privilege control
- Role persistence via database
- Action logging (user changes, role switches)

**Current Admin(s):**
- Ayush Singh Kshatriya (Primary / Hardcoded)

**Access Logs (Last 5 Events):**

| Timestamp (UTC)       | Action                  | User                  |
|-----------------------|-------------------------|-----------------------|
| 2025-06-29T12:45:02Z  | Role changed: analyst → admin | testuser@example.com |
| 2025-06-29T11:22:40Z  | User added              | intern01@example.com  |
| 2025-06-29T10:15:19Z  | Role viewed             | admin@example.com     |
| 2025-06-29T09:47:58Z  | Role changed: admin → analyst | helper@acme.com      |
| 2025-06-28T17:38:11Z  | User removed            | tempuser@sample.org   |

**Analyst Note:**  
The Admin Panel now centralizes role control and user auditing. While Ayush retains immutable admin access, all other roles are dynamically managed. This supports compliance, least privilege principles, and secure tool access segregation.

---

## ✅ Status Summary

| Phase | Module                        | Status     |
|-------|-------------------------------|------------|
| 1–16  | Core Recon Tools              | ✅ Complete |
| 18–24 | Auth, Audit, Storage          | ✅ Complete |
| 26     | Visual Dashboard              | ✅ Complete |
| 27–30 | Malware/IP/DNS/Port Scans     | ✅ Complete |
| 31     | Admin Panel                   | ✅ Complete |

---

© 2025 Ayush Singh Kshatriya – *Cygnal OSINT Framework*  
