from flask import Blueprint, request, jsonify
import os
import hashlib
import uuid
from datetime import datetime, timedelta
from db_utils import get_db_connection, DB_PATH
from jwt_utils import decode_token
from services.extractor import extract_entities_from_text
from socket_app import socketio

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
        conn = get_db_connection()
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
    # Security: Verify JWT token
    auth_header = request.headers.get("Authorization", "").replace("Bearer ", "")
    decoded = decode_token(auth_header)
    if not decoded:
        return jsonify({"success": False, "error": "Unauthorised session token."}), 401
    
    try:
        conn = get_db_connection()
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
        conn = get_db_connection()
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
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
    
    try:
        conn = get_db_connection()
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
        conn = get_db_connection()
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
        conn = get_db_connection()
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
        conn = get_db_connection()
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
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
    
    try:
        conn = get_db_connection()
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

@cases_bp.route("/cases/<case_id>/timeline", methods=["GET"])
def get_case_timeline_stages(case_id):
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Fetch case details
        cursor.execute("SELECT id, case_number, title, description, status, severity, created_by, created_at, assigned_to FROM cases WHERE id = ?;", (case_id,))
        case_row = cursor.fetchone()
        if not case_row:
            conn.close()
            return jsonify({"success": False, "error": "Case not found."}), 404
            
        c_id, c_num, c_title, c_desc, c_status, c_severity, c_created_by, c_created_at, c_assigned = case_row
        
        # Initialize lists for each stage
        initial_events = []
        evidence_events = []
        ioc_events = []
        threat_events = []
        relation_events = []
        assessment_events = []
        final_events = []
        
        # Helper to format timestamps and convert them cleanly
        def parse_ts(ts):
            return ts if ts else datetime.utcnow().isoformat() + "Z"
            
        # -- 1. Initial Detection Event
        initial_events.append({
            "id": f"init_case_{c_id}",
            "timestamp": parse_ts(c_created_at),
            "description": f"Incident case {c_num} initialized: '{c_title}'",
            "user": c_created_by,
            "type": "case_created",
            "severity": c_severity,
            "metadata": {"description": c_desc}
        })
        
        # -- 2. Evidence Collection
        cursor.execute("SELECT id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at FROM evidence WHERE case_id = ?;", (case_id,))
        evidence_rows = cursor.fetchall()
        for ev_id, filename, file_size, file_hash, file_type, uploaded_by, uploaded_at in evidence_rows:
            evidence_events.append({
                "id": f"ev_{ev_id}",
                "timestamp": parse_ts(uploaded_at),
                "description": f"Forensic evidence file '{filename}' signed and sealed into custody vault.",
                "user": uploaded_by,
                "type": "evidence_uploaded",
                "severity": "low",
                "metadata": {
                    "filename": filename,
                    "hash": file_hash,
                    "size": file_size,
                    "file_type": file_type
                }
            })
            
        # -- 3. IOC Extraction
        cursor.execute("SELECT id, indicator_value, indicator_type, confidence_score, severity, created_at FROM case_indicators WHERE case_id = ?;", (case_id,))
        indicators = cursor.fetchall()
        for ind_id, ind_val, ind_type, confidence, severity, created_at in indicators:
            ioc_events.append({
                "id": f"ioc_{ind_id}",
                "timestamp": parse_ts(created_at),
                "description": f"Extracted threat indicator: {ind_val} ({ind_type.upper()}) with confidence {confidence}%.",
                "user": "Cygnal Engine",
                "type": "ioc_extracted",
                "severity": severity,
                "metadata": {
                    "value": ind_val,
                    "type": ind_type,
                    "confidence": confidence,
                    "severity": severity
                }
            })
            
            # -- 4. Threat Intel Enrichment
            cursor.execute("SELECT id, source, tags FROM threat_intel WHERE indicator = ?;", (ind_val,))
            ti_row = cursor.fetchone()
            if ti_row:
                ti_id, ti_source, ti_tags = ti_row
                threat_events.append({
                    "id": f"ti_{ti_id}",
                    "timestamp": parse_ts(created_at),
                    "description": f"Threat Intel correlation matched: {ind_val} registered in {ti_source}.",
                    "user": "Cygnal Engine",
                    "type": "threat_intel_match",
                    "severity": "high" if confidence > 80 else "medium",
                    "metadata": {
                        "value": ind_val,
                        "source": ti_source,
                        "tags": ti_tags
                    }
                })
                
        # -- 5. Relationship Discovery
        # Get relations for all evidence items in this case
        ev_ids = [e[0] for e in evidence_rows]
        if ev_ids:
            placeholders = ",".join("?" for _ in ev_ids)
            cursor.execute(f"""
                SELECT id, source_evidence_id, target_evidence_id, correlation_reason, weight, created_at 
                FROM evidence_relations 
                WHERE source_evidence_id IN ({placeholders}) OR target_evidence_id IN ({placeholders});
            """, ev_ids + ev_ids)
            rel_rows = cursor.fetchall()
            for r_id, src_ev, tgt_ev, reason, weight, created_at in rel_rows:
                relation_events.append({
                    "id": f"rel_{r_id}",
                    "timestamp": parse_ts(created_at),
                    "description": f"Evidence relationship discovered: {reason} (Weight: {weight}).",
                    "user": "Cygnal Engine",
                    "type": "evidence_relation",
                    "severity": "medium" if weight > 50 else "low",
                    "metadata": {
                        "reason": reason,
                        "weight": weight
                    }
                })
                
        # -- 6. Assessment (Timeline general events, analyst comments, scanner lookups)
        cursor.execute("SELECT id, event_type, description, timestamp, user, metadata FROM timeline WHERE case_id = ?;", (case_id,))
        timeline_rows = cursor.fetchall()
        for t_id, event_type, description, timestamp, user, metadata in timeline_rows:
            if event_type == "case_created":
                continue
            event = {
                "id": f"tline_{t_id}",
                "timestamp": parse_ts(timestamp),
                "description": description,
                "user": user,
                "type": event_type,
                "severity": "medium",
                "metadata": {}
            }
            if metadata:
                try:
                    event["metadata"] = json.loads(metadata)
                except:
                    pass
            
            if event_type in ("report_generated", "case_resolved", "case_closed"):
                final_events.append(event)
            else:
                assessment_events.append(event)
                
        # Lookups related to extracted indicators
        for ind_val in [i[1] for i in indicators]:
            cursor.execute("SELECT id, tool, input, timestamp, user FROM lookups WHERE input = ? OR input LIKE ?;", (ind_val, f"%{ind_val}%"))
            for l_id, tool, l_input, timestamp, user in cursor.fetchall():
                assessment_events.append({
                    "id": f"lookup_{l_id}",
                    "timestamp": parse_ts(timestamp),
                    "description": f"Executed active sensor lookup via {tool.upper()} on indicator: {l_input}",
                    "user": user,
                    "type": "scanner_execution",
                    "severity": "low",
                    "metadata": {
                        "tool": tool,
                        "input": l_input
                    }
                })
                
        conn.close()
        
        # Sort each stage by timestamp
        for ev_list in (initial_events, evidence_events, ioc_events, threat_events, relation_events, assessment_events, final_events):
            ev_list.sort(key=lambda x: x["timestamp"])
            
        # 3. Compile Natural Language Narrations (No Hallucinations)
        stage_summaries = {}
        
        # Stage 1: Initial Detection
        if initial_events:
            stage_summaries["Initial Detection"] = f"Incident case was initialized. Severity level is categorized as {c_severity.upper()} based on the initial alerts. The security incident worksheet was assigned to analyst {c_assigned or 'system'}."
        else:
            stage_summaries["Initial Detection"] = "No initial detection events have been recorded."

        # Stage 2: Evidence Collection
        if evidence_events:
            filenames = [e["metadata"]["filename"] for e in evidence_events]
            stage_summaries["Evidence Collection"] = f"Acquired {len(evidence_events)} forensic artifact(s) for deep inspection: {', '.join(filenames)}. All items were signed and hashed for secure chain of custody."
        else:
            stage_summaries["Evidence Collection"] = "Evidence gathering is pending. Secure custody seals have not been signed."

        # Stage 3: IOC Extraction
        if ioc_events:
            types = set(e["metadata"]["type"] for e in ioc_events)
            stage_summaries["IOC Extraction"] = f"Deep parsing scanned evidence and identified {len(ioc_events)} unique Indicators of Compromise (IOCs) across types: {', '.join(types)}. These indicators have been locked for verification."
        else:
            stage_summaries["IOC Extraction"] = "Automatic entity extraction has not identified any Indicators of Compromise in text fields."

        # Stage 4: Threat Intelligence Enrichment
        if threat_events:
            threat_vals = [e["metadata"]["value"] for e in threat_events]
            stage_summaries["Threat Intelligence Enrichment"] = f"Threat intelligence lookup confirmed correlation. {len(threat_events)} indicator(s) matched active threat feeds: {', '.join(threat_vals)}. Confidence scores have been elevated accordingly."
        else:
            stage_summaries["Threat Intelligence Enrichment"] = "No direct matching indicators were found in active global threat intelligence feeds."

        # Stage 5: Relationship Discovery
        if relation_events:
            stage_summaries["Relationship Discovery"] = f"Found {len(relation_events)} connection(s) between evidence items in the repository. Cryptographic correlations (SHA-256 hashes or file prefixes) indicate propagation path overlaps."
        else:
            stage_summaries["Relationship Discovery"] = "No cryptographic evidence file duplications or similarities have been discovered."

        # Stage 6: Assessment
        if assessment_events:
            stage_summaries["Assessment"] = f"Investigation team logged analyst notes and executed active lookup diagnostics. Analysts are evaluating threat vectors and validating overrides policies."
        else:
            stage_summaries["Assessment"] = "Analyst review and triage notes are currently pending for this case workspace."

        # Stage 7: Final Findings
        if final_events:
            stage_summaries["Final Findings"] = f"Incident resolution activities detected. {len(final_events)} wrap-up events are locked into the ledger."
        else:
            stage_summaries["Final Findings"] = "Final incident compilation and reports have not been completed yet."
            
        # Assemble stages
        stages = [
            {"name": "Initial Detection", "summary": stage_summaries["Initial Detection"], "events": initial_events},
            {"name": "Evidence Collection", "summary": stage_summaries["Evidence Collection"], "events": evidence_events},
            {"name": "IOC Extraction", "summary": stage_summaries["IOC Extraction"], "events": ioc_events},
            {"name": "Threat Intelligence Enrichment", "summary": stage_summaries["Threat Intelligence Enrichment"], "events": threat_events},
            {"name": "Relationship Discovery", "summary": stage_summaries["Relationship Discovery"], "events": relation_events},
            {"name": "Assessment", "summary": stage_summaries["Assessment"], "events": assessment_events},
            {"name": "Final Findings", "summary": stage_summaries["Final Findings"], "events": final_events}
        ]
        
        return jsonify({
            "success": True,
            "case_id": case_id,
            "stages": stages
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/cases/<case_id>/lock", methods=["GET", "POST"])
def acquire_case_lock(case_id):
    username = get_current_user()
    if username == "unknown":
        return jsonify({"success": False, "error": "Authentication required."}), 401
    
    now_dt = datetime.now()
    
    if request.method == "GET":
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT locked_by, expires_at FROM case_locks WHERE case_id = ?;", (case_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                locked_by, expires_at_str = row[0], row[1]
                try:
                    expires_at_dt = datetime.fromisoformat(expires_at_str.replace("Z", ""))
                except Exception:
                    expires_at_dt = datetime.min
                if expires_at_dt > now_dt:
                    return jsonify({
                        "success": True,
                        "locked": True,
                        "locked_by": locked_by,
                        "expires_at": expires_at_str
                    })
            return jsonify({"success": True, "locked": False})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    now_str = now_dt.isoformat() + "Z"
    expires_dt = now_dt + timedelta(seconds=30)
    expires_str = expires_dt.isoformat() + "Z"

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if lock exists and is valid
        cursor.execute("SELECT locked_by, expires_at FROM case_locks WHERE case_id = ?;", (case_id,))
        row = cursor.fetchone()
        
        if row:
            locked_by, expires_at_str = row[0], row[1]
            try:
                # Parse expiration time
                expires_at_dt = datetime.fromisoformat(expires_at_str.replace("Z", ""))
            except Exception:
                expires_at_dt = datetime.min
            
            # If lock is still valid and owned by someone else
            if expires_at_dt > now_dt and locked_by != username:
                conn.close()
                return jsonify({
                    "success": False,
                    "error": "Case is locked by another investigator.",
                    "locked_by": locked_by,
                    "expires_at": expires_at_str
                }), 409
            
            # If expired or owned by the same user, update it
            cursor.execute(
                "UPDATE case_locks SET locked_by = ?, locked_at = ?, expires_at = ? WHERE case_id = ?;",
                (username, now_str, expires_str, case_id)
            )
        else:
            # Create a new lock
            cursor.execute(
                "INSERT INTO case_locks (case_id, locked_by, locked_at, expires_at) VALUES (?, ?, ?, ?);",
                (case_id, username, now_str, expires_str)
            )
            
        conn.commit()
        conn.close()
        
        # Broadcast lock state via Socket.IO
        socketio.emit("case_locked", {
            "case_id": case_id,
            "locked_by": username,
            "expires_at": expires_str
        }, to=case_id)
        
        return jsonify({
            "success": True,
            "locked_by": username,
            "expires_at": expires_str
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/cases/<case_id>/unlock", methods=["POST"])
def release_case_lock(case_id):
    username = get_current_user()
    if username == "unknown":
        return jsonify({"success": False, "error": "Authentication required."}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT locked_by FROM case_locks WHERE case_id = ?;", (case_id,))
        row = cursor.fetchone()
        
        if row:
            locked_by = row[0]
            if locked_by != username:
                conn.close()
                return jsonify({
                    "success": False,
                    "error": "You do not hold the lock for this case."
                }), 403
            
            cursor.execute("DELETE FROM case_locks WHERE case_id = ?;", (case_id,))
            conn.commit()
            
        conn.close()
        
        # Broadcast unlock state via Socket.IO
        socketio.emit("case_unlocked", {
            "case_id": case_id,
            "unlocked_by": username
        }, to=case_id)
        
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/cases/<case_id>/comments", methods=["GET"])
def get_case_comments(case_id):
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, case_id, username, content, created_at
            FROM comments
            WHERE case_id = ?
            ORDER BY created_at ASC;
        """, (case_id,))
        rows = cursor.fetchall()
        conn.close()
        
        comments = []
        for r in rows:
            comments.append({
                "id": r[0],
                "case_id": r[1],
                "username": r[2],
                "content": r[3],
                "created_at": r[4]
            })
            
        return jsonify({
            "success": True,
            "comments": comments
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/cases/<case_id>/comments", methods=["POST"])
def post_case_comment(case_id):
    username = get_current_user()
    if username == "unknown":
        return jsonify({"success": False, "error": "Authentication required."}), 401
        
    data = request.json or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"success": False, "error": "Comment content cannot be empty."}), 400
        
    comment_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat() + "Z"
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO comments (id, case_id, username, content, created_at)
            VALUES (?, ?, ?, ?, ?);
        """, (comment_id, case_id, username, content, now_str))
        conn.commit()
        conn.close()
        
        comment = {
            "id": comment_id,
            "case_id": case_id,
            "username": username,
            "content": content,
            "created_at": now_str
        }
        
        # Broadcast new comment via Socket.IO
        socketio.emit("new_comment", {
            "case_id": case_id,
            "comment": comment
        }, to=case_id)
        
        return jsonify({
            "success": True,
            "comment": comment
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500






