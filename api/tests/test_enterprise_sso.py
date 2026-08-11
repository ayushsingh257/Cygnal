"""
Cygnal Enterprise Hardening — Phase 5 Tests: Enterprise SSO Federation & Dynamic Metadata Discovery
Validates:
1. OIDC Dynamic Discovery (/.well-known/openid-configuration) & Token Validation
2. SAML 2.0 XML Metadata Parsing, Certificate Extraction & Assertion Validation
3. Microsoft Entra ID (Azure AD) Provider Flow & Graph Group Extraction
4. Google Workspace Provider Flow & Corporate Domain Restriction
5. Okta SSO Provider Flow & OIDC/SAML Handling
6. Directory Group to Cygnal RBAC Role Mapping (Weight-Based Resolution)
7. End-to-End SSO Callback API Routes (User Upsert, Session Issuance & Tenant Scoping)
"""

import pytest
import os
import sys
import base64
from unittest.mock import patch, MagicMock

# Set path to import from api root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.identity.base import IdentityProfile
from services.identity.oidc import OIDCProvider
from services.identity.entra_id import EntraIDProvider
from services.identity.google import GoogleWorkspaceProvider
from services.identity.okta import OktaProvider
from services.identity.saml import SAML2Provider
from services.identity.registry import get_identity_provider, list_registered_providers
from services.identity.session_manager import map_groups_to_role, create_user_session
from backend import app

# ─── 1. OIDC Dynamic Discovery & Token Validation Tests ───────────────────────

def test_oidc_dynamic_discovery():
    """Verify OIDC provider dynamic discovery parses endpoints correctly."""
    provider = OIDCProvider(
        provider_name="test_oidc",
        issuer="https://auth.corp.local",
        client_id="test-client-id"
    )
    meta = provider.discover_metadata()
    assert "authorization_endpoint" in meta
    assert "token_endpoint" in meta
    assert "jwks_uri" in meta
    assert "https://auth.corp.local" in meta["authorization_endpoint"]

def test_oidc_login_url_and_callback():
    """Verify OIDC login URL generation and mock callback handling."""
    provider = OIDCProvider(
        provider_name="test_oidc",
        issuer="https://auth.corp.local",
        client_id="test-client-id"
    )
    login_url = provider.get_login_url("https://cygnal.local/sso-callback", state="test_state_123")
    assert "test_state_123" in login_url
    assert "code=" in login_url or "state=" in login_url
    
    profile = provider.handle_callback("mock_oidc_code_12345", "https://cygnal.local/sso-callback")
    assert profile.email == "enterprise-user@corp.local"
    assert "Security-Admins" in profile.groups

# ─── 2. SAML 2.0 Metadata & Assertion Parsing Tests ──────────────────────────

def test_saml_metadata_discovery():
    """Verify SAML 2.0 XML metadata parsing and cert extraction."""
    mock_xml = """<?xml version="1.0"?>
    <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.enterprise.com">
        <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <KeyDescriptor use="signing">
                <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                    <ds:X509Data>
                        <ds:X509Certificate>MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0...</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </KeyDescriptor>
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.enterprise.com/sso/login"/>
        </IDPSSODescriptor>
    </EntityDescriptor>"""
    
    provider = SAML2Provider(metadata_url="https://idp.enterprise.com/metadata.xml")
    
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = mock_xml.encode("utf-8")
        mock_get.return_value = mock_resp
        
        meta = provider.discover_metadata()
        assert meta["entity_id"] == "https://idp.enterprise.com"
        assert meta["sso_url"] == "https://idp.enterprise.com/sso/login"
        assert "MIIBIjANBgkqhki" in meta["idp_cert"]

def test_saml_callback_assertion_parsing():
    """Verify SAML callback assertion XML parsing and attribute extraction."""
    provider = SAML2Provider(sso_url="https://idp.corp.com/sso")
    
    mock_assertion_xml = """<?xml version="1.0"?>
    <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        <saml:Assertion>
            <saml:Subject>
                <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">saml.lead@enterprise.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
                <saml:Attribute Name="groups">
                    <saml:AttributeValue>Security-Admins</saml:AttributeValue>
                    <saml:AttributeValue>DFIR-Team</saml:AttributeValue>
                </saml:Attribute>
            </saml:AttributeStatement>
        </saml:Assertion>
    </samlp:Response>"""
    
    encoded_response = base64.b64encode(mock_assertion_xml.encode("utf-8")).decode("utf-8")
    profile = provider.handle_callback(encoded_response, "https://cygnal.local/sso-callback", tenant_id=1)
    
    assert profile.email == "saml.lead@enterprise.com"
    assert profile.username == "saml.lead"
    assert "Security-Admins" in profile.groups

# ─── 3. Microsoft Entra ID & Okta Provider Tests ─────────────────────────────

def test_entra_id_provider_flow():
    """Verify Microsoft Entra ID provider initialization, login URL, and callback."""
    provider = get_identity_provider("entra_id")
    assert provider.provider_name == "entra_id"
    
    login_url = provider.get_login_url("https://cygnal.local/sso-callback", state="state_entra_999")
    assert "state_entra_999" in login_url
    
    profile = provider.handle_callback("mock_entra_code_12345", "https://cygnal.local/sso-callback")
    assert profile.email == "entra-analyst@enterprise.local"
    assert "SOC Managers" in profile.groups

