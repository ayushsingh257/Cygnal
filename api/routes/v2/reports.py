"""
Cygnal Reports Compiler Engine — Era 5
Saves, compiles, and shares digital forensics reports.
"""

from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
from db_utils import get_db_connection, DB_PATH
from jwt_utils import decode_token

reports_bp = Blueprint("reports_bp", __name__)

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

# ─── Endpoints ──────────────────────────────────────────────────────────────

@reports_bp.route("/reports", methods=["GET"])
def list_reports():
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.title, r.description, r.created_by, r.created_at, r.case_id, r.share_token, c.case_number
            FROM reports r
            LEFT JOIN cases c ON r.case_id = c.id
            ORDER BY r.created_at DESC;
        """)
        rows = cursor.fetchall()
        reports_list = []
        for r in rows:
            reports_list.append({
                "id": r[0], "title": r[1], "description": r[2], "created_by": r[3],
                "created_at": r[4], "case_id": r[5], "share_token": r[6], "case_number": r[7]
            })
        conn.close()
        return jsonify({"success": True, "reports": reports_list})
    except Exception as e:
        return jsonify({"success": False, "error": f"Database read failure: {str(e)}"}), 500

@reports_bp.route("/reports", methods=["POST"])
def create_report():
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
        
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    content = data.get("content", "").strip() # Stringified JSON or HTML markdown
    case_id = data.get("case_id", None)

    if not title or not content:
        return jsonify({"success": False, "error": "Report title and content are required."}), 400

    report_id = str(uuid.uuid4())
    share_token = str(uuid.uuid4())

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO reports (id, title, description, created_by, created_at, content, case_id, share_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (report_id, title, description, user, now_iso(), content, case_id, share_token))
        
        # Log to timeline
        if case_id:
            tid = str(uuid.uuid4())
            desc = f"Forensic report compiled: '{title}' by {user}."
            cursor.execute("""
                INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
                VALUES (?, ?, 'report_generation', ?, ?, ?, ?);
            """, (tid, case_id, desc, now_iso(), user, "{ }"))
            cursor.execute("UPDATE cases SET updated_at = ? WHERE id = ?;", (now_iso(), case_id))

        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True, 
            "report_id": report_id, 
            "share_token": share_token,
            "message": "Forensic report compiled successfully."
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Database write failure: {str(e)}"}), 500

@reports_bp.route("/reports/<id>", methods=["GET"])
def get_report(id):
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.title, r.description, r.created_by, r.created_at, r.content, r.case_id, r.share_token, c.case_number, c.title
            FROM reports r
            LEFT JOIN cases c ON r.case_id = c.id
            WHERE r.id = ?;
        """, (id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Report not found."}), 404
            
        report_data = {
            "id": row[0], "title": row[1], "description": row[2], "created_by": row[3],
            "created_at": row[4], "content": row[5], "case_id": row[6], "share_token": row[7],
            "case_number": row[8], "case_title": row[9]
        }
        conn.close()
        return jsonify({"success": True, "report": report_data})
    except Exception as e:
        return jsonify({"success": False, "error": f"Database read failure: {str(e)}"}), 500

@reports_bp.route("/reports/share/<token>", methods=["GET"])
def get_shared_report(token):
    """Bypasses investigator auth check to enable public preview links of sealed evidence reports."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.title, r.description, r.created_by, r.created_at, r.content, r.case_id, r.share_token, c.case_number, c.title, c.severity
            FROM reports r
            LEFT JOIN cases c ON r.case_id = c.id
            WHERE r.share_token = ?;
        """, (token,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Invalid or expired share token."}), 404
            
        # Also grab evidence files for forensic verification
        evidence_list = []
        if row[6]: # case_id
            cursor.execute("SELECT filename, file_size, file_hash, file_type, uploaded_by, uploaded_at FROM evidence WHERE case_id = ?;", (row[6],))
            for ev in cursor.fetchall():
                evidence_list.append({
                    "filename": ev[0], "file_size": ev[1], "file_hash": ev[2], "file_type": ev[3],
                    "uploaded_by": ev[4], "uploaded_at": ev[5]
                })

        report_data = {
            "id": row[0], "title": row[1], "description": row[2], "created_by": row[3],
            "created_at": row[4], "content": row[5], "case_id": row[6], "share_token": row[7],
            "case_number": row[8], "case_title": row[9], "case_severity": row[10],
            "evidence": evidence_list
        }
        conn.close()
        return jsonify({"success": True, "report": report_data})
    except Exception as e:
        return jsonify({"success": False, "error": f"Database read failure: {str(e)}"}), 500
