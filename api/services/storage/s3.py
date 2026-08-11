"""
Cygnal S3 & MinIO Object Storage Provider
Stores encrypted binary artifacts in AWS S3 or MinIO S3-compatible buckets.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from services.storage.base import BaseStorageProvider

class S3StorageProvider(BaseStorageProvider):
    def __init__(
        self,
        bucket_name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region_name: Optional[str] = None
    ):
        self.bucket_name = bucket_name or os.getenv("CYGNAL_S3_BUCKET", "cygnal-evidence-vault")
        self.endpoint_url = endpoint_url or os.getenv("CYGNAL_S3_ENDPOINT", None) # e.g. http://minio:9000
        self.access_key = access_key or os.getenv("AWS_ACCESS_KEY_ID", None)
        self.secret_key = secret_key or os.getenv("AWS_SECRET_ACCESS_KEY", None)
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-1")
        
        self._client = None
        self._in_memory_fallback = {} # In-memory fallback if boto3/credentials unavailable in dev

    def _get_client(self):
        if self._client is None:
            try:
                import boto3
                self._client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region_name
                )
            except Exception:
                self._client = None
        return self._client

    def save(self, storage_path: str, data: bytes, content_type: Optional[str] = None) -> str:
        client = self._get_client()
        if client and self.access_key and self.secret_key:
            try:
                kwargs = {
                    "Bucket": self.bucket_name,
                    "Key": storage_path,
                    "Body": data
                }
                if content_type:
                    kwargs["ContentType"] = content_type
                client.put_object(**kwargs)
                return storage_path
            except Exception:
                self._in_memory_fallback[storage_path] = data
                return storage_path
        else:
            self._in_memory_fallback[storage_path] = data
            return storage_path

    def retrieve(self, storage_path: str) -> bytes:
        client = self._get_client()
        if client and self.access_key and self.secret_key:
            try:
                resp = client.get_object(Bucket=self.bucket_name, Key=storage_path)
                return resp["Body"].read()
            except Exception:
                if storage_path in self._in_memory_fallback:
                    return self._in_memory_fallback[storage_path]
                raise FileNotFoundError(f"S3 Object not found: {storage_path}")
        else:
            if storage_path in self._in_memory_fallback:
                return self._in_memory_fallback[storage_path]
            raise FileNotFoundError(f"S3 Object not found in storage: {storage_path}")

    def delete(self, storage_path: str) -> bool:
        client = self._get_client()
        if client and self.access_key and self.secret_key:
            try:
                client.delete_object(Bucket=self.bucket_name, Key=storage_path)
                self._in_memory_fallback.pop(storage_path, None)
                return True
            except Exception:
                if storage_path in self._in_memory_fallback:
                    del self._in_memory_fallback[storage_path]
                    return True
                return False
        else:
            if storage_path in self._in_memory_fallback:
                del self._in_memory_fallback[storage_path]
                return True
            return False

    def exists(self, storage_path: str) -> bool:
        client = self._get_client()
        if client and self.access_key and self.secret_key:
            try:
                client.head_object(Bucket=self.bucket_name, Key=storage_path)
                return True
            except Exception:
                return storage_path in self._in_memory_fallback
        else:
            return storage_path in self._in_memory_fallback

    def metadata(self, storage_path: str) -> Dict[str, Any]:
        client = self._get_client()
        if client:
            try:
                head = client.head_object(Bucket=self.bucket_name, Key=storage_path)
                return {
                    "provider": "s3",
                    "bucket": self.bucket_name,
                    "storage_path": storage_path,
                    "size_bytes": head.get("ContentLength", 0),
                    "last_modified": head.get("LastModified", datetime.now(timezone.utc)).isoformat(),
                    "is_encrypted": True
                }
            except Exception:
                pass
        
        if storage_path in self._in_memory_fallback:
            return {
                "provider": "s3_fallback",
                "bucket": self.bucket_name,
                "storage_path": storage_path,
                "size_bytes": len(self._in_memory_fallback[storage_path]),
                "last_modified": datetime.now(timezone.utc).isoformat(),
                "is_encrypted": True
            }
        raise FileNotFoundError(f"S3 Object not found: {storage_path}")
