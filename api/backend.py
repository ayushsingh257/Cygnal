import os
from dotenv import load_dotenv
load_dotenv()

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import whois
import re
from urllib.parse import urlparse
import logging
from logging.handlers import RotatingFileHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import base64
import traceback
from jwt_utils import create_token
from jwt_utils import decode_token
from auth_utils import init_db, add_user, verify_user, get_user_role
from audit_logger import audit_log
from database import init_lookup_db, insert_lookup_log
import threading
import time
from bs4 import BeautifulSoup

# Metadata tools
from PIL import Image
from PIL.ExifTags import TAGS
import fitz  # PyMuPDF
import docx

# Reverse image search
from reverse_image_search import perform_reverse_image_search
from ip_reputation import get_ip_reputation  # ✅ Phase 28
from passive_dns import get_passive_dns # ✅ Phase 29
from port_scanner import scan_target


# Phase 18 logging dependencies
from datetime import datetime
import uuid
import json

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

# ========== FLASK SETUP ==========
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ========== ROUTE TO SERVE REFERENCE IMAGES ==========
@app.route('/reference_images/<path:filename>')
def serve_reference_images(filename):
    return send_from_directory('reference_images', filename)

# ========== HELPERS ==========
def is_valid_url(url):
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)

def is_valid_domain(domain):
    pattern = r"^(?!\-)(?:[a-zA-Z0-9\-]{1,63}\.)+[a-zA-Z]{2,}$"
    return re.match(pattern, domain)

def extract_image_metadata(file_path):
    try:
        img = Image.open(file_path)
        exif_data = img._getexif()
        if not exif_data:
            return {"message": "No EXIF metadata found."}

        metadata = {}
        for tag, value in exif_data.items():
            try:
                tag_name = TAGS.get(tag, tag)
                if isinstance(value, bytes):
                    continue
                metadata[str(tag_name)] = str(value)
            except Exception as e:
                logging.warning(f"Error processing EXIF tag {tag}: {e}")
        return metadata
    except Exception as e:
        logging.error(f"Image metadata extraction failed: {e}")
        return {"error": f"Image metadata extraction failed: {str(e)}"}

def extract_pdf_metadata(file_path):
    try:
        doc = fitz.open(file_path)
        meta = doc.metadata
        return meta if meta else {"message": "No PDF metadata found."}
    except Exception as e:
        logging.error(f"PDF metadata extraction failed: {e}")
        return {"error": f"PDF metadata extraction failed: {str(e)}"}

def extract_docx_metadata(file_path):
    try:
        doc = docx.Document(file_path)
        core_props = doc.core_properties
        metadata = {
            "author": core_props.author,
            "title": core_props.title,
            "created": str(core_props.created),
            "modified": str(core_props.modified),
            "subject": core_props.subject,
            "category": core_props.category,
        }
        return metadata
    except Exception as e:
        logging.error(f"DOCX metadata extraction failed: {e}")
        return {"error": f"DOCX metadata extraction failed: {str(e)}"}


def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown")
    except Exception:
        return "unknown"

# ========== NEW: PHASE 23.2 FETCH AUDIT LOGS ==========
@app.route("/api/get-audit-logs", methods=["GET"])
def get_audit_logs():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        if decoded.get("role") != "admin":
            return jsonify({"success": False, "error": "Access denied. Admins only."}), 403

        audit_path = "audit_logs/audit_log.json"  # ✅ Updated path
        if not os.path.exists(audit_path):
            return jsonify({"success": True, "logs": []})

        with open(audit_path, "r") as f:
            logs = [json.loads(line) for line in f if line.strip()]

        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        logging.error(f"Failed to fetch audit logs: {e}")
        return jsonify({"success": False, "error": "Failed to fetch audit logs"}), 500

# ========== ROUTES ==========
@app.route("/api/header-scan", methods=["POST"])
def header_scan():
    data = request.get_json()
    url = data.get("url", "").strip()
    user = get_current_user()

    if not is_valid_url(url):
        return jsonify({"success": False, "error": "Invalid URL format."}), 400

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

        ip = request.remote_addr
        insert_lookup_log(user, ip, "Header Scanner", {"url": url}, results)
        return jsonify({"success": True, "headers": results})
    except requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"Header scan failed: {str(e)}"}), 500

