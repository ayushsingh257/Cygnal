# api/tests/test_endpoints.py

import json
from api.backend import app


def test_header_scan_valid():
    with app.test_client() as client:
        response = client.post("/api/header-scan", json={"url": "https://example.com"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["headers"], list)

def test_header_scan_invalid():
    with app.test_client() as client:
        response = client.post("/api/header-scan", json={"url": "bad-url"})
        assert response.status_code == 400
        assert not response.get_json()["success"]

def test_whois_lookup_valid():
    with app.test_client() as client:
        response = client.post("/api/whois-lookup", json={"domain": "example.com"})
        assert response.status_code == 200
        assert response.get_json()["success"] is True

def test_whois_lookup_invalid():
    with app.test_client() as client:
        response = client.post("/api/whois-lookup", json={"domain": "not_a_domain"})
        assert response.status_code == 400
        assert not response.get_json()["success"]
