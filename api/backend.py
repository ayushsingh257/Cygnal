from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import whois
import re
from urllib.parse import urlparse
import logging
from logging.handlers import RotatingFileHandler

# ========== LOGGING CONFIGURATION ==========
log_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

file_handler = RotatingFileHandler("cygnal_backend.log", maxBytes=1_000_000, backupCount=3)
file_handler.setFormatter(log_formatter)

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(log_formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, stream_handler]
)

# ========== HELPER FUNCTIONS ==========
def is_valid_url(url):
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)

def is_valid_domain(domain):
    pattern = r"^(?!\-)(?:[a-zA-Z0-9\-]{1,63}\.)+[a-zA-Z]{2,}$"
    return re.match(pattern, domain)

# ========== FLASK SETUP ==========
app = Flask(__name__)
CORS(app)

# ========== HEADER SCAN ROUTE ==========
@app.route("/api/header-scan", methods=["POST"])
def header_scan():
    data = request.get_json()
    url = data.get("url", "").strip()

    if not is_valid_url(url):
        logging.warning(f"Invalid URL received: {url}")
        return jsonify({"success": False, "error": "Invalid URL format."}), 400

    logging.info(f"Scanning headers for URL: {url}")

    try:
        response = requests.get(url, timeout=5)
        headers = response.headers

        expected_headers = [
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Referrer-Policy",
            "Permissions-Policy",
        ]

        results = [{"name": h, "present": h in headers} for h in expected_headers]

        logging.info(f"Header scan completed successfully for: {url}")
        return jsonify({"success": True, "headers": results})

    except requests.exceptions.RequestException as e:
        logging.error(f"Header scan failed for {url}: {e}")
        return jsonify({"success": False, "error": f"Header scan failed: {str(e)}"}), 500

# ========== WHOIS LOOKUP ROUTE ==========
@app.route("/api/whois-lookup", methods=["POST"])
def whois_lookup():
    data = request.get_json()
    domain = data.get("domain", "").strip()

    if not is_valid_domain(domain):
        logging.warning(f"Invalid domain received: {domain}")
        return jsonify({"success": False, "error": "Invalid domain name."}), 400

    logging.info(f"Performing WHOIS lookup for: {domain}")

    try:
        w = whois.whois(domain)
        result = {
            "domain_name": str(w.domain_name),
            "registrar": str(w.registrar),
            "creation_date": str(w.creation_date),
            "expiration_date": str(w.expiration_date),
            "name_servers": str(w.name_servers),
            "emails": str(w.emails),
            "country": str(w.country)
        }
        logging.info(f"WHOIS lookup successful for: {domain}")
        return jsonify({"success": True, "result": result})
    except Exception as e:
        logging.error(f"WHOIS lookup failed for {domain}: {e}")
        return jsonify({"success": False, "error": f"WHOIS lookup failed: {str(e)}"}), 500

# ========== MAIN ==========
if __name__ == "__main__":
    app.run(debug=True)
