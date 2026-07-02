import os
from dotenv import load_dotenv
load_dotenv()

# Set environment variable to bypass KMP duplicate library errors
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler

from auth_utils import init_db
from database import init_lookup_db

# Import v2 blueprints
from routes.v2.auth import auth_bp
from routes.v2.admin import admin_bp
from routes.v2.scanners import scanners_bp
from routes.v2.cases import cases_bp

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
# Enable CORS for all routes under /api/
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Serve reference images static folder
@app.route('/reference_images/<path:filename>')
def serve_reference_images(filename):
    return send_from_directory('reference_images', filename)

# Serve screenshots static folder (useful for dashboard images rendering)
@app.route('/screenshots/<path:filename>')
def serve_screenshots(filename):
    return send_from_directory('screenshots', filename)

# Register v2 Blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api")
app.register_blueprint(scanners_bp, url_prefix="/api")
app.register_blueprint(cases_bp, url_prefix="/api")

# ========== GLOBAL ERROR HANDLERS ==========
@app.errorhandler(500)
def handle_500_error(e):
    logging.error(f"Global 500 error: {e}")
    return jsonify({"success": False, "error": "Internal Server Error"}), 500

@app.errorhandler(404)
def handle_404_error(e):
    return jsonify({"success": False, "error": "Route not found"}), 404

# ========== MAIN ==========
if __name__ == "__main__":
    init_db()          # Ensure unified DB has users table
    init_lookup_db()   # Ensure unified DB has logs & threat intel tables
    logging.info("Starting Cygnal 2.0 Backend on port 5000...")
    app.run(debug=True, host="0.0.0.0", port=5000)
