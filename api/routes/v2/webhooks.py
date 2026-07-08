import os
import hashlib
import json
import uuid
import logging
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify, current_app

from db_utils import get_db_connection
from jwt_utils import create_token, decode_token
from services.parser_registry import siem_parsers
from services.extraction_pipeline import ioc_pipeline
from socket_app import socketio

webhooks_bp = Blueprint("webhooks_bp", __name__)

CYGNAL_WEBHOOK_SECRET = os.getenv("CYGNAL_WEBHOOK_SECRET", "cygnal-default-webhook-secret-2026")

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def require_webhook_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        provided_key = request.headers.get("X-Cygnal-Webhook-Key")
        if not provided_key or provided_key != CYGNAL_WEBHOOK_SECRET:
            return jsonify({"success": False, "error": "Invalid or missing Webhook API Key."}), 401
        return f(*args, **kwargs)
    return decorated

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if user == "unknown":
            return jsonify({"success": False, "error": "Authentication signature required."}), 401
        return f(*args, **kwargs)
    return decorated


# ─── POST /api/webhooks/siem ──────────────────────────────────────────────────

@webhooks_bp.route("/webhooks/siem", methods=["POST"])
@require_webhook_key
def ingest_siem_alert():
    """
    Ingests inbound SIEM webhooks, parses them dynamically using the Pluggable Registry,
    stores them securely with integrity payload hashes, extracts IOCs via pipeline,
    and dispatches background autonomic loop execution.
    """
    raw_data = request.get_data()
    payload_hash = hashlib.sha256(raw_data).hexdigest()
    
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"success": False, "error": "Invalid JSON alert payload."}), 400
        
    source = request.headers.get("X-Cygnal-Alert-Source") or request.args.get("source")
    if not source:
        source = siem_parsers.auto_detect(payload)
        
    parser = siem_parsers.get_parser(source)
    try:
        parsed = parser.parse(payload)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed parsing SIEM alert payload: {str(e)}"}), 422
        
    # Combine content fields to scan for IOCs
    text_to_scan = f"{parsed['title']} {parsed['description']} {json.dumps(payload)}"
    extracted_iocs = ioc_pipeline.extract(text_to_scan)
    
    alert_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat() + "Z"
    
    # Store alert in database
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO inbound_alerts 
            (id, external_id, title, source, severity, description, raw_payload, payload_hash, parsed_iocs, status, case_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unhandled', NULL, ?);
        """, (
            alert_id,
            parsed["external_id"],
            parsed["title"],
            source,
            parsed["severity"],
            parsed["description"],
            json.dumps(payload),
            payload_hash,
            json.dumps(extracted_iocs),
            now_str
        ))
        
        # Log initial stage ingestion
        log_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO agent_logs (id, alert_id, stage, level, message, reasoning, details, timestamp)
            VALUES (?, ?, 'ingestion', 'info', ?, ?, ?, ?);
        """, (
            log_id,
            alert_id,
            f"Alert ingested from SIEM source: {source}",
            f"Auto-classified alert severity as {parsed['severity'].upper()} based on provider mapping.",
            json.dumps({"payload_hash": payload_hash, "extracted_iocs_count": len(extracted_iocs)}),
            now_str
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": f"Database transaction failed: {str(e)}"}), 500
    conn.close()
    
    # Broadcast new alert over WebSockets
    socketio.emit("new_alert", {
        "id": alert_id,
        "external_id": parsed["external_id"],
        "title": parsed["title"],
        "source": source,
        "severity": parsed["severity"],
        "description": parsed["description"],
        "status": "unhandled",
        "created_at": now_str
    })
    
    # Trigger Autonomic background task
    from task_utils import USE_CELERY
    if USE_CELERY:
        try:
            from celery_app import celery
            celery.send_task("cygnal.process_inbound_alert", args=[alert_id])
            logging.info(f"[WEBHOOKS] Dispatched alert {alert_id} successfully via Celery.")
        except Exception as e:
            logging.error(f"[WEBHOOKS] Failed to queue via Celery: {str(e)}. Executing in thread.")
            # Fallback to local thread
            trigger_autonomic_loop_thread(alert_id)
    else:
        trigger_autonomic_loop_thread(alert_id)
        
    return jsonify({
        "success": True,
        "alert_id": alert_id,
        "payload_hash": payload_hash,
        "message": "SIEM alert received and autonomic loop dispatched."
    }), 202


# ─── GET /api/webhooks/alerts ─────────────────────────────────────────────────

@webhooks_bp.route("/webhooks/alerts", methods=["GET"])
@require_auth
def get_inbound_alerts():
    """Returns paginated SIEM inbound alerts."""
    limit = request.args.get("limit", 20, type=int)
    offset = request.args.get("offset", 0, type=int)
    status = request.args.get("status")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "SELECT id, external_id, title, source, severity, description, status, case_id, created_at FROM inbound_alerts"
        params = []
        if status:
            query += " WHERE status = ?"
            params.append(status)
            
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        alerts = []
        for r in rows:
            alerts.append({
                "id": r[0], "external_id": r[1], "title": r[2],
                "source": r[3], "severity": r[4], "description": r[5],
                "status": r[6], "case_id": r[7], "created_at": r[8]
            })
            
        conn.close()
        return jsonify({"success": True, "alerts": alerts})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500


# ─── GET /api/webhooks/alerts/<alert_id> ──────────────────────────────────────

@webhooks_bp.route("/webhooks/alerts/<alert_id>", methods=["GET"])
@require_auth
def get_inbound_alert_details(alert_id):
    """Retrieve detailed metadata and raw payload of a specific SIEM alert."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, external_id, title, source, severity, description, raw_payload, payload_hash, parsed_iocs, status, case_id, created_at, processed_at
            FROM inbound_alerts WHERE id = ?;
        """, (alert_id,))
        r = cursor.fetchone()
        conn.close()
        
        if not r:
            return jsonify({"success": False, "error": "Alert not found."}), 404
            
        return jsonify({
            "success": True,
            "alert": {
                "id": r[0], "external_id": r[1], "title": r[2],
                "source": r[3], "severity": r[4], "description": r[5],
                "raw_payload": json.loads(r[6]), "payload_hash": r[7],
                "parsed_iocs": json.loads(r[8]), "status": r[9],
                "case_id": r[10], "created_at": r[11], "processed_at": r[12]
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500


# ─── GET /api/webhooks/alerts/<alert_id>/logs ─────────────────────────────────

@webhooks_bp.route("/webhooks/alerts/<alert_id>/logs", methods=["GET"])
@require_auth
def get_agent_execution_logs(alert_id):
    """Retrieve chronological autonomic execution stage logs for a specific alert."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if alert exists
        cursor.execute("SELECT id FROM inbound_alerts WHERE id = ?;", (alert_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Alert not found."}), 404
            
        cursor.execute("""
            SELECT id, stage, level, message, reasoning, details, timestamp
            FROM agent_logs WHERE alert_id = ? ORDER BY timestamp ASC;
        """, (alert_id,))
        rows = cursor.fetchall()
        conn.close()
        
        logs = []
        for r in rows:
            logs.append({
                "id": r[0], "stage": r[1], "level": r[2],
                "message": r[3], "reasoning": r[4],
                "details": json.loads(r[5]) if r[5] else None,
                "timestamp": r[6]
            })
            
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500


# ─── POST /api/webhooks/alerts/<alert_id>/take-over ───────────────────────────

@webhooks_bp.route("/webhooks/alerts/<alert_id>/take-over", methods=["POST"])
@require_auth
def analyst_take_over(alert_id):
    """Analyst interrupts autonomic AI scanning loop, stopping background processor."""
    user = get_current_user()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if alert exists
        cursor.execute("SELECT status, case_id FROM inbound_alerts WHERE id = ?;", (alert_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Alert not found."}), 404
            
        status, case_id = row
        if status in ("completed", "failed"):
            conn.close()
            return jsonify({"success": False, "error": f"Cannot take over alert with final status '{status}'."}), 400
            
        # Update alert status to failed (which signals takeover to thread)
        cursor.execute("UPDATE inbound_alerts SET status = 'failed' WHERE id = ?;", (alert_id,))
        conn.commit()
        conn.close()
        
        # Log takeover stage
        from services.agent import add_agent_log
        add_agent_log(
            alert_id, "completion", "warning",
            f"Incident analyst '{user}' initiated Take Over.",
            "Manual takeover requested. Auto-scanning loop halted. Control transferred to human responder."
        )
        
        socketio.emit("alert_updated", {"id": alert_id, "status": "failed"})
        
        return jsonify({
            "success": True, 
            "message": "Autonomic loop aborted. Workspace control transferred to analyst."
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500


# Helper to run autonomic processor in a local background thread
def trigger_autonomic_loop_thread(alert_id):
    from threading import Thread
    from services.agent import run_autonomic_loop_worker
    
    app_obj = current_app._get_current_object()
    t = Thread(
        target=run_autonomic_loop_worker,
        args=(app_obj, alert_id)
    )
    t.start()
