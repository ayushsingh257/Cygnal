# api/backend.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import whois

app = Flask(__name__)
CORS(app)

@app.route("/api/header-scan", methods=["POST"])
def header_scan():
    data = request.get_json()
    url = data.get("url")

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

        results = []
        for h in expected_headers:
            results.append({"name": h, "present": h in headers})

        return jsonify({"success": True, "headers": results})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/whois-lookup", methods=["POST"])
def whois_lookup():
    data = request.get_json()
    domain = data.get("domain")

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
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)
