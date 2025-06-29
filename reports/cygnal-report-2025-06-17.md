# 🛡️ Cygnal Recon Report
**Generated on:** 2025-06-17
**Analyst:** Ayush Singh Kshatriya

---

## 🔍 Findings Summary

```
=========================
[HEADER ANALYSIS REPORT]
=========================

🔍 Target: https://cyberpulse.in

Result:
[-] Content-Security-Policy: Missing ❌
[-] Strict-Transport-Security: Missing ❌
[-] X-Content-Type-Options: Missing ❌
[-] X-Frame-Options: Missing ❌
[-] Referrer-Policy: Missing ❌
[-] Permissions-Policy: Missing ❌

Interpretation:
This domain lacks basic HTTP security headers, which leaves users more exposed to browser-based attacks such as XSS, clickjacking, and MIME sniffing.

---

🔍 Target: https://poki.com

Result:
[+] Content-Security-Policy: Present ✅
[+] Strict-Transport-Security: Present ✅
[+] X-Content-Type-Options: Present ✅
[-] X-Frame-Options: Missing ❌
[+] Referrer-Policy: Present ✅
[-] Permissions-Policy: Missing ❌

Interpretation:
This domain is moderately well-configured, though two security headers are still missing. Improvement in `X-Frame-Options` and `Permissions-Policy` is recommended.

---

✅ Analyst Note:
Test performed using Cygnal header analyzer script.
All results are from real-time HTTP responses.

🖼️ Screenshot: ./screenshots/cygnal-poki-header-analysis.png

--- Phase 2: Redirect Chain Analysis ---
Target URL: https://bit.ly/3I6ZzrY

Result:
✅ No redirects. The URL leads directly to its destination.

🖼️ Screenshot: ./screenshots/redirect-trace-bitly-example.png

Significance:
Some shortened URLs point directly to final destinations without extra hops.
However, it's still important to scan shortened or suspicious links, as redirection is a common method used in phishing campaigns.

--- Phase 3: WHOIS Lookup & Domain Intel ---
Domain Searched: cyberpulse.in

Result:
- Registrar: GoDaddy
- Created: 2024-06-24
- Expires: 2025-06-24
- Country: IN
- Name Servers: ns28.domaincontrol.com, ns27.domaincontrol.com
- Email: reg_admin@godaddy.com

🖼️ Screenshot: ./screenshots/whois-cyberpulse-result.png

Significance:
WHOIS is often the first digital fingerprint in an investigation. This data helps track domain ownership patterns, assess if a site is a throwaway, and correlate it with scam infrastructure.

--- Phase 4: Email Header Analysis ---
Source: sample-email.txt

Results:
- Claimed Sender: sender@gmail.com
- Sender IP: 209.85.166.52
- SPF: PASS
- DKIM: PASS
- DMARC: PASS

🖼️ Screenshot: ./screenshots/email-header-analysis-sample.png

Significance:
Analyzing raw headers helps trace spoofed or malicious emails, verify sender authenticity, and identify targeted phishing attempts. Often used by SOC teams and police digital forensics units.

--- Phase 5: Web Screenshot Capture ---
Target: https://cyberpulse.in

✅ Screenshot saved at ./screenshots/cyberpulse-screenshot-20250616-214129.png

Significance:
Screenshots serve as visual proof in forensic investigations. They help document fraudulent pages before takedown or alteration, and are often attached to cybercrime reports, court documents, or phishing evidence bundles.

📌 Reverse Image Search – Phase 6
Image: elon.jpg
Tool Used: Google Lens via Selenium automation
Result: Screenshot saved as visual evidence of matches/similar images on the web.
Screenshot: screenshots/reverse-search-20250616-230107.png

📌 Email Extraction & Leak Awareness – Phase 7
URL Analyzed: https://cyberpulse.in
Result: No direct emails found / [X] email(s) found (if any)
Notes: Simulated basic breach check using keywords like 'admin', 'support'
Screenshot: screenshots/email-check-cyberpulse.png

📌 Metadata Extraction – Phase 8
File: samples/test.pdf
Type: PDF Document
Metadata Extracted:
 - Title: Purple White Professional Resume
 - Author: Ayush Singh
 - Created via: Canva
 - Date: 13 June 2025
Screenshot: screenshots/pdf-metadata-20250616.png

```

---
## 📸 Screenshots Used

![cyberpulse-screenshot-20250616-214129.png](screenshots\cyberpulse-screenshot-20250616-214129.png)

![cygnal-poki-header-analysis.png](screenshots\cygnal-poki-header-analysis.png)

![email-check-cyberpulse.png](screenshots\email-check-cyberpulse.png)

![email-header-analysis-sample.png](screenshots\email-header-analysis-sample.png)

![pdf-metadata-20250616.png](screenshots\pdf-metadata-20250616.png)

![redirect-trace-bitly-example.png](screenshots\redirect-trace-bitly-example.png)

![reverse-search-20250616-230107.png](screenshots\reverse-search-20250616-230107.png)

![whois-cyberpulse-result.png](screenshots\whois-cyberpulse-result.png)

---
## ✅ End of Report


---

✅ This report was automatically compiled by the Cygnal toolkit (Phase 9).
Generated on: 16 June 2025 by Ayush Singh Kshatriya
