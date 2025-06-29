from dotenv import load_dotenv
load_dotenv(dotenv_path="C:/Users/Ayush/OneDrive/Desktop/Cygnal/api/.env")
import os
import requests
import logging

VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")

def get_passive_dns(query: str):
    """
    Query VirusTotal's Passive DNS API with a domain or IP.
    """
    if not VT_API_KEY:
        return {"error": "VirusTotal API key not set."}

    headers = {
        "x-apikey": VT_API_KEY
    }

    # Check if it's an IP or domain
    if is_valid_ip(query):
        url = f"https://www.virustotal.com/api/v3/ip_addresses/{query}/resolutions"
    else:
        url = f"https://www.virustotal.com/api/v3/domains/{query}/resolutions"

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results = [
                {
                    "host": r.get("attributes", {}).get("host_name", ""),
                    "ip": r.get("attributes", {}).get("ip_address", ""),
                    "resolved": r.get("attributes", {}).get("date", "")
                }
                for r in data.get("data", [])
            ]
            return {
                "query": query,
                "result_count": len(results),
                "results": results
            }
        else:
            return {"error": f"VirusTotal API Error {response.status_code}: {response.text}"}
    except Exception as e:
        logging.error(f"Passive DNS lookup failed: {e}")
        return {"error": f"Exception: {str(e)}"}


def is_valid_ip(ip: str):
    import re
    ip_regex = r"^\d{1,3}(\.\d{1,3}){3}$"
    return bool(re.match(ip_regex, ip))
