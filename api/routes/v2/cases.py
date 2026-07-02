from flask import Blueprint, request, jsonify
import os
import hashlib
import uuid
import logging
import json
from datetime import datetime

# Helpers from parent
from jwt_utils import decode_token
from auth_utils import verify_token
from database import (
    insert_case,
    get_all_cases,
    get_case_by_id,
    get_case_evidence,
    get_case_timeline,
    insert_evidence,
    insert_timeline_event,
    update_case_status
)
from audit_logger import audit_log

cases_bp = Blueprint("cases_bp", __name__)

def get_current_user_and_role(req):
    """Helper to verify JWT token and extract user details."""
    auth_header = req.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        return None, None
    return payload.get("username", "unknown"), payload.get("role", "viewer")

@cases_bp.route("/cases", methods=["POST"])
def create_case():
    user, role = get_current_user_and_role(request)
    if not user or role not in ["admin", "analyst"]:
        return jsonify({"success": False, "error": "Unauthorized. Analysts and admins only."}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload"}), 400

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    severity = data.get("severity", "medium").strip()

    if not title:
        return jsonify({"success": False, "error": "Case title is required"}), 400

    if severity not in ["low", "medium", "high", "critical"]:
        severity = "medium"

    case_id = insert_case(title, description, severity, user)
    if not case_id:
        return jsonify({"success": False, "error": "Failed to create case in database"}), 500

    # Add initial timeline event
    insert_timeline_event(
        case_id=case_id,
        event_type="case_created",
        description=f"Case initialized by analyst {user}",
        user=user,
        metadata={"severity": severity, "title": title}
    )

    # Log audit event
    audit_log("Create Case", user, {"title": title, "severity": severity}, {"case_id": case_id})

    return jsonify({"success": True, "case_id": case_id, "message": "Case created successfully."})


@cases_bp.route("/cases", methods=["GET"])
def list_cases():
    user, role = get_current_user_and_role(request)
    if not user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    cases = get_all_cases()
    return jsonify({"success": True, "cases": cases})


@cases_bp.route("/cases/<case_id>", methods=["GET"])
def get_case_details(case_id):
    user, role = get_current_user_and_role(request)
    if not user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    case = get_case_by_id(case_id)
    if not case:
        return jsonify({"success": False, "error": "Case not found"}), 404

    evidence = get_case_evidence(case_id)
    timeline = get_case_timeline(case_id)

    return jsonify({
        "success": True,
        "case": case,
        "evidence": evidence,
        "timeline": timeline
    })


@cases_bp.route("/cases/<case_id>/status", methods=["PATCH"])
def patch_case_status(case_id):
    user, role = get_current_user_and_role(request)
    if not user or role not in ["admin", "analyst"]:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload"}), 400

    status = data.get("status", "").strip()
    if status not in ["open", "investigating", "closed"]:
        return jsonify({"success": False, "error": "Invalid status value"}), 400

    case = get_case_by_id(case_id)
    if not case:
        return jsonify({"success": False, "error": "Case not found"}), 404

    old_status = case["status"]
    if update_case_status(case_id, status):
        insert_timeline_event(
            case_id=case_id,
            event_type="status_changed",
            description=f"Status transitioned from {old_status} to {status}",
            user=user,
            metadata={"old_status": old_status, "new_status": status}
        )
        audit_log("Update Case Status", user, {"case_id": case_id, "new_status": status}, {"success": True})
        return jsonify({"success": True, "message": f"Status updated to {status}"})
    return jsonify({"success": False, "error": "Failed to update case status"}), 500


@cases_bp.route("/cases/<case_id>/note", methods=["POST"])
def add_case_note(case_id):
    user, role = get_current_user_and_role(request)
    if not user or role not in ["admin", "analyst"]:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload"}), 400

    note = data.get("note", "").strip()
    if not note:
        return jsonify({"success": False, "error": "Note content cannot be empty"}), 400

    case = get_case_by_id(case_id)
    if not case:
        return jsonify({"success": False, "error": "Case not found"}), 404

    insert_timeline_event(
        case_id=case_id,
        event_type="analyst_note",
        description=note,
        user=user
    )

    audit_log("Add Case Note", user, {"case_id": case_id}, {"success": True})
    return jsonify({"success": True, "message": "Note added to case timeline."})


@cases_bp.route("/cases/<case_id>/evidence", methods=["POST"])
def upload_case_evidence(case_id):
    user, role = get_current_user_and_role(request)
    if not user or role not in ["admin", "analyst"]:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded."}), 400

    file = request.files["file"]
    filename = file.filename
    if filename == "":
        return jsonify({"success": False, "error": "Filename is empty"}), 400

    case = get_case_by_id(case_id)
    if not case:
        return jsonify({"success": False, "error": "Case not found"}), 404

    try:
        # Save file to uploads/evidence directory
        os.makedirs("uploads/evidence", exist_ok=True)
        evidence_id = str(uuid.uuid4())
        # Preserve original extension
        ext = filename.split(".")[-1] if "." in filename else ""
        save_filename = f"{evidence_id}.{ext}" if ext else evidence_id
        filepath = os.path.join("uploads/evidence", save_filename)
        file.save(filepath)

        # Calculate file size & SHA-256 hash
        file_size = os.path.getsize(filepath)
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        file_hash = sha256_hash.hexdigest()

        file_type = file.content_type or ext

        # Insert to evidence table
        insert_evidence(
            case_id=case_id,
            filename=filename,
            file_size=file_size,
            file_hash=file_hash,
            file_type=file_type,
            uploaded_by=user
        )

        # Log timeline event
        insert_timeline_event(
            case_id=case_id,
            event_type="evidence_uploaded",
            description=f"Evidence file uploaded: {filename} (SHA-256: {file_hash[:8]}...)",
            user=user,
            metadata={"filename": filename, "file_hash": file_hash, "file_size": file_size}
        )

        audit_log("Upload Evidence", user, {"case_id": case_id, "filename": filename}, {"hash": file_hash})
        return jsonify({"success": True, "message": "Evidence uploaded successfully."})

    except Exception as e:
        logging.error(f"Failed to process uploaded evidence: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Failed to upload evidence: {str(e)}"}), 500


