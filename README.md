---

### ✨ About Cygnal

Cygnal is more than just a Python script — it's a growing forensic OSINT toolkit built to mimic how real-world investigators assess digital threats. Whether you're a student, ethical hacker, or analyst, Cygnal helps extract valuable intelligence from public domains — fast, clean, and ethically.


![Project](https://img.shields.io/badge/Cygnal-Recon_Toolkit-blueviolet)
![Phase](https://img.shields.io/badge/Phase-9%2F9-complete-brightgreen)

---
Why Does Cygnal Matter?

Most people don’t realize this, but every website leaves a trail —
Security headers, WHOIS data, redirect chains — all of them can reveal whether a site is safe, shady, or secretly harmful.

Cygnal turns those trails into actionable insights.

Think of it like your cyber investigator’s toolkit

Clean reports. Easy commands. No bloat. No noise.

And everything built with forensics & simplicity in mind

### 📍 Where Cygnal Stands Today (Phase 3 Complete)

So far, Cygnal can:
- Identify missing or misconfigured security headers
- Trace redirect chains to uncover phishing layers
- Perform WHOIS lookups to reveal domain ownership and registration trails

It’s already becoming a reliable passive recon kit used in real investigations.

---

### 🚀 Where Cygnal Is Headed

Coming in future phases:
- Email header forensics
- Screenshot capture engine
- Auto-generated PDF reporting
- Passive IP intelligence lookups
- Potential future web interface

Cygnal will evolve from a recon script into a field-ready OSINT utility — trusted by investigators, interns, analysts, and agencies alike.

---


# 🛡️ Cygnal – Security Header Analyzer

**Cygnal** is a lightweight, Python-based tool that performs HTTP security header analysis on any live website. It helps identify missing or misconfigured headers which can expose users to attacks like clickjacking, MIME sniffing, and cross-site scripting.

---

## 🔧 What It Does

Cygnal fetches response headers from any domain and checks for the presence of:

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- Follows redirect chains from shortened or suspicious URLs
- Reveals the true final destination of phishing/malicious links
- Performs WHOIS lookups to gather domain ownership, registration, and server details
- Analyzes raw email headers for SPF/DKIM/DMARC status and origin IP
- Captures full-page screenshot of live websites using headless browser
- Performs reverse image searches via Google Lens and captures visual matches
- Extracts emails from webpages and flags potentially sensitive ones (e.g. admin, support)
- Extracts hidden metadata from PDF and image files (author, tool used, creation time)


It then prints a clean report of what's present and what's missing.

---

## 💻 Sample Output

Analyzing security headers for: https://poki.com/

[+] Content-Security-Policy: Present ✅
[+] Strict-Transport-Security: Present ✅
[-] X-Frame-Options: Missing ❌
[+] Referrer-Policy: Present ✅
[-] Permissions-Policy: Missing ❌

Cygnal/
│
├── scripts/               # Python analysis script
│   └── header_parser.py
│
├── screenshots/           # Visual evidence from analysis
├── sample_headers/        # (Reserved for test data / mock scans)
├── findings.txt           # Written observations
├── report-template.md     # Markdown reporting format
├── README.md              # This file
└── requirements.txt       # Dependencies if any (currently not used)


---

## 🔗 Phase 2 Output Example

🔗 Tracing redirects for: https://bit.ly/3I6ZzrY

✅ No redirects. This URL leads directly to its destination.

---

## 🌐 Phase 3 Output Example

🌐 Performing WHOIS lookup for: cyberpulse.in

📄 WHOIS Result:

Domain Name: cyberpulse.in
Registrar: GoDaddy
Creation Date: 2024-06-24
Expiration Date: 2025-06-24
Name Servers: ns28.domaincontrol.com, ns27.domaincontrol.com
Country: IN
Emails: reg_admin@godaddy.com

---

## 📨 Phase 4 Output Example
📨 Analyzing Email Header...

🔍 Possible Sender IP: 209.85.166.52
✅ SPF Check: PASS
✅ DKIM Check: PASS
✅ DMARC Check: PASS
📩 Claimed Sender: sender@gmail.com

---

## 📸 Phase 5 Output Example

📸 Capturing screenshot of: https://cyberpulse.in
✅ Screenshot saved to screenshots/cyberpulse-screenshot-20250616-214129.png


## 🖼️ Phase 6 Output Example

Reverse image search for: elon.jpg
Result: Screenshot saved at `screenshots/reverse-search-20250616-230107.png`

---

## 📬 Phase 7 Output Example

Email scan for: https://cyberpulse.in
Found: 0 or more
Screenshot saved: `screenshots/email-check-cyberpulse.png`

---

## 🗂️ Phase 8 Output Example

PDF metadata extraction for: test.pdf
Result: Author – Ayush Singh, Tool – Canva
Screenshot saved: screenshots/pdf-metadata-20250616.png

---

## 📄 Phase 9: Automated Report Generator

Cygnal now includes a fully automated report generator that compiles all findings, screenshots, and results into a clean Markdown report — ready to be shared, archived, or submitted to security teams.

✔️ All 8 modules integrated
✔️ Auto-organized with date-stamped filenames
✔️ Designed for investigators, analysts, and cybercrime teams

🖼️ Screenshot: `screenshots/final-report-generated-20250616.png`

---

## 🚀 Getting Started

Make sure you have Python 3 installed.

1. Clone the repository:
git clone https://github.com/ayushsingh257/Cygnal.git
cd Cygnal

2. Run the script:
python scripts/header_parser.py

3. Edit the `url` variable inside `header_parser.py` to test other domains.

---

## 🧠 Why I Built This

This is my second cybersecurity project where I’ve gone a level deeper into practical recon. I wanted to understand what makes a website "secure" on a technical HTTP level and how header misconfigurations can leak sensitive data or allow user-side attacks.

---

## ⚠️ Disclaimer

This project is for educational and ethical testing purposes only. Always scan only websites you own or have explicit permission to analyze. Misuse of this tool is strictly discouraged.

---

## 📄 License

This project is licensed under the MIT License © 2025 Ayush Singh Kshatriya.
You are free to use, share, or adapt it with proper attribution.
Commercial redistribution without consent is discouraged.


---

## 👤 Author

**Ayush Singh Kshatriya**
`Cybersecurity Enthusiast | OSINT Explorer | Recon-focused Builder`
GitHub: [@ayushsingh257](https://github.com/ayushsingh257)
LinkedIn: [linkedin.com/in/ayush-singh-kshatriya](https://linkedin.com/in/ayush-singh-kshatriya)


---

## 🛣️ What's Next for Cygnal

- 🎯 Add a web-based GUI using Flask or React
- 📊 Build real-time dashboard with stats & charts
- 🔗 Integrate threat intel APIs (e.g., VirusTotal, AbuseIPDB)
- 🔐 Add user authentication for secure team access
- 📁 Export reports in PDF/HTML

Stay tuned for **Cygnal v2 – Web Edition** 🚀
