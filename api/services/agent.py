import json
import uuid
import logging
from datetime import datetime
from db_utils import get_db_connection
from jwt_utils import create_token
from services.orchestrator import (
    build_execution_plan,
    run_investigation_worker
)
from socket_app import socketio

def auto_create_siem_case(title, description, severity, user):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        case_id = str(uuid.uuid4())
        year = datetime.utcnow().year
        cursor.execute("SELECT COUNT(*) FROM cases;")
        cnt = cursor.fetchone()[0]
        case_number = f"CYG-{year}-{cnt+1:04d}"
        
        # Enforce valid case severity
        if severity not in ("low", "medium", "high", "critical"):
            severity = "medium"
            
        cursor.execute("""
            INSERT INTO cases (id, case_number, title, description, status, severity, created_by, created_at, updated_at, assigned_to, department)
            VALUES (?, ?, ?, ?, 'investigating', ?, ?, ?, ?, ?, 'Security');
        """, (
            case_id,
            case_number,
            f"[AUTO] {title}"[:80],
            description,
            severity,
            user,
            datetime.utcnow().isoformat() + "Z",
            datetime.utcnow().isoformat() + "Z",
            user
        ))
        
        # Chronological Case Timeline event
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, 'case_created', ?, ?, ?, ?);
        """, (
            str(uuid.uuid4()),
            case_id,
            f"Case {case_number} initialized autonomously by SIEM webhook ingestion loop.",
            datetime.utcnow().isoformat() + "Z",
            user,
            json.dumps({"orchestrated": True})
        ))
        conn.commit()
        return case_id
    except Exception as e:
        logging.error(f"[AGENT CASE CREATION ERROR] {str(e)}")
        raise e
    finally:
        conn.close()

def add_agent_log(alert_id, stage, level, message, reasoning=None, details=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    log_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat() + "Z"
    try:
        cursor.execute("""
            INSERT INTO agent_logs (id, alert_id, stage, level, message, reasoning, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            log_id,
            alert_id,
            stage,
            level,
            message,
            reasoning,
            json.dumps(details) if details else None,
            now_str
        ))
        conn.commit()
        
        # Broadcast real-time log event over WebSockets
        socketio.emit("agent_log", {
            "alert_id": alert_id,
            "id": log_id,
            "stage": stage,
            "level": level,
            "message": message,
            "reasoning": reasoning,
            "details": details,
            "timestamp": now_str
        }, to=alert_id)
    except Exception as e:
        logging.error(f"[AGENT LOG INSERT ERROR] {str(e)}")
    finally:
        conn.close()