@cases_bp.route("/cases/<case_id>/associate-scan", methods=["POST"])
def associate_scan_log(case_id):
    user, role = get_current_user_and_role(request)
    if not user or role not in ["admin", "analyst"]:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload"}), 400

    scan_id = data.get("scan_id")
    if not scan_id:
        return jsonify({"success": False, "error": "scan_id parameter is required"}), 400

    case = get_case_by_id(case_id)
    if not case:
        return jsonify({"success": False, "error": "Case not found"}), 404

    # Look up the scan log in lookups table
    import sqlite3
    from database import DB_PATH
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT tool, input, result FROM lookups WHERE id = ?;", (scan_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "error": "Scan log not found in history"}), 404

        tool, scan_input, scan_result = row[0], row[1], row[2]

        # Insert timeline event associating this scan log
        insert_timeline_event(
            case_id=case_id,
            event_type="scan_associated",
            description=f"Associated scan from {tool} (Input: {scan_input})",
            user=user,
            metadata={
                "scan_id": scan_id,
                "tool": tool,
                "input": json.loads(scan_input) if scan_input.startswith("{") else scan_input,
                "result": json.loads(scan_result) if scan_result.startswith("{") or scan_result.startswith("[") else scan_result
            }
        )

        audit_log("Associate Scan", user, {"case_id": case_id, "scan_id": scan_id}, {"success": True})
        return jsonify({"success": True, "message": "Scan associated with case successfully."})

    except Exception as e:
        logging.error(f"Failed to associate scan: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Failed to associate scan: {str(e)}"}), 500
