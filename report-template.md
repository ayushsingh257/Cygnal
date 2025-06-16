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

## 🌐 WHOIS & Domain Intelligence

**Target Domain:** cyberpulse.in

- Registrar: GoDaddy
- Creation Date: 2024-06-24
- Expiry Date: 2025-06-24
- Country: IN
- Email: reg_admin@godaddy.com

💡 **Interpretation:** The domain is recently created and hosted by GoDaddy. This info is useful in phishing or scam detection, especially when correlating domain lifetimes with malicious campaigns.

---

## 📨 Email Header Forensics

Source File: sample-email.txt

- Sender IP: 209.85.166.52
- SPF: PASS
- DKIM: PASS
- DMARC: PASS
- Claimed Sender: sender@gmail.com

💡 Interpretation:
This email passed key authentication checks, but investigating relay IP and header hops still helps confirm sender identity — especially in spoofing or targeted fraud.

---

## 📸 Web Screenshot Capture

Target: https://cyberpulse.in
📁 File: cyberpulse-screenshot-20250616-214129.png

💡 Interpretation:
Capturing real-time screenshots of target websites allows analysts to preserve volatile content before it's removed. This is standard practice in cybercrime investigations and media fact-checking teams.


---

## 🔗 Redirect Chain Analysis

**Input URL:** https://bit.ly/3I6ZzrY

**Result:**
✅ No redirects. The URL leads directly to its destination.

💡 **Interpretation:**
Although this specific shortened URL leads directly to a final site, many phishing or scam URLs pass through multiple redirect layers to mask their destination. Always trace these chains to uncover the true endpoint.

---

## 🧠 Analyst Interpretation

(Write your 2–3 line expert interpretation here.)

The target domain is missing multiple critical HTTP security headers. This suggests poor web server hardening and could expose users to risks like clickjacking, MIME-type attacks, or data leakage. Immediate improvements in header configuration are recommended.


---

📎 **Evidence Screenshot**: `screenshots/cygnal-[domain]-header-analysis.png`


---

## 🖼️ Reverse Image Search

**Image Searched:** elon.jpg
**Search Engine Used:** Google Lens
**Screenshot Saved:** screenshots/reverse-search-20250616-230107.png

### 🔍 Analyst Note:
Reverse image searches are critical in identifying fake profiles, reused images in scam sites, and disinformation campaigns. Google Lens offers reliable matches for public images.

---
