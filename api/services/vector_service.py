"""
Cygnal v4.0 Phase 3 — Vector Database & Semantic Search Service
Pure Python TF-IDF Vectorizer and Cosine Similarity Engine.
"""
from __future__ import annotations

import re
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from db_utils import get_db_connection

logger = logging.getLogger("cygnal.ai.vector_service")

# 128 curated, security-relevant vocabulary terms for vector dimensions
VOCABULARY = [
    # General Security/Incidents
    "malware", "ransomware", "botnet", "phishing", "c2", "command", "control", "compromise", 
    "victim", "alert", "signature", "threat", "score", "confidence", "severity", "critical", 
    "high", "medium", "low", "incident", "response", "analyst", "triage", "investigation",
    # Threat Intel & Connectors
    "virustotal", "shodan", "abuseipdb", "otx", "threatfox", "urlhaus", "censys", "misp", 
    "stix", "taxii", "enrichment", "reputation", "intelligence", "pulse", "blacklist", "votes",
    # Network & Protocols
    "ip", "domain", "url", "hash", "sha256", "md5", "email", "header", "dns", "whois", 
    "port", "scan", "scanner", "address", "connection", "traffic", "network", "firewall",
    # Identity & Auth
    "user", "admin", "session", "sso", "login", "logout", "authentication", "token", 
    "rotation", "key", "service", "audit", "rbac", "mfa", "totp", "otp", "keycloak", 
    "entra", "azure", "ad", "oidc", "saml", "federation", "okta", "google", "workspace",
    # Platform Architecture
    "database", "sqlite", "postgresql", "metadata", "reverse", "image", "screenshot", "celery", 
    "redis", "worker", "job", "pipeline", "validation", "approval", "agent", "copilot", 
    "memory", "semantic", "search", "vector", "embedding", "registry", "schema", "audit_logs",
    # Playbooks & Workflows
    "playbook", "workflow", "engine", "action", "step", "condition", "trigger", "execution", 
    "custody", "immutable", "ledger", "chronological", "timeline", "evidence", "signature", "seal",
    # Extra OSINT/DFIR keywords
    "geolocation", "asn", "isp", "registrar", "certificate", "ssl", "tls", "handshake"
]

VOCAB_INDEX = {term: idx for idx, term in enumerate(VOCABULARY)}

# Simple static IDF model precomputed based on general relative usage
STATIC_IDF = [1.5 if i % 2 == 0 else 1.2 for i in range(128)]


def clean_and_tokenize(text: str) -> list[str]:
    """Lowercase text and extract words/alphanumeric tokens."""
    if not text:
        return []
    words = re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", text.lower())
    return words


def vectorize_text(text: str) -> list[float]:
    """
    Vectorize any string to a 128-dimensional unit normalized vector
    using TF-IDF on our curated security vocabulary.
    """
    tokens = clean_and_tokenize(text)
    if not tokens:
        return [0.0] * 128

    # Calculate Term Frequencies (TF)
    tf = [0.0] * 128
    for t in tokens:
        if t in VOCAB_INDEX:
            tf[VOCAB_INDEX[t]] += 1.0

    # Multiply TF by IDF
    vector = [tf[i] * STATIC_IDF[i] for i in range(128)]

    # Normalize to unit length (L2 Norm)
    sq_sum = sum(v ** 2 for v in vector)
    if sq_sum == 0:
        return [0.0] * 128

    norm = sq_sum ** 0.5
    normalized_vector = [round(v / norm, 5) for v in vector]
    return normalized_vector


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Compute cosine similarity between two 128-dimensional vectors."""
    dot_product = sum(v1[i] * v2[i] for i in range(128))
    norm_v1 = sum(v1[i] ** 2 for i in range(128)) ** 0.5
    norm_v2 = sum(v2[i] ** 2 for i in range(128)) ** 0.5

    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return round(dot_product / (norm_v1 * norm_v2), 5)


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"


# ─── Synchronization Functions ───────────────────────────────────────────────

def index_text_entity(entity_id: str, entity_type: str, text_content: str) -> None:
    """Save or update the vector representation of a text entity in database."""
    if not text_content or not text_content.strip():
        return

    vector = vectorize_text(text_content)
    vector_json = json.dumps(vector)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if already exists to perform upsert
        cursor.execute(
            "SELECT id FROM vector_records WHERE entity_id = ? AND entity_type = ?;",
            (entity_id, entity_type)
        )
        row = cursor.fetchone()

        if row:
            cursor.execute("""
                UPDATE vector_records
                SET text_content = ?, vector_data = ?, created_at = ?
                WHERE entity_id = ? AND entity_type = ?;
            """, (text_content, vector_json, _utcnow(), entity_id, entity_type))
        else:
            rec_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO vector_records (id, entity_id, entity_type, text_content, vector_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (rec_id, entity_id, entity_type, text_content, vector_json, _utcnow()))
        conn.commit()
    except Exception as e:
        logger.error("[Vector Index] Failed to index entity %s (%s): %s", entity_id, entity_type, e)
    finally:
        conn.close()


def remove_text_entity(entity_id: str) -> None:
    """Remove entity from vector search database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM vector_records WHERE entity_id = ?;", (entity_id,))
        conn.commit()
    except Exception as e:
        logger.error("[Vector Index] Failed to remove entity %s: %s", entity_id, e)
    finally:
        conn.close()


