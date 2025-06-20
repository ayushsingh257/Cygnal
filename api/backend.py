import os
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

# Metadata tools
from PIL import Image
from PIL.ExifTags import TAGS
import fitz  # PyMuPDF
import docx

# Reverse image search
from reverse_image_search import perform_reverse_image_search

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
                    continue  # skip raw binary
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

# ========== ROUTES ==========

@app.route("/api/header-scan", methods=["POST"])
def header_scan():
    data = request.get_json()
    url = data.get("url", "").strip()

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
        return jsonify({"success": True, "headers": results})
    except requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"Header scan failed: {str(e)}"}), 500

@app.route("/api/whois-lookup", methods=["POST"])
def whois_lookup():
    data = request.get_json()
    domain = data.get("domain", "").strip()

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
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"WHOIS lookup failed: {str(e)}"}), 500

@app.route("/api/screenshot", methods=["POST"])
def screenshot():
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

        return jsonify({"success": True, "image": encoded})
    except Exception as e:
        return jsonify({"success": False, "error": f"Screenshot failed: {str(e)}"}), 500

@app.route("/api/metadata", methods=["POST"])
def metadata_extraction():
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

        return jsonify({"success": True, "metadata": metadata})
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to extract metadata: {str(e)}"}), 500

@app.route('/api/reverse-image-search', methods=['POST'])
def reverse_image_search():
    try:
        file = request.files['file']
        if not file:
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        filepath = os.path.join("temp_upload", file.filename)
        file.save(filepath)

        results = perform_reverse_image_search(filepath)

        return jsonify({"success": True, "results": results})
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.errorhandler(500)
def handle_500_error(e):
    return jsonify({"success": False, "error": "Internal Server Error"}), 500

# ========== MAIN ==========
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)