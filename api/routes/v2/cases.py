from flask import Blueprint, request, jsonify
import sqlite3
import os
import hashlib
import uuid
from datetime import datetime
from database import DB_PATH
from jwt_utils import decode_token

cases_bp = Blueprint("cases_bp", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def generate_case_number():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cases;")
        count = cursor.fetchone()[0]
        conn.close()
        
        year = datetime.now().year
        seq = str(count + 1).zfill(4)
        return f"CYG-{year}-{seq}"
    except:
        return f"CYG-2026-{uuid.uuid4().hex[:4].upper()}"

@cases_bp.route("/cases", methods=["GET"])
def get_cases():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, case_number, title, description, status, severity, created_by, created_at, updated_at, assigned_to, department
            FROM cases
            ORDER BY created_at DESC;
        """)
        rows = cursor.fetchall()
        conn.close()

        cases = []
        for r in rows:
            cases.append({
                "id": r[0],
                "case_number": r[1],
                "title": r[2],
                "description": r[3],
                "status": r[4],
                "severity": r[5],
                "created_by": r[6],
                "created_at": r[7],
                "updated_at": r[8],
                "assigned_to": r[9],
                "department": r[10]
            })
        return jsonify({"success": True, "cases": cases})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cases_bp.route("/cases", methods=["POST"])
def create_case():
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload data."}), 400

    title = data.get("title", "").strip()
    desc = data.get("description", "").strip()
    sev = data.get("severity", "medium").strip()
    assigned = data.get("assigned_to", "").strip()
    dept = data.get("department", "Security Operations").strip()

    if not title:
        return jsonify({"success": False, "error": "Case title is required."}), 400

    case_id = str(uuid.uuid4())
    case_num = generate_case_number()
    now_str = datetime.utcnow().isoformat() + "Z"

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO cases (id, case_number, title, description, status, severity, created_by, created_at, updated_at, assigned_to, department)
            VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?);
        """, (case_id, case_num, title, desc, sev, user, now_str, now_str, assigned if assigned else None, dept))

        # Log creation in case timeline
        timeline_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, 'case_created', ?, ?, ?, ?);
        """, (timeline_id, case_id, f"Incident case file {case_num} initialized by {user}.", now_str, user, json_dumps({"title": title})))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "case": {
                "id": case_id,
                "case_number": case_num,
                "title": title,
                "status": "open"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cases_bp.route("/cases/<case_id>", methods=["GET"])
def get_case_details(case_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get Case Profile
        cursor.execute("""
            SELECT id, case_number, title, description, status, severity, created_by, created_at, updated_at, assigned_to, department
            FROM cases WHERE id = ?;
        """, (case_id,))
        c = cursor.fetchone()
        if not c:
            conn.close()
            return jsonify({"success": False, "error": "Case not found."}), 404

        case_data = {
            "id": c[0],
            "case_number": c[1],
            "title": c[2],
            "description": c[3],
            "status": c[4],
            "severity": c[5],
            "created_by": c[6],
            "created_at": c[7],
            "updated_at": c[8],
            "assigned_to": c[9],
            "department": c[10]
        }

        # Get timeline ledger
        cursor.execute("""
            SELECT id, event_type, description, timestamp, user, metadata
            FROM timeline WHERE case_id = ? ORDER BY timestamp DESC;
        """, (case_id,))
        t_rows = cursor.fetchall()
        timeline = []
        for t in t_rows:
            timeline.append({
                "id": t[0],
                "event_type": t[1],
                "description": t[2],
                "timestamp": t[3],
                "user": t[4],
                "metadata": t[5]
            })

        # Get evidence custody ledger
        cursor.execute("""
            SELECT id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at
            FROM evidence WHERE case_id = ? ORDER BY uploaded_at DESC;
        """, (case_id,))
        e_rows = cursor.fetchall()
        evidence = []
        for e in e_rows:
            evidence.append({
                "id": e[0],
                "filename": e[1],
                "file_size": e[2],
                "file_hash": e[3],
                "file_type": e[4],
                "uploaded_by": e[5],
                "uploaded_at": e[6]
            })

        conn.close()
        return jsonify({
            "success": True,
            "case": case_data,
            "timeline": timeline,
            "evidence": evidence
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cases_bp.route("/cases/<case_id>/timeline", methods=["POST"])
def add_timeline_event(case_id):
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload data."}), 400

    desc = data.get("description", "").strip()
    evt_type = data.get("event_type", "analyst_note").strip()
    meta = data.get("metadata", {})

    if not desc:
        return jsonify({"success": False, "error": "Event description is required."}), 400

    timeline_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat() + "Z"

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verify case exists
        cursor.execute("SELECT id FROM cases WHERE id = ?;", (case_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Case not found."}), 404

        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (timeline_id, case_id, evt_type, desc, now_str, user, json_dumps(meta)))

        cursor.execute("UPDATE cases SET updated_at = ? WHERE id = ?;", (now_str, case_id))

        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cases_bp.route("/cases/<case_id>/evidence", methods=["POST"])
def upload_evidence(case_id):
    user = get_current_user()
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded."}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "Empty filename."}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verify case exists
        cursor.execute("SELECT case_number FROM cases WHERE id = ?;", (case_id,))
        case_row = cursor.fetchone()
        if not case_row:
            conn.close()
            return jsonify({"success": False, "error": "Case not found."}), 404

        case_num = case_row[0]
        file_content = file.read()
        
        # Calculate SHA-256 hash immediately
        sha256_hash = hashlib.sha256(file_content).hexdigest()
        file_size = len(file_content)
        file_type = file.content_type

        # Save file to uploads folder
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}_{file.filename}"
        file_dest = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        file.seek(0)
        file.save(file_dest)

        now_str = datetime.utcnow().isoformat() + "Z"

        # Insert to evidence table
        cursor.execute("""
            INSERT INTO evidence (id, case_id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (file_id, case_id, file.filename, file_size, sha256_hash, file_type, user, now_str))

        # Log timeline event
        timeline_id = str(uuid.uuid4())
        desc = f"Forensic evidence file '{file.filename}' uploaded and signed. SHA-256: {sha256_hash}."
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, 'evidence_uploaded', ?, ?, ?, ?);
        """, (timeline_id, case_id, desc, now_str, user, json_dumps({
            "filename": file.filename,
            "hash": sha256_hash,
            "size": file_size
        })))

        cursor.execute("UPDATE cases SET updated_at = ? WHERE id = ?;", (now_str, case_id))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "evidence": {
                "id": file_id,
                "filename": file.filename,
                "file_hash": sha256_hash,
                "file_size": file_size,
                "uploaded_at": now_str
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def json_dumps(data):
    import json
    return json.dumps(data)



