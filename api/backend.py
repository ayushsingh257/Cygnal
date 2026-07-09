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
from routes.v2.webhooks import webhooks_bp
from routes.v2.admin import admin_bp  # B-03/B-07: Real audit log + health endpoints
from routes.v2.threat_intel import threat_intel_bp  # Phase 2: Threat Intelligence


# ========== LOGGING CONFIGURATION ==========
from log_utils import setup_structured_logging
setup_structured_logging()

# ========== FLASK SETUP ==========
app = Flask(__name__)

from flask import g, request
import uuid

@app.before_request
def assign_correlation_id():
    g.correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())


# B-05 FIX: Limit request body size to prevent memory exhaustion attacks.
# JSON API calls: 10 MB. File uploads use a separate streaming check in routes.
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH_MB", "10")) * 1024 * 1024

# ========== SECURITY: HTTP HEADERS ==========
@app.after_request
def set_security_headers(response):
    """
    Add security headers to all responses.
    H-08 FIX: Removed 'unsafe-inline' from script-src.
    NOTE: style-src retains 'unsafe-inline' as a documented exception required
    by Next.js CSS-in-JS at runtime. This is acceptable given the frontend
    is served separately and the backend only serves API JSON responses.
    """
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self'; "                              # No unsafe-inline
        "style-src 'self' 'unsafe-inline'; "              # Documented: required by Next.js
        "img-src 'self' data: https:; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' ws: wss:; "
        "frame-ancestors 'none'; "
        "upgrade-insecure-requests;"
    )
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
app.register_blueprint(webhooks_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api")  # Admin + health + audit
app.register_blueprint(threat_intel_bp, url_prefix="/api")  # Phase 2: Threat Intel

# ========== GLOBAL ERROR HANDLERS ==========
@app.errorhandler(500)
def handle_500_error(e):
    logging.error(f"Global 500 error: {e}")
    return jsonify({"success": False, "error": "Internal Server Error"}), 500

@app.errorhandler(404)
def handle_404_error(e):
    return jsonify({"success": False, "error": "Route not found"}), 404

@app.errorhandler(413)
def handle_413_error(e):
    """B-05 FIX: Request payload too large."""
    return jsonify({
        "success": False,
        "error": "Request payload too large. Maximum allowed size is 10 MB."
    }), 413

@app.errorhandler(429)
def handle_429_error(e):
    return jsonify({
        "success": False,
        "error": "Too many requests. Please wait before trying again."
    }), 429



# ========== MAIN ==========
if __name__ == "__main__":
    init_lookup_db()   # Ensure database schema is initialized and migrated
    init_db()          # Ensure default admin accounts are seeded
    
    # Determine debug mode from environment
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    
    logging.info(f"Starting Cygnal v3.5 Flask Backend with WebSockets on port 5000... (debug={debug_mode})")
    
    # Security: Never use debug=True in production
    socketio.run(app, debug=debug_mode, host="0.0.0.0", port=5000)