def test_okta_provider_flow():
    """Verify Okta provider initialization, login URL, and callback."""
    provider = get_identity_provider("okta")
    assert provider.provider_name == "okta"
    
    login_url = provider.get_login_url("https://cygnal.local/sso-callback", state="state_okta_888")
    assert "state_okta_888" in login_url
    
    profile = provider.handle_callback("mock_okta_code_12345", "https://cygnal.local/sso-callback")
    assert profile.email == "okta-auditor@enterprise.local"
    assert "Security-Admins" in profile.groups

# ─── 4. Google Workspace Domain Restriction Tests ────────────────────────────

def test_google_workspace_domain_restriction():
    """Verify Google Workspace provider allows corporate domains and rejects personal Gmail / unauthorized domains."""
    # Allow company.com only
    provider = GoogleWorkspaceProvider(
        client_id="mock-google-client-id",
        allowed_domains=["company.com", "cygnal-security.com"]
    )
    
    # 1. Valid corporate domain passes
    valid_claims = {"sub": "goog-1", "email": "alice@cygnal-security.com"}
    with patch.object(provider, "validate_token", return_value=valid_claims):
        profile = provider.handle_callback("mock_code", "https://cygnal.local/sso-callback")
        assert profile.email == "alice@cygnal-security.com"
        
    # 2. Unauthorized corporate domain is rejected with PermissionError
    invalid_corp_claims = {"sub": "goog-2", "email": "bob@unauthorized-corp.com"}
    with patch.object(provider, "validate_token", return_value=invalid_corp_claims):
        with pytest.raises(PermissionError) as exc_info:
            provider.handle_callback("mock_code", "https://cygnal.local/sso-callback")
        assert "Domain '@unauthorized-corp.com' is not authorized" in str(exc_info.value)
        
    # 3. Personal Gmail account is rejected
    gmail_claims = {"sub": "goog-3", "email": "attacker@gmail.com"}
    with patch.object(provider, "validate_token", return_value=gmail_claims):
        with pytest.raises(PermissionError):
            provider.handle_callback("mock_code", "https://cygnal.local/sso-callback")

# ─── 5. RBAC Group Mapping & Weight Resolution Tests ─────────────────────────

def test_directory_group_to_rbac_role_mapping():
    """Verify external directory groups map to highest-weight internal role."""
    # SOC Managers only -> soc_manager
    assert map_groups_to_role("entra_id", ["SOC Managers"]) == "soc_manager"
    
    # Enterprise Admin only -> admin
    assert map_groups_to_role("entra_id", ["Enterprise Admin"]) == "admin"
    
    # SOC Managers + Enterprise Admin -> admin (highest weight 100 > 70)
    assert map_groups_to_role("entra_id", ["SOC Managers", "Enterprise Admin"]) == "admin"

    # Security-Admins -> admin (weight 100)
    assert map_groups_to_role("entra_id", ["Security-Admins"]) == "admin"
    
    # SOC-Analysts / DFIR -> analyst (weight 40)
    assert map_groups_to_role("google", ["Incident-Responders", "DFIR"]) == "analyst"
    
    # Multi-group: Highest weight wins (Security-Admins (100) + SOC-Analysts (40) -> admin)
    assert map_groups_to_role("okta", ["SOC-Analysts", "Security-Admins", "Interns"]) == "admin"
    
    # Unknown groups fallback to 'analyst'
    assert map_groups_to_role("saml", ["Random-External-Group-99"]) == "analyst"

# ─── 6. End-to-End SSO API Routes Integration Tests ──────────────────────────

@pytest.fixture
def client():
    app.config["TESTING"] = True
    from database import init_lookup_db
    init_lookup_db()
    with app.test_client() as client:
        yield client

def test_sso_providers_endpoint(client):
    """GET /api/auth/sso/providers returns active identity providers."""
    res = client.get("/api/auth/sso/providers")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    provider_ids = [p["id"] for p in data["providers"]]
    assert "entra_id" in provider_ids
    assert "google" in provider_ids
    assert "okta" in provider_ids
    assert "saml" in provider_ids

def test_sso_login_and_callback_flow(client):
    """Verify full initiate and callback flow for Entra ID."""
    # 1. Initiate login
    init_res = client.get("/api/auth/sso/login/entra_id")
    assert init_res.status_code == 200
    init_data = init_res.get_json()
    assert init_data["success"] is True
    assert "url" in init_data
    assert "login_url" in init_data
    assert init_data["url"] == init_data["login_url"]
    state = init_data["state"]
    
    # 2. Callback
    cb_res = client.post(
        "/api/auth/sso/callback/entra_id",
        json={
            "code": "mock_entra_code_12345",
            "state": state,
            "redirect_uri": "http://localhost:3001/sso-callback"
        }
    )
    assert cb_res.status_code == 200
    cb_data = cb_res.get_json()
    assert cb_data["success"] is True
    assert "token" in cb_data
    assert "refresh_token" in cb_data
    assert cb_data["user"]["username"] == "entra_analyst"
    assert cb_data["user"]["role"] == "soc_manager"  # Mapped from "SOC Managers"

def test_sso_callback_rejection_on_missing_code(client):
    """Verify callback fails if authorization code is missing."""
    res = client.post("/api/auth/sso/callback/entra_id", json={})
    assert res.status_code == 400
    assert "Missing authorization code" in res.get_json()["error"]
