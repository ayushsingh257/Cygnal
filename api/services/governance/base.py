"""
Cygnal Data Governance & Automated Retention — Base Domain Models & Enums
Defines core data structures, classification levels, lifecycle actions, and records.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

class DataClassification(str, Enum):
    """Supported Enterprise Data Classification levels."""
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"
    TOP_SECRET = "TOP_SECRET"

    @classmethod
    def from_str(cls, value: str) -> "DataClassification":
        try:
            return cls[value.strip().upper()]
        except (KeyError, AttributeError):
            return cls.INTERNAL

    @classmethod
    def list_levels(cls) -> List[str]:
        return [level.value for level in cls]


class LifecycleAction(str, Enum):
    """Actions performed on data upon retention expiration."""
    ARCHIVE = "ARCHIVE"
    DELETE = "DELETE"
    ANONYMIZE = "ANONYMIZE"

    @classmethod
    def from_str(cls, value: str) -> "LifecycleAction":
        try:
            return cls[value.strip().upper()]
        except (KeyError, AttributeError):
            return cls.ARCHIVE


class ResourceType(str, Enum):
    """Resources subject to data governance and lifecycle policies."""
    CASES = "cases"
    EVIDENCE = "evidence"
    REPORTS = "reports"
    AUDIT_LOGS = "audit_logs"
    VECTOR_RECORDS = "vector_records"

    @classmethod
    def from_str(cls, value: str) -> "ResourceType":
        val_clean = value.strip().lower()
        # Handle singular forms gracefully
        mapping = {
            "case": cls.CASES,
            "cases": cls.CASES,
            "evidence": cls.EVIDENCE,
            "report": cls.REPORTS,
            "reports": cls.REPORTS,
            "audit_log": cls.AUDIT_LOGS,
            "audit_logs": cls.AUDIT_LOGS,
            "vector_record": cls.VECTOR_RECORDS,
            "vector_records": cls.VECTOR_RECORDS,
        }
        if val_clean in mapping:
            return mapping[val_clean]
        return cls.CASES


@dataclass
class RetentionPolicy:
    """Enterprise retention policy specification."""
    id: str
    tenant_id: int
    resource_type: str
    classification_level: str
    retention_days: int
    action_after_expiry: str
    enabled: bool = True
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "resource_type": self.resource_type,
            "classification_level": self.classification_level,
            "retention_days": self.retention_days,
            "action_after_expiry": self.action_after_expiry,
            "enabled": self.enabled,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class DeletionRecord:
    """Cryptographically verifiable record of secure data destruction."""
    id: str
    tenant_id: int
    resource_type: str
    resource_id: str
    deletion_reason: str
    deleted_by: str
    deleted_at: str
    verification_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "deletion_reason": self.deletion_reason,
            "deleted_by": self.deleted_by,
            "deleted_at": self.deleted_at,
            "verification_hash": self.verification_hash
        }


@dataclass
class ExpiredResource:
    """Summary of a resource that has exceeded its retention policy duration."""
    resource_type: str
    resource_id: str
    tenant_id: int
    classification_level: str
    created_at: str
    age_days: int
    policy_id: str
    policy_retention_days: int
    action: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "tenant_id": self.tenant_id,
            "classification_level": self.classification_level,
            "created_at": self.created_at,
            "age_days": self.age_days,
            "policy_id": self.policy_id,
            "policy_retention_days": self.policy_retention_days,
            "action": self.action,
            "metadata": self.metadata
        }
