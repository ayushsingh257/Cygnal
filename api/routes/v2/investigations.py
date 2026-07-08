from flask import Blueprint, request, jsonify, current_app
import uuid
from datetime import datetime
import json
from db_utils import get_db_connection, DB_PATH
from jwt_utils import decode_token
from services.orchestrator import (
    detect_input_type,
    build_execution_plan,
    run_investigation_worker,
    auto_create_case
)
from task_utils import dispatch_investigation

investigations_bp = Blueprint("investigations_bp", __name__)

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

@investigations_bp.route("/investigations/start", methods=["POST"])
def start_investigation():
    user = get_current_user()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
    
    # 1. Parse inputs (JSON or Multipart Form)
    target = ""
    input_type = ""
    case_id = ""
    file_bytes = None
    filename = None
    
    if request.content_type and "multipart/form-data" in request.content_type:
        case_id = request.form.get("case_id", "").strip()
        input_type = request.form.get("input_type", "").strip()
        target = request.form.get("target", "").strip()
        
        if "file" in request.files:
            file = request.files["file"]
            if file.filename:
                filename = file.filename
                file_bytes = file.read()
                if not target:
                    target = filename
                if not input_type:
                    ext = filename.split(".")[-1].lower() if "." in filename else ""
                    input_type = "email" if ext == "eml" else "file"
    else:
        data = request.get_json(silent=True) or {}
        target = data.get("target", "").strip()
        input_type = data.get("input_type", "").strip()
        case_id = data.get("case_id", "").strip()
        
    if not target:
        return jsonify({"success": False, "error": "Investigation target or file payload is required."}), 400
        
    # 2. Auto-detect input type if not provided
    if not input_type:
        input_type = detect_input_type(target)
        
    # 3. Create case if not provided
    if not case_id:
        case_id = auto_create_case(target, input_type, user)
        if not case_id:
            return jsonify({"success": False, "error": "Failed to create investigation case."}), 500
            
    # 4. Generate plan and register job
    scanners = build_execution_plan(input_type, target)
    job_id = str(uuid.uuid4())
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO investigation_jobs (id, case_id, target, input_type, status, progress, current_scanner, total_scanners, completed_scanners, scanner_statuses, created_at, updated_at, user)
            VALUES (?, ?, ?, ?, 'queued', 0, 'None', ?, '[]', '{}', ?, ?, ?);
        """, (
            job_id,
            case_id,
            target,
            input_type,
            len(scanners) if input_type != "text" else 1, # text uses dynamic count initialized to 1 (extractor)
            now_iso(),
            now_iso(),
            user
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": f"Failed to initialize job: {str(e)}"}), 500
    conn.close()
    
    # 5. Dispatch task dynamically
    app = current_app._get_current_object()
    dispatch_investigation(app, job_id, case_id, target, input_type, token, user, file_bytes, filename)
    
    return jsonify({
        "success": True,
        "job_id": job_id,
        "case_id": case_id,
        "target": target,
        "input_type": input_type,
        "status": "queued"
    })

@investigations_bp.route("/investigations/<job_id>", methods=["GET"])
def get_job_status(job_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, case_id, target, input_type, status, progress, current_scanner, total_scanners, completed_scanners, scanner_statuses, created_at, updated_at, user 
        FROM investigation_jobs WHERE id = ?;
    """, (job_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"success": False, "error": "Job not found."}), 404
        
    return jsonify({
        "success": True,
        "job": {
            "id": row[0],
            "case_id": row[1],
            "target": row[2],
            "input_type": row[3],
            "status": row[4],
            "progress": row[5],
            "current_scanner": row[6],
            "total_scanners": row[7],
            "completed_scanners": json.loads(row[8]),
            "scanner_statuses": json.loads(row[9]),
            "created_at": row[10],
            "updated_at": row[11],
            "user": row[12]
        }
    })

@investigations_bp.route("/investigations/<job_id>/results", methods=["GET"])
def get_job_results(job_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT case_id, target, scanner_statuses FROM investigation_jobs WHERE id = ?;", (job_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"success": False, "error": "Job not found."}), 404
        
    case_id, target, scanner_statuses = row
    return jsonify({
        "success": True,
        "job_id": job_id,
        "case_id": case_id,
        "target": target,
        "results": json.loads(scanner_statuses)
    })