@app.route("/api/whois-lookup", methods=["POST"])
def whois_lookup():
    data = request.get_json()
    domain = data.get("domain", "").strip()
    user = get_current_user()

    if not is_valid_domain(domain):
        return jsonify({"success": False, "error": "Invalid domain name."}), 400

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

        # ✅ Log this lookup
        ip = request.remote_addr
        insert_lookup_log(user, ip, "WHOIS Lookup", {"domain": domain}, result)

        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"WHOIS lookup failed: {str(e)}"}), 500

@app.route("/api/email-scan", methods=["POST"])
def email_scan():
    user = get_current_user()
    try:
        data = request.get_json()
        url = data.get("url", "").strip()
        include_subpages = data.get("includeSubpages", False)

        if not is_valid_url(url):
            return jsonify({"success": False, "error": "Invalid URL format."}), 400

        found_emails = set()

        def extract_emails_from_url(page_url):
            try:
                response = requests.get(page_url, timeout=6)
                html = response.text
                email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                return set(re.findall(email_pattern, html))
            except Exception as e:
                logging.warning(f"Failed to fetch {page_url}: {e}")
                return set()

        found_emails.update(extract_emails_from_url(url))

        if include_subpages:
            try:
                base_domain = urlparse(url).netloc
                base_response = requests.get(url, timeout=6)
                soup = BeautifulSoup(base_response.text, "html.parser")
                internal_links = set()

                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    parsed = urlparse(href)
                    if href.startswith("/") or parsed.netloc == base_domain:
                        full_url = href if href.startswith("http") else f"https://{base_domain}{href}"
                        internal_links.add(full_url)

                for link in list(internal_links)[:10]:
                    found_emails.update(extract_emails_from_url(link))
            except Exception as e:
                logging.warning(f"Subpage scan failed: {e}")

        result = {
            "success": True,
            "emails": list(found_emails),
            "count": len(found_emails)
        }

        # ✅ Log this scan
        ip = request.remote_addr
        insert_lookup_log(user, ip, "Email Scanner", {"url": url, "includeSubpages": include_subpages}, result)

        return jsonify(result)

    except Exception as e:
        logging.error(f"Email scan failed: {e}")
        return jsonify({"success": False, "error": f"Email scan failed: {str(e)}"}), 500

@app.route("/api/email-scan-js", methods=["POST"])
def email_scan_js():
    user = get_current_user()
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from bs4 import BeautifulSoup

        data = request.get_json()
        url = data.get("url", "").strip()

        if not is_valid_url(url):
            return jsonify({"success": False, "error": "Invalid URL format."}), 400

        options = Options()
        options.headless = True
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1280,800")

        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(40)

        try:
            driver.get(url)
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(5)
            html = driver.page_source
            soup = BeautifulSoup(html, "html.parser")
            visible_text = soup.get_text(separator=" ")
        finally:
            driver.quit()

        email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        found_emails = list(set(re.findall(email_pattern, visible_text)))

        result = {"success": True, "emails": found_emails, "count": len(found_emails)}

        # ✅ Log to DB
        ip = request.remote_addr
        insert_lookup_log(user, ip, "Email Scanner (JS)", {"url": url}, result)

        return jsonify(result)

    except Exception as e:
        logging.error(f"JS email scan failed: {e}")
        return jsonify({"success": False, "error": f"JS email scan failed: {str(e)}"}), 500

@app.route("/api/screenshot", methods=["POST"])
def screenshot():
    user = get_current_user()
    data = request.get_json()
    url = data.get("url", "").strip()

    if not is_valid_url(url):
        return jsonify({"success": False, "error": "Invalid URL format."}), 400

    try:
        os.makedirs("screenshots", exist_ok=True)

        options = Options()
        options.headless = True
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        driver = webdriver.Chrome(options=options)
        driver.set_window_size(1280, 800)
        driver.get(url)

        filename = urlparse(url).netloc.replace('.', '_') + ".png"
        screenshot_path = os.path.join("screenshots", filename)
        driver.save_screenshot(screenshot_path)
        driver.quit()

        with open(screenshot_path, "rb") as img:
            encoded = base64.b64encode(img.read()).decode("utf-8")

        result = {"success": True, "image": encoded}

        # ✅ Log to DB
        ip = request.remote_addr
        insert_lookup_log(user, ip, "Screenshot Tool", {"url": url}, {"screenshot_saved": filename})

        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": f"Screenshot failed: {str(e)}"}), 500
    
