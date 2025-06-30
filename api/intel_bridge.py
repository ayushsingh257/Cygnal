# intel_bridge.py
import json
from datetime import datetime
import sqlite3
from database import insert_lookup_log

DB_PATH = "lookup_logs.db"

def query_intel_bridge(indicator: str, username: str = "unknown", ip: str = "unknown"):
    # Simulate threat intel query
    result = {
        "indicator": indicator,
        "tags": ["APT28", "malware", "C2"],
        "risk_score": 78,
        "source": "Custom Threat Feed",
        "related_hashes": ["abc123", "def456"]
    }

    # Log to database using existing insert_lookup_log function
    insert_lookup_log(
        username,
        ip,
        "Custom Threat Intelligence",
        {"indicator": indicator},
        result
    )

    return result