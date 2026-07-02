from flask import Blueprint, request, jsonify
import os
import requests
import whois
import re
import uuid
import json
import logging
import base64
import time
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from PIL import Image
from PIL.ExifTags import TAGS
import fitz  # PyMuPDF
import docx
from datetime import datetime

# Helper imports from parent
from jwt_utils import decode_token
from reverse_image_search import perform_reverse_image_search
from ip_reputation import get_ip_reputation
from passive_dns import get_passive_dns
from port_scanner import scan_target
from database import insert_lookup_log
from audit_logger import audit_log
from task_manager import global_task_manager

scanners_bp = Blueprint("scanners_bp", __name__)

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
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

# ========== TASK MANAGEMENT ENDPOINTS ==========

@scanners_bp.route("/tasks", methods=["GET"])
def get_all_tasks():
    tasks = global_task_manager.get_all_tasks()
    return jsonify({"success": True, "tasks": tasks})

@scanners_bp.route("/task/<task_id>", methods=["GET"])
def get_task_status(task_id):
    task = global_task_manager.get_task_status(task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found."}), 404
    return jsonify({"success": True, "task": task})

# ========== ROUTES ==========

@scanners_bp.route("/header-scan", methods=["POST"])
def header_scan():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload."}), 400
    url = data.get("url", "").strip()
    user = get_current_user()

    if not is_valid_url(url):
        return jsonify({"success": False, "error": "Invalid URL format."}), 400

    def worker(progress_callback=None):
        if progress_callback: progress_callback(30)
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
        if progress_callback: progress_callback(85)

        ip = request.remote_addr if request else "127.0.0.1"
        insert_lookup_log(user, ip, "Header Scanner", {"url": url}, results)
        return {"headers": results}

    task_id = global_task_manager.submit_task("Header Scan", worker)
    return jsonify({"success": True, "task_id": task_id})


@scanners_bp.route("/whois-lookup", methods=["POST"])
def whois_lookup():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload."}), 400
    domain = data.get("domain", "").strip()
    user = get_current_user()

    if not is_valid_domain(domain):
        return jsonify({"success": False, "error": "Invalid domain name."}), 400

    def worker(progress_callback=None):
        if progress_callback: progress_callback(40)
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
        if progress_callback: progress_callback(85)

        ip = request.remote_addr if request else "127.0.0.1"
        insert_lookup_log(user, ip, "WHOIS Lookup", {"domain": domain}, result)
        return {"result": result}

    task_id = global_task_manager.submit_task("WHOIS Lookup", worker)
    return jsonify({"success": True, "task_id": task_id})


@scanners_bp.route("/email-scan", methods=["POST"])
def email_scan():
    user = get_current_user()
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing payload."}), 400
        url = data.get("url", "").strip()
        include_subpages = data.get("includeSubpages", False)

        if not is_valid_url(url):
            return jsonify({"success": False, "error": "Invalid URL format."}), 400

        def worker(progress_callback=None):
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

            if progress_callback: progress_callback(20)
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

                    links_to_scan = list(internal_links)[:10]
                    total_links = len(links_to_scan)
                    for idx, link in enumerate(links_to_scan):
                        found_emails.update(extract_emails_from_url(link))
                        if progress_callback and total_links > 0:
                            progress_callback(30 + int((idx / total_links) * 60))
                except Exception as e:
                    logging.warning(f"Subpage scan failed: {e}")

            result = {
                "success": True,
                "emails": list(found_emails),
                "count": len(found_emails)
            }

            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "Email Scanner", {"url": url, "includeSubpages": include_subpages}, result)
            return result

        task_id = global_task_manager.submit_task("Email Scan", worker)
        return jsonify({"success": True, "task_id": task_id})
    except Exception as e:
        logging.error(f"Email scan setup failed: {e}")
        return jsonify({"success": False, "error": f"Email scan failed: {str(e)}"}), 500


@scanners_bp.route("/email-scan-js", methods=["POST"])
def email_scan_js():
    user = get_current_user()
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing payload."}), 400
        url = data.get("url", "").strip()

        if not is_valid_url(url):
            return jsonify({"success": False, "error": "Invalid URL format."}), 400

        def worker(progress_callback=None):
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC

            if progress_callback: progress_callback(20)
            options = Options()
            options.headless = True
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--window-size=1280,800")

            if progress_callback: progress_callback(40)
            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(40)

            try:
                driver.get(url)
                if progress_callback: progress_callback(70)
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

            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "Email Scanner (JS)", {"url": url}, result)
            return result

        task_id = global_task_manager.submit_task("JS Email Scan", worker)
        return jsonify({"success": True, "task_id": task_id})
    except Exception as e:
        logging.error(f"JS email scan failed: {e}")
        return jsonify({"success": False, "error": f"JS email scan failed: {str(e)}"}), 500


