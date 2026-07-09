"""
IOC Enrichment Engine — Cygnal v4.0 Phase 2
Aggregates results from multiple providers, computes confidence scores,
persists results, and returns unified enrichment reports.
"""
from __future__ import annotations

import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional

from services.threat_intel.base import EnrichmentResult, IndicatorType, Verdict
from services.threat_intel.registry import get_registry
from db_utils import get_db_connection

logger = logging.getLogger("cygnal.threat_intel.enrichment")

# Role-based weights for confidence aggregation
_PROVIDER_WEIGHTS = {
    "virustotal": 1.0,
    "abuseipdb": 0.85,
    "otx": 0.8,
    "shodan": 0.65,
    "threatfox": 0.9,
    "urlhaus": 0.85,
    "censys": 0.6,
    "misp": 0.9,
}

_VERDICT_SCORE = {
    Verdict.MALICIOUS: 1.0,
    Verdict.SUSPICIOUS: 0.5,
    Verdict.CLEAN: 0.0,
    Verdict.UNKNOWN: None,   # excluded from aggregation
}

CACHE_TTL_HOURS = 6


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"


def enrich_indicator(
    indicator: str,
    indicator_type: str,
    requested_providers: Optional[list[str]] = None,
    case_id: Optional[str] = None,
    requested_by: str = "system",
) -> dict:
    """
    Enrich an IOC across all available providers (or a specified subset).
    Results are persisted to the database and a unified report is returned.
    """
    try:
        itype = IndicatorType(indicator_type)
    except ValueError:
        return {"success": False, "error": f"Unsupported indicator type: {indicator_type}"}

    # Check cache first
    cached = _load_from_cache(indicator, indicator_type)
    if cached:
        logger.info("[Enrichment] Cache hit for %s (%s)", indicator, indicator_type)
        return {"success": True, "cached": True, "data": cached}

    registry = get_registry()
    providers_to_query = (
        {k: v for k, v in registry.items() if k in requested_providers}
        if requested_providers
        else registry
    )

    results: list[EnrichmentResult] = []
    errors: list[dict] = []

    # Fan-out queries in parallel (max 8 concurrent threads)
    with ThreadPoolExecutor(max_workers=min(len(providers_to_query), 8)) as executor:
        futures = {
            executor.submit(provider.enrich, indicator, itype): name
            for name, provider in providers_to_query.items()
            if provider.is_available or name in ("threatfox", "urlhaus")
        }
        for future in as_completed(futures):
            provider_name = futures[future]
            try:
                result = future.result(timeout=30)
                results.append(result)
                if result.error:
                    errors.append({"provider": provider_name, "error": result.error})
            except Exception as exc:
                logger.warning("[Enrichment] %s future failed: %s", provider_name, exc)
                errors.append({"provider": provider_name, "error": str(exc)})

    # Aggregate results
    aggregated = _aggregate(indicator, itype, results)
    aggregated["errors"] = errors
    aggregated["queried_at"] = _utcnow()
    aggregated["case_id"] = case_id
    aggregated["requested_by"] = requested_by

    # Persist
    _persist_enrichment(indicator, indicator_type, aggregated, case_id, requested_by)

    return {"success": True, "cached": False, "data": aggregated}


def _aggregate(indicator: str, itype: IndicatorType, results: list[EnrichmentResult]) -> dict:
    """Compute weighted confidence score and consensus verdict."""
    provider_results = [r.to_dict() for r in results]

    weighted_scores: list[float] = []
    verdict_votes: dict[str, float] = {"malicious": 0.0, "suspicious": 0.0, "clean": 0.0}
    all_tags: set[str] = set()
    countries: list[str] = []
    hostnames: list[str] = []
    asns: list[str] = []

    for result in results:
        if result.error:
            continue
        weight = _PROVIDER_WEIGHTS.get(result.provider, 0.7)
        score_val = _VERDICT_SCORE.get(result.verdict)
        if score_val is not None:
            weighted_scores.append(result.confidence * weight)
            verdict_votes[result.verdict.value] = verdict_votes.get(result.verdict.value, 0.0) + weight
        all_tags.update(result.tags)
        if result.country:
            countries.append(result.country)
        hostnames.extend(result.hostnames)
        if result.asn:
            asns.append(result.asn)

    overall_confidence = round(
        sum(weighted_scores) / len(weighted_scores), 3
    ) if weighted_scores else 0.0

    # Determine consensus verdict
    if verdict_votes["malicious"] > 0:
        consensus_verdict = "malicious"
    elif verdict_votes["suspicious"] > 0:
        consensus_verdict = "suspicious"
    elif verdict_votes["clean"] > 0:
        consensus_verdict = "clean"
    else:
        consensus_verdict = "unknown"

    return {
        "indicator": indicator,
        "indicator_type": itype.value,
        "verdict": consensus_verdict,
        "confidence": overall_confidence,
        "tags": sorted(all_tags),
        "country": max(set(countries), key=countries.count) if countries else None,
        "hostnames": list(set(hostnames))[:10],
        "asn": asns[0] if asns else None,
        "provider_results": provider_results,
        "provider_count": len(provider_results),
        "verdict_votes": verdict_votes,
    }


def _persist_enrichment(
    indicator: str,
    indicator_type: str,
    data: dict,
    case_id: Optional[str],
    requested_by: str,
) -> None:
    """Save enrichment result to the ti_enrichment_cache table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO ti_enrichment_cache
            (id, indicator, indicator_type, verdict, confidence, tags, provider_results, case_id, requested_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            str(uuid.uuid4()),
            indicator,
            indicator_type,
            data.get("verdict"),
            data.get("confidence"),
            json.dumps(data.get("tags", [])),
            json.dumps(data.get("provider_results", [])),
            case_id,
            requested_by,
            _utcnow(),
        ))
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("[Enrichment] Failed to persist result: %s", exc)


def _load_from_cache(indicator: str, indicator_type: str) -> Optional[dict]:
    """
    Return a cached enrichment result if it exists and is within TTL.
    TTL is defined by CACHE_TTL_HOURS.
    """
    try:
        from datetime import timedelta
        cutoff = (
            datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
        ).replace(tzinfo=None).isoformat() + "Z"

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT verdict, confidence, tags, provider_results, created_at
            FROM ti_enrichment_cache
            WHERE indicator = ? AND indicator_type = ? AND created_at > ?
            ORDER BY created_at DESC LIMIT 1;
        """, (indicator, indicator_type, cutoff))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        return {
            "indicator": indicator,
            "indicator_type": indicator_type,
            "verdict": row[0],
            "confidence": row[1],
            "tags": json.loads(row[2] or "[]"),
            "provider_results": json.loads(row[3] or "[]"),
            "queried_at": row[4],
        }
    except Exception as exc:
        logger.warning("[Enrichment] Cache lookup failed: %s", exc)
        return None


def bulk_enrich(
    indicators: list[dict],
    requested_by: str = "system",
    case_id: Optional[str] = None,
) -> list[dict]:
    """
    Enrich multiple IOCs. Each item in `indicators` must have 'value' and 'type'.
    Returns list of enrichment result dicts.
    """
    results = []
    for item in indicators:
        result = enrich_indicator(
            indicator=item["value"],
            indicator_type=item["type"],
            case_id=case_id,
            requested_by=requested_by,
        )
        result["indicator"] = item["value"]
        results.append(result)
    return results
