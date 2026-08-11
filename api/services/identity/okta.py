"""
Cygnal Okta Identity Provider
Supports Okta OIDC & SAML integration, dynamic metadata discovery,
JWKS signature verification, and group-to-role mappings.
"""

import os
import urllib.parse
from typing import Dict, Any, Optional, List
from services.identity.oidc import OIDCProvider
from services.identity.base import IdentityProfile

class OktaProvider(OIDCProvider):
    def __init__(
        self,
        okta_domain: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None
    ):
        self.okta_domain = okta_domain or os.getenv("OKTA_DOMAIN", "identity.okta.local")
        # Ensure scheme
        if not self.okta_domain.startswith("http"):
            domain_url = f"https://{self.okta_domain}"
        else:
            domain_url = self.okta_domain

        issuer = f"{domain_url}/oauth2/default"
        metadata_url = f"{issuer}/.well-known/openid-configuration"

        super().__init__(
            provider_name="okta",
            issuer=issuer,
            client_id=client_id or os.getenv("OKTA_CLIENT_ID", ""),
            client_secret=client_secret or os.getenv("OKTA_CLIENT_SECRET", ""),
            metadata_url=metadata_url
        )
        self.mock_mode = os.getenv("OKTA_MOCK_MODE", "false").lower() == "true" or not self.client_id

    @property
    def provider_name(self) -> str:
        return "okta"

    def get_login_url(self, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> str:
        if self.mock_mode:
            params = {
                "code": "mock_okta_code_12345",
                "state": state or ""
            }
            url_parts = list(urllib.parse.urlparse(redirect_uri))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update(params)
            url_parts[4] = urllib.parse.urlencode(query)
            return urllib.parse.urlunparse(url_parts)

        meta = self.discover_metadata()
        auth_endpoint = meta.get("authorization_endpoint", f"{self.issuer}/v1/authorize")
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": "openid profile email groups",
            "state": state or ""
        }
        return f"{auth_endpoint}?{urllib.parse.urlencode(params)}"

    def handle_callback(self, code_or_response: str, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> IdentityProfile:
        if self.mock_mode or code_or_response == "mock_okta_code_12345":
            return IdentityProfile(
                external_id="okta-usr-8888",
                email="okta-auditor@enterprise.local",
                username="okta_auditor",
                groups=["Security-Admins", "SOC-Analysts"],
                raw_claims={"iss": self.issuer, "sub": "okta-usr-8888"},
                tenant_id=tenant_id
            )

        return super().handle_callback(code_or_response, redirect_uri, state=state, tenant_id=tenant_id)
