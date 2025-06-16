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

## 👤 Author

**Ayush Singh Kshatriya**
`Cybersecurity Enthusiast | OSINT Explorer | Recon-focused Builder`
GitHub: [@ayushsingh257](https://github.com/ayushsingh257)
LinkedIn: [linkedin.com/in/ayush-singh-kshatriya](https://linkedin.com/in/ayush-singh-kshatriya)