@scanners_bp.route("/screenshot", methods=["POST"])
def screenshot():
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Missing payload."}), 400
    url = data.get("url", "").strip()

    if not is_valid_url(url):
        return jsonify({"success": False, "error": "Invalid URL format."}), 400

    def worker(progress_callback=None):
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options

        if progress_callback: progress_callback(20)
        os.makedirs("screenshots", exist_ok=True)

        options = Options()
        options.headless = True
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        if progress_callback: progress_callback(40)
        driver = webdriver.Chrome(options=options)
        driver.set_window_size(1280, 800)
        
        if progress_callback: progress_callback(60)
        driver.get(url)

        filename = urlparse(url).netloc.replace('.', '_') + ".png"
        screenshot_path = os.path.join("screenshots", filename)
        driver.save_screenshot(screenshot_path)
        driver.quit()

        if progress_callback: progress_callback(85)
        with open(screenshot_path, "rb") as img:
            encoded = base64.b64encode(img.read()).decode("utf-8")

        ip = request.remote_addr if request else "127.0.0.1"
        insert_lookup_log(user, ip, "Screenshot Tool", {"url": url}, {"screenshot_saved": filename})
        return {"image": encoded}

    task_id = global_task_manager.submit_task("Screenshot Tool", worker)
    return jsonify({"success": True, "task_id": task_id})


@scanners_bp.route("/metadata", methods=["POST"])
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

    # Save to temp file
    temp_path = os.path.join("temp_upload", f"{uuid.uuid4()}_{filename}")
    os.makedirs("temp_upload", exist_ok=True)
    file.save(temp_path)

    def worker(progress_callback=None):
        try:
            if progress_callback: progress_callback(30)
            ext = filename.lower().split(".")[-1]
            if ext in ["jpg", "jpeg", "png"]:
                metadata = extract_image_metadata(temp_path)
            elif ext == "pdf":
                metadata = extract_pdf_metadata(temp_path)
            elif ext == "docx":
                metadata = extract_docx_metadata(temp_path)
            else:
                metadata = {"error": "Unsupported file type."}

            if progress_callback: progress_callback(85)
            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "Metadata Extraction", {"filename": filename}, metadata)
            return {"metadata": metadata}
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    task_id = global_task_manager.submit_task("Metadata Extraction", worker)
    return jsonify({"success": True, "task_id": task_id})


@scanners_bp.route("/reverse-image-search", methods=["POST"])
def reverse_image_search():
    user = get_current_user()
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
        file = request.files['file']
        if not file or file.filename == "":
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        filename = file.filename
        filepath = os.path.join("temp_upload", f"{uuid.uuid4()}_{filename}")
        os.makedirs("temp_upload", exist_ok=True)
        file.save(filepath)

        def worker(progress_callback=None):
            try:
                if progress_callback: progress_callback(40)
                results = perform_reverse_image_search(filepath)
                if progress_callback: progress_callback(85)

                ip = request.remote_addr if request else "127.0.0.1"
                insert_lookup_log(user, ip, "Reverse Image Search", {"filename": filename}, {"matches_found": len(results)})
                return {"results": results}
            finally:
                if os.path.exists(filepath):
                    os.remove(filepath)

        task_id = global_task_manager.submit_task("Reverse Image Search", worker)
        return jsonify({"success": True, "task_id": task_id})
    except Exception as e:
        logging.error(f"Reverse image search setup failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@scanners_bp.route("/malware-scan", methods=["POST"])
def malware_scan():
    from malware_scanner import scan_file_hybrid_analysis
    user = get_current_user()

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename

    if filename == "":
        return jsonify({"success": False, "error": "Filename is empty"}), 400

    filepath = os.path.join("temp_upload", f"{uuid.uuid4()}_{filename}")
    os.makedirs("temp_upload", exist_ok=True)
    file.save(filepath)

    def worker(progress_callback=None):
        try:
            if progress_callback: progress_callback(20)
            result = scan_file_hybrid_analysis(filepath)

            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "Malware Scanner", {"filename": filename}, result)
            audit_log("Malware Scanner", user, {"filename": filename}, result)

            scan_log = {
                "tool": "Malware Scanner",
                "input": filename,
                "result": result,
                "user": user,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            os.makedirs("session_logs", exist_ok=True)
            session_id = str(uuid.uuid4())
            with open(f"session_logs/{session_id}.json", "w", encoding="utf-8") as f:
                json.dump(scan_log, f, indent=2)

            return {"result": result}
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)

    task_id = global_task_manager.submit_task("Malware Scanner", worker)
    return jsonify({"success": True, "task_id": task_id})