# ─── Semantic Search ─────────────────────────────────────────────────────────

def semantic_search(query: str, limit: int = 5, entity_type: Optional[str] = None) -> list[dict]:
    """
    Search the vector database for semantically similar entities.
    Returns matched records with a cosine similarity score.
    """
    if not query or not query.strip():
        return []

    query_vector = vectorize_text(query)

    conn = get_db_connection()
    cursor = conn.cursor()
    results = []

    try:
        # Retrieve all records (filtered by type if specified)
        if entity_type:
            cursor.execute(
                "SELECT entity_id, entity_type, text_content, vector_data, created_at FROM vector_records WHERE entity_type = ?;",
                (entity_type,)
            )
        else:
            cursor.execute("SELECT entity_id, entity_type, text_content, vector_data, created_at FROM vector_records;")

        rows = cursor.fetchall()
        for row in rows:
            entity_id, ent_type, content, vec_json, created_at = row
            try:
                doc_vector = json.loads(vec_json)
                similarity = cosine_similarity(query_vector, doc_vector)
                if similarity > 0.05:  # Relevance threshold
                    results.append({
                        "entity_id": entity_id,
                        "entity_type": ent_type,
                        "text_content": content,
                        "similarity": similarity,
                        "created_at": created_at
                    })
            except Exception as parse_err:
                logger.warning("[Vector Search] Parse error for vector record %s: %s", entity_id, parse_err)

        # Sort results by similarity score descending
        results.sort(key=lambda x: x["similarity"], reverse=True)
    except Exception as e:
        logger.error("[Vector Search] Query failed: %s", e)
    finally:
        conn.close()

    return results[:limit]


# ─── Synchronisation Batch Hook ──────────────────────────────────────────────

def full_database_reindex() -> dict[str, int]:
    """Scan cases, evidence, and timeline tables and sync everything to vector_records."""
    stats = {"cases": 0, "evidence": 0, "timeline": 0}
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Index cases
        cursor.execute("SELECT id, case_number, title, description FROM cases;")
        cases = cursor.fetchall()
        for c in cases:
            text = f"Case {c[1]}: {c[2]}. Description: {c[3] or ''}"
            index_text_entity(c[0], "case", text)
            stats["cases"] += 1

        # 2. Index evidence
        cursor.execute("SELECT id, filename, file_hash, file_type, file_size FROM evidence;")
        evidence = cursor.fetchall()
        for e in evidence:
            text = f"Evidence File: {e[1]}. Hash: {e[2]}. Type: {e[3]}. Size: {e[4]} bytes."
            index_text_entity(e[0], "evidence", text)
            stats["evidence"] += 1

        # 3. Index timeline events
        cursor.execute("SELECT id, event_type, description, user FROM timeline;")
        timeline = cursor.fetchall()
        for t in timeline:
            text = f"Timeline Event: {t[1]}. Details: {t[2]}. Auditor/User: {t[3]}."
            index_text_entity(t[0], "timeline_event", text)
            stats["timeline"] += 1

        logger.info("[Vector Reindex] Reindexed all database records: %s", stats)
    except Exception as e:
        logger.error("[Vector Reindex] Batch sync failed: %s", e)
    finally:
        conn.close()

    return stats
