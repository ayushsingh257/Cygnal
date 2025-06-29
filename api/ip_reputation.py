import os
import requests
import logging

API_KEY = os.environ.get("ABUSEIPDB_API_KEY", "")
ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2/check"

def get_ip_reputation(ip):
    if not API_KEY:
        return {"status": "error", "message": "AbuseIPDB API key not set."}

    try:
        headers = {
            "Key": API_KEY,
            "Accept": "application/json"
        }
        params = {
            "ipAddress": ip,
            "maxAgeInDays": 90  # Past 90 days of reputation
        }
        response = requests.get(ABUSEIPDB_URL, headers=headers, params=params)
        if response.status_code != 200:
            return {
                "status": "error",
                "message": f"AbuseIPDB error: {response.status_code} - {response.text}"
            }

        data = response.json().get("data", {})
        return {
            "ipAddress": data.get("ipAddress"),
            "isWhitelisted": data.get("isWhitelisted"),
            "abuseConfidenceScore": data.get("abuseConfidenceScore"),
            "countryCode": data.get("countryCode"),
            "domain": data.get("domain"),
            "totalReports": data.get("totalReports"),
            "lastReportedAt": data.get("lastReportedAt"),
            "usageType": data.get("usageType"),
            "isp": data.get("isp"),
            "hostnames": data.get("hostnames"),
            "status": "complete"
        }

    except Exception as e:
        logging.error(f"IP Reputation query failed: {e}")
        return {"status": "error", "message": f"Exception occurred: {str(e)}"}
