"""
Cygnal AI Investigation Copilot — API Routes (Sprint 4B)
Provides two endpoints:
  POST /api/copilot/message  — Chat + structured investigation response
  POST /api/copilot/approve  — Approval gate that triggers the Orchestrator
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from jwt_utils import decode_token
from services.copilot import process_copilot_message

copilot_bp = Blueprint("copilot_bp", __name__)

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def get_token():
    return request.headers.get("Authorization", "").replace("Bearer ", "")


# ─── POST /api/copilot/message ────────────────────────────────────────────────

@copilot_bp.route("/copilot/message", methods=["POST"])
def copilot_message():
    """
    Main Copilot conversation endpoint.
    Accepts: { prompt, case_id (optional) }
    Returns: { response (markdown), intent, iocs_detected, confidence,
               requires_approval, proposed_action }
    """
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "").strip()
    case_id = data.get("case_id", None)

    if not prompt:
        return jsonify({"success": False, "error": "Prompt is required."}), 400

    result = process_copilot_message(prompt, case_id=case_id, user=user)

    return jsonify({
        "success": True,
        "response": result["response"],
        "intent": result["intent"],
        "iocs_detected": result["iocs_detected"],
        "confidence": result["confidence"],
        "requires_approval": result["requires_approval"],
        "proposed_action": result["proposed_action"],
        "timestamp": now_iso()
    })


# ─── POST /api/copilot/approve ────────────────────────────────────────────────

@copilot_bp.route("/copilot/approve", methods=["POST"])
def copilot_approve():
    """
    Approval confirmation endpoint — the human in the loop gate.
    Accepts: { proposed_action: { type, iocs, plan, case_id } }
    Calls the existing Investigation Orchestrator service functions directly.
    Returns: { job_id, case_id, message }
    """
    import sqlite3
    import uuid
    import json
    from threading import Thread
    from services.orchestrator import (
        detect_input_type, build_execution_plan,
        run_investigation_worker, auto_create_case
    )
    from database import DB_PATH

    user = get_current_user()
    token = get_token()
    data = request.get_json(silent=True) or {}
    action = data.get("proposed_action", {})

    if not action or action.get("type") != "LAUNCH_INVESTIGATION":
        return jsonify({"success": False, "error": "Valid proposed_action with type LAUNCH_INVESTIGATION is required."}), 400

    iocs = action.get("iocs", [])
    case_id = action.get("case_id") or ""

    if not iocs:
        return jsonify({"success": False, "error": "No IOCs provided in the proposed_action."}), 400

    # Use the primary IOC as the orchestrator target
    primary_ioc = iocs[0]
    target = primary_ioc["value"]
    input_type = primary_ioc.get("type") or detect_input_type(target)

    # Auto-create case if not provided
    if not case_id:
        case_id = auto_create_case(target, input_type, user)
        if not case_id:
            return jsonify({"success": False, "error": "Failed to create investigation case."}), 500

    # Build execution plan and register job in DB
    scanners = build_execution_plan(input_type, target)
    job_id = str(uuid.uuid4())

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO investigation_jobs
            (id, case_id, target, input_type, status, progress, current_scanner,
             total_scanners, completed_scanners, scanner_statuses, created_at, updated_at, user)
            VALUES (?, ?, ?, ?, 'queued', 0, 'None', ?, '[]', '{}', ?, ?, ?);
        """, (
            job_id, case_id, target, input_type,
            len(scanners) if input_type != "text" else 1,
            now_iso(), now_iso(), user
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": f"Failed to initialize job: {str(e)}"}), 500
    conn.close()

    # Spin up background thread worker (same pattern as investigations route)
    app_obj = current_app._get_current_object()
    t = Thread(
        target=run_investigation_worker,
        args=(app_obj, job_id, case_id, target, input_type, token, user, None, None)
    )
    t.start()

    return jsonify({
        "success": True,
        "job_id": job_id,
        "case_id": case_id,
        "target": target,
        "message": f"Investigation launched. Tracking job `{job_id}`. The Progress Dashboard will update in real-time.",
        "poll_url": f"/api/investigations/{job_id}",
        "timestamp": now_iso()
    })


# ─── GET /api/copilot/summary/<case_id> ───────────────────────────────────────

@copilot_bp.route("/copilot/summary/<case_id>", methods=["GET"])
def copilot_summary(case_id):
    """
    Post-investigation structured summary for a specific case.
    Called automatically after an orchestrated job completes.
    """
    from services.copilot import fetch_case_context, calculate_confidence, format_summary_response

    context = fetch_case_context(case_id)
    if not context.get("case"):
        return jsonify({"success": False, "error": "Case not found."}), 404

    confidence = calculate_confidence([], context)
    summary = format_summary_response(context, confidence)

    return jsonify({
        "success": True,
        "case_id": case_id,
        "summary": summary,
        "confidence": confidence,
        "timestamp": now_iso()
    })
