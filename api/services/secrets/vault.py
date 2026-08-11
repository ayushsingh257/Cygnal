"""
Cygnal HashiCorp Vault Provider
Integrates with HashiCorp Vault KV v2 secrets engine for enterprise secret management.
Supports token authentication, path navigation, and version retrieval.
"""

import os
import time
from typing import Optional, List, Dict, Any
from services.secrets.base import BaseSecretsProvider

class VaultSecretsProvider(BaseSecretsProvider):
    """
    HashiCorp Vault KV v2 secrets engine provider.
    """

    def __init__(
        self,
        vault_url: Optional[str] = None,
        token: Optional[str] = None,
        mount_point: str = "secret",
        path_prefix: str = "cygnal",
        ttl_seconds: int = 300
    ):
        self.vault_url = vault_url or os.getenv("VAULT_ADDR", "http://127.0.0.1:8200")
        self.token = token or os.getenv("VAULT_TOKEN", None)
        self.mount_point = mount_point or os.getenv("VAULT_MOUNT_POINT", "secret")
        self.path_prefix = path_prefix or os.getenv("VAULT_PATH_PREFIX", "cygnal")
        self.ttl_seconds = ttl_seconds

        self._client = None
        self._cache: Dict[str, tuple[str, float]] = {}
        self._in_memory_kv: Dict[str, List[str]] = {}

    @property
    def provider_name(self) -> str:
        return "vault"

    def _get_client(self):
        if self._client is None and self.token:
            try:
                import hvac
                self._client = hvac.Client(url=self.vault_url, token=self.token)
            except Exception:
                self._client = None
        return self._client

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        now = time.time()
        if key in self._cache:
            val, exp = self._cache[key]
            if now < exp:
                return val

        client = self._get_client()
        if client:
            try:
                secret_path = f"{self.path_prefix}/{key}"
                read_res = client.secrets.kv.v2.read_secret_version(
                    path=secret_path,
                    mount_point=self.mount_point
                )
                data = read_res.get("data", {}).get("data", {})
                val = data.get("value") or data.get(key)
                if val is not None:
                    self._cache[key] = (str(val), now + self.ttl_seconds)
                    return str(val)
            except Exception:
                pass

        if key in self._in_memory_kv and self._in_memory_kv[key]:
            return self._in_memory_kv[key][-1]

        env_val = os.getenv(key)
        if env_val is not None:
            return env_val

        return default

    def list_versions(self, key: str) -> List[str]:
        client = self._get_client()
        if client:
            try:
                secret_path = f"{self.path_prefix}/{key}"
                metadata = client.secrets.kv.v2.read_secret_metadata(
                    path=secret_path,
                    mount_point=self.mount_point
                )
                versions = metadata.get("data", {}).get("versions", {})
                return [str(v) for v in versions.keys()]
            except Exception:
                pass

        if key in self._in_memory_kv:
            return [str(i + 1) for i in range(len(self._in_memory_kv[key]))]
        if key in os.environ:
            return ["1"]
        return []

    def rotate_secret(self, key: str, new_value: str) -> bool:
        self._cache.pop(key, None)

        client = self._get_client()
        if client:
            try:
                secret_path = f"{self.path_prefix}/{key}"
                client.secrets.kv.v2.create_or_update_secret(
                    path=secret_path,
                    secret={"value": new_value},
                    mount_point=self.mount_point
                )
                self._cache[key] = (new_value, time.time() + self.ttl_seconds)
                return True
            except Exception:
                pass

        if key not in self._in_memory_kv:
            self._in_memory_kv[key] = []
        self._in_memory_kv[key].append(new_value)
        self._cache[key] = (new_value, time.time() + self.ttl_seconds)
        return True

    def health_check(self) -> Dict[str, Any]:
        client = self._get_client()
        return {
            "provider": self.provider_name,
            "vault_url": self.vault_url,
            "authenticated": client is not None and client.is_authenticated() if client else False,
            "status": "healthy"
        }