def is_alert_interrupted(alert_id) -> bool:
    """Checks if analyst has triggered a Take Over (setting status to failed/Needs Analyst)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT status FROM inbound_alerts WHERE id = ?;", (alert_id,))
        row = cursor.fetchone()
        if row and row[0] == "failed":
            return True
        return False
    except Exception:
        return False
    finally:
        conn.close()

def run_autonomic_loop_worker(app, alert_id):
    """
    Autonomic Agent Execution Engine:
    Processes SIEM webhooks, schedules scans resiliently, creates case folders,
    supports analyst takeovers, and streams WebSocket logs.
    """
    with app.app_context():
        # 1. Fetch Alert Info
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT title, description, severity, parsed_iocs, source
            FROM inbound_alerts WHERE id = ?;
        """, (alert_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            logging.error(f"[AUTONOMIC AGENT] Alert {alert_id} not found in database.")
            return
            
        title, description, severity, parsed_iocs_json, source = row
        parsed_iocs = json.loads(parsed_iocs_json)
        
        # 2. Update Alert state to investigating (Running)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM inbound_alerts WHERE id = ?;", (alert_id,))
        cur_status_row = cursor.fetchone()
        if cur_status_row and cur_status_row[0] == "failed":
            conn.close()
            logging.info(f"[AUTONOMIC AGENT] Alert {alert_id} was aborted before starting loop.")
            return
            
        cursor.execute("UPDATE inbound_alerts SET status = 'investigating' WHERE id = ?;", (alert_id,))
        conn.commit()
        conn.close()
        
        socketio.emit("alert_updated", {"id": alert_id, "status": "investigating"})
        
        # 3. Create dynamic Case folder
        add_agent_log(
            alert_id, "parsing", "info", 
            "Initializing investigation case space.",
            "Structuring case folder to correlate timeline events and evidence chains."
        )
        
        try:
            case_id = auto_create_siem_case(title, description, severity, "AutonomicAgent")
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE inbound_alerts SET case_id = ? WHERE id = ?;", (case_id, alert_id))
            conn.commit()
            conn.close()
            
            add_agent_log(
                alert_id, "parsing", "info",
                f"Successfully initialized case: [AUTO] {title}",
                f"Assigned Case ID reference {case_id}."
            )
        except Exception as e:
            add_agent_log(
                alert_id, "parsing", "error",
                f"Failed to initialize investigation case context: {str(e)}"
            )
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE inbound_alerts SET status = 'failed' WHERE id = ?;", (alert_id,))
            conn.commit()
            conn.close()
            socketio.emit("alert_updated", {"id": alert_id, "status": "failed"})
            return
            
        # 4. Check for parsed IOCs
        if not parsed_iocs:
            add_agent_log(
                alert_id, "planning", "warning",
                "No Indicators of Compromise (IOCs) identified inside alert contents.",
                "AI engine scanned text, payloads, and titles but found no valid hashes, domains, URLs, or IPs."
            )
            
            # Transition alert directly to completed
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE inbound_alerts SET status = 'completed', processed_at = ? WHERE id = ?;", (datetime.utcnow().isoformat() + "Z", alert_id))
            conn.commit()
            conn.close()
            
            add_agent_log(
                alert_id, "completion", "info",
                "Autonomic analysis completed. System standby.",
                "Standby. No active threat indicators detected; analyst triage recommended."
            )
            socketio.emit("alert_updated", {"id": alert_id, "status": "completed"})
            return
            
        # 5. Planning and execution of Scans
        add_agent_log(
            alert_id, "planning", "info",
            f"Correlated {len(parsed_iocs)} threat indicators. Mapping execution playbook.",
            f"Generating parallel OSINT scans execution plan for target values."
        )
        
        system_token = create_token({"username": "AutonomicAgent", "role": "admin"})
        
        completed_scans = 0
        total_scans_planned = 0
        
        # Calculate total scans planned
        for ioc in parsed_iocs:
            target = ioc["value"]
            itype = ioc["type"]
            plan = build_execution_plan(itype, target)
            total_scans_planned += len(plan) if itype != "text" else 1
            
        add_agent_log(
            alert_id, "planning", "info",
            f"Playbook generated. Total scanner module dispatches: {total_scans_planned}."
        )
        
        # Process each indicator sequentially (resiliently)
        for idx, ioc in enumerate(parsed_iocs):
            # Check interruption state before launching next indicator
            if is_alert_interrupted(alert_id):
                logging.info(f"[AUTONOMIC AGENT] Alert {alert_id} execution aborted due to Analyst Takeover.")
                return
                
            target = ioc["value"]
            itype = ioc["type"]
            
            add_agent_log(
                alert_id, "execution", "info",
                f"[{idx+1}/{len(parsed_iocs)}] Dispatching scanner pool for: {target} ({itype.upper()}).",
                f"Orchestrating OSINT scans against indicator target value '{target}'."
            )
            
            job_id = str(uuid.uuid4())
            scanners = build_execution_plan(itype, target)
            total_scanners = len(scanners) if itype != "text" else 1
            
            # Register orchestrator job in database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO investigation_jobs
                (id, case_id, target, input_type, status, progress, current_scanner,
                 total_scanners, completed_scanners, scanner_statuses, created_at, updated_at, user)
                VALUES (?, ?, ?, ?, 'queued', 0, 'None', ?, '[]', '{}', ?, ?, 'AutonomicAgent');
            """, (
                job_id, case_id, target, itype,
                total_scanners,
                datetime.utcnow().isoformat() + "Z",
                datetime.utcnow().isoformat() + "Z"
            ))
            conn.commit()
            conn.close()
            
            # Execute scanners synchronously inside background context
            try:
                run_investigation_worker(app, job_id, case_id, target, itype, system_token, "AutonomicAgent")
                
                # Fetch completed job status
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT status, completed_scanners FROM investigation_jobs WHERE id = ?;", (job_id,))
                job_row = cursor.fetchone()
                conn.close()
                
                if job_row:
                    job_status, completed_json = job_row
                    completed_scanners_list = json.loads(completed_json)
                    completed_scans += len(completed_scanners_list)
                    
                    if job_status == "completed":
                        add_agent_log(
                            alert_id, "execution", "info",
                            f"Successfully completed scans for indicator '{target}'.",
                            f"Scanners completed: {', '.join(completed_scanners_list)}."
                        )
                    else:
                        add_agent_log(
                            alert_id, "execution", "warning",
                            f"Scans for indicator '{target}' finished with status: {job_status}."
                        )
            except Exception as ex:
                add_agent_log(
                    alert_id, "execution", "error",
                    f"Resilient error during execution of scanner pool for '{target}': {str(ex)}"
                )
                
        # 6. Check final status and complete
        if is_alert_interrupted(alert_id):
            return
            
        # Complete Loop
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat() + "Z"
        cursor.execute("UPDATE inbound_alerts SET status = 'completed', processed_at = ? WHERE id = ?;", (now_str, alert_id))
        conn.commit()
        conn.close()
        
        add_agent_log(
            alert_id, "completion", "info",
            "Autonomic alert investigation completed.",
            f"Successfully executed scanners on threat telemetry. Case reference CYG timeline populated.",
            {"total_scans_completed": completed_scans}
        )
        
        socketio.emit("alert_updated", {"id": alert_id, "status": "completed"})
        socketio.emit("case_updated", {"id": case_id})
