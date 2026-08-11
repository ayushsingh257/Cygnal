"""
Cygnal Data Governance & Automated Retention — API Endpoints
Provides enterprise endpoints for data classification, retention policy lifecycle management,
cryptographic deletion tracking, and compliance audit reporting.
"""

from flask import Blueprint, request, jsonify, g
from auth_middleware import require_auth, require_role, get_current_user
from log_utils import log_audit_event
from services.governance import (
    DataClassification,
    LifecycleAction,
    ResourceType,
    classify_resource,
    get_resource_classification,
    get_classification_stats,
    RetentionEngine,
    SecureDeletionPipeline,
    RetentionScheduler,
    GovernanceAudit
)

governance_bp = Blueprint("governance_v2", __name__)

@governance_bp.route("/policies", methods=["GET"])
@require_auth
def get_retention_policies(current_user=None):
    """Returns all data retention policies for the authenticated tenant."""
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    resource_type = request.args.get("resource_type")

    try:
        policies = RetentionEngine.get_policies(tenant_id=tenant_id, resource_type=resource_type)
        return jsonify({
            "success": True,
            "policies": [p.to_dict() for p in policies]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/policies", methods=["POST"])
@require_auth
@require_role("admin", "director")
def create_or_update_policy(current_user=None):
    """
    Creates or updates a retention policy.
    Restricted to 'admin' and 'director' roles.
    """
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    username = (current_user or {}).get("username", "admin")

    data = request.get_json() or {}
    policy_id = data.get("id")
    resource_type = data.get("resource_type")
    classification_level = data.get("classification_level")
    retention_days = data.get("retention_days")
    action = data.get("action_after_expiry", "ARCHIVE")
    enabled = data.get("enabled", True)

    if not policy_id and (not resource_type or not classification_level or retention_days is None):
        return jsonify({"success": False, "error": "resource_type, classification_level, and retention_days are required"}), 400

    try:
        if policy_id:
            updated = RetentionEngine.update_policy(
                policy_id=policy_id,
                tenant_id=tenant_id,
                retention_days=retention_days,
                action_after_expiry=action,
                enabled=enabled,
                updated_by=username
            )
            if not updated:
                return jsonify({"success": False, "error": f"Policy {policy_id} not found"}), 404
            return jsonify({"success": True, "policy": updated.to_dict()}), 200
        else:
            created = RetentionEngine.create_policy(
                tenant_id=tenant_id,
                resource_type=resource_type,
                classification_level=classification_level,
                retention_days=int(retention_days),
                action_after_expiry=action,
                enabled=bool(enabled),
                created_by=username
            )
            return jsonify({"success": True, "policy": created.to_dict()}), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/policies/<policy_id>", methods=["DELETE"])
@require_auth
@require_role("admin", "director")
def delete_retention_policy(policy_id, current_user=None):
    """Deletes a retention policy. Restricted to admin/director."""
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    username = (current_user or {}).get("username", "admin")

    try:
        deleted = RetentionEngine.delete_policy(policy_id, tenant_id=tenant_id, deleted_by=username)
        if not deleted:
            return jsonify({"success": False, "error": f"Policy {policy_id} not found"}), 404
        return jsonify({"success": True, "message": f"Policy {policy_id} deleted successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/classify", methods=["POST"])
@require_auth
def classify_data_resource(current_user=None):
    """Assigns or updates data classification for a designated resource."""
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    username = (current_user or {}).get("username", "user")

    data = request.get_json() or {}
    resource_type = data.get("resource_type")
    resource_id = data.get("resource_id")
    classification_level = data.get("classification_level")
    reason = data.get("classification_reason")

    if not resource_type or not resource_id or not classification_level:
        return jsonify({"success": False, "error": "resource_type, resource_id, and classification_level are required"}), 400

    try:
        res = classify_resource(
            resource_type=resource_type,
            resource_id=resource_id,
            classification_level=classification_level,
            classification_reason=reason,
            classified_by=username,
            tenant_id=tenant_id
        )
        return jsonify(res), 200
    except FileNotFoundError as fnf:
        return jsonify({"success": False, "error": str(fnf)}), 404
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/retention/status", methods=["GET"])
@require_auth
def get_retention_status(current_user=None):
    """Evaluates retention status and returns list of expired resources."""
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    dry_run = request.args.get("dry_run", "true").lower() in ("true", "1")

    try:
        report = RetentionScheduler.run_lifecycle_cycle(tenant_id=tenant_id, dry_run=dry_run)
        return jsonify(report), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/retention/enforce", methods=["POST"])
@require_auth
@require_role("admin", "director")
def enforce_retention_lifecycle(current_user=None):
    """
    Executes automated lifecycle actions on all expired resources.
    Supports dry_run parameter. Restricted to admin/director.
    """
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    username = (current_user or {}).get("username", "admin")

    data = request.get_json() or {}
    dry_run = data.get("dry_run", False)

    try:
        result = RetentionScheduler.run_lifecycle_cycle(
            tenant_id=tenant_id,
            dry_run=dry_run,
            triggered_by=username
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/deletion/history", methods=["GET"])
@require_auth
def get_deletion_history(current_user=None):
    """Returns the cryptographic destruction records for the authenticated tenant."""
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1
    limit = request.args.get("limit", 50, type=int)

    try:
        history = SecureDeletionPipeline.get_deletion_history(tenant_id=tenant_id, limit=limit)
        return jsonify({
            "success": True,
            "deletion_records": [r.to_dict() for r in history]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@governance_bp.route("/compliance/report", methods=["GET"])
@require_auth
def get_compliance_report(current_user=None):
    """Generates a complete data governance & compliance audit report."""
    tenant_id = (current_user or {}).get("tenant_id") or getattr(g, "tenant_id", 1) or 1

    try:
        report = GovernanceAudit.generate_compliance_report(tenant_id=tenant_id)
        return jsonify(report), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
