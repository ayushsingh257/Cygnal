"""
Phase 3 Tests — Enterprise AI Platform (Vector DB, RAG Semantic Search, Multi-Agent Planning, Confidence Scoring)
"""
import pytest
import json
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app as flask_app
from database import init_lookup_db
from auth_utils import init_db

from services.vector_service import (
    vectorize_text, cosine_similarity, index_text_entity,
    semantic_search, full_database_reindex
)
from services.copilot import (
    classify_intent, calculate_confidence, build_investigation_plan,
    process_copilot_message
)


@pytest.fixture(autouse=True)
def setup_database():
    init_lookup_db()
    init_db()
    # Clear vector records to isolate test cases
    from db_utils import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM vector_records;")
    conn.commit()
    conn.close()


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


@pytest.fixture
def auth_token(client):
    res = client.post("/api/login", json={"username": "Ayush Singh", "password": "Duster@2004"})
    return res.get_json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Pure Python Vector Embedding & Similarity Checks
# ─────────────────────────────────────────────────────────────────────────────

def test_vectorization_produces_128_dims():
    text = "The malware scanner detected a C2 command and control connection on IP 1.2.3.4."
    vector = vectorize_text(text)
    assert isinstance(vector, list)
    assert len(vector) == 128
    assert any(v > 0.0 for v in vector)

def test_empty_vectorization():
    vector = vectorize_text("")
    assert len(vector) == 128
    assert all(v == 0.0 for v in vector)

def test_cosine_similarity_identity():
    v1 = vectorize_text("critical malware infection detected")
    sim = cosine_similarity(v1, v1)
    assert pytest.approx(sim, 0.01) == 1.0

def test_cosine_similarity_orthogonal():
    # Completely different texts
    v1 = vectorize_text("malware ransomware")
    v2 = vectorize_text("azure entra oidc")
    sim = cosine_similarity(v1, v2)
    assert sim < 0.2


# ─────────────────────────────────────────────────────────────────────────────
# 2. Vector DB Storage & Semantic Search Retrieval
# ─────────────────────────────────────────────────────────────────────────────

def test_vector_indexing_and_semantic_search():
    index_text_entity("case-uuid-1", "case", "Malicious C2 callback botnet connection found on critical assets")
    index_text_entity("case-uuid-2", "case", "Regular user session login authentication check")

    # Search for malware related
    results = semantic_search("botnet command control malware", limit=2)
    assert len(results) >= 1
    assert results[0]["entity_id"] == "case-uuid-1"
    assert results[0]["similarity"] > 0.1

    # Search for login related
    results2 = semantic_search("user authenticate session", limit=2)
    assert len(results2) >= 1
    assert results2[0]["entity_id"] == "case-uuid-2"

def test_database_batch_reindex():
    stats = full_database_reindex()
    assert isinstance(stats, dict)
    assert "cases" in stats
    assert "evidence" in stats
    assert "timeline" in stats


# ─────────────────────────────────────────────────────────────────────────────
# 3. Multi-Agent Planning & Validation checks
# ─────────────────────────────────────────────────────────────────────────────

def test_multi_agent_plan_creation():
    iocs = [
        {"type": "ip", "value": "1.2.3.4", "confidence": 90},
        {"type": "hash", "value": "abc123sha256", "confidence": 95}
    ]
    plan = build_investigation_plan(iocs)
    
    assert plan["total_scanners"] >= 4
    assert "agents_plan" in plan
    
    agents = plan["agents_plan"]
    assert len(agents) == 4
    
    # Check roles
    agent_names = [a["agent"] for a in agents]
    assert "Recon & OSINT Agent" in agent_names
    assert "Malware Analysis Agent" in agent_names
    assert "Identity Auditor" in agent_names
    assert "Executive Compiler" in agent_names

    # Check tasks assignment
    recon = next(a for a in agents if a["agent"] == "Recon & OSINT Agent")
    assert len(recon["tasks"]) >= 2
    assert any("DNS" in t["task"] for t in recon["tasks"])


# ─────────────────────────────────────────────────────────────────────────────
# 4. Upgraded Confidence Scoring Engine
# ─────────────────────────────────────────────────────────────────────────────

def test_confidence_scoring_calculation():
    # Scenario A: minimal context
    context_low = {
        "indicators": [],
        "lookups": [],
        "evidence": [],
        "timeline": [],
        "memories": []
    }
    score_low = calculate_confidence([], context_low)
    assert score_low == 10  # Base fallback score

    # Scenario B: high intelligence matching + evidence + semantic memories
    context_high = {
        "indicators": [{"value": "1.2.3.4", "type": "ip"}],
        "lookups": [{"tool": "virustotal", "input": "1.2.3.4", "result": "verdict: malicious"}],
        "evidence": [{"filename": "log.csv"}],
        "timeline": [{"event_type": "evidence_uploaded", "description": "some info"}],
        "memories": [{"similarity": 0.8, "text_content": "Matching botnet log info"}]
    }
    score_high = calculate_confidence([], context_high)
    assert score_high >= 70
    assert score_high <= 95


# ─────────────────────────────────────────────────────────────────────────────
# 5. REST API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

def test_semantic_search_endpoint_auth(client):
    res = client.get("/api/ai/semantic-search?query=malware")
    assert res.status_code == 401

def test_semantic_search_endpoint_query(client, auth_headers):
    # Register some vector data first
    index_text_entity("uuid-1", "case", "Active directory malware campaign attack")
    
    res = client.get("/api/ai/semantic-search?query=directory+malware", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["results"]) >= 1

def test_memory_sync_endpoint(client, auth_headers):
    res = client.post("/api/ai/memory/sync", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "stats" in data
