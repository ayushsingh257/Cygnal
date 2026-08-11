"""
Cygnal Data Governance — Data Classification Service
Manages assignment, validation, and querying of enterprise classification levels across resources.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from db_utils import get_db_connection
from log_utils import log_audit_event
from .base import DataClassification, ResourceType

VALID_TABLE_MAPPING = {
    ResourceType.CASES.value: ("cases", "id"),
    ResourceType.EVIDENCE.value: ("evidence", "id"),
    ResourceType.REPORTS.value: ("reports", "id"),
    ResourceType.AUDIT_LOGS.value: ("audit_log", "id"),
    ResourceType.VECTOR_RECORDS.value: ("vector_records", "id"),
}

def classify_resource(
    resource_type: str,
    resource_id: str,
    classification_level: str,
    classification_reason: Optional[str] = None,
    classified_by: str = "system",
    tenant_id: int = 1
) -> Dict[str, Any]:
    """
    Updates the data classification metadata for a designated resource.
    Validates classification level and records an audit trail event.
    """
    norm_type = ResourceType.from_str(resource_type).value
    norm_level = DataClassification.from_str(classification_level).value

    if norm_type not in VALID_TABLE_MAPPING:
        raise ValueError(f"Unsupported resource type: '{resource_type}'")

    table_name, id_col = VALID_TABLE_MAPPING[norm_type]
    now_str = datetime.now(timezone.utc).isoformat() + "Z"
    reason = classification_reason or f"Assigned classification {norm_level}"

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify resource exists and belongs to tenant
    cursor.execute(
        f"SELECT {id_col}, tenant_id, data_classification FROM {table_name} WHERE {id_col} = ? AND tenant_id = ?;",
        (resource_id, tenant_id)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise FileNotFoundError(f"Resource '{resource_type}' with ID '{resource_id}' not found for tenant {tenant_id}.")

    prev_level = row[2] or "UNCLASSIFIED"

    # Update classification
    cursor.execute(
        f"""
        UPDATE {table_name}
        SET data_classification = ?,
            classification_reason = ?,
            classified_by = ?,
            classified_at = ?
        WHERE {id_col} = ? AND tenant_id = ?;
        """,
        (norm_level, reason, classified_by, now_str, resource_id, tenant_id)
    )
    conn.commit()
    conn.close()

    # Audit log
    log_audit_event(
        action="governance.classify_resource",
        user_id=classified_by,
        tenant_id=tenant_id,
        details={
            "resource_type": norm_type,
            "resource_id": resource_id,
            "previous_level": prev_level,
            "new_level": norm_level,
            "reason": reason
        }
    )

    return {
        "success": True,
        "resource_type": norm_type,
        "resource_id": resource_id,
        "previous_classification": prev_level,
        "data_classification": norm_level,
        "classification_reason": reason,
        "classified_by": classified_by,
        "classified_at": now_str,
        "tenant_id": tenant_id
    }


def get_resource_classification(
    resource_type: str,
    resource_id: str,
    tenant_id: int = 1
) -> Optional[Dict[str, Any]]:
    """Retrieves the classification metadata for a specific resource."""
    norm_type = ResourceType.from_str(resource_type).value
    if norm_type not in VALID_TABLE_MAPPING:
        return None

    table_name, id_col = VALID_TABLE_MAPPING[norm_type]
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        f"""
        SELECT {id_col}, data_classification, classification_reason, classified_by, classified_at, tenant_id
        FROM {table_name}
        WHERE {id_col} = ? AND tenant_id = ?;
        """,
        (resource_id, tenant_id)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "resource_type": norm_type,
        "resource_id": str(row[0]),
        "data_classification": row[1] or DataClassification.INTERNAL.value,
        "classification_reason": row[2],
        "classified_by": row[3],
        "classified_at": row[4],
        "tenant_id": row[5]
    }


def get_classification_stats(tenant_id: int = 1) -> Dict[str, Any]:
    """Returns classification distributions across all resources for the tenant."""
    stats = {
        "total_resources": 0,
        "by_level": {level: 0 for level in DataClassification.list_levels()},
        "by_resource_type": {}
    }

    conn = get_db_connection()
    cursor = conn.cursor()

    for r_type, (tbl, id_col) in VALID_TABLE_MAPPING.items():
        try:
            cursor.execute(
                f"""
                SELECT COALESCE(data_classification, 'INTERNAL') as lvl, COUNT(*) 
                FROM {tbl} 
                WHERE tenant_id = ? 
                GROUP BY lvl;
                """,
                (tenant_id,)
            )
            rows = cursor.fetchall()
            type_counts = {}
            for lvl, count in rows:
                norm_lvl = DataClassification.from_str(lvl).value
                stats["by_level"][norm_lvl] = stats["by_level"].get(norm_lvl, 0) + count
                stats["total_resources"] += count
                type_counts[norm_lvl] = count
            stats["by_resource_type"][r_type] = type_counts
        except Exception:
            pass

    conn.close()
    return stats
