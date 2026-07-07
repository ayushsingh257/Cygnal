"""
Era 4 — Scanner Engine Unit Tests
Tests each of the 10 investigation scanner endpoints.
"""

import sys, os, io
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import json
from backend import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def auth_headers():
    return {"Content-Type": "application/json", "Authorization": "Bearer testtoken123"}


# ─── Scanner Directory ────────────────────────────────────────────────────────

def test_scanner_directory(client):
    resp = client.get("/api/scanners", headers=auth_headers())
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert len(data["scanners"]) == 10
    slugs = [s["slug"] for s in data["scanners"]]
    assert "whois" in slugs
    assert "headers" in slugs
    assert "threat-intel" in slugs

# ─── WHOIS Lookup ────────────────────────────────────────────────────────────

def test_whois_missing_target(client):
    resp = client.post("/api/scanners/whois", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert "required" in data["error"].lower()

def test_whois_valid_domain(client):
    resp = client.post("/api/scanners/whois", headers=auth_headers(),
                       data=json.dumps({"target": "google.com"}))
    data = resp.get_json()
    # Should attempt lookup — may fail on CI without network, but schema should be present
    assert "success" in data

# ─── HTTP Header Scanner ─────────────────────────────────────────────────────

def test_header_scanner_missing_url(client):
    resp = client.post("/api/scanners/headers", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False

def test_header_scanner_schema(client):
    resp = client.post("/api/scanners/headers", headers=auth_headers(),
                       data=json.dumps({"url": "https://example.com"}))
    data = resp.get_json()
    # May succeed or fail (network), but schema check
    assert "success" in data

# ─── Metadata Extractor ──────────────────────────────────────────────────────

def test_metadata_no_file(client):
    resp = client.post("/api/scanners/metadata",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert "file" in data["error"].lower()

def test_metadata_pdf_upload(client):
    # Minimal valid PDF
    minimal_pdf = b"""%PDF-1.4
1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj
2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj
3 0 obj<</Type /Page /MediaBox [0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4 /Root 1 0 R>>
startxref
190
%%EOF"""
    resp = client.post("/api/scanners/metadata",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={"file": (io.BytesIO(minimal_pdf), "test.pdf"), "case_id": ""})
    data = resp.get_json()
    assert data["success"] is True
    assert data["filename"] == "test.pdf"
    assert data["sha256"] is not None
    assert data["file_type"] == ".pdf"

# ─── DNS Intelligence ────────────────────────────────────────────────────────

def test_dns_missing_domain(client):
    resp = client.post("/api/scanners/dns", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False

def test_dns_valid_schema(client):
    resp = client.post("/api/scanners/dns", headers=auth_headers(),
                       data=json.dumps({"domain": "google.com"}))
    data = resp.get_json()
    assert "success" in data
    if data["success"]:
        assert "records" in data
        assert "spf" in data
        assert "dmarc" in data

# ─── Email Header Analyzer ───────────────────────────────────────────────────

def test_email_header_missing(client):
    resp = client.post("/api/scanners/email-headers", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False

def test_email_header_parse(client):
    sample = (
        "From: attacker@evil.com\n"
        "To: victim@company.com\n"
        "Subject: Phishing Test\n"
        "Date: Mon, 7 Jul 2026 12:00:00 +0000\n"
        "Message-ID: <test@evil.com>\n"
        "Reply-To: different@evil.com\n"
        "Received: from mail.evil.com (185.220.101.50) by mx.company.com\n"
        "Authentication-Results: mx.company.com; spf=fail smtp.from=evil.com; dkim=fail"
    )
    resp = client.post("/api/scanners/email-headers", headers=auth_headers(),
                       data=json.dumps({"raw_headers": sample}))
    data = resp.get_json()
    assert data["success"] is True
    assert data["from"] == "attacker@evil.com"
    assert data["spf"] == "fail"
    assert data["dkim"] == "fail"
    assert len(data["warnings"]) >= 1  # Reply-To mismatch or auth failures
    assert any("spf" in w.lower() or "dkim" in w.lower() or "reply" in w.lower() for w in data["warnings"])

# ─── IP Reputation ───────────────────────────────────────────────────────────

def test_ip_reputation_missing(client):
    resp = client.post("/api/scanners/ip-reputation", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400

def test_ip_reputation_invalid_format(client):
    resp = client.post("/api/scanners/ip-reputation", headers=auth_headers(),
                       data=json.dumps({"ip": "not-an-ip"}))
    assert resp.status_code == 400
    data = resp.get_json()
    assert "invalid" in data["error"].lower()

# ─── Malware Scanner ─────────────────────────────────────────────────────────

def test_malware_no_file(client):
    resp = client.post("/api/scanners/malware",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={})
    assert resp.status_code == 400

def test_malware_clean_file(client):
    clean_file = b"This is a plain text file with no threats."
    resp = client.post("/api/scanners/malware",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={"file": (io.BytesIO(clean_file), "clean.txt"), "case_id": ""})
    data = resp.get_json()
    assert data["success"] is True
    assert data["sha256"] is not None
    assert data["verdict"] in ("Clean", "Suspicious", "Malicious")
    assert isinstance(data["entropy"], float)

def test_malware_exe_extension_warning(client):
    fake_exe = b"MZ\x90\x00" + b"\x00" * 100  # Windows PE magic bytes
    resp = client.post("/api/scanners/malware",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={"file": (io.BytesIO(fake_exe), "payload.exe"), "case_id": ""})
    data = resp.get_json()
    assert data["success"] is True
    assert data["file_type_detected"] == "Windows Executable (PE)"
    # Should have executable warning
    assert any("dangerous" in w.lower() or "executable" in w.lower() for w in data["warnings"])

# ─── Page Archiver ───────────────────────────────────────────────────────────

def test_screenshot_missing_url(client):
    resp = client.post("/api/scanners/screenshot", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400

def test_screenshot_schema(client):
    resp = client.post("/api/scanners/screenshot", headers=auth_headers(),
                       data=json.dumps({"url": "https://example.com"}))
    data = resp.get_json()
    assert "success" in data
    if data["success"]:
        assert "title" in data
        assert "status_code" in data

# ─── Reverse Image Search ────────────────────────────────────────────────────

def test_reverse_image_no_file(client):
    resp = client.post("/api/scanners/reverse-image",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={})
    assert resp.status_code == 400

def test_reverse_image_invalid_extension(client):
    resp = client.post("/api/scanners/reverse-image",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={"file": (io.BytesIO(b"data"), "malware.exe"), "case_id": ""})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "unsupported" in data["error"].lower()

def test_reverse_image_png(client):
    # 1x1 white PNG
    png_bytes = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    resp = client.post("/api/scanners/reverse-image",
                       headers={"Authorization": "Bearer testtoken123"},
                       data={"file": (io.BytesIO(png_bytes), "test.png"), "case_id": ""})
    data = resp.get_json()
    assert data["success"] is True
    assert data["filename"] == "test.png"
    assert "sha256" in data
    assert "dimensions" in data

# ─── Threat Intelligence ─────────────────────────────────────────────────────

def test_threat_intel_missing_ioc(client):
    resp = client.post("/api/scanners/threat-intel", headers=auth_headers(), data=json.dumps({}))
    assert resp.status_code == 400

def test_threat_intel_known_ioc(client):
    # Known bad IP in our local DB
    resp = client.post("/api/scanners/threat-intel", headers=auth_headers(),
                       data=json.dumps({"ioc": "185.220.101.1", "ioc_type": "ip"}))
    data = resp.get_json()
    assert data["success"] is True
    assert data["threat_found"] is True
    assert data["confidence"] >= 80

def test_threat_intel_clean_ioc(client):
    resp = client.post("/api/scanners/threat-intel", headers=auth_headers(),
                       data=json.dumps({"ioc": "8.8.8.8", "ioc_type": "ip"}))
    data = resp.get_json()
    assert data["success"] is True
    assert data["threat_found"] is False
    assert data["ioc_type"] == "ip"

def test_threat_intel_cve_auto_detect(client):
    resp = client.post("/api/scanners/threat-intel", headers=auth_headers(),
                       data=json.dumps({"ioc": "CVE-2021-44228", "ioc_type": "auto"}))
    data = resp.get_json()
    assert data["success"] is True
    assert data["ioc_type"] == "cve"
    assert data["cve_details"] is not None

def test_threat_intel_auto_detect_domain(client):
    resp = client.post("/api/scanners/threat-intel", headers=auth_headers(),
                       data=json.dumps({"ioc": "malware-domain.ru", "ioc_type": "auto"}))
    data = resp.get_json()
    assert data["success"] is True
    assert data["ioc_type"] == "domain"
    assert data["threat_found"] is True