@app.route("/api/metadata", methods=["POST"])
def metadata_extraction():
    user = get_current_user()
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded."}), 400

    file = request.files["file"]
    filename = file.filename

    if filename == "":
        return jsonify({"success": False, "error": "Empty filename."}), 400

    file.seek(0, os.SEEK_END)
    size_in_mb = file.tell() / (1024 * 1024)
    file.seek(0)
    if size_in_mb > 5:
        return jsonify({"success": False, "error": "File size exceeds 5MB limit."}), 400

    try:
        ext = filename.lower().split(".")[-1]
        temp_path = os.path.join("temp_upload", filename)
        os.makedirs("temp_upload", exist_ok=True)
        file.save(temp_path)
        if ext in ["jpg", "jpeg", "png"]:
            metadata = extract_image_metadata(temp_path)
        elif ext == "pdf":
            metadata = extract_pdf_metadata(temp_path)
        elif ext == "docx":
            metadata = extract_docx_metadata(temp_path)
        else:
            metadata = {"error": "Unsupported file type."}
        os.remove(temp_path)
        result = {"success": True, "metadata": metadata}
        # ✅ Log to DB
        ip = request.remote_addr
        insert_lookup_log(user, ip, "Metadata Extraction", {"filename": filename}, metadata)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to extract metadata: {str(e)}"}), 500

@app.route('/api/reverse-image-search', methods=['POST'])
def reverse_image_search():
    user = get_current_user()
    try:
        file = request.files['file']
        if not file:
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        filename = file.filename
        filepath = os.path.join("temp_upload", filename)
        os.makedirs("temp_upload", exist_ok=True)
        file.save(filepath)
        results = perform_reverse_image_search(filepath)
        os.remove(filepath)
        result = {"success": True, "results": results}
        # ✅ Log to DB
        ip = request.remote_addr
        insert_lookup_log(user, ip, "Reverse Image Search", {"filename": filename}, {"matches_found": len(results)})
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
    

@app.route("/api/malware-scan", methods=["POST"])
def malware_scan():
    from malware_scanner import scan_file_hybrid_analysis  # ✅ Now using Hybrid Analysis
    user = get_current_user()

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename

    if filename == "":
        return jsonify({"success": False, "error": "Filename is empty"}), 400

    try:
        os.makedirs("uploads", exist_ok=True)
        filepath = os.path.join("uploads", filename)
        file.save(filepath)

        # 🔁 Scan using Hybrid Analysis
        result = scan_file_hybrid_analysis(filepath)

        # ✅ Log to DB + Audit
        ip = request.remote_addr
        insert_lookup_log(user, ip, "Malware Scanner", {"filename": filename}, result)
        audit_log("Malware Scanner", user, {"filename": filename}, result)

        # ✅ Also log to session_logs for Dashboard
        scan_log = {
            "tool": "Malware Scanner",
            "input": filename,
            "result": result,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        os.makedirs("session_logs", exist_ok=True)
        session_id = str(uuid.uuid4())
        with open(f"session_logs/{session_id}.json", "w") as f:
            json.dump(scan_log, f, indent=2)

        os.remove(filepath)
        return jsonify({"success": True, "result": result})

    except Exception as e:
        logging.error(f"Malware scan failed: {e}")
        return jsonify({"success": False, "error": f"Scan failed: {str(e)}"}), 500


@app.route("/api/ip-reputation", methods=["POST"])
def ip_reputation():
    from ip_reputation import get_ip_reputation
    user = get_current_user()
    try:
        data = request.get_json()
        ip_address = data.get("ip", "").strip()
        if not ip_address:
            return jsonify({"success": False, "error": "Missing IP address"}), 400

        result = get_ip_reputation(ip_address)

        ip = request.remote_addr
        insert_lookup_log(user, ip, "IP Reputation", {"ip": ip_address}, result)
        audit_log("IP Reputation", user, {"ip": ip_address}, result)

        # ✅ Also write to session logs for Dashboard to pick up
        scan_log = {
            "tool": "IP Reputation",
            "input": ip_address,
            "result": result,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        os.makedirs("session_logs", exist_ok=True)
        session_id = str(uuid.uuid4())
        with open(f"session_logs/{session_id}.json", "w") as f:
            json.dump(scan_log, f, indent=2)

        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"IP reputation check failed: {str(e)}"}), 500
    
