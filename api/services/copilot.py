"""
Cygnal AI Investigation Copilot — Sprint 4B
Structured investigation intelligence engine.

Responsibilities:
- Intent classification (what does the analyst want to do?)
- RAG context enrichment (what do we know from the database?)
- IOC detection from free-text prompts
- Structured investigation response formatting
- Investigation plan generation with scan recommendations
- Post-investigation summarization
- Confidence scoring
"""

import re
import json
from datetime import datetime
from db_utils import get_db_connection, DB_PATH

# ─── Intent Classification ────────────────────────────────────────────────────

INTENT_INVESTIGATE = "INVESTIGATE_TARGET"
INTENT_EXPLAIN = "EXPLAIN_CASE"
INTENT_SUMMARIZE = "SUMMARIZE_FINDINGS"
INTENT_RECOMMEND = "RECOMMEND_NEXT_STEPS"
INTENT_ANSWER = "ANSWER_QUESTION"

# Patterns that trigger investigation intent
_INVESTIGATE_SIGNALS = [
    r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',  # IPv4
    r'\bhttps?://[^\s]+',  # URL
    r'\b[A-Fa-f0-9]{64}\b',  # SHA-256
    r'\b[A-Fa-f0-9]{32}\b',  # MD5
    r'\bCVE-\d{4}-\d{4,7}\b',  # CVE
]

_EXPLAIN_KEYWORDS = ["explain", "what is", "what does", "why is", "describe", "tell me about", "what happened"]
_SUMMARIZE_KEYWORDS = ["summarize", "summary", "findings", "what was found", "results", "investigation complete", "what did"]
_RECOMMEND_KEYWORDS = ["what should", "next step", "recommend", "what do i do", "suggest", "advice", "how do i"]


def classify_intent(prompt: str) -> str:
    """Classify the analyst's intent from their natural language prompt."""
    lower = prompt.lower()

    # Investigate: explicit IOC patterns
    for pattern in _INVESTIGATE_SIGNALS:
        if re.search(pattern, prompt):
            return INTENT_INVESTIGATE

    # Investigate: explicit action keywords
    investigate_keywords = ["investigate", "scan", "check", "lookup", "analyze", "run scan", "look up", "research"]
    for kw in investigate_keywords:
        if kw in lower:
            return INTENT_INVESTIGATE

    # Summarize findings
    for kw in _SUMMARIZE_KEYWORDS:
        if kw in lower:
            return INTENT_SUMMARIZE

    # Explain / describe
    for kw in _EXPLAIN_KEYWORDS:
        if kw in lower:
            return INTENT_EXPLAIN

    # Recommend next actions
    for kw in _RECOMMEND_KEYWORDS:
        if kw in lower:
            return INTENT_RECOMMEND

    return INTENT_ANSWER


# ─── IOC Extraction from Prompt ───────────────────────────────────────────────

