import os
from dotenv import load_dotenv
load_dotenv()

# Set environment variable to bypass KMP duplicate library errors
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from flask import Flask, jsonify
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler

from auth_utils import init_db
from database import init_lookup_db
from socket_app import socketio

# Import v2 blueprints
from routes.v2.auth import auth_bp
from routes.v2.cases import cases_bp
from routes.v2.scanners import scanners_bp
from routes.v2.ai import ai_bp
from routes.v2.reports import reports_bp
from routes.v2.investigations import investigations_bp
from routes.v2.copilot import copilot_bp
from routes.v2.mfa import mfa_bp

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

# ========== SECURITY: HTTP HEADERS ==========
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:;"
    return response

# Enable CORS for configured origins (not wildcard in production)
CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")}})
socketio.init_app(app, cors_allowed_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","))

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(cases_bp, url_prefix="/api")
app.register_blueprint(scanners_bp, url_prefix="/api")
app.register_blueprint(ai_bp, url_prefix="/api")
app.register_blueprint(reports_bp, url_prefix="/api")
app.register_blueprint(investigations_bp, url_prefix="/api")
app.register_blueprint(copilot_bp, url_prefix="/api")
app.register_blueprint(mfa_bp, url_prefix="/api")


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
    init_lookup_db()   # Ensure database schema is initialized and migrated
    init_db()          # Ensure default admin accounts are seeded
    
    # Determine debug mode from environment
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    
    logging.info(f"Starting Cygnal v2.5 Flask Backend with WebSockets on port 5000... (debug={debug_mode})")
    
    # Security: Never use debug=True in production
    socketio.run(app, debug=debug_mode, host="0.0.0.0", port=5000)
