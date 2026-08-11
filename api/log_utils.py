import logging
import json
import uuid
from flask import g, has_request_context

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        # Resolve active tenant context
        from db_utils import get_current_tenant_id
        try:
            log_data["tenant_id"] = get_current_tenant_id()
        except Exception:
            log_data["tenant_id"] = 1

        # Ingress correlation ID
        if has_request_context():
            if not hasattr(g, "correlation_id") or not g.correlation_id:
                # Fallback generate correlation_id
                from flask import request
                g.correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
            log_data["correlation_id"] = g.correlation_id
        else:
            log_data["correlation_id"] = "system-context"

        # Ingress any extra properties
        if hasattr(record, "extra_fields") and record.extra_fields:
            log_data.update(record.extra_fields)
            
        return json.dumps(log_data)

def setup_structured_logging():
    """Sets up JSON structured logging globally."""
    logger = logging.getLogger()
    # Remove existing handlers to avoid duplicate formats
    for h in logger.handlers[:]:
        logger.removeHandler(h)
        
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def log_auth_event(action: str, status: str, username: str, ip_address: str = None, details: dict = None):
    """
    Structured audit helper specifically for authentication and session events.
    Sends output to the standardized log stream.
    """
    logger = logging.getLogger("cygnal.auth")
    payload = {
        "event_type": "auth_event",
        "action": action,
        "status": status,
        "username": username,
        "ip_address": ip_address or "unknown",
        "details": details or {}
    }
    logger.info(f"Auth event: {action} - {status} for {username}", extra={"extra_fields": payload})

def log_audit_event(action: str, user_id: str, tenant_id: int = 1, details: dict = None):
    """
    Structured audit helper for enterprise data governance and security events.
    Records to structured logger and audit_log table.
    """
    logger = logging.getLogger("cygnal.audit")
    payload = {
        "event_type": "audit_event",
        "action": action,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "details": details or {}
    }
    logger.info(f"Audit event: {action} by {user_id} (Tenant {tenant_id})", extra={"extra_fields": payload})
    try:
        from db_utils import get_db_connection
        from datetime import datetime, timezone
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat() + "Z"
        log_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO audit_log (id, timestamp, actor, action, details, tenant_id, data_classification)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (log_id, now_str, user_id, action, json.dumps(details or {}), tenant_id, "CONFIDENTIAL")
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