@app.route("/api/passive-dns", methods=["POST"])
def passive_dns_lookup():
    user = get_current_user()
    try:
        data = request.get_json()
        domain = data.get("domain", "").strip()
        if not domain:
            return jsonify({"success": False, "error": "Missing domain name"}), 400

        result = get_passive_dns(domain)

        ip = request.remote_addr
        insert_lookup_log(user, ip, "Passive DNS", {"domain": domain}, result)
        audit_log("Passive DNS", user, {"domain": domain}, result)

        # ✅ Also write to session logs for Dashboard
        scan_log = {
            "tool": "Passive DNS",
            "input": domain,
            "result": result,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        os.makedirs("session_logs", exist_ok=True)
        session_id = str(uuid.uuid4())
        with open(f"session_logs/{session_id}.json", "w") as f:
            json.dump(scan_log, f, indent=2)

        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"Passive DNS lookup failed: {str(e)}"}), 500

@app.route("/api/port-scan", methods=["POST"])
def port_scan():
    user = get_current_user()
    try:
        data = request.get_json()
        target = data.get("target", "").strip()
        mode = data.get("mode", "fast")

        if not target:
            return jsonify({"error": "Missing target"}), 400

        result = scan_target(target, mode)
        if "error" in result:
            return jsonify(result), 500

        ip = request.remote_addr
        insert_lookup_log(user, ip, "Port Scanner", {"target": target, "mode": mode}, result)
        audit_log("Port Scanner", user, {"target": target, "mode": mode}, result)

        # ✅ Write to session logs for Visual Dashboard
        scan_log = {
            "tool": "Port Scanner",
            "input": f"{target} ({mode})",
            "result": result,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        os.makedirs("session_logs", exist_ok=True)
        session_id = str(uuid.uuid4())
        with open(f"session_logs/{session_id}.json", "w") as f:
            json.dump(scan_log, f, indent=2)

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Scan failed: {str(e)}"}), 500


# ========== NEW: PHASE 18 – SCAN LOGGING ==========
@app.route("/api/log-scan", methods=["POST"])
def log_scan():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No scan data provided."}), 400

        os.makedirs("session_logs", exist_ok=True)

        session_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        log_data = {
            "id": session_id,
            "timestamp": timestamp,
            **data
        }

        log_path = os.path.join("session_logs", f"{session_id}.json")
        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)

        return jsonify({"success": True, "session_id": session_id})
    except Exception as e:
        logging.error(f"Failed to log scan session: {e}")
        return jsonify({"success": False, "error": "Failed to log scan session"}), 500
    
    # ========== OPTIONAL: HISTORY LOG VIEW ==========
@app.route("/api/history", methods=["GET"])
def fetch_all_logs():
    try:
        log_dir = "session_logs"
        if not os.path.exists(log_dir):
            return jsonify({"success": True, "logs": []})
        
        logs = []
        for file in os.listdir(log_dir):
            if file.endswith(".json"):
                path = os.path.join(log_dir, file)
                with open(path) as f:
                    logs.append(json.load(f))
        # Sort by timestamp descending
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        logging.error(f"Failed to load history logs: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.errorhandler(500)
def handle_500_error(e):
    return jsonify({"success": False, "error": "Internal Server Error"}), 

# ========== PHASE 19: AUTH API ROUTES ==========
@app.route("/api/register", methods=["POST"])
def register_user():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not email or not password or not username:
            return jsonify({"success": False, "error": "All fields are required."}), 400

        success = add_user(email, username, password)
        if not success:
            return jsonify({"success": False, "error": "User already exists."}), 409

        role = "admin" if username == "Ayush Singh" else "analyst"  # hardcoded role for now
        token = create_token({"username": username, "role": role})
        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "user": {"username": username, "role": role},
            "token": token
        })
    except Exception as e:
        logging.error(f"Registration error: {e}")
        return jsonify({"success": False, "error": "Registration failed."}), 500

@app.route("/api/login", methods=["POST"])
def login_user():
    try:
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"success": False, "error": "Username and password are required."}), 400
        valid = verify_user(username, password)
        if not valid:
            return jsonify({"success": False, "error": "Invalid credentials."}), 401
        role = get_user_role(username)
        token = create_token({"username": username, "role": role})
        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {"username": username, "role": role},
            "token": token
        })
    except Exception as e:
        logging.error(f"Login error: {e}")
        return jsonify({"success": False, "error": "Login failed."}), 500

# ========== MAIN ==========
if __name__ == "__main__":
    init_db()  # ✅ Ensure DB is ready
    init_lookup_db()  # ✅ Phase 24: SQLite Lookup Logging
    app.run(debug=True, host="0.0.0.0", port=5000)
