"""
Cygnal Environment Secrets Provider
Loads secrets from environment variables and .env files for development and testing.
Clearly designated as a non-production provider.
"""

import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from services.secrets.base import BaseSecretsProvider

# Ensure .env is loaded
load_dotenv()

class EnvSecretsProvider(BaseSecretsProvider):
    """
    Development/testing secrets provider reading directly from os.environ.
    """

    @property
    def provider_name(self) -> str:
        return "env"

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        return os.getenv(key, default)

    def list_versions(self, key: str) -> List[str]:
        if key in os.environ:
            return ["current"]
        return []

    def rotate_secret(self, key: str, new_value: str) -> bool:
        # For local testing, update in-memory os.environ
        os.environ[key] = new_value
        return True

    def health_check(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": "healthy",
            "environment_mode": "development_or_test"
        }
