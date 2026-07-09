import re
import socket
import uuid
import json
import io
from datetime import datetime
from db_utils import get_db_connection, DB_PATH
from services.vector_service import index_text_entity

IP_PATTERN = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
URL_PATTERN = r'https?://[^\s/$.?#].[^\s]*'
SHA256_PATTERN = r'\b[A-Fa-f0-9]{64}\b'
MD5_PATTERN = r'\b[A-Fa-f0-9]{32}\b'
DOMAIN_PATTERN = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b'

def detect_input_type(target: str) -> str:
    target = target.strip()
    if re.match(SHA256_PATTERN, target) or re.match(MD5_PATTERN, target):
        return "hash"
    if re.match(IP_PATTERN, target):
        return "ip"
    if re.match(EMAIL_PATTERN, target):
        return "email"
    if re.match(URL_PATTERN, target):
        return "url"
    if "." in target and " " not in target:
        ext = target.split(".")[-1].lower()
        if ext in ("exe", "pdf", "zip", "png", "jpg", "jpeg", "webp", "txt", "docx", "bin", "dat", "xlsx", "eml", "gif", "dll"):
            return "file"
    if re.match(DOMAIN_PATTERN, target):
        return "domain"
    if "." in target and len(target.split(".")[-1]) in (2, 3, 4) and " " not in target:
        return "file"
    return "text"


def build_execution_plan(input_type: str, target: str) -> list:
    if input_type == "email":
        return ["email-headers", "metadata"]
    elif input_type == "url":
        return ["headers", "screenshot", "whois", "dns"]
    elif input_type == "domain":
        return ["dns", "whois", "screenshot", "headers"]
    elif input_type == "ip":
        return ["ip-reputation", "whois", "dns"]
    elif input_type == "file":
        ext = target.split(".")[-1].lower() if "." in target else ""
        if ext in ("png", "jpg", "jpeg", "webp"):
            return ["metadata", "reverse-image"]
        return ["metadata", "malware"]
    elif input_type == "hash":
        return ["threat-intel"]
    elif input_type == "text":
        return ["extractor"]
    return []

