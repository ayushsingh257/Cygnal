"""
Cygnal Enterprise Identity Federation — Base Interface
Defines the standard contract for all Enterprise Identity Providers (OIDC, SAML, Entra ID, Google, Okta).
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class IdentityProfile:
    """Standardized user identity profile returned by all Identity Providers."""
    def __init__(
        self,
        external_id: str,
        email: str,
        username: str,
        groups: Optional[List[str]] = None,
        raw_claims: Optional[Dict[str, Any]] = None,
        tenant_id: int = 1,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None
    ):
        self.external_id = external_id
        self.email = email.lower().strip() if email else ""
        self.username = username or (self.email.split("@")[0] if self.email else external_id)
        self.groups = groups or []
        self.raw_claims = raw_claims or {}
        self.tenant_id = tenant_id
        self.first_name = first_name or ""
        self.last_name = last_name or ""

class BaseIdentityProvider(ABC):
    """Abstract Base Class for Enterprise Identity Providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique provider identifier (e.g., 'entra_id', 'google', 'okta', 'saml', 'oidc')."""
        pass

    @abstractmethod
    def get_login_url(self, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> str:
        """Generates the authorization redirect URL for initiating SSO login."""
        pass

    @abstractmethod
    def handle_callback(self, code_or_response: str, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> IdentityProfile:
        """Handles callback payload from the IdP, validates signatures/tokens, and returns IdentityProfile."""
        pass

    def discover_metadata(self, metadata_url: Optional[str] = None) -> Dict[str, Any]:
        """Discovers provider endpoints and certificates dynamically via OpenID discovery or SAML metadata XML."""
        return {}

    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validates an ID token or access token from the provider."""
        return {}

    def get_groups(self, user_profile: IdentityProfile) -> List[str]:
        """Extracts security groups/directory claims associated with the user."""
        return user_profile.groups

    def map_roles(self, groups: List[str], tenant_id: int = 1) -> str:
        """Maps directory group list to internal Cygnal RBAC role."""
        from services.identity.session_manager import map_groups_to_role
        return map_groups_to_role(self.provider_name, groups, tenant_id=tenant_id)
