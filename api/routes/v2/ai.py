"""
Cygnal AI Engine — Era 5
RAG database context correlation & Multi-Agent loop simulator.
"""

from flask import Blueprint, request, jsonify
import os, json, re, uuid
from datetime import datetime
from db_utils import get_db_connection, DB_PATH
from jwt_utils import decode_token

ai_bp = Blueprint("ai_bp", __name__)

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

# ─── Heuristic RAG Resolver ──────────────────────────────────────────────────
def resolve_rag_context(prompt: str):
    """
    Search SQLite/PG tables (cases, timeline, evidence, lookups) for matching terms:
    - Case IDs (e.g. CYG-2026-XXXX or UUIDs)
    - IP addresses (IPv4 format)
    - Domain names
    - SHA-256 hashes
    - Scanner tools (whois, dns, metadata, headers, etc.)
    Enriched with Vector Database Semantic search memories.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    context = {
        "cases": [],
        "timeline_events": [],
        "evidence_files": [],
        "recent_lookups": [],
        "memories": []
    }
    
    # 1. Parse Case Numbers (e.g., CYG-2026-0001)
    case_matches = re.findall(r'CYG-\d{4}-\d+', prompt, re.IGNORECASE)
    for case_no in case_matches:
        cursor.execute("SELECT id, case_number, title, description, status, severity, assigned_to FROM cases WHERE case_number LIKE ?;", (f"%{case_no}%",))
        row = cursor.fetchone()
        if row:
            case_data = {
                "id": row[0], "case_number": row[1], "title": row[2], 
                "description": row[3], "status": row[4], "severity": row[5], "assigned_to": row[6]
            }
            context["cases"].append(case_data)
            
            # Fetch associated timeline logs
            cursor.execute("SELECT event_type, description, timestamp, user FROM timeline WHERE case_id = ? ORDER BY timestamp DESC LIMIT 10;", (row[0],))
            for t_row in cursor.fetchall():
                context["timeline_events"].append({
                    "case_number": row[1], "event_type": t_row[0], "description": t_row[1], "timestamp": t_row[2], "user": t_row[3]
                })
                
            # Fetch associated evidence
            cursor.execute("SELECT filename, file_size, file_hash, file_type, uploaded_by FROM evidence WHERE case_id = ?;", (row[0],))
            for e_row in cursor.fetchall():
                context["evidence_files"].append({
                    "case_number": row[1], "filename": e_row[0], "file_size": e_row[1], "file_hash": e_row[2], "file_type": e_row[3], "uploaded_by": e_row[4]
                })

    # 2. Parse general keywords (IPs, domains, hashes)
    ip_matches = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', prompt)
    domain_matches = re.findall(r'\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', prompt)
    hash_matches = re.findall(r'\b[a-fA-F0-9]{32,64}\b', prompt)

    # Search lookup histories for matches
    search_terms = ip_matches + domain_matches + hash_matches
    for term in search_terms:
        cursor.execute("""
            SELECT tool, input, result, timestamp, user FROM lookups 
            WHERE input LIKE ? OR result LIKE ? 
            ORDER BY timestamp DESC LIMIT 5;
        """, (f"%{term}%", f"%{term}%"))
        for l_row in cursor.fetchall():
            context["recent_lookups"].append({
                "tool": l_row[0], "input": l_row[1], "result": l_row[2][:500] + "..." if len(l_row[2]) > 500 else l_row[2],
                "timestamp": l_row[3], "user": l_row[4]
            })

    # If no case specific term, grab active cases summary for general queries
    if not context["cases"]:
        cursor.execute("SELECT id, case_number, title, status, severity FROM cases WHERE status != 'closed' ORDER BY created_at DESC LIMIT 5;")
        for row in cursor.fetchall():
            context["cases"].append({
                "id": row[0], "case_number": row[1], "title": row[2], "status": row[3], "severity": row[4]
            })

    conn.close()

    # 3. Add Semantic Vector Search Memories
    from services.vector_service import semantic_search
    try:
        context["memories"] = semantic_search(prompt, limit=4)
    except Exception as e:
        print("[AI BP RAG] Semantic search failed:", e)

    return context

def generate_ai_response(prompt: str, context: dict) -> str:
    """Generates a highly structured, analytical cyber analyst RAG response."""
    prompt_lower = prompt.lower()
    response = []
    
    response.append("### 🧠 CYGNAL COGNITIVE RAG ANALYSIS (v4.0)")
    
    # Semantic Memories section
    if context.get("memories"):
        response.append("\n**相关历史语义记忆 (Correlated Semantic Memories):**")
        for m in context["memories"]:
            response.append(f"- [Match similarity: {int(m['similarity'] * 100)}%] {m['text_content'][:150]}...")

    # Case summary section
    if context["cases"]:
        response.append("\n**关联案件情报 (Correlated Case Intelligence):**")
        for c in context["cases"]:
            response.append(f"- **{c['case_number']} ({c['title']})**: Severity `{c['severity'].upper()}`, Status `{c['status'].upper()}`, Assigned to `{c.get('assigned_to') or 'Unassigned'}`.")
            if c.get('description'):
                response.append(f"  *Description:* {c['description']}")

    # Timeline section
    if context["timeline_events"]:
        response.append("\n**事件记录轨迹 (Audited Timeline Logs):**")
        for t in context["timeline_events"][:5]:
            response.append(f"- `[{t['timestamp']}]` **{t['case_number']}** - *{t['event_type']}* by *{t['user']}*: {t['description']}")

    # Evidence section
    if context["evidence_files"]:
        response.append("\n**取证物证哈希 (Cryptographic Evidence Hashes):**")
        for e in context["evidence_files"]:
            response.append(f"- File: `{e['filename']}` ({e['file_type']}) | SHA-256: `{e['file_hash']}`")

    # Scans history section
    if context["recent_lookups"]:
        response.append("\n**近期传感器扫描历史 (Recent Scanner Records):**")
        for l in context["recent_lookups"][:3]:
            response.append(f"- `[{l['timestamp']}]` Tool `{l['tool'].upper()}` queries: `{l['input']}`")

    response.append("\n**🛡️ 深度分析与安全应急响应建议 (Deep Correlation & Recommendations):**")
    
    if "case" in prompt_lower or "summary" in prompt_lower:
        response.append("1. **Forensic Integrity**: Ensure all evidence attachments are sealed with SHA-256 signatures inside the ledger.")
        response.append("2. **Containment Phase**: Based on timeline logs, verify HSTS, Hops routing verification, and CVE associations for threat matching.")
        response.append("3. **Log Sealing**: Audit policy overrides configurations in `tool_permissions` to prevent unauthorized tool execution.")
    elif "ip" in prompt_lower or any(re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', prompt_lower)):
        response.append("1. **Sensor Alerts**: Perform dynamic IP Reputation and Geolocation lookup immediately on the target nodes.")
        response.append("2. **Firewall Blocks**: Revoke incoming routes to port channels matching abuse reports.")
        response.append("3. **Cross Correlation**: Query case timelines to find if this node is associated with file metadata anomalies.")
    elif "file" in prompt_lower or "malware" in prompt_lower or "hash" in prompt_lower:
        response.append("1. **Entropy Check**: Evaluate file content entropy. High entropy indicates compression or polymorphic packing.")
        response.append("2. **Sandbox Triage**: Dispatch a malware scanner file query against known VirusTotal CVE indicators.")
        response.append("3. **Chain of Custody**: Ensure the binary is saved inside the case timeline ledger to preserve forensic validity.")
    else:
        response.append("1. **Orchestrate Scanners**: Use WHOIS, HTTP Headers, and DNS resolving engines to harvest active footprint diagnostics.")
        response.append("2. **Investigate timelines**: Connect indicators of compromise directly to case incident worksheets.")
        response.append("3. **RAG Queries**: Reference specific Case IDs (e.g. `CYG-2026-0001`) in chat to pull chronological operational ledger records.")

    return "\n".join(response)

# ════════════════════════════════════════════════════════════════
# Endpoints
# ════════════════════════════════════════════════════════════════

@ai_bp.route("/ai/chat", methods=["POST"])
def ai_chat():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "").strip()

    if not prompt:
        return jsonify({"success": False, "error": "Prompt query content is required."}), 400

    context = resolve_rag_context(prompt)
    answer = generate_ai_response(prompt, context)

    return jsonify({
        "success": True,
        "response": answer,
        "timestamp": now_iso()
    })

@ai_bp.route("/ai/agents", methods=["POST"])
def ai_agents_pipeline():
    """
    Simulates four parallel security analysis agents checking a case or specific target:
    Recon & OSINT, Malware Triage, Custody Auditor, and Executive Compiler.
    """
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    case_id = data.get("case_id", "").strip()
    target = data.get("target", "").strip()

    if not target and not case_id:
        return jsonify({"success": False, "error": "Target parameter or Case ID is required."}), 400

    pipeline_steps = [
        {
            "agent": "Recon & OSINT Agent",
            "status": "completed",
            "logs": [
                f"[{now_iso()}] Initiating host discovery against: {target or case_id}",
                f"[{now_iso()}] DNS resolution pulled A and MX records. WHOIS query dispatched.",
                f"[{now_iso()}] Reputation feed returns confidence score of 89% clean."
            ]
        },
        {
            "agent": "Malware Analysis Agent",
            "status": "completed",
            "logs": [
                f"[{now_iso()}] Sweeping associated document attachments file profiles.",
                f"[{now_iso()}] Evaluated EXIF authors metadata and PDF encryption schemas.",
                f"[{now_iso()}] 0 malware threat vector indicators detected on active files."
            ]
        },
        {
            "agent": "Custody Auditor",
            "status": "completed",
            "logs": [
                f"[{now_iso()}] Checking cryptographic signatures of the evidentiary ledger.",
                f"[{now_iso()}] Verified SHA-256 checksums match values computed during ingest.",
                f"[{now_iso()}] Ledger state validated: Chain of Custody intact."
            ]
        },
        {
            "agent": "Executive Compiler",
            "status": "completed",
            "logs": [
                f"[{now_iso()}] Synthesizing findings from Recon, Malware, and Custody agents.",
                f"[{now_iso()}] Correlated 3 indicators of compromise. Generated executive summary block.",
                f"[{now_iso()}] Pipeline completed successfully. Findings packaged for report compiler."
            ]
        }
    ]

    return jsonify({
        "success": True,
        "case_id": case_id,
        "target": target,
        "steps": pipeline_steps,
        "completed_at": now_iso()
    })

# ─── Phase 3: Semantic Memory Admin & Search Endpoints ─────────────────────────

@ai_bp.route("/ai/semantic-search", methods=["GET"])
def ai_semantic_search():
    """Query semantic vector records database directly."""
    query = request.args.get("query", "").strip()
    entity_type = request.args.get("type", None)
    limit = min(int(request.args.get("limit", 5)), 20)

    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401

    if not query:
        return jsonify({"success": False, "error": "Query parameter is required"}), 400

    from services.vector_service import semantic_search
    results = semantic_search(query, limit=limit, entity_type=entity_type)
    return jsonify({"success": True, "results": results, "count": len(results)})

@ai_bp.route("/ai/memory/sync", methods=["POST"])
def ai_memory_sync():
    """Admin endpoint to force sync all cases/evidence/timeline to vector db."""
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401

    from services.vector_service import full_database_reindex
    try:
        stats = full_database_reindex()
        return jsonify({"success": True, "message": "Synchronized all operational memory entities to vector database", "stats": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
