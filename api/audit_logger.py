import os
from datetime import datetime
import json
from flask import request

# ========== AUDIT LOGGER (Phase 23.1) ==========

def get_client_ip():
    """
    Get the client's IP address considering proxy headers if present.
    """
    forwarded_for = request.headers.get("X-Forwarded-For", request.remote_addr)
    return forwarded_for.split(',')[0].strip()


def audit_log(tool: str, user: str, input_data, result_data):
    """
    Append a structured audit log to audit_logs/audit_log.json
    """
    try:
        os.makedirs("audit_logs", exist_ok=True)

        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "ip": get_client_ip(),
            "user": user,
            "tool": tool,
            "input": input_data,
            "result": result_data,
        }

        with open("audit_logs/audit_log.json", "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")

    except Exception as e:
        # Ensure log failure doesn't break tool logic
        print(f"[AUDIT LOGGING ERROR]: {e}")
