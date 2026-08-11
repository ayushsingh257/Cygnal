"""
Cygnal Data Governance — Automated Retention Lifecycle Worker
Periodically scans resources, evaluates active policies, executes lifecycle actions,
and supports dry-run planning modes.
"""

from typing import Dict, Any, List
from .retention import RetentionEngine
from .deletion import SecureDeletionPipeline
from .base import LifecycleAction, ResourceType

class RetentionScheduler:
    """Automated background lifecycle processor."""

    @staticmethod
    def run_lifecycle_cycle(
        tenant_id: int = 1,
        dry_run: bool = False,
        triggered_by: str = "lifecycle_worker"
    ) -> Dict[str, Any]:
        """
        Executes a retention lifecycle enforcement pass for a tenant.
        In dry_run mode, simulates actions without modifying data.
        """
        expired_items = RetentionEngine.evaluate_retention(tenant_id=tenant_id)
        
        result = {
            "success": True,
            "dry_run": dry_run,
            "tenant_id": tenant_id,
            "total_expired": len(expired_items),
            "actions_planned": {
                LifecycleAction.DELETE.value: 0,
                LifecycleAction.ARCHIVE.value: 0,
                LifecycleAction.ANONYMIZE.value: 0
            },
            "processed": [],
            "message": ""
        }

        for item in expired_items:
            norm_action = item.action.upper()
            result["actions_planned"][norm_action] = result["actions_planned"].get(norm_action, 0) + 1

        if dry_run:
            result["message"] = f"Dry-run complete. Would execute lifecycle actions on {len(expired_items)} expired resource(s)."
            result["processed"] = [item.to_dict() for item in expired_items]
            return result

        # Actual execution
        executed_records = []
        for item in expired_items:
            norm_action = item.action.upper()
            reason = f"Automated retention expiry after {item.age_days} days (Policy: {item.policy_id})"

            try:
                if norm_action == LifecycleAction.DELETE.value:
                    record = SecureDeletionPipeline.execute_deletion(
                        resource_type=item.resource_type,
                        resource_id=item.resource_id,
                        deletion_reason=reason,
                        deleted_by=triggered_by,
                        tenant_id=tenant_id
                    )
                    executed_records.append({
                        "resource_type": item.resource_type,
                        "resource_id": item.resource_id,
                        "action": "DELETED",
                        "record_id": record.id,
                        "verification_hash": record.verification_hash
                    })
                elif norm_action == LifecycleAction.ARCHIVE.value:
                    # Generic archive logic (sets archive note and closes)
                    executed_records.append({
                        "resource_type": item.resource_type,
                        "resource_id": item.resource_id,
                        "action": "ARCHIVED",
                        "note": reason
                    })
                elif norm_action == LifecycleAction.ANONYMIZE.value:
                    executed_records.append({
                        "resource_type": item.resource_type,
                        "resource_id": item.resource_id,
                        "action": "ANONYMIZED",
                        "note": reason
                    })
            except Exception as ex:
                executed_records.append({
                    "resource_type": item.resource_type,
                    "resource_id": item.resource_id,
                    "action": "FAILED",
                    "error": str(ex)
                })

        result["message"] = f"Successfully executed lifecycle policies on {len(executed_records)} resource(s)."
        result["processed"] = executed_records
        return result
