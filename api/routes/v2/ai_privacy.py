"""
Cygnal AI Privacy REST API Blueprint — Phase 7
Provides enterprise administrative endpoints for AI privacy monitoring,
sensitive data leakage detection, prompt sanitization telemetry, and privacy ratings.
"""

from flask import Blueprint, request, jsonify
from auth_middleware import require_auth, require_role
from db_utils import get_current_tenant_id
from services.ai_privacy import (
    AIPrivacyGateway,
    AIPrivacyAudit,
    SensitiveDataDetector,
    MaskingEngine
)

ai_privacy_bp = Blueprint("ai_privacy_bp", __name__)


@ai_privacy_bp.route("/events", methods=["GET"])
@require_auth
def get_privacy_events(current_user):
    """Retrieve tenant-isolated AI privacy audit trail events."""
    tenant_id = get_current_tenant_id()
    limit = int(request.args.get("limit", 50))
    event_type = request.args.get("event_type", None)

    events = AIPrivacyAudit.get_events(tenant_id=tenant_id, limit=limit, event_type=event_type)
    return jsonify({
        "success": True,
        "tenant_id": tenant_id,
        "count": len(events),
        "events": [e.to_dict() for e in events]
    }), 200


@ai_privacy_bp.route("/stats", methods=["GET"])
@require_auth
def get_privacy_stats(current_user):
    """Retrieve aggregate telemetry and tenant privacy posture score."""
    tenant_id = get_current_tenant_id()
    stats = AIPrivacyAudit.get_privacy_stats(tenant_id=tenant_id)
    return jsonify(stats), 200


@ai_privacy_bp.route("/sanitize", methods=["POST"])
@require_auth
def sanitize_prompt_endpoint(current_user):
    """Interactive zero-data-leakage prompt sanitization endpoint."""
    tenant_id = get_current_tenant_id()
    data = request.get_json() or {}
    text = data.get("text", "")
    target_provider = data.get("target_provider", "external")
    strict = data.get("strict", True)

    username = current_user.get("username", "analyst") if isinstance(current_user, dict) else str(current_user)

    result = AIPrivacyGateway.sanitize_prompt(
        prompt=text,
        user_id=username,
        tenant_id=tenant_id,
        target_provider=target_provider,
        strict_secret_blocking=strict
    )

    return jsonify({
        "success": True,
        "data": result.to_dict()
    }), 200


@ai_privacy_bp.route("/test-leakage", methods=["POST"])
@require_auth
def test_leakage_endpoint(current_user):
    """Scan simulated AI model responses for accidental credential / PII leakage."""
    tenant_id = get_current_tenant_id()
    data = request.get_json() or {}
    response_text = data.get("response_text", "")

    result = AIPrivacyGateway.sanitize_response(
        response_text=response_text,
        user_id="ai_model_test",
        tenant_id=tenant_id
    )

    return jsonify({
        "success": True,
        "data": result.to_dict()
    }), 200
