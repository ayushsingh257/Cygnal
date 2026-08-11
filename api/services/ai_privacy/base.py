"""
Cygnal AI Privacy Controls & Zero-Data-Leakage Masking — Core Domain Models
Defines privacy finding classifications, severity matrices, and sanitization structures.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

class PrivacyFindingType(str, Enum):
    # Personal Identifiable Information (PII)
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    IP_ADDRESS = "IP_ADDRESS"
    NAME = "NAME"
    ADDRESS = "ADDRESS"
    GOVERNMENT_ID = "GOVERNMENT_ID"

    # Security Secrets & Credentials
    API_KEY = "API_KEY"
    JWT_TOKEN = "JWT_TOKEN"
    OAUTH_TOKEN = "OAUTH_TOKEN"
    PASSWORD = "PASSWORD"
    PRIVATE_KEY = "PRIVATE_KEY"
    CLOUD_CREDENTIAL = "CLOUD_CREDENTIAL"

    # Cyber Investigation & Infrastructure Data
    MALWARE_HASH = "MALWARE_HASH"
    INTERNAL_HOSTNAME = "INTERNAL_HOSTNAME"
    INTERNAL_IP_RANGE = "INTERNAL_IP_RANGE"
    CASE_IDENTIFIER = "CASE_IDENTIFIER"
    EVIDENCE_IDENTIFIER = "EVIDENCE_IDENTIFIER"

    @classmethod
    def from_str(cls, val: str) -> "PrivacyFindingType":
        try:
            return cls(val.upper().strip())
        except Exception:
            return cls.API_KEY


class PrivacySeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

    @classmethod
    def from_str(cls, val: str) -> "PrivacySeverity":
        try:
            return cls(val.upper().strip())
        except Exception:
            return cls.MEDIUM


class PrivacyAction(str, Enum):
    MASKED = "MASKED"
    REDACTED = "REDACTED"
    BLOCKED = "BLOCKED"
    SANITIZED = "SANITIZED"
    ANONYMIZED = "ANONYMIZED"


class PrivacyEventType(str, Enum):
    PROMPT_SANITIZED = "PROMPT_SANITIZED"
    SECRET_BLOCKED = "SECRET_BLOCKED"
    PII_MASKED = "PII_MASKED"
    RESPONSE_REDACTED = "RESPONSE_REDACTED"
    EMBEDDING_SANITIZED = "EMBEDDING_SANITIZED"


@dataclass
class PrivacyFinding:
    finding_type: str
    severity: str
    start_pos: int
    end_pos: int
    matched_pattern: str
    original_value: str
    masked_value: str
    is_secret: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_type": self.finding_type,
            "severity": self.severity,
            "start_pos": self.start_pos,
            "end_pos": self.end_pos,
            "matched_pattern": self.matched_pattern,
            "original_value": self.original_value,
            "masked_value": self.masked_value,
            "is_secret": self.is_secret
        }


@dataclass
class SanitizationResult:
    sanitized_text: str
    original_text: str
    findings: List[PrivacyFinding] = field(default_factory=list)
    has_critical_secrets: bool = False
    blocked: bool = False
    block_reason: Optional[str] = None
    tenant_id: int = 1
    user_id: str = "system"
    reversible_tokens: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sanitized_text": self.sanitized_text,
            "findings_count": len(self.findings),
            "findings": [f.to_dict() for f in self.findings],
            "has_critical_secrets": self.has_critical_secrets,
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "tokens_replaced": len(self.reversible_tokens)
        }


@dataclass
class PrivacyEventRecord:
    id: str
    tenant_id: int
    user_id: str
    event_type: str
    detected_category: str
    severity: str
    action_taken: str
    details: Dict[str, Any]
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "detected_category": self.detected_category,
            "severity": self.severity,
            "action_taken": self.action_taken,
            "details": self.details,
            "timestamp": self.timestamp
        }
