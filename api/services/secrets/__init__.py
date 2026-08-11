"""
Cygnal Enterprise Secrets Manager Factory & Audit Logging
Provides centralized secret access, provider switching (Env, GCP, Vault),
secret access audit tracking (without exposing values), and production startup validation.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from services.secrets.base import BaseSecretsProvider
from services.secrets.env import EnvSecretsProvider
from services.secrets.gcp import GCPSecretManagerProvider
from services.secrets.vault import VaultSecretsProvider

logger = logging.getLogger("cygnal.security.secrets")

_active_secrets_provider: Optional[BaseSecretsProvider] = None
_secret_access_audit_log: List[Dict[str, Any]] = []

def get_secrets_manager(provider_type: Optional[str] = None) -> BaseSecretsProvider:
    """
    Returns the active secrets provider instance.
    Configured via SECRET_PROVIDER environment variable ('env', 'gcp', 'vault').
    Default: 'env' (EnvSecretsProvider).
    """
    global _active_secrets_provider
    target_type = (provider_type or os.getenv("SECRET_PROVIDER", "env")).lower().strip()

    if _active_secrets_provider is not None and provider_type is None:
        return _active_secrets_provider

    if target_type in ("gcp", "google"):
        provider = GCPSecretManagerProvider()
    elif target_type in ("vault", "hashicorp"):
        provider = VaultSecretsProvider()
    else:
        provider = EnvSecretsProvider()

    if provider_type is None:
        _active_secrets_provider = provider

    return provider

def reset_secrets_manager():
    """Resets cached secrets provider (useful for testing)."""
    global _active_secrets_provider
    _active_secrets_provider = None

def get_secret(key: str, default: Optional[str] = None, requesting_service: str = "core") -> Optional[str]:
    """
    Convenience function: retrieves a secret and records an audit trail entry.
    Never logs secret plaintext values.
    """
    audit_secret_access(key, requesting_service)
    manager = get_secrets_manager()
    return manager.get_secret(key, default)

def get_required_secret(key: str, requesting_service: str = "core") -> str:
    """
    Retrieves a mandatory secret. Raises ValueError if missing or empty.
    """
    audit_secret_access(key, requesting_service)
    manager = get_secrets_manager()
    return manager.get_required_secret(key)

def audit_secret_access(secret_key: str, requesting_service: str = "core"):
    """
    Records an access event for a secret without exposing its value.
    """
    record = {
        "secret_key": secret_key,
        "requesting_service": requesting_service,
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "provider": get_secrets_manager().provider_name,
        "environment": os.getenv("ENVIRONMENT", "development")
    }
    _secret_access_audit_log.append(record)
    if len(_secret_access_audit_log) > 1000:
        _secret_access_audit_log.pop(0)
    logger.debug("[SECRETS AUDIT] Service '%s' accessed secret '%s'", requesting_service, secret_key)

def get_secret_access_audit_log() -> List[Dict[str, Any]]:
    """Returns historical secret access records."""
    return list(_secret_access_audit_log)

def validate_production_secrets() -> bool:
    """
    Validates required secrets on application boot if running in production mode.
    Raises RuntimeError if critical secrets are missing or unconfigured.
    """
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env not in ("production", "prod"):
        return True

    required_secrets = [
        "JWT_SECRET",
        "CYGNAL_MASTER_KEK"
    ]

    manager = get_secrets_manager()
    missing = []
    for sec in required_secrets:
        val = manager.get_secret(sec)
        if not val or not str(val).strip() or "CHANGE_ME" in str(val):
            missing.append(sec)

    if missing:
        error_msg = f"CRITICAL PRODUCTION STARTUP FAILURE: The following mandatory secrets are missing or default in {manager.provider_name}: {', '.join(missing)}"
        logger.critical(error_msg)
        raise RuntimeError(error_msg)

    return True