def update_job_status(job_id, status=None, progress=None, current_scanner=None, completed_scanner=None, result_payload=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT status, progress, current_scanner, completed_scanners, scanner_statuses FROM investigation_jobs WHERE id = ?;", (job_id,))
        row = cursor.fetchone()
        if not row:
            return
        
        curr_status, curr_progress, curr_curr, curr_completed, curr_statuses = row
        completed_list = json.loads(curr_completed)
        statuses_dict = json.loads(curr_statuses)
        
        new_status = status if status else curr_status
        new_progress = progress if progress is not None else curr_progress
        new_curr = current_scanner if current_scanner else curr_curr
        
        if completed_scanner and completed_scanner not in completed_list:
            completed_list.append(completed_scanner)
        
        if result_payload:
            statuses_dict[result_payload[0]] = result_payload[1]
            
        cursor.execute("""
            UPDATE investigation_jobs 
            SET status = ?, progress = ?, current_scanner = ?, completed_scanners = ?, scanner_statuses = ?, updated_at = ?
            WHERE id = ?;
        """, (
            new_status,
            new_progress,
            new_curr,
            json.dumps(completed_list),
            json.dumps(statuses_dict),
            datetime.utcnow().isoformat() + "Z",
            job_id
        ))
        conn.commit()
    except Exception as e:
        print("[ORCHESTRATOR STATUS ERROR]", str(e))
    finally:
        conn.close()

def log_timeline(case_id, event_type, description, user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        tid = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            tid,
            case_id,
            event_type,
            description,
            datetime.utcnow().isoformat() + "Z",
            user,
            json.dumps({"orchestrated": True})
        ))
        cursor.execute("UPDATE cases SET updated_at = ? WHERE id = ?;", (datetime.utcnow().isoformat() + "Z", case_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print("[ORCHESTRATOR LOG ERROR]", str(e))

def auto_create_case(target, input_type, user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        case_id = str(uuid.uuid4())
        
        year = datetime.utcnow().year
        cursor.execute("SELECT COUNT(*) FROM cases;")
        cnt = cursor.fetchone()[0]
        case_number = f"CYG-{year}-{cnt+1:04d}"
        
        title = f"Autonomous Investigation: {target[:30]}"
        desc = f"Orchestrated incident scan workspace compiled for target value '{target}' ({input_type.upper()})."
        
        cursor.execute("""
            INSERT INTO cases (id, case_number, title, description, status, severity, created_by, created_at, updated_at, assigned_to, department)
            VALUES (?, ?, ?, ?, 'investigating', 'medium', ?, ?, ?, ?, 'Security');
        """, (
            case_id,
            case_number,
            title,
            desc,
            user,
            datetime.utcnow().isoformat() + "Z",
            datetime.utcnow().isoformat() + "Z",
            user
        ))
        
        tid = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, 'case_created', ?, ?, ?, ?);
        """, (
            tid,
            case_id,
            f"Incident case {case_number} initialized dynamically by orchestrator.",
            datetime.utcnow().isoformat() + "Z",
            user,
            json.dumps({"orchestrated": True})
        ))
        
        conn.commit()
        conn.close()

        # Update Vector DB
        try:
            index_text_entity(case_id, "case", f"Case {case_number}: {title}. Description: {desc}")
            index_text_entity(tid, "timeline_event", f"Timeline Event: case_created. Details: Incident case {case_number} initialized dynamically by orchestrator. Auditor/User: {user}.")
        except Exception as vec_err:
            print("[Vector Index] Error indexing auto-created case:", vec_err)

        return case_id
    except Exception as e:
        print("[ORCHESTRATOR CASE CREATE ERROR]", str(e))
        return None

def execute_endpoint_task(app, endpoint, payload, auth_token):
    with app.test_client() as client:
        res = client.post(endpoint, json=payload, headers={"Authorization": f"Bearer {auth_token}"})
        return res.get_json() or {"success": False}

def execute_normal_scanner(app, scanner, case_id, target, auth_token, file_bytes=None, filename=None):
    with app.test_client() as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        if scanner == "metadata":
            data = {"case_id": case_id, "file": (io.BytesIO(file_bytes or b""), filename or "file.dat")}
            res = client.post("/api/scanners/metadata", data=data, content_type="multipart/form-data", headers=headers)
        elif scanner == "malware":
            data = {"case_id": case_id, "file": (io.BytesIO(file_bytes or b""), filename or "file.dat")}
            res = client.post("/api/scanners/malware", data=data, content_type="multipart/form-data", headers=headers)
        elif scanner == "reverse-image":
            data = {"case_id": case_id, "file": (io.BytesIO(file_bytes or b""), filename or "file.dat")}
            res = client.post("/api/scanners/reverse-image", data=data, content_type="multipart/form-data", headers=headers)
        elif scanner == "whois":
            res = client.post("/api/scanners/whois", json={"target": target, "case_id": case_id}, headers=headers)
        elif scanner == "headers":
            res = client.post("/api/scanners/headers", json={"url": target, "case_id": case_id}, headers=headers)
        elif scanner == "dns":
            res = client.post("/api/scanners/dns", json={"domain": target, "case_id": case_id}, headers=headers)
        elif scanner == "email-headers":
            headers_text = file_bytes.decode("utf-8", errors="ignore") if file_bytes else target
            res = client.post("/api/scanners/email-headers", json={"headers": headers_text, "case_id": case_id}, headers=headers)
        elif scanner == "ip-reputation":
            res = client.post("/api/scanners/ip-reputation", json={"ip": target, "case_id": case_id}, headers=headers)
        elif scanner == "screenshot":
            res = client.post("/api/scanners/screenshot", json={"url": target, "case_id": case_id}, headers=headers)
        elif scanner == "threat-intel":
            res = client.post("/api/scanners/threat-intel", json={"ioc": target, "case_id": case_id}, headers=headers)
        else:
            return {"success": False, "error": f"Unknown scanner: {scanner}"}
        
        return res.get_json() or {"success": False}

def run_investigation_worker(app, job_id, case_id, target, input_type, auth_token, user, file_bytes=None, filename=None):
    with app.app_context():
        try:
            update_job_status(job_id, status="running", progress=0, current_scanner="Initializing")
            log_timeline(case_id, "investigation_started", f"Autonomous investigation started for target: {target} ({input_type.upper()})", user)
            
            scanners = build_execution_plan(input_type, target)
            total = len(scanners)
            
            if total == 0:
                update_job_status(job_id, status="completed", progress=100, current_scanner="None")
                log_timeline(case_id, "investigation_completed", "Autonomous investigation finished. No scanners were matched.", user)
                return
                
            if input_type == "text":
                update_job_status(job_id, progress=10, current_scanner="Extractor")
                with app.test_client() as client:
                    res = client.post(f"/api/cases/{case_id}/extract-iocs", json={"text": target}, headers={"Authorization": f"Bearer {auth_token}"})
                    data = res.get_json()
                    
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT indicator_value, indicator_type FROM case_indicators WHERE case_id = ?;", (case_id,))
                iocs = cursor.fetchall()
                conn.close()
                
                child_scanners = []
                for val, itype in iocs:
                    if itype == "ip":
                        child_scanners.append(("/api/scanners/ip-reputation", {"ip": val, "case_id": case_id}, "IP Reputation"))
                        child_scanners.append(("/api/scanners/whois", {"target": val, "case_id": case_id}, "WHOIS Lookup"))
                        child_scanners.append(("/api/scanners/dns", {"domain": val, "case_id": case_id}, "DNS Intelligence"))
                    elif itype == "domain":
                        child_scanners.append(("/api/scanners/dns", {"domain": val, "case_id": case_id}, "DNS Intelligence"))
                        child_scanners.append(("/api/scanners/whois", {"target": val, "case_id": case_id}, "WHOIS Lookup"))
                    elif itype == "url":
                        child_scanners.append(("/api/scanners/headers", {"url": val, "case_id": case_id}, "HTTP Header Scanner"))
                    elif itype in ("hash", "sha256", "md5"):
                        child_scanners.append(("/api/scanners/threat-intel", {"ioc": val, "case_id": case_id}, "Threat Intel"))
                
                if not child_scanners:
                    update_job_status(job_id, status="completed", progress=100, current_scanner="None")
                    log_timeline(case_id, "investigation_completed", "Autonomous investigation finished. No indicators extracted for dynamic scans.", user)
                    return
                    
                total_children = len(child_scanners)
                completed_count = 0
                
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor(max_workers=3) as executor:
                    futures = {}
                    for endpoint, payload, name in child_scanners:
                        f = executor.submit(execute_endpoint_task, app, endpoint, payload, auth_token)
                        futures[f] = (name, payload)
                        
                    for f in futures:
                        name, payload = futures[f]
                        update_job_status(job_id, current_scanner=name)
                        try:
                            res_payload = f.result(timeout=20)
                            status_str = "completed" if res_payload.get("success", True) else "failed"
                        except Exception as ex:
                            res_payload = {"success": False, "error": str(ex)}
                            status_str = "failed"
                            
                        completed_count += 1
                        prog = 10 + int((completed_count / total_children) * 90)
                        update_job_status(job_id, progress=prog, completed_scanner=name, result_payload=(name, status_str))
                        
                update_job_status(job_id, status="completed", progress=100, current_scanner="None")
                log_timeline(case_id, "investigation_completed", f"Autonomous investigation completed. Executed {total_children} indicator lookups.", user)
                return

            completed_count = 0
            for scanner in scanners:
                update_job_status(job_id, current_scanner=scanner)
                try:
                    res_payload = execute_normal_scanner(app, scanner, case_id, target, auth_token, file_bytes, filename)
                    status_str = "completed" if res_payload.get("success", True) else "failed"
                except Exception as ex:
                    res_payload = {"success": False, "error": str(ex)}
                    status_str = "failed"
                    
                completed_count += 1
                prog = int((completed_count / total) * 100)
                update_job_status(job_id, progress=prog, completed_scanner=scanner, result_payload=(scanner, status_str))
                
            update_job_status(job_id, status="completed", progress=100, current_scanner="None")
            log_timeline(case_id, "investigation_completed", f"Autonomous investigation finished. Completed {total} tool scans.", user)
            
        except Exception as err:
            update_job_status(job_id, status="failed", progress=100, current_scanner="None")
            log_timeline(case_id, "investigation_failed", f"Orchestrator failed: {str(err)}", user)
