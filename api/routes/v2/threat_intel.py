"""
Cygnal v4.0 Phase 2 — Threat Intelligence API Routes
Provides endpoints for IOC enrichment, provider status, and configuration.
"""
from __future__ import annotations

import json
import logging
import re
from flask import Blueprint, request, jsonify

from auth_middleware import require_auth, require_role
from log_utils import log_auth_event
from services.threat_intel import enrich_indicator, bulk_enrich, list_providers, get_provider
from services.threat_intel.stix_taxii import parse_stix_bundle

threat_intel_bp = Blueprint("threat_intel", __name__)
logger = logging.getLogger("cygnal.routes.threat_intel")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

VALID_INDICATOR_TYPES = {
    "ip", "domain", "url",
    "hash_md5", "hash_sha1", "hash_sha256",
    "email", "cve",
}

def _validate_indicator(indicator: str, indicator_type: str) -> str | None:
    """Returns an error message if invalid, else None."""
    if not indicator or not indicator.strip():
        return "indicator is required"
    if indicator_type not in VALID_INDICATOR_TYPES:
        return f"indicator_type must be one of: {sorted(VALID_INDICATOR_TYPES)}"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Provider Status
# ─────────────────────────────────────────────────────────────────────────────

@threat_intel_bp.route("/threat-intel/providers", methods=["GET"])
@require_auth
def get_providers(current_user):
    """List all configured TI providers and their availability status."""
    return jsonify({"success": True, "providers": list_providers()})


# ─────────────────────────────────────────────────────────────────────────────
# IOC Enrichment
# ─────────────────────────────────────────────────────────────────────────────

@threat_intel_bp.route("/threat-intel/enrich", methods=["POST"])
@require_auth
def enrich_ioc(current_user):
    """
    Enrich a single IOC across all available threat intelligence providers.
    Body: { "indicator": "1.2.3.4", "type": "ip", "providers": [...], "case_id": "..." }
    """
    body = request.get_json(silent=True) or {}
    indicator = (body.get("indicator") or "").strip()
    indicator_type = (body.get("type") or "").strip().lower()
    providers = body.get("providers")  # optional list
    case_id = body.get("case_id")

    err = _validate_indicator(indicator, indicator_type)
    if err:
        return jsonify({"success": False, "error": err}), 400

    logger.info("[TI] Enrichment request: %s (%s) by %s", indicator, indicator_type, current_user.get("username"))

    result = enrich_indicator(
        indicator=indicator,
        indicator_type=indicator_type,
        requested_providers=providers,
        case_id=case_id,
        requested_by=current_user.get("username", "unknown"),
    )

    return jsonify(result), 200 if result.get("success") else 500


@threat_intel_bp.route("/threat-intel/enrich/bulk", methods=["POST"])
@require_auth
def enrich_bulk(current_user):
    """
    Enrich multiple IOCs in one request.
    Body: { "indicators": [{"value": "...", "type": "ip"}, ...], "case_id": "..." }
    """
    body = request.get_json(silent=True) or {}
    indicators = body.get("indicators", [])
    case_id = body.get("case_id")

    if not indicators or not isinstance(indicators, list):
        return jsonify({"success": False, "error": "indicators must be a non-empty list"}), 400

    if len(indicators) > 50:
        return jsonify({"success": False, "error": "Maximum 50 indicators per bulk request"}), 400

    for item in indicators:
        err = _validate_indicator(item.get("value", ""), item.get("type", ""))
        if err:
            return jsonify({"success": False, "error": f"Invalid indicator: {err}"}), 400

    results = bulk_enrich(
        indicators=indicators,
        requested_by=current_user.get("username", "unknown"),
        case_id=case_id,
    )

    return jsonify({"success": True, "results": results, "count": len(results)})


