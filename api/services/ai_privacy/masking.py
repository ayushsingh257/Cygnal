"""
Cygnal Data Masking Engine
Provides reversible and irreversible redaction strategies for PII, credentials,
secrets, tokens, and cyber investigation telemetry.
"""

import re
from typing import Dict, Any, Tuple, List
from .base import PrivacyFinding, PrivacyFindingType

class MaskingEngine:
    """Transforms raw sensitive text into sanitized and redacted strings."""

    @staticmethod
    def mask_email(email_str: str) -> str:
        """Transforms 'john.doe@gmail.com' -> 'j***@gmail.com'."""
        if "@" not in email_str:
            return "[REDACTED_EMAIL]"
        parts = email_str.split("@", 1)
        user_part = parts[0]
        domain_part = parts[1]
        if len(user_part) <= 1:
            masked_user = user_part + "***"
        else:
            masked_user = user_part[0] + "***"
        return f"{masked_user}@{domain_part}"

    @staticmethod
    def mask_ip(ip_str: str) -> str:
        """Transforms '192.168.1.25' -> '192.168.xxx.xxx'."""
        parts = ip_str.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.xxx.xxx"
        return "[REDACTED_IP]"

    @staticmethod
    def mask_phone(phone_str: str) -> str:
        """Transforms '+1-555-123-4567' -> '+1-555-***-4567'."""
        digits = re.sub(r'\D', '', phone_str)
        if len(digits) >= 10:
            last4 = digits[-4:]
            return f"***-***-{last4}"
        return "[REDACTED_PHONE]"

    @staticmethod
    def mask_ssn(ssn_str: str) -> str:
        """Transforms '123-45-6789' -> '***-**-6789'."""
        parts = ssn_str.split("-")
        if len(parts) == 3:
            return f"***-**-{parts[2]}"
        return "***-**-****"

    @classmethod
    def get_masked_value(cls, finding_type: str, original_value: str, reversible: bool = False, token_index: int = 1) -> str:
        """Computes replacement value based on finding type and mode."""
        if reversible:
            return f"<CYGNAL_SAN_TOKEN_{token_index:03d}_{finding_type}>"

        t = finding_type.upper()
        if t == PrivacyFindingType.EMAIL.value:
            return cls.mask_email(original_value)
        elif t in (PrivacyFindingType.IP_ADDRESS.value, PrivacyFindingType.INTERNAL_IP_RANGE.value):
            return cls.mask_ip(original_value)
        elif t == PrivacyFindingType.PHONE.value:
            return cls.mask_phone(original_value)
        elif t == PrivacyFindingType.GOVERNMENT_ID.value:
            return cls.mask_ssn(original_value)
        elif t == PrivacyFindingType.API_KEY.value:
            return "[REDACTED_API_KEY]"
        elif t == PrivacyFindingType.JWT_TOKEN.value:
            return "[REDACTED_TOKEN]"
        elif t == PrivacyFindingType.CLOUD_CREDENTIAL.value:
            return "[REDACTED_CLOUD_CREDENTIAL]"
        elif t == PrivacyFindingType.PASSWORD.value:
            return "[REDACTED_PASSWORD]"
        elif t == PrivacyFindingType.PRIVATE_KEY.value:
            return "[REDACTED_PRIVATE_KEY]"
        elif t == PrivacyFindingType.OAUTH_TOKEN.value:
            return "[REDACTED_OAUTH_TOKEN]"
        elif t == PrivacyFindingType.CASE_IDENTIFIER.value:
            return "[CASE_REF]"
        elif t == PrivacyFindingType.EVIDENCE_IDENTIFIER.value:
            return "[EVIDENCE_REF]"
        else:
            return f"[REDACTED_{t}]"

    @classmethod
    def apply_masking(
        cls,
        text: str,
        findings: List[PrivacyFinding],
        reversible: bool = False
    ) -> Tuple[str, Dict[str, str]]:
        """
        Replaces all detected sensitive spans in text with their masked equivalents.
        Returns (sanitized_text, token_map).
        """
        if not findings or not text:
            return text, {}

        # Work from right to left (descending start_pos) so string indices remain valid
        sorted_findings = sorted(findings, key=lambda f: f.start_pos, reverse=True)
        sanitized = text
        token_map: Dict[str, str] = {}

        for idx, f in enumerate(reversed(sorted_findings), start=1):
            masked = cls.get_masked_value(f.finding_type, f.original_value, reversible=reversible, token_index=idx)
            f.masked_value = masked
            if reversible:
                token_map[masked] = f.original_value

        for f in sorted_findings:
            start, end = f.start_pos, f.end_pos
            sanitized = sanitized[:start] + f.masked_value + sanitized[end:]

        return sanitized, token_map

    @staticmethod
    def restore_reversible_tokens(sanitized_text: str, token_map: Dict[str, str]) -> str:
        """Restores original values for reversible tokens in authorized workflows."""
        if not token_map or not sanitized_text:
            return sanitized_text
        restored = sanitized_text
        for token, original in token_map.items():
            restored = restored.replace(token, original)
        return restored
