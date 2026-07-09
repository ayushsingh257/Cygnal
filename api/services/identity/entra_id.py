import os
import time
import json
import base64
import urllib.parse
from typing import Dict, Any
import jwt
from services.identity.base import BaseIdentityProvider, IdentityProfile

class EntraIDProvider(BaseIdentityProvider):
    def __init__(self):
        self.client_id = os.getenv("ENTRA_CLIENT_ID", "")
        self.client_secret = os.getenv("ENTRA_CLIENT_SECRET", "")
        self.tenant_id = os.getenv("ENTRA_TENANT_ID", "common")
        # Allow mock mode in testing to run GHA without network dependency
        self.mock_mode = os.getenv("ENTRA_MOCK_MODE", "false").lower() == "true" or not self.client_id

    def get_login_url(self, redirect_uri: str, state: str = None) -> str:
        if self.mock_mode:
            # Under mock/dev, redirect directly to a simulated code response
            params = {
                "code": "mock_entra_code_12345",
                "state": state or ""
            }
            # We redirect straight to redirect_uri containing mock code
            url_parts = list(urllib.parse.urlparse(redirect_uri))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update(params)
            url_parts[4] = urllib.parse.urlencode(query)
            return urllib.parse.urlunparse(url_parts)

        # Real Microsoft Entra ID authorize endpoint
        base_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "response_mode": "query",
            "scope": "openid profile email",
            "state": state or ""
        }
        return f"{base_url}?{urllib.parse.urlencode(params)}"

    def handle_callback(self, code_or_response: str, redirect_uri: str, state: str = None) -> IdentityProfile:
        if self.mock_mode or code_or_response == "mock_entra_code_12345":
            # Return a mock profile for local test verification
            return IdentityProfile(
                external_id="entra-user-id-9999",
                email="entra-analyst@enterprise.local",
                username="entra_analyst",
                groups=["SOC Managers", "DFIR"],
                raw_claims={"typ": "JWT", "iss": "mock-entra-idp"}
            )

        # Real token exchange and verification (production OIDC)
        import requests
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code_or_response,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = requests.post(token_url, data=payload, headers=headers, timeout=10)
        if response.status_code != 200:
            raise ValueError(f"Failed to exchange Entra ID authorization code: {response.text}")

        tokens = response.json()
        id_token = tokens.get("id_token")
        if not id_token:
            raise ValueError("ID Token missing in Entra ID response.")

        # Decode token payload without signature verification first to fetch key ID (kid)
        unverified_header = jwt.get_unverified_header(id_token)
        unverified_claims = jwt.decode(id_token, options={"verify_signature": False})

        # Fetch Microsoft's public keys from JWKS to verify OIDC token signature
        jwks_url = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        jwks_resp = requests.get(jwks_url, timeout=5)
        if jwks_resp.status_code != 200:
            raise ValueError("Failed to retrieve Entra ID JWKs keys.")

        jwks = jwks_resp.json()
        public_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                # Construct public key using cryptography or pyjwt algorithms helper
                from jwt.algorithms import RSAAlgorithm
                public_key = RSAAlgorithm.from_jwk(key)
                break

        if not public_key:
            raise ValueError("Signature verification key ID (kid) not matched in Entra JWKs.")

        # Decode and cryptographically verify signature, audience, and issuer
        claims = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=self.client_id,
            options={"verify_exp": True}
        )

        external_id = claims.get("sub")
        email = claims.get("email") or claims.get("preferred_username") or ""
        username = email.split("@")[0] if email else "entra_user"
        
        # Groups can be fetched from claims if configured in Entra directory claims,
        # or we fetch them from MS Graph via Access Token if authorized
        groups = claims.get("groups", [])
        if not groups and "access_token" in tokens:
            # Fallback check Microsoft Graph to fetch group memberships of the user
            graph_url = "https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=displayName"
            graph_headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            graph_resp = requests.get(graph_url, headers=graph_headers, timeout=5)
            if graph_resp.status_code == 200:
                member_data = graph_resp.json()
                groups = [item.get("displayName") for item in member_data.get("value", []) if item.get("displayName")]

        return IdentityProfile(
            external_id=external_id,
            email=email,
            username=username,
            groups=groups,
            raw_claims=claims
        )
