# Cygnal - Open-Source Intelligence Toolkit

Cygnal is an OSINT (Open-Source Intelligence) toolkit designed to uncover hidden insights from publicly available data. Built by Ayush Singh Kshatriya, a second-year BCA (Hons) student at Manipal University Jaipur, this project combines web development, cybersecurity, and API integration to empower investigators, researchers, and security enthusiasts.

- **GitHub**: [https://github.com/ayushsingh257/Cygnal](https://github.com/ayushsingh257/Cygnal)
- **LinkedIn**: [https://www.linkedin.com/in/ayush-singh-kshatriya/](https://www.linkedin.com/in/ayush-singh-kshatriya/)
- **Medium**: [https://medium.com/@ayushsinghkshatriya](https://medium.com/@ayushsinghkshatriya)
- **Last Updated**: Recent

---

### ✨ About Cygnal

Cygnal is more than just a Python script — it's a growing forensic OSINT toolkit built to mimic how real-world investigators assess digital threats. Whether you're a student, ethical hacker, or analyst, Cygnal helps extract valuable intelligence from public domains — fast, clean, and ethically.

---

### Why Does Cygnal Matter?

Most people don’t realize this, but every website leaves a trail —
Security headers, WHOIS data, redirect chains — all of them can reveal whether a site is safe, shady, or secretly harmful.

Cygnal turns those trails into actionable insights.

Think of it like your cyber investigator’s toolkit

Clean reports. Easy commands. No bloat. No noise.

And everything built with forensics & simplicity in mind

---

### 📍 Where Cygnal Stands Today (Phase 16 Complete)

So far, Cygnal can:
- Identify missing or misconfigured security headers
- Trace redirect chains to uncover phishing layers
- Perform WHOIS lookups to reveal domain ownership and registration trails
- Capture full-page screenshots of live websites
- Extract hidden metadata from PDF and image files
- Perform reverse image searches via API integration
- Present tools in an enhanced UI/UX with accordion layout and about section

It’s already becoming a reliable passive recon kit used in real investigations.

---

### 🚀 Where Cygnal Is Headed

Coming in future phases:
- Email header forensics
- Auto-generated PDF reporting (Phase 17)
- Authentication and user login
- Passive IP intelligence lookups
- Integration with Shodan/Censys
- Docker deployment and public release

Cygnal will evolve from a recon script into a field-ready OSINT utility — trusted by investigators, interns, analysts, and agencies alike.

---

## Technologies
- **Frontend**: Next.js, Tailwind CSS, React
- **Backend**: Flask, Python
- **Tools**: Nmap, Burp Suite, LaTeX (Phase 17 onward)
- **Deployment**: Planned for Vercel and PythonAnywhere (Phase 30)

## Phase Updates
### Phase 1: Project Planning & Repo Setup
- **Description**: Initialized the GitHub repository and planned the 31-phase roadmap.
- **What I Did**:
  - Created the initial repository structure on GitHub.
  - Outlined the 31-phase plan for Cygnal’s development.
  - Set up basic folders for frontend and backend.
  - Documented initial project goals and tools.
  - Established version control with Git.
- **Status**: ✅ Completed

### Phase 2: UI Design Concept, Logo
- **Description**: Designed the initial UI concept and created the Cygnal 3D logo.
- **What I Did**:
  - Sketched the UI layout using Figma.
  - Designed the Cygnal 3D logo with creative elements.
  - Incorporated a dark theme with neon accents.
  - Tested logo compatibility with video formats.
  - Finalized the hero section concept.
- **Status**: ✅ Completed

### Phase 3: Tailwind & Base Styling
- **Description**: Implemented Tailwind CSS for base styling with a consistent theme.
- **What I Did**:
  - Integrated Tailwind CSS into the project.
  - Applied a dark theme with neon highlights.
  - Styled basic components like buttons and inputs.
  - Ensured responsive design across devices.
  - Optimized CSS for performance.
- **Status**: ✅ Completed

### Phase 4: Header Scanner UI
- **Description**: Developed the UI for the Header Scanner tool.
- **What I Did**:
  - Built the Header Scanner interface with Next.js.
  - Added input fields for URL scanning.
  - Styled the component with Tailwind.
  - Implemented basic error handling.
  - Tested the UI for usability.
- **Status**: ✅ Completed

### Phase 5: WHOIS UI
- **Description**: Built the WHOIS Lookup UI, integrating with the design system.
- **What I Did**:
  - Created the WHOIS Lookup interface.
  - Aligned styling with the Header Scanner UI.
  - Added a domain input field.
  - Incorporated loading states.
  - Ensured consistent layout.
- **Status**: ✅ Completed

### Phase 6: Header → Backend Connection
- **Description**: Connected the Header Scanner to a Flask backend.
- **What I Did**:
  - Set up a Flask API endpoint for scanning.
  - Integrated the frontend with the backend API.
  - Handled HTTP requests for header data.
  - Debugged API response issues.
  - Tested end-to-end functionality.
- **Status**: ✅ Completed

### Phase 7: WHOIS → Backend Connection
- **Description**: Linked the WHOIS tool to the backend.
- **What I Did**:
  - Created a WHOIS API endpoint in Flask.
  - Connected the UI to fetch domain data.
  - Managed API response parsing.
  - Resolved connection timeouts.
  - Validated data display.
- **Status**: ✅ Completed

### Phase 8: Initial UI Polish
- **Description**: Refined the UI with additional styling and responsiveness.
- **What I Did**:
  - Enhanced button hover effects.
  - Improved mobile responsiveness.
  - Adjusted spacing and alignment.
  - Added subtle animations.
  - Tested across browsers.
- **Status**: ✅ Completed

### Phase 9: Writeup & Slide Prep
- **Description**: Prepared documentation and slides for project presentation.
- **What I Did**:
  - Wrote a detailed project overview.
  - Created slides for key features.
  - Included screenshots and diagrams.
  - Practiced the presentation flow.
  - Shared with peers for feedback.
- **Status**: ✅ Completed

### Phase 10: Transition to Next.js
- **Description**: Migrated the project to Next.js for better performance.
- **What I Did**:
  - Converted React components to Next.js.
  - Set up server-side rendering (SSR).
  - Configured routing with Next.js.
  - Migrated CSS to Tailwind.
  - Tested page loading speed.
- **Status**: ✅ Completed

### Phase 11: Hero Section + Glow/Animation
- **Description**: Added a hero section with a 3D logo video and glow effects.
- **What I Did**:
  - Integrated the 3D logo video.
  - Added glow animations with CSS.
  - Styled the hero text and subtitle.
  - Ensured video autoplay and mute.
  - Optimized for performance.
- **Status**: ✅ Completed

### Phase 12: Input Validation, Tests, Logs
- **Description**: Implemented input validation, unit tests, and logging.
- **What I Did**:
  - Added validation for URL inputs.
  - Wrote unit tests for tools.
  - Implemented logging for errors.
  - Debugged test failures.
  - Documented test cases.
- **Status**: ✅ Completed

### Phase 13: Screenshot Tool
- **Description**: Developed the Screenshot Tool with API integration.
- **What I Did**:
  - Built the Screenshot Tool UI.
  - Integrated a screenshot API.
  - Handled image display.
  - Added loading states.
  - Tested with various URLs.
- **Status**: ✅ Completed

### Phase 14: Metadata Recon Tool
- **Description**: Created the Metadata Recon Tool for file analysis.
- **What I Did**:
  - Developed the metadata UI.
  - Implemented file upload parsing.
  - Extracted metadata fields.
  - Added error handling.
  - Tested with sample files.
- **Status**: ✅ Completed

### Phase 15: Reverse Image Search UI/API
- **Description**: Built the Reverse Image Search feature.
- **What I Did**:
  - Created the image search UI.
  - Integrated a reverse image API.
  - Handled image uploads.
  - Displayed search results.
  - Optimized API calls.
- **Status**: ✅ Completed

### Phase 16: UI/UX Redesign
- **Description**: Redesigning the UI/UX with a vertical tool stack and enhancements.
- **What I Did**:
  - Reorganized tools into an accordion layout.
  - Added an about section for OSINT.
  - Increased tool card sizes (3x).
  - Applied purple borders with hover shine.
  - Centered the layout with gaps.
- **Status**: ✅ Completed

### Phase 17.1: Set Up LaTeX Environment and Prepare Logo
- **Description**: Set up a LaTeX environment using MiKTeX for PDF report generation and prepared the Cygnal logo.
- **What I Did**:
  - Installed MiKTeX on Windows for LaTeX support.
  - Created a `test.tex` file to verify setup.
  - Copied `cygnal-logo.png` from `public` to `api/static`.
  - Updated `test.tex` to include the logo.
  - Documented the setup in project files.
- **Status**: In Progress
- **Next Steps**: Design a LaTeX template in Phase 17.2.

## Future Phases
- **Phase 17-31**: Planned features include PDF exports, authentication, deployment, and advanced OSINT integrations (e.g., Shodan, IP tracking).
- **Target Completion**: End of degree timeline

## Contributions
- Open to feedback and collaboration. Contact me via LinkedIn or email (a.s.kshatriya99@gmail.com).

## License
[MIT License](LICENSE) - Free to use and modify.

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

## 🔟 Phase 10: Frontend UI Design + Component Setup

- Transitioned to a Next.js 14 frontend using the App Router.
- Implemented a **visually rich Hero Section** with rotating logo, animated gradients, and neon glow hover effects.
- Introduced structured components: `HeaderScanner`, `WhoisLookup`, and `Hero`.
- Ensured responsive design using Tailwind CSS.
- Separated `Hero.css` for scalable animation and background customization.

## 🔁 Phase 11: Backend Integration

- Connected the **Flask backend** to the frontend via custom APIs.
- Developed and tested `/api/header-scan` and `/api/whois-lookup` POST routes.
- Implemented API calls in the frontend using `fetch()` and `useState`.
- Displayed scan results in real-time with conditional rendering and improved UX.
- Added error handling for invalid inputs and backend connectivity.

### ✅ Phase 14: Metadata Recon Tool
- Upload multiple files (JPG, PNG, PDF, DOCX)
- Extract and prettify metadata
- Side-by-side comparison with diff viewer
- Suspicious metadata detection (author mismatch, EXIF location, outdated timestamps)
- Threat scoring (Low / Medium / High)
- Analyst notes for each file
- Full session export (ZIP of JSON + CSV)

## Phase 15: Reverse Image Search (CLIP + FAISS)

This phase implements an offline reverse image search feature using OpenAI's CLIP model combined with FAISS for efficient similarity matching. It allows analysts to upload an image and find visually or semantically similar images from a reference dataset — even with angle, lighting, or composition changes.

### Features:
- 🔍 CLIP ViT-B/32 model for robust visual feature encoding
- ⚙️ FAISS cosine similarity index (`IndexFlatIP`)
- 📁 Automatic indexing of all reference images in `reference_images/`
- 📷 Supports multiple image formats (.jpg, .png, .webp, .bmp, .tiff, etc.)
- ✅ Normalized cosine similarity used for accurate comparison
- 📊 Results displayed with **percentage similarity match**
- 💡 Works entirely offline, ideal for forensic environments

### Example Match Output:
```json
{
  "match_path": "reference_images/shoe.png",
  "match_percentage": 92.31
}

---

## 📝 `report_template.md` (Phase 15 entry)

Append this to the project report markdown file:

```markdown
## Phase 15 - Reverse Image Search

### Objective:
Enable offline reverse image search using AI to detect image similarities from a given reference dataset.

### Tools & Libraries:
- OpenAI CLIP (`ViT-B/32`)
- FAISS (Facebook AI Similarity Search)
- PIL (Pillow), NumPy
- React + Flask

### Implementation:
- CLIP used to generate 512-dimension image embeddings.
- Vectors normalized and added to FAISS index using cosine similarity.
- Uploaded image is encoded and compared with stored reference vectors.
- Results are ranked and shown with similarity percentage.

### Output:
- Returns top-5 closest matches with similarity %.
- Matches remain effective even if angle, zoom, or background varies.

### Status: ✅ Completed

## Phase 15.5: Reverse Image Search UI Enhancement

This phase enhances the reverse image search feature by displaying the matched images directly on the UI, improving analyst efficiency. Building on the offline CLIP + FAISS implementation, the frontend now renders the top matches alongside their similarity percentages.

### Features:
- 📷 Displays matched images (e.g., `shoe.png`) on the UI using base64-encoded data.
- 🎨 Preserves the existing percentage similarity calculation without changes.
- 🔄 Seamless integration with the existing Next.js frontend and Flask backend.
- ✅ Tested with various reference images to ensure accurate rendering.

### Example Output:
- Upload an image (e.g., `Screenshot_213455.png`) and see a match like:
  - Match 0: 87.33% with image displayed.
  - File Path: `reference_images/shoe.png`

### Status: ✅ Completed

## 🔟 Phase 16: UI/UX Design Overhaul

This phase marks a significant redesign of Cygnal's user interface, transitioning to a modern Next.js 14 frontend with Tailwind CSS to enhance usability and visual appeal for investigators and analysts.

### Features:
- 🎨 **Visually Rich Hero Section**: Implemented a dynamic Hero component with a rotating Cygnal logo, animated gradients, and neon glow hover effects to create an immersive first impression.
- 🛠️ **Structured Components**: Developed reusable components including `HeaderScanner`, `WhoisLookup`, and `Hero`, ensuring modularity and scalability.
- 📱 **Responsive Design**: Utilized Tailwind CSS to ensure a seamless experience across devices (desktop, tablet, mobile) with fluid layouts and adaptive styling.
- 🎥 **Custom Animations**: Added `Hero.css` for scalable animations and background customization, enhancing user engagement with smooth transitions.
- ✅ **Tested Usability**: Validated with mock user scenarios to ensure intuitive navigation and accessibility.

### Example Output:
- **Hero Section Screenshot**: Displays the animated logo and gradient background, saved as `screenshots/hero-redesign-20250621.png`.
- **Component Demo**: `HeaderScanner` and `WhoisLookup` components render dynamically with real-time data, e.g., security header status for `https://poki.com`.

### Status: ✅ Completed on June 21, 2025