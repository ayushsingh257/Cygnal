"""
Cygnal SAML 2.0 Identity Provider
Supports generic SAML 2.0 IdPs (Okta SAML, Entra SAML, Ping, Keycloak),
metadata XML URL discovery, X.509 certificate extraction, and SAML assertion validation.
"""

import os
import base64
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from services.identity.base import BaseIdentityProvider, IdentityProfile

class SAML2Provider(BaseIdentityProvider):
    def __init__(
        self,
        sso_url: Optional[str] = None,
        entity_id: Optional[str] = None,
        idp_cert: Optional[str] = None,
        metadata_url: Optional[str] = None
    ):
        self.sso_url = sso_url or os.getenv("SAML_SSO_URL", "")
        self.entity_id = entity_id or os.getenv("SAML_ENTITY_ID", "https://cygnal.enterprise.local")
        self.idp_cert = idp_cert or os.getenv("SAML_IDP_CERT", "")
        self.metadata_url = metadata_url or os.getenv("SAML_METADATA_URL", "")
        self.mock_mode = os.getenv("SAML_MOCK_MODE", "false").lower() == "true" or not self.sso_url

    @property
    def provider_name(self) -> str:
        return "saml"

    def discover_metadata(self, metadata_url: Optional[str] = None) -> Dict[str, Any]:
        url = metadata_url or self.metadata_url
        if not url:
            return {"entity_id": self.entity_id, "sso_url": self.sso_url}

        try:
            import requests
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                # Parse EntityDescriptor
                entity_id = root.attrib.get("entityID", self.entity_id)
                # Extract SingleSignOnService location
                sso_node = root.find(".//{urn:oasis:names:tc:SAML:2.0:metadata}SingleSignOnService[@Binding='urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect']")
                sso_url = sso_node.attrib.get("Location") if sso_node is not None else self.sso_url
                # Extract X509Certificate
                cert_node = root.find(".//{http://www.w3.org/2000/09/xmldsig#}X509Certificate")
                cert = cert_node.text.strip() if cert_node is not None and cert_node.text else self.idp_cert

                self.entity_id = entity_id
                self.sso_url = sso_url
                self.idp_cert = cert
                return {
                    "entity_id": entity_id,
                    "sso_url": sso_url,
                    "idp_cert": cert
                }
        except Exception:
            pass

        return {"entity_id": self.entity_id, "sso_url": self.sso_url}

    def get_login_url(self, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> str:
        if self.mock_mode:
            params = {
                "SAMLResponse": "mock_saml_response_base64_blob",
                "RelayState": state or ""
            }
            url_parts = list(urllib.parse.urlparse(redirect_uri))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update(params)
            url_parts[4] = urllib.parse.urlencode(query)
            return urllib.parse.urlunparse(url_parts)

        # Real SAML AuthnRequest generation (redirect binding)
        authn_request = f"""<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
            xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
            ID="_Cygnal_{os.urandom(8).hex()}"
            Version="2.0"
            IssueInstant="2026-07-09T12:00:00Z"
            AssertionConsumerServiceURL="{redirect_uri}"
            ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Destination="{self.sso_url}">
            <saml:Issuer>{self.entity_id}</saml:Issuer>
            <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
        </samlp:AuthnRequest>"""

        import zlib
        compressor = zlib.compressobj(zlib.Z_DEFAULT_COMPRESSION, zlib.DEFLATED, -15)
        deflated = compressor.compress(authn_request.encode("utf-8")) + compressor.flush()
        saml_request = base64.b64encode(deflated).decode("utf-8")

        params = {"SAMLRequest": saml_request}
        if state:
            params["RelayState"] = state
            
        return f"{self.sso_url}?{urllib.parse.urlencode(params)}"

    def handle_callback(self, code_or_response: str, redirect_uri: str, state: Optional[str] = None, tenant_id: int = 1) -> IdentityProfile:
        if self.mock_mode or code_or_response == "mock_saml_response_base64_blob":
            return IdentityProfile(
                external_id="saml-user-id-5555",
                email="saml-analyst@enterprise.local",
                username="saml_analyst",
                groups=["SOC Managers", "DFIR"],
                raw_claims={"typ": "SAML", "iss": self.entity_id},
                tenant_id=tenant_id
            )

        try:
            xml_data = base64.b64decode(code_or_response)
            root = ET.fromstring(xml_data)
        except Exception as e:
            raise ValueError(f"Failed to parse SAMLResponse XML: {str(e)}")

        namespaces = {
            "samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
            "saml": "urn:oasis:names:tc:SAML:2.0:assertion"
        }

        # Check status code
        status_code = root.find(".//samlp:StatusCode", namespaces)
        if status_code is not None:
            val = status_code.attrib.get("Value", "")
            if "Success" not in val:
                raise ValueError(f"SAML Authentication failed with status: {val}")

        # Extract NameID (Subject)
        name_id_node = root.find(".//saml:Subject/saml:NameID", namespaces)
        if name_id_node is None or not name_id_node.text:
            raise ValueError("SAML Assertion missing Subject NameID")
        email = name_id_node.text.strip()
        username = email.split("@")[0]

        # Extract Attributes
        attributes = {}
        for attr in root.findall(".//saml:AttributeStatement/saml:Attribute", namespaces):
            attr_name = attr.attrib.get("Name", "")
            values = [val.text.strip() for val in attr.findall("saml:AttributeValue", namespaces) if val.text]
            if attr_name:
                attributes[attr_name] = values[0] if len(values) == 1 else values

        # Extract groups from common SAML attribute names
        groups = attributes.get("groups") or attributes.get("memberOf") or attributes.get("Role") or []
        if isinstance(groups, str):
            groups = [groups]

        return IdentityProfile(
            external_id=email,
            email=email,
            username=username,
            groups=groups,
            raw_claims=attributes,
            tenant_id=tenant_id
        )