@threat_intel_bp.route("/threat-intel/enrich/provider/<provider_name>", methods=["POST"])
@require_auth
def enrich_single_provider(current_user, provider_name: str):
    """
    Enrich an IOC using a specific provider only.
    Body: { "indicator": "...", "type": "ip" }
    """
    body = request.get_json(silent=True) or {}
    indicator = (body.get("indicator") or "").strip()
    indicator_type = (body.get("type") or "").strip().lower()

    err = _validate_indicator(indicator, indicator_type)
    if err:
        return jsonify({"success": False, "error": err}), 400

    provider = get_provider(provider_name)
    if not provider:
        return jsonify({"success": False, "error": f"Provider '{provider_name}' not found"}), 404

    if not provider.is_available:
        return jsonify({
            "success": False,
            "error": f"Provider '{provider_name}' is not configured (missing API key)"
        }), 503

    try:
        from services.threat_intel.base import IndicatorType
        itype = IndicatorType(indicator_type)
        result = provider.enrich(indicator, itype)
        return jsonify({"success": True, "data": result.to_dict()})
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        logger.error("[TI] Provider %s error: %s", provider_name, exc)
        return jsonify({"success": False, "error": "Provider query failed"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Enrichment History
# ─────────────────────────────────────────────────────────────────────────────

@threat_intel_bp.route("/threat-intel/history", methods=["GET"])
@require_auth
def get_enrichment_history(current_user):
    """Return recent enrichment results from cache."""
    from db_utils import get_db_connection

    limit = min(int(request.args.get("limit", 50)), 200)
    case_id = request.args.get("case_id")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if case_id:
            cursor.execute("""
                SELECT indicator, indicator_type, verdict, confidence, tags, created_at
                FROM ti_enrichment_cache
                WHERE case_id = ?
                ORDER BY created_at DESC LIMIT ?;
            """, (case_id, limit))
        else:
            cursor.execute("""
                SELECT indicator, indicator_type, verdict, confidence, tags, created_at
                FROM ti_enrichment_cache
                ORDER BY created_at DESC LIMIT ?;
            """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        results = [
            {
                "indicator": r[0],
                "type": r[1],
                "verdict": r[2],
                "confidence": r[3],
                "tags": json.loads(r[4] or "[]"),
                "queried_at": r[5],
            }
            for r in rows
        ]

        return jsonify({"success": True, "results": results, "count": len(results)})
    except Exception as exc:
        logger.error("[TI] History query failed: %s", exc)
        return jsonify({"success": False, "error": "Failed to retrieve history"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# STIX Bundle Parsing
# ─────────────────────────────────────────────────────────────────────────────

@threat_intel_bp.route("/threat-intel/stix/parse", methods=["POST"])
@require_auth
@require_role("analyst", "soc_manager", "director", "admin")
def parse_stix(current_user):
    """
    Parse a STIX 2.x bundle and return extracted IOCs.
    Body: { "bundle": { ...stix bundle... } }
    """
    body = request.get_json(silent=True) or {}
    bundle = body.get("bundle")

    if not bundle:
        return jsonify({"success": False, "error": "STIX bundle is required"}), 400

    try:
        iocs = parse_stix_bundle(bundle)
        return jsonify({"success": True, "iocs": iocs, "count": len(iocs)})
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        logger.error("[TI] STIX parse error: %s", exc)
        return jsonify({"success": False, "error": "Failed to parse STIX bundle"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Connector Configuration (Admin)
# ─────────────────────────────────────────────────────────────────────────────

@threat_intel_bp.route("/threat-intel/config", methods=["GET"])
@require_auth
@require_role("admin")
def get_connector_config(current_user):
    """Return which environment variables are set (masked) for each provider."""
    import os

    env_vars = {
        "VIRUSTOTAL_API_KEY": bool(os.getenv("VIRUSTOTAL_API_KEY")),
        "SHODAN_API_KEY": bool(os.getenv("SHODAN_API_KEY")),
        "ABUSEIPDB_API_KEY": bool(os.getenv("ABUSEIPDB_API_KEY")),
        "OTX_API_KEY": bool(os.getenv("OTX_API_KEY")),
        "CENSYS_API_ID": bool(os.getenv("CENSYS_API_ID")),
        "CENSYS_API_SECRET": bool(os.getenv("CENSYS_API_SECRET")),
        "MISP_API_KEY": bool(os.getenv("MISP_API_KEY")),
        "MISP_URL": os.getenv("MISP_URL", ""),
    }
    return jsonify({"success": True, "config": env_vars, "providers": list_providers()})
