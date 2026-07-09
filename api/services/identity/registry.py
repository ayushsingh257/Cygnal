from typing import Dict
from services.identity.base import BaseIdentityProvider
from services.identity.entra_id import EntraIDProvider
from services.identity.saml import SAML2Provider

_providers_registry: Dict[str, BaseIdentityProvider] = {}

def register_identity_provider(name: str, provider: BaseIdentityProvider):
    """Registers an extensible identity provider adapter."""
    _providers_registry[name.lower()] = provider

def get_identity_provider(name: str) -> BaseIdentityProvider:
    """Retrieves an identity provider adapter by name."""
    name_key = name.lower()
    if name_key not in _providers_registry:
        # Lazy initialization
        if name_key == "entra_id":
            register_identity_provider("entra_id", EntraIDProvider())
        elif name_key == "saml":
            register_identity_provider("saml", SAML2Provider())
        else:
            raise KeyError(f"Identity provider '{name}' is not registered or supported.")
    return _providers_registry[name_key]
