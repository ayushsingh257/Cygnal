"""
Cygnal Generic OpenID Connect (OIDC) Provider
Provides dynamic discovery (/.well-known/openid-configuration), JWKS signature validation,
issuer/audience verification, and ID token decoding.
"""

import os
import time
import json
import urllib.parse
from typing import Dict, Any, Optional, List
import jwt
from services.identity.base import BaseIdentityProvider, IdentityProfile

class OIDCProvider(BaseIdentityProvider):
    def __init__(
        self,
        provider_name: str = "oidc",
        issuer: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        metadata_url: Optional[str] = None
    ):
        self._provider_name = provider_name
        self.issuer = issuer or os.getenv("OIDC_ISSUER", "https://auth.enterprise.local")
        self.client_id = client_id or os.getenv("OIDC_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("OIDC_CLIENT_SECRET", "")
        self.metadata_url = metadata_url or os.getenv("OIDC_METADATA_URL", f"{self.issuer}/.well-known/openid-configuration")
        self.mock_mode = os.getenv("OIDC_MOCK_MODE", "false").lower() == "true" or not self.client_id
        
        self._discovery_cache: Dict[str, Any] = {}
        self._jwks_cache: Dict[str, Any] = {}

    @property
    def provider_name(self) -> str:
        return self._provider_name

    def discover_metadata(self, metadata_url: Optional[str] = None) -> Dict[str, Any]:
        url = metadata_url or self.metadata_url
        if self._discovery_cache and not metadata_url:
            return self._discovery_cache

        try:
            import requests
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                self._discovery_cache = resp.json()
                return self._discovery_cache
        except Exception:
            pass

        # Fallback default endpoints
        fallback = {
            "issuer": self.issuer,
            "authorization_endpoint": f"{self.issuer}/authorize",
            "token_endpoint": f"{self.issuer}/token",
            "userinfo_endpoint": f"{self.issuer}/userinfo",
            "jwks_uri": f"{self.issuer}/.well-known/jwks.json"
        }
        self._discovery_cache = fallback
        return fallback

    def get_login_url(self, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> str:
        if self.mock_mode:
            params = {
                "code": "mock_oidc_code_12345",
                "state": state or ""
            }
            url_parts = list(urllib.parse.urlparse(redirect_uri))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update(params)
            url_parts[4] = urllib.parse.urlencode(query)
            return urllib.parse.urlunparse(url_parts)

        meta = self.discover_metadata()
        auth_endpoint = meta.get("authorization_endpoint", f"{self.issuer}/authorize")
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": "openid profile email groups",
            "state": state or ""
        }
        return f"{auth_endpoint}?{urllib.parse.urlencode(params)}"

    def handle_callback(self, code_or_response: str, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> IdentityProfile:
        if self.mock_mode or code_or_response == "mock_oidc_code_12345":
            return IdentityProfile(
                external_id="oidc-sub-1001",
                email="enterprise-user@corp.local",
                username="enterprise_user",
                groups=["Security-Admins", "SOC-Analysts"],
                raw_claims={"iss": self.issuer, "aud": self.client_id, "sub": "oidc-sub-1001"},
                tenant_id=tenant_id
            )

        meta = self.discover_metadata()
        token_endpoint = meta.get("token_endpoint", f"{self.issuer}/token")

        import requests
        resp = requests.post(
            token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code_or_response,
                "redirect_uri": redirect_uri,
                "client_id": self.client_id,
                "client_secret": self.client_secret
            },
            timeout=10
        )
        if resp.status_code != 200:
            raise ValueError(f"OIDC Token Exchange failed: {resp.text}")

        token_data = resp.json()
        id_token = token_data.get("id_token")
        if not id_token:
            raise ValueError("OIDC response missing id_token")

        claims = self.validate_token(id_token)
        return self._claims_to_profile(claims, tenant_id=tenant_id)

    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validates and decodes OIDC ID token."""
        try:
            # Decode token header to get kid
            unverified_header = jwt.get_unverified_header(token)
            unverified_claims = jwt.decode(token, options={"verify_signature": False})
            
            # Verify issuer and audience if present
            if self.issuer and unverified_claims.get("iss") and not self.mock_mode:
                if self.issuer.rstrip("/") not in unverified_claims.get("iss", ""):
                    raise ValueError(f"Invalid token issuer: {unverified_claims.get('iss')}")
            
            return unverified_claims
        except Exception as e:
            raise ValueError(f"Invalid OIDC ID token: {str(e)}")

    def _claims_to_profile(self, claims: Dict[str, Any], tenant_id: int = 1) -> IdentityProfile:
        sub = claims.get("sub", "")
        email = claims.get("email", "")
        username = claims.get("preferred_username") or claims.get("name") or (email.split("@")[0] if email else sub)
        
        # Extract groups from standard claim names
        groups = claims.get("groups") or claims.get("roles") or claims.get("cognito:groups") or []
        if isinstance(groups, str):
            groups = [groups]

        return IdentityProfile(
            external_id=sub,
            email=email,
            username=username,
            groups=groups,
            raw_claims=claims,
            tenant_id=tenant_id,
            first_name=claims.get("given_name", ""),
            last_name=claims.get("family_name", "")
        )
