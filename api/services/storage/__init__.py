"""
Cygnal Storage Abstraction Layer Factory
Provides singleton access to the configured storage driver (Local, S3/MinIO, GCS).
"""

import os
from typing import Optional
from services.storage.base import BaseStorageProvider
from services.storage.local import LocalStorageProvider
from services.storage.s3 import S3StorageProvider
from services.storage.gcs import GCSStorageProvider

_active_storage_provider: Optional[BaseStorageProvider] = None

def get_storage_provider(provider_type: Optional[str] = None) -> BaseStorageProvider:
    """
    Returns the active storage provider instance.
    Configured via STORAGE_PROVIDER environment variable ('local', 's3', 'gcs').
    Default: 'local' (LocalStorageProvider).
    """
    global _active_storage_provider
    target_type = (provider_type or os.getenv("STORAGE_PROVIDER", "local")).lower().strip()
    
    if _active_storage_provider is not None and provider_type is None:
        return _active_storage_provider
        
    if target_type in ("s3", "minio"):
        provider = S3StorageProvider()
    elif target_type in ("gcs", "google"):
        provider = GCSStorageProvider()
    else:
        provider = LocalStorageProvider()
        
    if provider_type is None:
        _active_storage_provider = provider
        
    return provider

def reset_storage_provider():
    """Resets cached storage provider instance (useful for testing)."""
    global _active_storage_provider
    _active_storage_provider = None
