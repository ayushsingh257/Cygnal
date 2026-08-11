"""
Cygnal Google Cloud Storage (GCS) Provider
Stores encrypted binary artifacts in Google Cloud Storage buckets.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from services.storage.base import BaseStorageProvider

class GCSStorageProvider(BaseStorageProvider):
    def __init__(self, bucket_name: Optional[str] = None, project_id: Optional[str] = None):
        self.bucket_name = bucket_name or os.getenv("CYGNAL_GCS_BUCKET", "cygnal-evidence-vault-gcs")
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", None)
        
        self._client = None
        self._bucket = None
        self._in_memory_fallback = {}

    def _get_bucket(self):
        if self._bucket is None:
            try:
                from google.cloud import storage
                self._client = storage.Client(project=self.project_id)
                self._bucket = self._client.bucket(self.bucket_name)
            except Exception:
                self._bucket = None
        return self._bucket

    def save(self, storage_path: str, data: bytes, content_type: Optional[str] = None) -> str:
        bucket = self._get_bucket()
        if bucket:
            try:
                blob = bucket.blob(storage_path)
                blob.upload_from_string(data, content_type=content_type or "application/octet-stream")
                return storage_path
            except Exception:
                self._in_memory_fallback[storage_path] = data
                return storage_path
        else:
            self._in_memory_fallback[storage_path] = data
            return storage_path

    def retrieve(self, storage_path: str) -> bytes:
        bucket = self._get_bucket()
        if bucket:
            try:
                blob = bucket.blob(storage_path)
                return blob.download_as_bytes()
            except Exception:
                if storage_path in self._in_memory_fallback:
                    return self._in_memory_fallback[storage_path]
                raise FileNotFoundError(f"GCS Object not found: {storage_path}")
        else:
            if storage_path in self._in_memory_fallback:
                return self._in_memory_fallback[storage_path]
            raise FileNotFoundError(f"GCS Object not found in storage: {storage_path}")

    def delete(self, storage_path: str) -> bool:
        bucket = self._get_bucket()
        if bucket:
            try:
                blob = bucket.blob(storage_path)
                blob.delete()
                self._in_memory_fallback.pop(storage_path, None)
                return True
            except Exception:
                return False
        else:
            if storage_path in self._in_memory_fallback:
                del self._in_memory_fallback[storage_path]
                return True
            return False

    def exists(self, storage_path: str) -> bool:
        bucket = self._get_bucket()
        if bucket:
            try:
                blob = bucket.blob(storage_path)
                return blob.exists()
            except Exception:
                return storage_path in self._in_memory_fallback
        else:
            return storage_path in self._in_memory_fallback

    def metadata(self, storage_path: str) -> Dict[str, Any]:
        bucket = self._get_bucket()
        if bucket:
            try:
                blob = bucket.blob(storage_path)
                blob.reload()
                return {
                    "provider": "gcs",
                    "bucket": self.bucket_name,
                    "storage_path": storage_path,
                    "size_bytes": blob.size or 0,
                    "last_modified": blob.updated.isoformat() if blob.updated else datetime.now(timezone.utc).isoformat(),
                    "is_encrypted": True
                }
            except Exception:
                pass
        
        if storage_path in self._in_memory_fallback:
            return {
                "provider": "gcs_fallback",
                "bucket": self.bucket_name,
                "storage_path": storage_path,
                "size_bytes": len(self._in_memory_fallback[storage_path]),
                "last_modified": datetime.now(timezone.utc).isoformat(),
                "is_encrypted": True
            }
        raise FileNotFoundError(f"GCS Object not found: {storage_path}")
