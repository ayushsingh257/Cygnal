# api/tests/test_endpoints.py

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import app


def test_header_scan_valid():
    with app.test_client() as client:
        response = client.post("/api/header-scan", json={"url": "https://example.com"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "task_id" in data


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
        assert "task_id" in response.get_json()


def test_whois_lookup_invalid():
    with app.test_client() as client:
        response = client.post("/api/whois-lookup", json={"domain": "not_a_domain"})
        assert response.status_code == 400
        assert not response.get_json()["success"]


def test_task_status_endpoint():
    with app.test_client() as client:
        response = client.post("/api/header-scan", json={"url": "https://example.com"})
        task_id = response.get_json()["task_id"]
        status_res = client.get(f"/api/task/{task_id}")
        assert status_res.status_code == 200
        assert status_res.get_json()["success"] is True


def test_get_intel_endpoint():
    with app.test_client() as client:
        response = client.get("/api/get-intel")
        assert response.status_code == 200
        assert isinstance(response.get_json(), list)


def test_lookups_endpoint():
    with app.test_client() as client:
        response = client.get("/api/lookups")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["logs"], list)
