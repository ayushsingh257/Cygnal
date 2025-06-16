# 📝 Cygnal – Header Analysis Report

**Domain Analyzed:** [https://example.com]  
**Scan Date:** [16 June 2025]  
**Analyst:** Ayush Singh Kshatriya

---

## 🔍 Header Status

| Header                      | Status   |
|----------------------------|----------|
| Content-Security-Policy    | ✅ / ❌   |
| Strict-Transport-Security  | ✅ / ❌   |
| X-Content-Type-Options     | ✅ / ❌   |
| X-Frame-Options            | ✅ / ❌   |
| Referrer-Policy            | ✅ / ❌   |
| Permissions-Policy         | ✅ / ❌   |

---

## 🧠 Analyst Interpretation

(Write your 2–3 line expert interpretation here.)

The target domain is missing multiple critical HTTP security headers. This suggests poor web server hardening and could expose users to risks like clickjacking, MIME-type attacks, or data leakage. Immediate improvements in header configuration are recommended.


---

📎 **Evidence Screenshot**: `screenshots/cygnal-[domain]-header-analysis.png`
