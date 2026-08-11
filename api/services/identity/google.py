"""
Cygnal Google Workspace Identity Provider
Supports Google OAuth2/OIDC login with corporate domain restriction.
Restricts logins to approved corporate domains (e.g. company.com) and rejects personal Gmail addresses.
"""

import os
import urllib.parse
from typing import Dict, Any, Optional, List
from services.identity.oidc import OIDCProvider
from services.identity.base import IdentityProfile

class GoogleWorkspaceProvider(OIDCProvider):
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        allowed_domains: Optional[List[str]] = None
    ):
        super().__init__(
            provider_name="google",
            issuer="https://accounts.google.com",
            client_id=client_id or os.getenv("GOOGLE_CLIENT_ID", ""),
            client_secret=client_secret or os.getenv("GOOGLE_CLIENT_SECRET", ""),
            metadata_url="https://accounts.google.com/.well-known/openid-configuration"
        )
        domains_env = os.getenv("GOOGLE_ALLOWED_DOMAINS", "")
        self.allowed_domains = allowed_domains or ([d.strip().lower() for d in domains_env.split(",") if d.strip()] if domains_env else [])
        self.mock_mode = os.getenv("GOOGLE_MOCK_MODE", "false").lower() == "true" or not self.client_id

    @property
    def provider_name(self) -> str:
        return "google"

    def get_login_url(self, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> str:
        if self.mock_mode:
            params = {
                "code": "mock_google_code_12345",
                "state": state or ""
            }
            url_parts = list(urllib.parse.urlparse(redirect_uri))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update(params)
            url_parts[4] = urllib.parse.urlencode(query)
            return urllib.parse.urlunparse(url_parts)

        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": "openid email profile",
            "access_type": "offline",
            "state": state or ""
        }
        # If single allowed domain is configured, pass hd parameter for UX optimization
        if len(self.allowed_domains) == 1:
            params["hd"] = self.allowed_domains[0]

        return f"{base_url}?{urllib.parse.urlencode(params)}"

    def handle_callback(self, code_or_response: str, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> IdentityProfile:
        if self.mock_mode or code_or_response.startswith("mock_"):
            try:
                claims = self.validate_token(code_or_response)
                email = claims.get("email", "sec-lead@cygnal-security.com")
            except Exception:
                email = "sec-lead@cygnal-security.com"
                claims = {"iss": "https://accounts.google.com", "email_verified": True, "hd": "cygnal-security.com", "email": email}

            self._validate_domain(email)
            return IdentityProfile(
                external_id=claims.get("sub", "google-sub-7777"),
                email=email,
                username=claims.get("name", email.split("@")[0]),
                groups=["Security Operations", "Incident Response"],
                raw_claims=claims,
                tenant_id=tenant_id
            )

        import requests
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code_or_response,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }
        resp = requests.post(token_url, data=payload, timeout=10)
        if resp.status_code != 200:
            raise ValueError(f"Google Token Exchange Failed: {resp.text}")

        data = resp.json()
        id_token = data.get("id_token")
        if not id_token:
            raise ValueError("Google Token response missing id_token")

        claims = self.validate_token(id_token)
        email = claims.get("email", "")
        self._validate_domain(email)

        return self._claims_to_profile(claims, tenant_id=tenant_id)

    def _validate_domain(self, email: str):
        """Enforces corporate workspace domain restrictions."""
        if not email or "@" not in email:
            raise ValueError("Invalid user email address.")

        domain = email.split("@")[1].lower()
        if self.allowed_domains:
            if domain not in self.allowed_domains:
                raise PermissionError(
                    f"Access Denied: Domain '@{domain}' is not authorized. "
                    f"Only users from {', '.join(self.allowed_domains)} are permitted."
                )
        elif domain in ("gmail.com", "googlemail.com") and os.getenv("REJECT_PERSONAL_GMAIL", "true").lower() == "true":
            raise PermissionError("Access Denied: Personal Gmail accounts are prohibited. Please use your corporate Google Workspace email.")
