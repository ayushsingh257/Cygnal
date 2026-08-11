"""
Cygnal Storage Abstraction Layer — Base Interface
Defines the contract for object/file storage providers (Local, S3/MinIO, GCS).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseStorageProvider(ABC):
    """Abstract base class for evidence storage providers."""

    @abstractmethod
    def save(self, storage_path: str, data: bytes, content_type: Optional[str] = None) -> str:
        """
        Stores binary data at the designated path.
        Returns the resolved storage path / key.
        """
        pass

    @abstractmethod
    def retrieve(self, storage_path: str) -> bytes:
        """
        Retrieves binary data from the designated path.
        Raises FileNotFoundError if the artifact does not exist.
        """
        pass

    @abstractmethod
    def delete(self, storage_path: str) -> bool:
        """
        Deletes the object at the designated path.
        Returns True if deleted, False otherwise.
        """
        pass

    @abstractmethod
    def exists(self, storage_path: str) -> bool:
        """
        Checks whether an object exists at the designated path.
        """
        pass

    @abstractmethod
    def metadata(self, storage_path: str) -> Dict[str, Any]:
        """
        Returns metadata (size, last_modified, provider) for the stored object.
        """
        pass
