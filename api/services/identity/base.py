from typing import List, Dict, Any

class IdentityProfile:
    def __init__(self, external_id: str, email: str, username: str, groups: List[str], raw_claims: Dict[str, Any] = None):
        self.external_id = external_id
        self.email = email
        self.username = username
        self.groups = groups
        self.raw_claims = raw_claims or {}

class BaseIdentityProvider:
    def get_login_url(self, redirect_uri: str, state: str = None) -> str:
        raise NotImplementedError
        
    def handle_callback(self, code_or_response: str, redirect_uri: str, state: str = None) -> IdentityProfile:
        raise NotImplementedError