@scanners_bp.route("/ip-reputation", methods=["POST"])
def ip_reputation():
    user = get_current_user()
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing payload."}), 400
        ip_address = data.get("ip", "").strip()
        if not ip_address:
            return jsonify({"success": False, "error": "Missing IP address"}), 400

        def worker(progress_callback=None):
            if progress_callback: progress_callback(30)
            result = get_ip_reputation(ip_address)
            if progress_callback: progress_callback(80)

            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "IP Reputation", {"ip": ip_address}, result)
            audit_log("IP Reputation", user, {"ip": ip_address}, result)

            scan_log = {
                "tool": "IP Reputation",
                "input": ip_address,
                "result": result,
                "user": user,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            os.makedirs("session_logs", exist_ok=True)
            session_id = str(uuid.uuid4())
            with open(f"session_logs/{session_id}.json", "w", encoding="utf-8") as f:
                json.dump(scan_log, f, indent=2)
            return {"result": result}

        task_id = global_task_manager.submit_task("IP Reputation Tracker", worker)
        return jsonify({"success": True, "task_id": task_id})
    except Exception as e:
        logging.error(f"IP reputation setup failed: {e}")
        return jsonify({"success": False, "error": f"IP reputation check failed: {str(e)}"}), 500


@scanners_bp.route("/passive-dns", methods=["POST"])
def passive_dns_lookup():
    user = get_current_user()
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing payload."}), 400
        domain = data.get("domain", "").strip()
        if not domain:
            return jsonify({"success": False, "error": "Missing domain name"}), 400

        def worker(progress_callback=None):
            if progress_callback: progress_callback(30)
            result = get_passive_dns(domain)
            if progress_callback: progress_callback(80)

            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "Passive DNS", {"domain": domain}, result)
            audit_log("Passive DNS", user, {"domain": domain}, result)

            scan_log = {
                "tool": "Passive DNS",
                "input": domain,
                "result": result,
                "user": user,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            os.makedirs("session_logs", exist_ok=True)
            session_id = str(uuid.uuid4())
            with open(f"session_logs/{session_id}.json", "w", encoding="utf-8") as f:
                json.dump(scan_log, f, indent=2)
            return {"result": result}

        task_id = global_task_manager.submit_task("Passive DNS Lookup", worker)
        return jsonify({"success": True, "task_id": task_id})
    except Exception as e:
        logging.error(f"Passive DNS lookup setup failed: {e}")
        return jsonify({"success": False, "error": f"Passive DNS lookup failed: {str(e)}"}), 500


@scanners_bp.route("/port-scan", methods=["POST"])
def port_scan():
    user = get_current_user()
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Missing payload."}), 400
        target = data.get("target", "").strip()
        mode = data.get("mode", "fast")

        if not target:
            return jsonify({"error": "Missing target"}), 400

        def worker(progress_callback=None):
            result = scan_target(target, mode, progress_callback=progress_callback)

            ip = request.remote_addr if request else "127.0.0.1"
            insert_lookup_log(user, ip, "Port Scanner", {"target": target, "mode": mode}, result)
            audit_log("Port Scanner", user, {"target": target, "mode": mode}, result)

            scan_log = {
                "tool": "Port Scanner",
                "input": f"{target} ({mode})",
                "result": result,
                "user": user,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            os.makedirs("session_logs", exist_ok=True)
            session_id = str(uuid.uuid4())
            with open(f"session_logs/{session_id}.json", "w", encoding="utf-8") as f:
                json.dump(scan_log, f, indent=2)
            return result

        task_id = global_task_manager.submit_task("Port Scanner", worker)
        return jsonify({"success": True, "task_id": task_id})
    except Exception as e:
        logging.error(f"Port scan setup failed: {e}")
        return jsonify({"error": f"Scan failed: {str(e)}"}), 500


@scanners_bp.route("/log-scan", methods=["POST"])
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
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2)

        return jsonify({"success": True, "session_id": session_id})
    except Exception as e:
        logging.error(f"Failed to log scan session: {e}")
        return jsonify({"success": False, "error": "Failed to log scan session"}), 500
    

@scanners_bp.route("/history", methods=["GET"])
def fetch_all_logs():
    try:
        log_dir = "session_logs"
        if not os.path.exists(log_dir):
            return jsonify({"success": True, "logs": []})
        
        logs = []
        for file in os.listdir(log_dir):
            if file.endswith(".json"):
                path = os.path.join(log_dir, file)
                with open(path, encoding="utf-8") as f:
                    logs.append(json.load(f))
        # Sort by timestamp descending
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        logging.error(f"Failed to load history logs: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
