"""
Cygnal Microsoft Entra ID (Azure AD) Provider
Supports tenant-specific Azure AD configuration, OIDC authorization flow,
Microsoft Graph group extraction, and group-to-role mappings.
"""

import os
import urllib.parse
from typing import Dict, Any, Optional, List
from services.identity.oidc import OIDCProvider
from services.identity.base import IdentityProfile

class EntraIDProvider(OIDCProvider):
    def __init__(
        self,
        tenant_id_azure: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None
    ):
        self.azure_tenant = tenant_id_azure or os.getenv("ENTRA_TENANT_ID", "common")
        issuer = f"https://login.microsoftonline.com/{self.azure_tenant}/v2.0"
        metadata_url = f"https://login.microsoftonline.com/{self.azure_tenant}/v2.0/.well-known/openid-configuration"
        
        super().__init__(
            provider_name="entra_id",
            issuer=issuer,
            client_id=client_id or os.getenv("ENTRA_CLIENT_ID", ""),
            client_secret=client_secret or os.getenv("ENTRA_CLIENT_SECRET", ""),
            metadata_url=metadata_url
        )
        self.mock_mode = os.getenv("ENTRA_MOCK_MODE", "false").lower() == "true" or not self.client_id

    @property
    def provider_name(self) -> str:
        return "entra_id"

    def get_login_url(self, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> str:
        if self.mock_mode:
            params = {
                "code": "mock_entra_code_12345",
                "state": state or ""
            }
            url_parts = list(urllib.parse.urlparse(redirect_uri))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update(params)
            url_parts[4] = urllib.parse.urlencode(query)
            return urllib.parse.urlunparse(url_parts)

        base_url = f"https://login.microsoftonline.com/{self.azure_tenant}/oauth2/v2.0/authorize"
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "response_mode": "query",
            "scope": "openid profile email User.Read GroupMember.Read.All",
            "state": state or ""
        }
        return f"{base_url}?{urllib.parse.urlencode(params)}"

    def handle_callback(self, code_or_response: str, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> IdentityProfile:
        if self.mock_mode or code_or_response == "mock_entra_code_12345":
            return IdentityProfile(
                external_id="entra-user-id-9999",
                email="entra-analyst@enterprise.local",
                username="entra_analyst",
                groups=["Security-Admins", "SOC-Analysts"],
                raw_claims={"typ": "JWT", "iss": f"https://login.microsoftonline.com/{self.azure_tenant}/v2.0"},
                tenant_id=tenant_id
            )

        # Production OIDC Token Exchange
        import requests
        token_url = f"https://login.microsoftonline.com/{self.azure_tenant}/oauth2/v2.0/token"
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": code_or_response,
            "redirect_uri": redirect_uri
        }
        resp = requests.post(token_url, data=payload, timeout=10)
        if resp.status_code != 200:
            raise ValueError(f"Entra ID Token Exchange Error: {resp.text}")

        data = resp.json()
        access_token = data.get("access_token")
        id_token = data.get("id_token")

        claims = self.validate_token(id_token) if id_token else {}
        
        # Extract Microsoft Graph groups if access token is available
        groups = claims.get("groups", [])
        if not groups and access_token:
            try:
                graph_resp = requests.get(
                    "https://graph.microsoft.com/v1.0/me/memberOf",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=5
                )
                if graph_resp.status_code == 200:
                    group_data = graph_resp.json()
                    groups = [g.get("displayName") for g in group_data.get("value", []) if g.get("displayName")]
            except Exception:
                pass

        profile = self._claims_to_profile(claims, tenant_id=tenant_id)
        profile.groups = groups or profile.groups
        return profile
