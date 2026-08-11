"""
Cygnal Identity Provider Registry
Provides extensible lookup and lazy instantiation for Enterprise Identity Providers.
"""

from typing import Dict, List
from services.identity.base import BaseIdentityProvider
from services.identity.entra_id import EntraIDProvider
from services.identity.google import GoogleWorkspaceProvider
from services.identity.okta import OktaProvider
from services.identity.saml import SAML2Provider
from services.identity.oidc import OIDCProvider

_providers_registry: Dict[str, BaseIdentityProvider] = {}

def register_identity_provider(name: str, provider: BaseIdentityProvider):
    """Registers an extensible identity provider adapter."""
    _providers_registry[name.lower().strip()] = provider

def get_identity_provider(name: str) -> BaseIdentityProvider:
    """Retrieves an identity provider adapter by name, with lazy initialization."""
    name_key = name.lower().strip()
    if name_key not in _providers_registry:
        if name_key in ("entra_id", "entra", "azure", "azure_ad"):
            register_identity_provider(name_key, EntraIDProvider())
        elif name_key in ("google", "google_workspace"):
            register_identity_provider(name_key, GoogleWorkspaceProvider())
        elif name_key == "okta":
            register_identity_provider("okta", OktaProvider())
        elif name_key == "saml":
            register_identity_provider("saml", SAML2Provider())
        elif name_key == "oidc":
            register_identity_provider("oidc", OIDCProvider())
        else:
            raise KeyError(f"Identity provider '{name}' is not supported. Choose from: entra_id, google, okta, saml, oidc.")
    return _providers_registry[name_key]

def list_registered_providers() -> List[str]:
    """Returns a list of supported identity providers."""
    return ["entra_id", "google", "okta", "saml", "oidc"]
