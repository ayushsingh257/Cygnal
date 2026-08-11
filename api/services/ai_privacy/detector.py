"""
Cygnal Sensitive Data Detection Engine
Provides high-performance regex and rule-based pattern matching for PII, credentials,
secrets, tokens, and cyber investigation telemetry.
"""

import re
from typing import List, Tuple, Dict, Any
from .base import PrivacyFinding, PrivacyFindingType, PrivacySeverity

# ─── Compiled Detection Patterns ──────────────────────────────────────────────

# 1. Credentials & Secrets (CRITICAL)
PAT_JWT = re.compile(r'\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b')
PAT_PRIVATE_KEY = re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----')
PAT_OPENAI_KEY = re.compile(r'\b(?:sk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}|sk_[A-Za-z0-9_]{16,})\b')
PAT_AWS_KEY = re.compile(r'\b(?:AKIA|ASIA|AROA)[0-9A-Z]{16}\b')
PAT_GITHUB_TOKEN = re.compile(r'\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|gho_[A-Za-z0-9]{36})\b')
PAT_GENERIC_KEY = re.compile(r'(?i)(?:api_key|apikey|api-key|secret_key|client_secret)\s*[:=]\s*["\']?([A-Za-z0-9_\-]{16,64})["\']?')
PAT_PASSWORD = re.compile(r'(?i)(?:password|passwd|pwd)\s*[:=]\s*["\']?([^\s"\'\n]{6,64})["\']?')

# 2. PII (Personal Identifiable Information)
PAT_EMAIL = re.compile(r'\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b')
PAT_PHONE = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
PAT_SSN = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')

# 3. Network & Infrastructure Data
PAT_PRIVATE_IP = re.compile(r'\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})\b')
PAT_IPV4 = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')

# 4. Cyber Investigation Identifiers
PAT_CASE_ID = re.compile(r'\bCYG-\d{4}-\d+\b', re.IGNORECASE)
PAT_EVIDENCE_ID = re.compile(r'\bev-[a-zA-Z0-9-]{6,}\b', re.IGNORECASE)


class SensitiveDataDetector:
    """Executes multi-class rule scans against input texts."""

    @staticmethod
    def detect(text: str) -> List[PrivacyFinding]:
        if not text:
            return []

        findings: List[PrivacyFinding] = []
        occupied_spans: List[Tuple[int, int]] = []

        def _overlaps(start: int, end: int) -> bool:
            for o_start, o_end in occupied_spans:
                if max(start, o_start) < min(end, o_end):
                    return True
            return False

        def _add_finding(finding_type: PrivacyFindingType, severity: PrivacySeverity, start: int, end: int, val: str, is_secret: bool = False):
            if _overlaps(start, end):
                return
            occupied_spans.append((start, end))
            findings.append(PrivacyFinding(
                finding_type=finding_type.value,
                severity=severity.value,
                start_pos=start,
                end_pos=end,
                matched_pattern=finding_type.name,
                original_value=val,
                masked_value="",  # will be computed by MaskingEngine
                is_secret=is_secret
            ))

        # ── Priority 1: Private Keys & Heavy Secrets (CRITICAL) ───────────────
        for m in PAT_PRIVATE_KEY.finditer(text):
            _add_finding(PrivacyFindingType.PRIVATE_KEY, PrivacySeverity.CRITICAL, m.start(), m.end(), m.group(0), is_secret=True)

        for m in PAT_JWT.finditer(text):
            _add_finding(PrivacyFindingType.JWT_TOKEN, PrivacySeverity.CRITICAL, m.start(), m.end(), m.group(0), is_secret=True)

        for m in PAT_GITHUB_TOKEN.finditer(text):
            _add_finding(PrivacyFindingType.API_KEY, PrivacySeverity.CRITICAL, m.start(), m.end(), m.group(0), is_secret=True)

        for m in PAT_OPENAI_KEY.finditer(text):
            _add_finding(PrivacyFindingType.API_KEY, PrivacySeverity.CRITICAL, m.start(), m.end(), m.group(0), is_secret=True)

        for m in PAT_AWS_KEY.finditer(text):
            _add_finding(PrivacyFindingType.CLOUD_CREDENTIAL, PrivacySeverity.CRITICAL, m.start(), m.end(), m.group(0), is_secret=True)

        for m in PAT_GENERIC_KEY.finditer(text):
            val = m.group(1) if m.groups() else m.group(0)
            _add_finding(PrivacyFindingType.API_KEY, PrivacySeverity.CRITICAL, m.start(), m.end(), val, is_secret=True)

        for m in PAT_PASSWORD.finditer(text):
            val = m.group(1) if m.groups() else m.group(0)
            _add_finding(PrivacyFindingType.PASSWORD, PrivacySeverity.CRITICAL, m.start(), m.end(), val, is_secret=True)

        # ── Priority 2: PII (HIGH / MEDIUM) ──────────────────────────────────
        for m in PAT_SSN.finditer(text):
            _add_finding(PrivacyFindingType.GOVERNMENT_ID, PrivacySeverity.HIGH, m.start(), m.end(), m.group(0), is_secret=False)

        for m in PAT_EMAIL.finditer(text):
            _add_finding(PrivacyFindingType.EMAIL, PrivacySeverity.MEDIUM, m.start(), m.end(), m.group(0), is_secret=False)

        for m in PAT_PHONE.finditer(text):
            # Guard against short date/time strings
            val = m.group(0).strip()
            digits = re.sub(r'\D', '', val)
            if len(digits) >= 10:
                _add_finding(PrivacyFindingType.PHONE, PrivacySeverity.MEDIUM, m.start(), m.end(), val, is_secret=False)

        # ── Priority 3: Network & Investigation Telemetry (MEDIUM / LOW) ──────
        for m in PAT_PRIVATE_IP.finditer(text):
            _add_finding(PrivacyFindingType.INTERNAL_IP_RANGE, PrivacySeverity.MEDIUM, m.start(), m.end(), m.group(0), is_secret=False)

        for m in PAT_IPV4.finditer(text):
            _add_finding(PrivacyFindingType.IP_ADDRESS, PrivacySeverity.LOW, m.start(), m.end(), m.group(0), is_secret=False)

        for m in PAT_CASE_ID.finditer(text):
            _add_finding(PrivacyFindingType.CASE_IDENTIFIER, PrivacySeverity.LOW, m.start(), m.end(), m.group(0), is_secret=False)

        for m in PAT_EVIDENCE_ID.finditer(text):
            _add_finding(PrivacyFindingType.EVIDENCE_IDENTIFIER, PrivacySeverity.LOW, m.start(), m.end(), m.group(0), is_secret=False)

        # Sort findings by starting index ascending
        findings.sort(key=lambda x: x.start_pos)
        return findings
