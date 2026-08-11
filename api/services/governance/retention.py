"""
Cygnal Data Governance — Retention Policy Engine
Evaluates data retention lifecycles, matches active policies, and flags expired resources.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from db_utils import get_db_connection
from log_utils import log_audit_event
from .base import (
    DataClassification,
    LifecycleAction,
    ResourceType,
    RetentionPolicy,
    ExpiredResource
)

# Table configurations: (table_name, id_col, created_at_col)
RESOURCE_TABLES = {
    ResourceType.CASES.value: ("cases", "id", "created_at"),
    ResourceType.EVIDENCE.value: ("evidence", "id", "uploaded_at"),
    ResourceType.REPORTS.value: ("reports", "id", "created_at"),
    ResourceType.AUDIT_LOGS.value: ("audit_log", "id", "timestamp"),
    ResourceType.VECTOR_RECORDS.value: ("vector_records", "id", "created_at"),
}

class RetentionEngine:
    """Manages CRUD and evaluation of enterprise data retention policies."""

    @staticmethod
    def create_policy(
        tenant_id: int,
        resource_type: str,
        classification_level: str,
        retention_days: int,
        action_after_expiry: str = "ARCHIVE",
        enabled: bool = True,
        created_by: str = "admin"
    ) -> RetentionPolicy:
        """Creates a new tenant-isolated retention policy."""
        norm_type = ResourceType.from_str(resource_type).value
        norm_level = DataClassification.from_str(classification_level).value
        norm_action = LifecycleAction.from_str(action_after_expiry).value

        if retention_days < 1:
            raise ValueError("Retention days must be at least 1 day.")

        policy_id = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat() + "Z"

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO retention_policies (
                id, tenant_id, resource_type, classification_level,
                retention_days, action_after_expiry, enabled,
                created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                policy_id, tenant_id, norm_type, norm_level,
                retention_days, norm_action, 1 if enabled else 0,
                created_by, now_str, now_str
            )
        )
        conn.commit()
        conn.close()

        log_audit_event(
            action="governance.create_policy",
            user_id=created_by,
            tenant_id=tenant_id,
            details={
                "policy_id": policy_id,
                "resource_type": norm_type,
                "classification_level": norm_level,
                "retention_days": retention_days,
                "action": norm_action
            }
        )

        return RetentionPolicy(
            id=policy_id,
            tenant_id=tenant_id,
            resource_type=norm_type,
            classification_level=norm_level,
            retention_days=retention_days,
            action_after_expiry=norm_action,
            enabled=enabled,
            created_by=created_by,
            created_at=now_str,
            updated_at=now_str
        )

    @staticmethod
    def get_policies(tenant_id: int = 1, resource_type: Optional[str] = None) -> List[RetentionPolicy]:
        """Fetches all retention policies for a tenant."""
        conn = get_db_connection()
        cursor = conn.cursor()

        if resource_type:
            norm_type = ResourceType.from_str(resource_type).value
            cursor.execute(
                """
                SELECT id, tenant_id, resource_type, classification_level,
                       retention_days, action_after_expiry, enabled,
                       created_by, created_at, updated_at
                FROM retention_policies
                WHERE tenant_id = ? AND resource_type = ?
                ORDER BY created_at DESC;
                """,
                (tenant_id, norm_type)
            )
        else:
            cursor.execute(
                """
                SELECT id, tenant_id, resource_type, classification_level,
                       retention_days, action_after_expiry, enabled,
                       created_by, created_at, updated_at
                FROM retention_policies
                WHERE tenant_id = ?
                ORDER BY created_at DESC;
                """,
                (tenant_id,)
            )

        rows = cursor.fetchall()
        conn.close()

        policies = []
        for r in rows:
            policies.append(RetentionPolicy(
                id=r[0],
                tenant_id=r[1],
                resource_type=r[2],
                classification_level=r[3],
                retention_days=r[4],
                action_after_expiry=r[5],
                enabled=bool(r[6]),
                created_by=r[7],
                created_at=r[8],
                updated_at=r[9]
            ))
        return policies

    @staticmethod
    def get_policy(policy_id: str, tenant_id: int = 1) -> Optional[RetentionPolicy]:
        """Fetches a single retention policy by ID."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, tenant_id, resource_type, classification_level,
                   retention_days, action_after_expiry, enabled,
                   created_by, created_at, updated_at
            FROM retention_policies
            WHERE id = ? AND tenant_id = ?;
            """,
            (policy_id, tenant_id)
        )
        r = cursor.fetchone()
        conn.close()

        if not r:
            return None

        return RetentionPolicy(
            id=r[0],
            tenant_id=r[1],
            resource_type=r[2],
            classification_level=r[3],
            retention_days=r[4],
            action_after_expiry=r[5],
            enabled=bool(r[6]),
            created_by=r[7],
            created_at=r[8],
            updated_at=r[9]
        )

    @staticmethod
    def update_policy(
        policy_id: str,
        tenant_id: int,
        retention_days: Optional[int] = None,
        action_after_expiry: Optional[str] = None,
        enabled: Optional[bool] = None,
        updated_by: str = "admin"
    ) -> Optional[RetentionPolicy]:
        """Updates an existing retention policy."""
        existing = RetentionEngine.get_policy(policy_id, tenant_id=tenant_id)
        if not existing:
            return None

        new_days = retention_days if retention_days is not None else existing.retention_days
        new_action = LifecycleAction.from_str(action_after_expiry).value if action_after_expiry else existing.action_after_expiry
        new_enabled = enabled if enabled is not None else existing.enabled
        now_str = datetime.now(timezone.utc).isoformat() + "Z"

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE retention_policies
            SET retention_days = ?,
                action_after_expiry = ?,
                enabled = ?,
                updated_at = ?
            WHERE id = ? AND tenant_id = ?;
            """,
            (new_days, new_action, 1 if new_enabled else 0, now_str, policy_id, tenant_id)
        )
        conn.commit()
        conn.close()

        log_audit_event(
            action="governance.update_policy",
            user_id=updated_by,
            tenant_id=tenant_id,
            details={
                "policy_id": policy_id,
                "retention_days": new_days,
                "action": new_action,
                "enabled": new_enabled
            }
        )

        return RetentionPolicy(
            id=policy_id,
            tenant_id=tenant_id,
            resource_type=existing.resource_type,
            classification_level=existing.classification_level,
            retention_days=new_days,
            action_after_expiry=new_action,
            enabled=new_enabled,
            created_by=existing.created_by,
            created_at=existing.created_at,
            updated_at=now_str
        )

    @staticmethod
    def delete_policy(policy_id: str, tenant_id: int = 1, deleted_by: str = "admin") -> bool:
        """Deletes a retention policy."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM retention_policies WHERE id = ? AND tenant_id = ?;",
            (policy_id, tenant_id)
        )
        affected = cursor.rowcount
        conn.commit()
        conn.close()

        if affected > 0:
            log_audit_event(
                action="governance.delete_policy",
                user_id=deleted_by,
                tenant_id=tenant_id,
                details={"policy_id": policy_id}
            )
            return True
        return False

    @staticmethod
    def evaluate_retention(tenant_id: int = 1) -> List[ExpiredResource]:
        """
        Scans all resources against active tenant retention policies and returns expired objects.
        """
        policies = RetentionEngine.get_policies(tenant_id=tenant_id)
        active_policies = [p for p in policies if p.enabled]
        
        expired: List[ExpiredResource] = []
        now = datetime.now(timezone.utc)

        conn = get_db_connection()
        cursor = conn.cursor()

        for policy in active_policies:
            if policy.resource_type not in RESOURCE_TABLES:
                continue

            tbl, id_col, date_col = RESOURCE_TABLES[policy.resource_type]

            # Query records matching tenant and classification level
            try:
                cursor.execute(
                    f"""
                    SELECT {id_col}, {date_col}, COALESCE(data_classification, 'INTERNAL') as lvl
                    FROM {tbl}
                    WHERE tenant_id = ?;
                    """,
                    (tenant_id,)
                )
                rows = cursor.fetchall()
                for r in rows:
                    res_id = str(r[0])
                    created_raw = r[1]
                    res_lvl = DataClassification.from_str(r[2]).value

                    if res_lvl != policy.classification_level:
                        continue

                    # Parse timestamp safely
                    if not created_raw:
                        continue

                    s = str(created_raw).strip()
                    if s.endswith("+00:00Z"):
                        s = s[:-1]
                    elif s.endswith("Z"):
                        s = s[:-1] + "+00:00"
                    
                    try:
                        res_dt = datetime.fromisoformat(s)
                        if res_dt.tzinfo is None:
                            res_dt = res_dt.replace(tzinfo=timezone.utc)
                    except Exception:
                        try:
                            res_dt = datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                        except Exception:
                            continue

                    age_days = (now - res_dt).days
                    if age_days >= policy.retention_days:
                        expired.append(ExpiredResource(
                            resource_type=policy.resource_type,
                            resource_id=res_id,
                            tenant_id=tenant_id,
                            classification_level=policy.classification_level,
                            created_at=str(created_raw),
                            age_days=age_days,
                            policy_id=policy.id,
                            policy_retention_days=policy.retention_days,
                            action=policy.action_after_expiry
                        ))
            except Exception as e:
                print(f"[RETENTION EVAL EXCEPTION] Table {tbl}: {str(e)}")

        conn.close()
        return expired
