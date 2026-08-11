"""
Cygnal AI Privacy Gateway
Centralized orchestration layer for prompt sanitization, credential zero-leakage protection,
response leakage redaction, and RAG vector embedding privacy safeguards.
"""

import hashlib
from typing import Tuple, Dict, Any, List, Optional
from .base import (
    PrivacyFinding,
    PrivacyFindingType,
    PrivacySeverity,
    PrivacyEventType,
    SanitizationResult
)
from .detector import SensitiveDataDetector
from .masking import MaskingEngine
from .audit import AIPrivacyAudit

class AIPrivacyGateway:
    """Enterprise AI Privacy and Zero-Data-Leakage Protection Gateway."""

    @classmethod
    def sanitize_prompt(
        cls,
        prompt: str,
        user_id: str = "analyst",
        tenant_id: int = 1,
        target_provider: str = "external",
        strict_secret_blocking: bool = True
    ) -> SanitizationResult:
        """
        Scans and sanitizes user or agent prompts before transmission to an AI model.
        In strict mode, blocks transmission of raw private keys and master credentials.
        """
        if not prompt or not prompt.strip():
            return SanitizationResult(
                sanitized_text="",
                original_text="",
                findings=[],
                tenant_id=tenant_id,
                user_id=user_id
            )

        findings = SensitiveDataDetector.detect(prompt)
        has_critical = any(f.severity == PrivacySeverity.CRITICAL.value and f.is_secret for f in findings)

        # 1. Critical credential blocking check
        if has_critical and strict_secret_blocking and target_provider.lower() in ("external", "openai", "gemini", "anthropic"):
            critical_finding = next(f for f in findings if f.severity == PrivacySeverity.CRITICAL.value and f.is_secret)
            AIPrivacyAudit.log_event(
                event_type=PrivacyEventType.SECRET_BLOCKED.value,
                user_id=user_id,
                tenant_id=tenant_id,
                detected_category=critical_finding.finding_type,
                severity=PrivacySeverity.CRITICAL.value,
                action_taken="BLOCKED",
                details={
                    "finding_type": critical_finding.finding_type,
                    "target_provider": target_provider,
                    "blocked_reason": "Outbound credential leakage prevention"
                }
            )
            return SanitizationResult(
                sanitized_text="",
                original_text=prompt,
                findings=findings,
                has_critical_secrets=True,
                blocked=True,
                block_reason=f"Transmission blocked: Sensitive {critical_finding.finding_type} detected.",
                tenant_id=tenant_id,
                user_id=user_id
            )

        # 2. Masking execution
        reversible = (target_provider.lower() == "internal")
        sanitized_text, token_map = MaskingEngine.apply_masking(prompt, findings, reversible=reversible)

        # 3. Audit logging if modifications were made
        if findings:
            primary_cat = findings[0].finding_type
            max_sev = max((f.severity for f in findings), default="LOW")
            ev_type = PrivacyEventType.PROMPT_SANITIZED.value if any(f.is_secret for f in findings) else PrivacyEventType.PII_MASKED.value

            AIPrivacyAudit.log_event(
                event_type=ev_type,
                user_id=user_id,
                tenant_id=tenant_id,
                detected_category=primary_cat,
                severity=max_sev,
                action_taken="MASKED",
                details={
                    "total_findings": len(findings),
                    "finding_types": [f.finding_type for f in findings],
                    "target_provider": target_provider,
                    "reversible": reversible
                }
            )

        return SanitizationResult(
            sanitized_text=sanitized_text,
            original_text=prompt,
            findings=findings,
            has_critical_secrets=has_critical,
            blocked=False,
            tenant_id=tenant_id,
            user_id=user_id,
            reversible_tokens=token_map
        )

    @classmethod
    def sanitize_response(
        cls,
        response_text: str,
        user_id: str = "ai_model",
        tenant_id: int = 1
    ) -> SanitizationResult:
        """
        Scans AI-generated responses before returning them to the user.
        Catches and redacts accidental LLM hallucination/leakage of credentials or PII.
        """
        if not response_text:
            return SanitizationResult(
                sanitized_text="",
                original_text="",
                findings=[],
                tenant_id=tenant_id,
                user_id=user_id
            )

        findings = SensitiveDataDetector.detect(response_text)
        if not findings:
            return SanitizationResult(
                sanitized_text=response_text,
                original_text=response_text,
                findings=[],
                tenant_id=tenant_id,
                user_id=user_id
            )

        sanitized_text, _ = MaskingEngine.apply_masking(response_text, findings, reversible=False)

        AIPrivacyAudit.log_event(
            event_type=PrivacyEventType.RESPONSE_REDACTED.value,
            user_id=user_id,
            tenant_id=tenant_id,
            detected_category=findings[0].finding_type,
            severity=max((f.severity for f in findings), default="MEDIUM"),
            action_taken="REDACTED",
            details={
                "total_findings": len(findings),
                "finding_types": [f.finding_type for f in findings]
            }
        )

        return SanitizationResult(
            sanitized_text=sanitized_text,
            original_text=response_text,
            findings=findings,
            has_critical_secrets=any(f.is_secret for f in findings),
            blocked=False,
            tenant_id=tenant_id,
            user_id=user_id
        )

    @classmethod
    def sanitize_for_embedding(
        cls,
        text: str,
        user_id: str = "system",
        tenant_id: int = 1
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Sanitizes text prior to vector embedding calculation and storage in vector_records.
        Returns (sanitized_text, privacy_metadata).
        """
        if not text:
            return "", {
                "privacy_filtered": 1,
                "masking_applied": 0,
                "original_hash": hashlib.sha256(b"").hexdigest(),
                "findings_count": 0
            }

        original_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        findings = SensitiveDataDetector.detect(text)

        if not findings:
            return text, {
                "privacy_filtered": 1,
                "masking_applied": 0,
                "original_hash": original_hash,
                "findings_count": 0
            }

        sanitized_text, _ = MaskingEngine.apply_masking(text, findings, reversible=False)

        AIPrivacyAudit.log_event(
            event_type=PrivacyEventType.EMBEDDING_SANITIZED.value,
            user_id=user_id,
            tenant_id=tenant_id,
            detected_category=findings[0].finding_type,
            severity="LOW",
            action_taken="MASKED",
            details={
                "total_findings": len(findings),
                "original_hash": original_hash
            }
        )

        return sanitized_text, {
            "privacy_filtered": 1,
            "masking_applied": 1,
            "original_hash": original_hash,
            "findings_count": len(findings)
        }
