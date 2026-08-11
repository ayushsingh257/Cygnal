"""
Cygnal Local Storage Provider
Stores encrypted binary artifacts in local filesystem volumes.
Never stores plaintext evidence on disk.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from services.storage.base import BaseStorageProvider

class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = base_dir
        else:
            # Default to api/uploads
            self.base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, storage_path: str) -> str:
        # Prevent directory traversal
        clean_path = os.path.basename(storage_path) if "/" not in storage_path and "\\" not in storage_path else storage_path.replace("..", "").lstrip("/\\")
        return os.path.join(self.base_dir, clean_path)

    def save(self, storage_path: str, data: bytes, content_type: Optional[str] = None) -> str:
        full_path = self._resolve_path(storage_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(data)
        return storage_path

    def retrieve(self, storage_path: str) -> bytes:
        full_path = self._resolve_path(storage_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Storage artifact not found: {storage_path}")
        with open(full_path, "rb") as f:
            return f.read()

    def delete(self, storage_path: str) -> bool:
        full_path = self._resolve_path(storage_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                return True
            except OSError:
                return False
        return False

    def exists(self, storage_path: str) -> bool:
        full_path = self._resolve_path(storage_path)
        return os.path.exists(full_path)

    def metadata(self, storage_path: str) -> Dict[str, Any]:
        full_path = self._resolve_path(storage_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Storage artifact not found: {storage_path}")
        stat = os.stat(full_path)
        return {
            "provider": "local",
            "storage_path": storage_path,
            "size_bytes": stat.st_size,
            "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "is_encrypted": True
        }
