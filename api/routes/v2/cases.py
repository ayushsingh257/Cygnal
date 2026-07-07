from flask import Blueprint, request, jsonify
import sqlite3
import os
import hashlib
import uuid
from datetime import datetime
from database import DB_PATH
from jwt_utils import decode_token
from services.extractor import extract_entities_from_text

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

@cases_bp.route("/cases/<case_id>/extract-iocs", methods=["POST"])
def extract_case_iocs(case_id):
    user = get_current_user()
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verify case exists
        cursor.execute("SELECT id, case_number FROM cases WHERE id = ?;", (case_id,))
        case_row = cursor.fetchone()
        if not case_row:
            conn.close()
            return jsonify({"success": False, "error": "Case not found."}), 404
        
        case_num = case_row[1]
        
        payload = request.get_json(silent=True) or {}
        text = payload.get("text", "").strip()
        evidence_id = payload.get("evidence_id", "").strip()
        
        # If evidence ID is supplied, enrich from database file details
        if evidence_id:
            cursor.execute("SELECT filename, file_hash, file_type FROM evidence WHERE id = ? AND case_id = ?;", (evidence_id, case_id))
            ev = cursor.fetchone()
            if not ev:
                conn.close()
                return jsonify({"success": False, "error": "Evidence not found."}), 404
            
            filename, file_hash, file_type = ev
            # Try reading evidence file text if text is empty
            if not text:
                file_path = os.path.join(UPLOAD_FOLDER, f"{evidence_id}_{filename}")
                if os.path.exists(file_path):
                    try:
                        _, ext = os.path.splitext(filename.lower())
                        if ext in ('.txt', '.eml', '.log', '.json', '.xml', '.csv', '.ini', '.yaml', '.yml'):
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                text = f.read()
                        else:
                            text = f"File: {filename}\nHash: {file_hash}\nType: {file_type}\n"
                    except:
                        text = f"File: {filename}\nHash: {file_hash}\nType: {file_type}\n"
                else:
                    text = f"File: {filename}\nHash: {file_hash}\nType: {file_type}\n"
        
        if not text:
            conn.close()
            return jsonify({"success": False, "error": "No text content or evidence ID provided for extraction."}), 400
            
        # Run extractor service
        extracted = extract_entities_from_text(text)
        
        now_str = datetime.utcnow().isoformat() + "Z"
        
        # Insert extracted indicators to case_indicators table (avoid exact duplicates)
        cursor.execute("SELECT indicator_value, indicator_type FROM case_indicators WHERE case_id = ?;", (case_id,))
        existing = {(row[0], row[1]) for row in cursor.fetchall()}
        
        inserted = []
        for item in extracted:
            val = item["value"]
            t = item["type"]
            if (val, t) in existing:
                continue
                
            # Confidence & severity heuristics
            confidence = 80
            severity = "medium"
            
            if t == "hash":
                confidence = 90
            elif t in ("ip", "domain", "url"):
                confidence = 85
                
            # Cross-reference local threat intelligence feed
            cursor.execute("SELECT type, tags FROM threat_intel WHERE indicator = ?;", (val,))
            ti_match = cursor.fetchone()
            if ti_match:
                confidence = 100
                severity = "critical" if "ransomware" in str(ti_match[1]).lower() or "botnet" in str(ti_match[1]).lower() else "high"
                
            ind_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO case_indicators (id, case_id, indicator_value, indicator_type, confidence_score, severity, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (ind_id, case_id, val, t, confidence, severity, now_str))
            
            inserted.append({
                "id": ind_id,
                "value": val,
                "type": t,
                "severity": severity,
                "confidence": confidence
            })
            
        # Update case timeline automatically if elements were added
        if inserted:
            timeline_id = str(uuid.uuid4())
            desc = f"Extracted {len(inserted)} indicators of compromise from inputs automatically."
            cursor.execute("""
                INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
                VALUES (?, ?, 'iocs_extracted', ?, ?, ?, ?);
            """, (timeline_id, case_id, desc, now_str, user, json_dumps({
                "count": len(inserted),
                "indicators": [ind["value"] for ind in inserted[:5]]
            })))
            
        # Update evidence relationships where applicable
        if evidence_id:
            cursor.execute("SELECT file_hash, filename FROM evidence WHERE id = ?;", (evidence_id,))
            current_ev = cursor.fetchone()
            if current_ev:
                curr_hash, curr_name = current_ev
                
                # Compare against other evidence files
                cursor.execute("SELECT id, filename, file_hash FROM evidence WHERE id != ? AND case_id = ?;", (evidence_id, case_id))
                other_evidences = cursor.fetchall()
                for o_id, o_name, o_hash in other_evidences:
                    reason = ""
                    weight = 0
                    if o_hash == curr_hash:
                        reason = f"Duplicate file hash matching file '{o_name}'"
                        weight = 100
                    else:
                        # Check for filename matches (excluding extension)
                        curr_base = os.path.splitext(curr_name)[0]
                        o_base = os.path.splitext(o_name)[0]
                        if curr_base and curr_base == o_base:
                            reason = f"Shared filename prefix: '{curr_base}'"
                            weight = 70
                            
                    if reason:
                        # Insert relationship (avoid duplicates)
                        cursor.execute("""
                            SELECT COUNT(*) FROM evidence_relations 
                            WHERE (source_evidence_id = ? AND target_evidence_id = ?) 
                               OR (source_evidence_id = ? AND target_evidence_id = ?);
                        """, (evidence_id, o_id, o_id, evidence_id))
                        if cursor.fetchone()[0] == 0:
                            rel_id = str(uuid.uuid4())
                            cursor.execute("""
                                INSERT INTO evidence_relations (id, source_evidence_id, target_evidence_id, correlation_reason, weight, created_at)
                                VALUES (?, ?, ?, ?, ?, ?);
                            """, (rel_id, evidence_id, o_id, reason, weight, now_str))

        cursor.execute("UPDATE cases SET updated_at = ? WHERE id = ?;", (now_str, case_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "case_id": case_id,
            "extracted_count": len(inserted),
            "indicators": inserted
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cases_bp.route("/cases/<case_id>/graph", methods=["GET"])
def get_case_graph(case_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verify case exists
        cursor.execute("SELECT id, case_number, title FROM cases WHERE id = ?;", (case_id,))
        case_row = cursor.fetchone()
        if not case_row:
            conn.close()
            return jsonify({"success": False, "error": "Case not found."}), 404
            
        case_uuid, case_num, case_title = case_row
        
        # Initialize nodes and edges
        nodes = []
        edges = []
        seen_nodes = set()
        
        def add_node(node_id, label, group, val=10, extra=None):
            if node_id not in seen_nodes:
                seen_nodes.add(node_id)
                n = {
                    "id": node_id,
                    "label": label,
                    "group": group,
                    "val": val
                }
                if extra:
                    n.update(extra)
                nodes.append(n)
                
        def add_edge(source, target, relation, weight=50):
            edges.append({
                "source": source,
                "target": target,
                "relation": relation,
                "weight": weight
            })
            
        # Add root Case node
        add_node(case_uuid, case_num, "case", val=20, extra={"title": case_title})
        
        # Retrieve Indicators
        cursor.execute("SELECT id, indicator_value, indicator_type, confidence_score, severity FROM case_indicators WHERE case_id = ?;", (case_id,))
        indicators = cursor.fetchall()
        for ind_id, ind_val, ind_type, confidence, severity in indicators:
            add_node(ind_id, ind_val, ind_type, val=12, extra={
                "confidence": confidence,
                "severity": severity,
                "type": ind_type
            })
            add_edge(case_uuid, ind_id, "detects_indicator", weight=60)
            
            # Cross-reference threat intel
            cursor.execute("SELECT id, source, tags FROM threat_intel WHERE indicator = ?;", (ind_val,))
            ti_match = cursor.fetchone()
            if ti_match:
                ti_id, ti_source, ti_tags = ti_match
                ti_node_id = f"intel_{ti_id}"
                add_node(ti_node_id, f"Intel: {ti_source}", "threat_intel", val=10, extra={"tags": ti_tags})
                add_edge(ind_id, ti_node_id, "matched_threat_feed", weight=40)
                
        # Retrieve Evidence
        cursor.execute("SELECT id, filename, file_hash, file_type FROM evidence WHERE case_id = ?;", (case_id,))
        evidence_list = cursor.fetchall()
        for ev_id, filename, file_hash, file_type in evidence_list:
            add_node(ev_id, filename, "evidence", val=15, extra={
                "hash": file_hash,
                "file_type": file_type
            })
            add_edge(case_uuid, ev_id, "contains_evidence", weight=80)
            
            # Retrieve evidence relationships
            cursor.execute("""
                SELECT id, source_evidence_id, target_evidence_id, correlation_reason, weight 
                FROM evidence_relations 
                WHERE source_evidence_id = ? OR target_evidence_id = ?;
            """, (ev_id, ev_id))
            relations = cursor.fetchall()
            for r_id, src_ev, tgt_ev, reason, weight in relations:
                # Resolve external evidence details if the match is in another case
                other_ev = tgt_ev if src_ev == ev_id else src_ev
                cursor.execute("SELECT id, filename, file_hash, case_id FROM evidence WHERE id = ?;", (other_ev,))
                other_row = cursor.fetchone()
                if other_row:
                    o_id, o_name, o_hash, o_case = other_row
                    # Add target evidence node (even if from another case)
                    add_node(o_id, o_name, "evidence", val=15, extra={
                        "hash": o_hash,
                        "cross_case": True
                    })
                    add_edge(ev_id, o_id, reason, weight=weight)
                    
                    # Link to the other case if it exists and is different
                    if o_case and o_case != case_id:
                        cursor.execute("SELECT case_number FROM cases WHERE id = ?;", (o_case,))
                        o_case_row = cursor.fetchone()
                        if o_case_row:
                            add_node(o_case, o_case_row[0], "case", val=20, extra={"cross_case": True})
                            add_edge(o_case, o_id, "contains_evidence", weight=80)
                            
        conn.close()
        
        # Support pagination / limit
        limit = request.args.get("limit", default=100, type=int)
        if len(nodes) > limit:
            # Keep case, evidence and top confidence indicators
            nodes = nodes[:limit]
            # Filter edges to only keep those referencing existing nodes
            active_node_ids = {n["id"] for n in nodes}
            edges = [e for e in edges if e["source"] in active_node_ids and e["target"] in active_node_ids]
            
        return jsonify({
            "success": True,
            "nodes": nodes,
            "edges": edges
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500