def extract_iocs_from_prompt(prompt: str) -> list:
    """Extract structured IOC list from a raw text prompt."""
    found = []
    seen = set()

    def _add(val, itype, conf=95):
        if val not in seen:
            seen.add(val)
            found.append({"value": val, "type": itype, "confidence": conf})

    for m in re.finditer(r'\b[A-Fa-f0-9]{64}\b', prompt):
        _add(m.group(), "hash", 99)
    for m in re.finditer(r'\b[A-Fa-f0-9]{40}\b', prompt):
        _add(m.group(), "hash", 99)
    for m in re.finditer(r'\b[A-Fa-f0-9]{32}\b', prompt):
        _add(m.group(), "hash", 95)
    for m in re.finditer(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b', prompt):
        val = m.group()
        if not val.startswith(("127.", "0.", "192.168.", "10.", "172.")):
            _add(val, "ip", 98)
        else:
            _add(val, "ip", 80)
    for m in re.finditer(r'\bhttps?://[^\s<>"\']+', prompt):
        _add(m.group(), "url", 97)
    for m in re.finditer(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', prompt):
        _add(m.group(), "email", 96)
    for m in re.finditer(r'\bCVE-\d{4}-\d{4,7}\b', prompt, re.IGNORECASE):
        _add(m.group().upper(), "cve", 100)

    # Domains — only if not already captured as part of URL or email
    domain_candidates = re.finditer(r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b', prompt)
    for m in domain_candidates:
        val = m.group()
        # Skip if already part of a URL or email
        already = any(val in x["value"] for x in found if x["type"] in ("url", "email"))
        # Skip common system TLDs
        if not already and not any(val.endswith(t) for t in [".py", ".tsx", ".ts", ".js", ".md", ".txt", ".pdf"]):
            _add(val, "domain", 85)

    return found


# ─── RAG Context Lookup ────────────────────────────────────────────────────────

def fetch_case_context(case_id: str) -> dict:
    """Fetch all investigation context for a specific case."""
    conn = get_db_connection()
    cursor = conn.cursor()
    ctx = {"case": None, "timeline": [], "evidence": [], "indicators": [], "lookups": []}

    try:
        cursor.execute("SELECT id, case_number, title, description, status, severity, assigned_to, created_at FROM cases WHERE id = ?;", (case_id,))
        row = cursor.fetchone()
        if row:
            ctx["case"] = {
                "id": row[0], "case_number": row[1], "title": row[2],
                "description": row[3], "status": row[4], "severity": row[5],
                "assigned_to": row[6], "created_at": row[7]
            }

        cursor.execute("SELECT event_type, description, timestamp, user FROM timeline WHERE case_id = ? ORDER BY timestamp DESC LIMIT 15;", (case_id,))
        for r in cursor.fetchall():
            ctx["timeline"].append({"event_type": r[0], "description": r[1], "timestamp": r[2], "user": r[3]})

        cursor.execute("SELECT filename, file_size, file_hash, file_type, uploaded_by FROM evidence WHERE case_id = ?;", (case_id,))
        for r in cursor.fetchall():
            ctx["evidence"].append({"filename": r[0], "size": r[1], "hash": r[2], "type": r[3], "uploaded_by": r[4]})

        cursor.execute("SELECT indicator_value, indicator_type, confidence_score FROM case_indicators WHERE case_id = ?;", (case_id,))
        for r in cursor.fetchall():
            ctx["indicators"].append({"value": r[0], "type": r[1], "confidence": r[2]})

        cursor.execute("""
            SELECT tool, input, result, timestamp FROM lookups
            WHERE result LIKE ? ORDER BY timestamp DESC LIMIT 8;
        """, (f"%{case_id}%",))
        for r in cursor.fetchall():
            ctx["lookups"].append({"tool": r[0], "input": r[1], "result": r[2][:400], "timestamp": r[3]})

    finally:
        conn.close()

    return ctx


def fetch_general_context(prompt: str) -> dict:
    """Fetch general context when no case_id is provided."""
    conn = get_db_connection()
    cursor = conn.cursor()
    ctx = {"cases": [], "lookups": []}

    try:
        # Active cases
        cursor.execute("SELECT id, case_number, title, status, severity FROM cases WHERE status != 'closed' ORDER BY created_at DESC LIMIT 5;")
        for r in cursor.fetchall():
            ctx["cases"].append({"id": r[0], "case_number": r[1], "title": r[2], "status": r[3], "severity": r[4]})

        # Lookup recent entries matching prompt tokens
        for token in re.findall(r'\b[\w.-]{4,}\b', prompt):
            cursor.execute("SELECT tool, input, result, timestamp FROM lookups WHERE input LIKE ? ORDER BY timestamp DESC LIMIT 3;", (f"%{token}%",))
            for r in cursor.fetchall():
                entry = {"tool": r[0], "input": r[1], "result": r[2][:300], "timestamp": r[3]}
                if entry not in ctx["lookups"]:
                    ctx["lookups"].append(entry)

    finally:
        conn.close()

    return ctx


# ─── Confidence Scoring ───────────────────────────────────────────────────────

def calculate_confidence(iocs: list, context: dict) -> int:
    """
    Deterministic confidence score:
    Base = 40 if IOCs found in DB
    +20 for each signed evidence file
    +20 if prior lookups exist for the target
    +10 if timeline has 3+ events
    Capped at 95.
    """
    score = 0

    indicators = context.get("indicators", [])
    if indicators:
        score += 40
    elif context.get("lookups"):
        score += 25

    evidence = context.get("evidence", [])
    score += min(len(evidence) * 10, 20)

    lookups = context.get("lookups", [])
    if lookups:
        score += 20

    timeline = context.get("timeline", [])
    if len(timeline) >= 3:
        score += 10

    return min(score, 95)


# ─── Scan Plan Builder ────────────────────────────────────────────────────────

def build_investigation_plan(iocs: list) -> dict:
    """Build structured investigation plan from extracted IOCs."""
    scanners = []
    targets_by_type = {}

    for ioc in iocs:
        t = ioc["type"]
        v = ioc["value"]
        targets_by_type.setdefault(t, []).append(v)

    for t, vals in targets_by_type.items():
        for v in vals:
            if t == "ip":
                scanners.extend([
                    {"scanner": "IP Reputation", "target": v, "reason": "Check abuse reports and geolocation"},
                    {"scanner": "WHOIS", "target": v, "reason": "Identify registrant and network block"},
                    {"scanner": "DNS", "target": v, "reason": "Reverse DNS and PTR record analysis"},
                ])
            elif t == "domain":
                scanners.extend([
                    {"scanner": "DNS", "target": v, "reason": "Resolve A/MX/NS/TXT records"},
                    {"scanner": "WHOIS", "target": v, "reason": "Registration date and registrant info"},
                    {"scanner": "HTTP Headers", "target": f"https://{v}", "reason": "Security header audit"},
                ])
            elif t == "url":
                scanners.extend([
                    {"scanner": "HTTP Headers", "target": v, "reason": "Server security headers and redirect chains"},
                    {"scanner": "Screenshot", "target": v, "reason": "Visual site capture for phishing detection"},
                    {"scanner": "WHOIS", "target": v.split("/")[2] if "/" in v else v, "reason": "Domain registrant lookup"},
                ])
            elif t == "email":
                scanners.append({"scanner": "Email Headers", "target": v, "reason": "Analyze sender routing hops"})
            elif t in ("hash", "sha256", "md5"):
                scanners.append({"scanner": "Threat Intelligence", "target": v, "reason": "Check CVE/malware hash databases"})
            elif t == "cve":
                scanners.append({"scanner": "Threat Intelligence", "target": v, "reason": "CVE details and CVSS score"})

    # Deduplicate
    seen = set()
    unique = []
    for s in scanners:
        key = f"{s['scanner']}:{s['target']}"
        if key not in seen:
            seen.add(key)
            unique.append(s)

    est_seconds = max(len(unique) * 3, 5)

    return {
        "scanners": unique,
        "total_scanners": len(unique),
        "estimated_seconds": est_seconds,
        "iocs": iocs
    }


# ─── Structured Response Builders ─────────────────────────────────────────────

def format_investigate_response(iocs: list, plan: dict, context: dict, confidence: int) -> str:
    """Build structured investigation readiness report."""
    lines = []
    lines.append("## 🤖 Investigation Copilot — Threat Assessment")
    lines.append("")

    # Executive Summary
    ioc_types = {}
    for ioc in iocs:
        ioc_types[ioc["type"]] = ioc_types.get(ioc["type"], 0) + 1

    summary_parts = [f"{count} {itype.upper()}" + ("s" if count > 1 else "") for itype, count in ioc_types.items()]
    lines.append("### 📋 Executive Summary")
    lines.append(f"Detected **{len(iocs)} indicator(s)** in your request: {', '.join(summary_parts)}.")
    if context.get("case"):
        case = context["case"]
        lines.append(f"Active case context: **{case['case_number']}** — {case['title']} (Severity: `{case['severity'].upper()}`, Status: `{case['status']}`)")
    lines.append("")

    # IOCs identified
    lines.append("### 🔍 Indicators of Compromise Identified")
    for ioc in iocs:
        badge = {"ip": "🌐", "domain": "🔗", "url": "🌍", "email": "📧", "hash": "🔑", "cve": "⚠️"}.get(ioc["type"], "📌")
        lines.append(f"- {badge} `{ioc['value']}` — Type: **{ioc['type'].upper()}**, Confidence: `{ioc['confidence']}%`")
    lines.append("")

    # Investigation plan
    lines.append("### 🛰️ Recommended Investigation Plan")
    lines.append(f"I will execute **{plan['total_scanners']} tool scan(s)** with an estimated completion time of **~{plan['estimated_seconds']} seconds**:")
    lines.append("")
    for s in plan["scanners"][:10]:  # Cap display at 10
        lines.append(f"- **{s['scanner']}** → `{s['target']}` — *{s['reason']}*")
    if len(plan["scanners"]) > 10:
        lines.append(f"- *(+{len(plan['scanners']) - 10} additional scans)*")
    lines.append("")

    # Historical context
    if context.get("lookups"):
        lines.append("### 📚 Prior Investigation Records")
        for lk in context["lookups"][:3]:
            lines.append(f"- `{lk['tool'].upper()}` on `{lk['input']}` at `{lk['timestamp']}`")
        lines.append("")

    # Reasoning
    lines.append("### 🧠 Reasoning")
    reasons = []
    for ioc in iocs[:3]:
        if ioc["type"] == "ip":
            reasons.append(f"`{ioc['value']}` is a public IP address requiring reputation, ASN, and geolocation verification")
        elif ioc["type"] == "domain":
            reasons.append(f"`{ioc['value']}` is a domain requiring DNS resolution and WHOIS registration history")
        elif ioc["type"] == "url":
            reasons.append(f"`{ioc['value']}` is a URL requiring header analysis and screenshot capture for phishing detection")
        elif ioc["type"] == "hash":
            reasons.append(f"`{ioc['value']}` is a file hash requiring malware database correlation")
        elif ioc["type"] == "cve":
            reasons.append(f"`{ioc['value']}` is a CVE reference requiring CVSS score and patch status")
    for r in reasons:
        lines.append(f"- {r}")
    lines.append("")

    # Confidence
    lines.append(f"### 📊 Confidence Score: `{confidence}%`")
    if confidence >= 80:
        lines.append("High confidence — significant prior investigation data found in the local database.")
    elif confidence >= 50:
        lines.append("Medium confidence — some context available; investigation will expand this.")
    else:
        lines.append("Low confidence — no prior data found. Investigation required to establish baseline.")
    lines.append("")

    # Next actions
    lines.append("### ✅ Recommended Next Actions")
    lines.append("1. Click **Approve & Investigate** to dispatch parallel scans automatically.")
    lines.append("2. Review the IOC Knowledge Graph once scans complete.")
    lines.append("3. Check the AI Timeline for a narrative summary of findings.")
    lines.append("4. Compile a forensics report for documentation.")

    return "\n".join(lines)


def format_summary_response(context: dict, confidence: int) -> str:
    """Build structured post-investigation findings summary."""
    lines = []
    lines.append("## 🤖 Investigation Copilot — Findings Summary")
    lines.append("")

    case = context.get("case")
    if not case:
        return "## 🤖 Investigation Copilot — Findings Summary\n\n### ⚠️ No Active Case Selected\nNo case context is available. To see a structured summary:\n1. Select a case from the Cases workspace.\n2. Ask me to `summarize case CYG-2026-XXXX` using your case number.\n3. Upload evidence to a case and extract IOCs first.\n\n### ✅ Suggested Next Actions\n- Navigate to the Cases page and select an investigation.\n- Type your case number (e.g. `CYG-2026-0001`) in the chat.\n- Use the Orchestrate Scan button to start gathering data."

    lines.append("### 📋 Executive Summary")
    lines.append(f"Case **{case['case_number']}** ({case['title']}) has been analyzed.")
    lines.append(f"Current status: `{case['status'].upper()}` | Severity: `{case['severity'].upper()}`")
    lines.append("")

    # What was discovered
    indicators = context.get("indicators", [])
    evidence = context.get("evidence", [])
    lookups = context.get("lookups", [])
    timeline = context.get("timeline", [])

    lines.append("### 🔍 What Was Discovered")
    if indicators:
        for ioc in indicators[:8]:
            badge = {"ip": "🌐", "domain": "🔗", "url": "🌍", "email": "📧", "hash": "🔑"}.get(ioc["type"], "📌")
            lines.append(f"- {badge} **{ioc['type'].upper()}**: `{ioc['value']}` (Confidence: `{ioc['confidence']}%`)")
    else:
        lines.append("- No indicators extracted yet. Upload evidence or use Extract IOCs on this case.")
    lines.append("")

    # Evidence supporting conclusions
    lines.append("### 🗂️ Evidence Supporting Conclusions")
    if evidence:
        for ev in evidence[:5]:
            lines.append(f"- 📎 `{ev['filename']}` ({ev['type']}) — SHA-256: `{ev['hash'][:16]}...`")
    else:
        lines.append("- No evidence files uploaded to this case yet.")
    lines.append("")

    # Why it matters
    lines.append("### ⚠️ Risk Assessment")
    sev = case["severity"]
    if sev == "critical":
        lines.append("**CRITICAL RISK** — Immediate containment required. Escalate to incident commander.")
    elif sev == "high":
        lines.append("**HIGH RISK** — Active threat indicators present. Prioritize for immediate investigation.")
    elif sev == "medium":
        lines.append("**MEDIUM RISK** — Suspicious indicators found. Schedule investigation within 24 hours.")
    else:
        lines.append("**LOW RISK** — No critical indicators detected. Monitor and log for future reference.")
    lines.append("")

    # Confidence
    lines.append(f"### 📊 Investigation Confidence Score: `{confidence}%`")
    lines.append("")

    # Recent timeline events
    if timeline:
        lines.append("### 📅 Recent Investigation Activity")
        for ev in timeline[:5]:
            lines.append(f"- `[{ev['timestamp'][:19]}]` *{ev['event_type']}* — {ev['description'][:100]}")
        lines.append("")

    # Suggested analyst actions
    lines.append("### ✅ Suggested Analyst Actions")
    if indicators:
        lines.append("1. Review the IOC Knowledge Graph for relationship patterns.")
        lines.append("2. Run WHOIS/DNS/IP Reputation scans on flagged indicators.")
        lines.append("3. Use the Orchestrator to dispatch parallel investigation automatically.")
    if evidence:
        lines.append("4. Verify SHA-256 hashes of uploaded evidence against known malware databases.")
    lines.append("5. Compile a forensics report using the Reports module when investigation is complete.")
    lines.append("6. Update the case status and document containment actions in the Timeline.")

    return "\n".join(lines)


def format_explain_response(prompt: str, context: dict) -> str:
    """Build structured explanation response from RAG context."""
    lines = []
    lines.append("## 🤖 Investigation Copilot — Contextual Explanation")
    lines.append("")

    case = context.get("case")
    cases_list = context.get("cases", [])

    lines.append("### 📋 Executive Summary")
    if case:
        lines.append(f"Explaining case **{case['case_number']}**: {case['title']}")
        lines.append(f"Status: `{case['status']}` | Severity: `{case['severity']}`")
        if case.get("description"):
            lines.append(f"\n**Case Description:** {case['description']}")
    elif cases_list:
        lines.append(f"Found **{len(cases_list)} active case(s)** in the workspace:")
        for c in cases_list:
            lines.append(f"- **{c['case_number']}** — {c['title']} (`{c['status']}`, `{c['severity']}`)")
    else:
        lines.append("No matching case data found in the local database.")
    lines.append("")

    indicators = context.get("indicators", [])
    if indicators:
        lines.append("### 🔍 Indicators of Compromise")
        for ioc in indicators[:6]:
            lines.append(f"- **{ioc['type'].upper()}**: `{ioc['value']}` (Confidence: `{ioc['confidence']}%`)")
        lines.append("")

    lookups = context.get("lookups", [])
    if lookups:
        lines.append("### 🛰️ Prior Scan Records")
        for lk in lookups[:4]:
            lines.append(f"- `{lk['tool'].upper()}` on `{lk['input']}` — `{lk['timestamp'][:19]}`")
        lines.append("")

    lines.append("### 🧠 Reasoning")
    lines.append("All findings above are sourced from verified SQLite database records. No information has been inferred or fabricated.")
    lines.append("")

    lines.append("### ✅ Recommended Next Actions")
    lines.append("1. Ask me to summarize investigation findings for this case.")
    lines.append("2. Paste any suspicious IPs, domains, or hashes to start an investigation.")
    lines.append("3. Type `What should I do next?` for tailored recommendations.")

    return "\n".join(lines)


def format_recommend_response(context: dict) -> str:
    """Build structured next-step recommendations."""
    lines = []
    lines.append("## 🤖 Investigation Copilot — Next Steps Guidance")
    lines.append("")

    case = context.get("case")
    indicators = context.get("indicators", [])
    evidence = context.get("evidence", [])
    timeline = context.get("timeline", [])
    lookups = context.get("lookups", [])

    lines.append("### 📋 Situation Assessment")
    if case:
        lines.append(f"Active case: **{case['case_number']}** — Severity: `{case['severity'].upper()}`")
        lines.append(f"- Indicators extracted: **{len(indicators)}**")
        lines.append(f"- Evidence files: **{len(evidence)}**")
        lines.append(f"- Timeline events: **{len(timeline)}**")
        lines.append(f"- Prior scans: **{len(lookups)}**")
    else:
        lines.append("No active case selected. These are general investigation recommendations.")
    lines.append("")

    lines.append("### 🛰️ Investigation Plan")
    recs = []
    if indicators and not lookups:
        recs.append(("HIGH", "Dispatch the Autonomous Orchestrator to scan all extracted IOCs in parallel", "Use the Orchestrate Scan button on the Cases page or ask me to investigate a specific target"))
    if not indicators and evidence:
        recs.append(("HIGH", "Extract IOCs from uploaded evidence", "Use the Extract IOCs button or paste evidence text into this chat"))
    if not evidence:
        recs.append(("MEDIUM", "Upload evidence files to the Case Vault", "Navigate to the Cases page, select this case, and upload suspicious files"))
    if lookups and not case:
        recs.append(("MEDIUM", "Associate your scan results with a case", "Create a case and link lookups to maintain investigation continuity"))
    if case and case.get("status") == "investigating" and len(timeline) > 5:
        recs.append(("MEDIUM", "Compile a forensics report", "Use the Reports module to document your investigation findings"))
    if not recs:
        recs.append(("LOW", "Continue monitoring this case", "Review the Knowledge Graph and Timeline for new correlations"))

    for priority, action, how in recs:
        badge = "🔴" if priority == "HIGH" else "🟡" if priority == "MEDIUM" else "🟢"
        lines.append(f"#### {badge} {priority} Priority: {action}")
        lines.append(f"*How:* {how}")
        lines.append("")

    lines.append("### 🧠 Reasoning")
    lines.append("Recommendations are based on the current investigation state in the local database. No information has been fabricated.")
    lines.append("")

    lines.append("### ✅ Quick Actions")
    lines.append("- Paste any suspicious text below to extract indicators automatically.")
    lines.append("- Type `investigate 8.8.8.8` to start a targeted scan.")
    lines.append("- Type `summarize this case` for a full findings report.")

    return "\n".join(lines)


def format_answer_response(prompt: str, context: dict) -> str:
    """Build structured general answer from RAG context."""
    lines = []
    lines.append("## 🤖 Investigation Copilot — Database Analysis")
    lines.append("")

    cases = context.get("cases", []) or ([context["case"]] if context.get("case") else [])
    lookups = context.get("lookups", [])
    indicators = context.get("indicators", [])

    lines.append("### 📋 Executive Summary")
    if cases:
        lines.append(f"Found **{len(cases)} correlated record(s)** in the Cygnal database:")
        for c in cases[:5]:
            lines.append(f"- **{c.get('case_number', 'N/A')}** — {c.get('title', 'Unknown')} (`{c.get('status', '?')}`)")
    else:
        lines.append("No matching case records found. The database may not contain data matching your query.")
    lines.append("")

    if indicators:
        lines.append("### 🔍 Indicators of Compromise")
        for ioc in indicators[:5]:
            lines.append(f"- **{ioc['type'].upper()}**: `{ioc['value']}`")
        lines.append("")

    if lookups:
        lines.append("### 🛰️ Related Scan History")
        for lk in lookups[:4]:
            lines.append(f"- `{lk['tool'].upper()}` — `{lk['input']}` at `{lk['timestamp'][:19]}`")
        lines.append("")

    lines.append("### 🧠 Reasoning")
    lines.append("All responses are derived from verified SQLite database records. No information is inferred beyond what is stored.")
    lines.append("")

    lines.append("### ✅ Suggested Actions")
    lines.append("- For targeted analysis, mention a specific case number (e.g. `CYG-2026-0001`) or paste an IP/domain/hash.")
    lines.append("- To run scans, say `investigate [target]` or use the Orchestrate Scan button in Cases.")
    lines.append("- To see case findings, say `summarize this case` or `what are the findings for CYG-2026-0001`.")

    return "\n".join(lines)


# ─── Main Copilot Entry Point ──────────────────────────────────────────────────

def process_copilot_message(prompt: str, case_id: str = None, user: str = "unknown") -> dict:
    """
    Main Copilot processing pipeline.
    Returns structured response + optional proposed_action for approval.
    """
    intent = classify_intent(prompt)
    iocs = extract_iocs_from_prompt(prompt)
    proposed_action = None
    requires_approval = False

    # Build context
    if case_id:
        context = fetch_case_context(case_id)
    else:
        context = fetch_general_context(prompt)

    confidence = calculate_confidence(iocs, context)

    if intent == INTENT_INVESTIGATE and iocs:
        plan = build_investigation_plan(iocs)
        response = format_investigate_response(iocs, plan, context, confidence)
        requires_approval = True
        proposed_action = {
            "type": "LAUNCH_INVESTIGATION",
            "iocs": iocs,
            "plan": plan,
            "case_id": case_id
        }

    elif intent == INTENT_SUMMARIZE:
        response = format_summary_response(context, confidence)

    elif intent == INTENT_EXPLAIN:
        response = format_explain_response(prompt, context)

    elif intent == INTENT_RECOMMEND:
        response = format_recommend_response(context)

    else:
        # INVESTIGATE intent but no IOCs found — fallback to general answer
        if intent == INTENT_INVESTIGATE:
            response = format_answer_response(prompt, context)
            response = "**Note:** I detected an investigation request but could not extract specific IOC targets from your input. Please paste IP addresses, domain names, URLs, or hashes directly.\n\n" + response
        else:
            response = format_answer_response(prompt, context)

    return {
        "response": response,
        "intent": intent,
        "iocs_detected": iocs,
        "confidence": confidence,
        "requires_approval": requires_approval,
        "proposed_action": proposed_action
    }
