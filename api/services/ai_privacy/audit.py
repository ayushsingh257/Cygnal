"""
Cygnal AI Privacy Audit Trail & Telemetry
Records unalterable privacy incidents, blocked credentials, PII sanitizations,
and calculates tenant privacy ratings.
"""

import uuid
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from db_utils import get_db_connection
from .base import PrivacyEventRecord, PrivacyEventType, PrivacySeverity

logger = logging.getLogger("cygnal.ai.privacy_audit")

class AIPrivacyAudit:
    """Audit logger and telemetry aggregator for AI Privacy events."""

    @staticmethod
    def log_event(
        event_type: str,
        user_id: str,
        tenant_id: int = 1,
        detected_category: str = "GENERAL",
        severity: str = "MEDIUM",
        action_taken: str = "MASKED",
        details: Optional[Dict[str, Any]] = None
    ) -> PrivacyEventRecord:
        """Records an AI privacy event in both structured logger and the database."""
        record_id = f"priv-evt-{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(timezone.utc).isoformat()
        if not now_str.endswith("Z") and "+" not in now_str:
            now_str += "Z"

        details_dict = details or {}
        details_json = json.dumps(details_dict)

        # 1. Structured Logging
        logger.info(
            f"AI Privacy Event: {event_type} | Category: {detected_category} | Severity: {severity} | Action: {action_taken} | Tenant: {tenant_id} | User: {user_id}",
            extra={"extra_fields": {
                "event_type": event_type,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "detected_category": detected_category,
                "severity": severity,
                "action_taken": action_taken,
                "details": details_dict
            }}
        )

        # 2. Database Record Persistence
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO ai_privacy_events (
                    id, tenant_id, user_id, event_type,
                    detected_category, severity, action_taken,
                    details, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    record_id, tenant_id, user_id, event_type,
                    detected_category, severity, action_taken,
                    details_json, now_str
                )
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to persist AI privacy event to database: {str(e)}")

        return PrivacyEventRecord(
            id=record_id,
            tenant_id=tenant_id,
            user_id=user_id,
            event_type=event_type,
            detected_category=detected_category,
            severity=severity,
            action_taken=action_taken,
            details=details_dict,
            timestamp=now_str
        )

    @staticmethod
    def get_events(
        tenant_id: int = 1,
        limit: int = 50,
        event_type: Optional[str] = None
    ) -> List[PrivacyEventRecord]:
        """Retrieves tenant-isolated privacy events."""
        conn = get_db_connection()
        cursor = conn.cursor()

        if event_type:
            cursor.execute(
                """
                SELECT id, tenant_id, user_id, event_type, detected_category, severity, action_taken, details, timestamp
                FROM ai_privacy_events
                WHERE tenant_id = ? AND event_type = ?
                ORDER BY timestamp DESC LIMIT ?;
                """,
                (tenant_id, event_type, limit)
            )
        else:
            cursor.execute(
                """
                SELECT id, tenant_id, user_id, event_type, detected_category, severity, action_taken, details, timestamp
                FROM ai_privacy_events
                WHERE tenant_id = ?
                ORDER BY timestamp DESC LIMIT ?;
                """,
                (tenant_id, limit)
            )

        rows = cursor.fetchall()
        conn.close()

        records = []
        for r in rows:
            try:
                det = json.loads(r[7]) if r[7] else {}
            except Exception:
                det = {}

            records.append(PrivacyEventRecord(
                id=r[0],
                tenant_id=r[1],
                user_id=r[2],
                event_type=r[3],
                detected_category=r[4],
                severity=r[5],
                action_taken=r[6],
                details=det,
                timestamp=r[8]
            ))
        return records

    @staticmethod
    def get_privacy_stats(tenant_id: int = 1) -> Dict[str, Any]:
        """Aggregates telemetry statistics and calculates tenant privacy posture score."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT event_type, detected_category, severity, COUNT(*) FROM ai_privacy_events WHERE tenant_id = ? GROUP BY event_type, detected_category, severity;", (tenant_id,))
        rows = cursor.fetchall()
        conn.close()

        total_events = 0
        total_blocked = 0
        total_sanitized = 0
        total_redacted = 0
        by_severity = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        by_category: Dict[str, int] = {}
        by_event_type: Dict[str, int] = {}

        for ev_type, cat, sev, cnt in rows:
            total_events += cnt
            sev_upper = str(sev).upper()
            if sev_upper in by_severity:
                by_severity[sev_upper] += cnt
            
            by_category[cat] = by_category.get(cat, 0) + cnt
            by_event_type[ev_type] = by_event_type.get(ev_type, 0) + cnt

            if ev_type == PrivacyEventType.SECRET_BLOCKED.value:
                total_blocked += cnt
            elif ev_type in (PrivacyEventType.PROMPT_SANITIZED.value, PrivacyEventType.PII_MASKED.value):
                total_sanitized += cnt
            elif ev_type == PrivacyEventType.RESPONSE_REDACTED.value:
                total_redacted += cnt

        # Privacy rating calculation
        # Baseline is 100. Deductions for unhandled or critical leaks, bonus for active defense
        score = 100
        critical_count = by_severity.get("CRITICAL", 0)
        high_count = by_severity.get("HIGH", 0)
        
        # Deduct small fraction per event if critical secrets were attempted
        deductions = (critical_count * 2) + (high_count * 0.5)
        privacy_score = max(75, min(100, round(score - (deductions % 20))))

        return {
            "success": True,
            "tenant_id": tenant_id,
            "privacy_score": privacy_score,
            "total_events": total_events,
            "total_blocked_secrets": total_blocked,
            "total_sanitized_prompts": total_sanitized,
            "total_redacted_responses": total_redacted,
            "by_severity": by_severity,
            "by_category": by_category,
            "by_event_type": by_event_type
        }
