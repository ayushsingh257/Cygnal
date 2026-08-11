"""
Cygnal Data Governance — Compliance Audit & Reporting Service
Generates comprehensive enterprise compliance reports, retention posture audits,
and cryptographic verification status for data governance audits.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List
from .classification import get_classification_stats
from .retention import RetentionEngine
from .deletion import SecureDeletionPipeline
from .base import DataClassification, ResourceType

class GovernanceAudit:
    """Compliance report generator for enterprise data governance."""

    @staticmethod
    def generate_compliance_report(tenant_id: int = 1) -> Dict[str, Any]:
        """
        Builds a comprehensive data governance & retention compliance audit report.
        """
        now_str = datetime.now(timezone.utc).isoformat() + "Z"

        # 1. Classification distribution
        classification_stats = get_classification_stats(tenant_id=tenant_id)
        total_resources = classification_stats["total_resources"]

        # 2. Retention policies posture
        policies = RetentionEngine.get_policies(tenant_id=tenant_id)
        active_policies = [p for p in policies if p.enabled]
        
        covered_types = set(p.resource_type for p in active_policies)
        all_types = set(r.value for r in ResourceType)
        uncovered_types = list(all_types - covered_types)

        # 3. Expired resources pending action
        expired_resources = RetentionEngine.evaluate_retention(tenant_id=tenant_id)

        # 4. Recent secure deletion cryptographic history
        recent_deletions = SecureDeletionPipeline.get_deletion_history(tenant_id=tenant_id, limit=20)

        # 5. Determine compliance status score
        issues = []
        if uncovered_types:
            issues.append(f"Missing active retention policy for: {', '.join(uncovered_types)}")
        if expired_resources:
            issues.append(f"{len(expired_resources)} resource(s) pending lifecycle action execution.")

        compliance_status = "COMPLIANT"
        if len(issues) > 1 or len(expired_resources) > 50:
            compliance_status = "ACTION_OVERDUE"
        elif len(issues) > 0:
            compliance_status = "REQUIRES_ATTENTION"

        compliance_score = max(0, 100 - (len(uncovered_types) * 10) - min(30, len(expired_resources) * 2))

        return {
            "success": True,
            "report_id": f"gov-rep-{tenant_id}-{int(datetime.now(timezone.utc).timestamp())}",
            "generated_at": now_str,
            "tenant_id": tenant_id,
            "compliance_status": compliance_status,
            "compliance_score": compliance_score,
            "classification": {
                "total_resources": total_resources,
                "distribution_by_level": classification_stats["by_level"],
                "by_resource_type": classification_stats["by_resource_type"]
            },
            "retention": {
                "total_policies": len(policies),
                "active_policies_count": len(active_policies),
                "covered_resource_types": list(covered_types),
                "uncovered_resource_types": uncovered_types,
                "policies": [p.to_dict() for p in policies]
            },
            "lifecycle": {
                "pending_expired_count": len(expired_resources),
                "expired_resources": [e.to_dict() for e in expired_resources[:50]]
            },
            "deletion_audit": {
                "total_cryptographic_deletions": len(recent_deletions),
                "recent_destruction_proofs": [d.to_dict() for d in recent_deletions]
            },
            "issues_identified": issues
        }
