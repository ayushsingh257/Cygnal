"""
Cygnal Secrets Management — Base Provider Interface
Defines the contract for secret management providers (Env, GCP Secret Manager, HashiCorp Vault).
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BaseSecretsProvider(ABC):
    """Abstract base class for secret management backends."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Identifier for the secret provider backend."""
        pass

    @abstractmethod
    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Retrieves the secret value for the given key.
        Returns `default` if the key is not present.
        """
        pass

    def get_required_secret(self, key: str) -> str:
        """
        Retrieves a mandatory secret. Raises ValueError if missing or empty.
        """
        val = self.get_secret(key)
        if not val or not str(val).strip():
            raise ValueError(f"CRITICAL: Mandatory secret '{key}' is not configured in {self.provider_name} provider.")
        return val

    @abstractmethod
    def list_versions(self, key: str) -> List[str]:
        """
        Lists available version identifiers for a secret.
        """
        pass

    @abstractmethod
    def rotate_secret(self, key: str, new_value: str) -> bool:
        """
        Pushes a new version of the secret into the provider backend.
        """
        pass

    def health_check(self) -> Dict[str, Any]:
        """
        Performs a provider connectivity/health diagnostic.
        """
        return {
            "provider": self.provider_name,
            "status": "healthy"
        }
