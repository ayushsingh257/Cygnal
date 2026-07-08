"""
Cygnal Scanner Engine — Era 4
10 Investigation Modules with structured result schemas, confidence scoring,
and case timeline integration.
"""

from flask import Blueprint, request, jsonify
import os, json, hashlib, socket, uuid, re, base64
from datetime import datetime
from db_utils import get_db_connection, DB_PATH
from database import check_tool_allowed, insert_lookup_log
from jwt_utils import decode_token
from functools import wraps
from concurrent.futures import ThreadPoolExecutor

scanners_bp = Blueprint("scanners_bp", __name__)

# Initialize background execution task manager pool
scan_executor = ThreadPoolExecutor(max_workers=5)

def run_scanner_task(task_func, *args, **kwargs):
    """Executes a scan task asynchronously in the background thread pool and waits for results."""
    future = scan_executor.submit(task_func, *args, **kwargs)
    return future.result(timeout=15)

def require_tool_permission(tool_name):
    """Flask endpoint decorator to check if user has active policy overrides to run the scanner."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if user == "unknown":
                return jsonify({"success": False, "error": "Authentication signature required."}), 401
            if not check_tool_allowed(user, tool_name):
                return jsonify({
                    "success": False, 
                    "error": f"Policy Restriction: You do not have permission to execute the '{tool_name}' tool. Contact your administrator to request access overrides."
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Auth helper ────────────────────────────────────────────────────────────

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = decode_token(token)
        return decoded.get("username", "unknown") if decoded else "unknown"
    except Exception:
        return "unknown"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def save_scan_to_timeline(case_id, scanner_name, summary, user, token_header):
    """Attach a scan result summary to a case timeline if case_id is provided."""
    if not case_id:
        return
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM cases WHERE id = ?;", (case_id,))
        if not cursor.fetchone():
            conn.close()
            return
        tid = str(uuid.uuid4())
        desc = f"[{scanner_name}] {summary}"
        cursor.execute("""
            INSERT INTO timeline (id, case_id, event_type, description, timestamp, user, metadata)
            VALUES (?, ?, 'scanner_result', ?, ?, ?, ?);
        """, (tid, case_id, desc, now_iso(), user, json.dumps({"scanner": scanner_name})))
        cursor.execute("UPDATE cases SET updated_at = ? WHERE id = ?;", (now_iso(), case_id))
        conn.commit()
        conn.close()
    except Exception:
        pass

# ════════════════════════════════════════════════════════════════
# 1. WHOIS LOOKUP
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners/whois", methods=["POST"])
@require_tool_permission("whois")
def whois_lookup():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    target = data.get("target", "").strip()
    case_id = data.get("case_id", "")

    if not target:
        return jsonify({"success": False, "error": "Target domain or IP is required."}), 400

    def execute_whois():
        import whois
        w = whois.whois(target)

        def safe(val):
            if val is None:
                return "Unknown"
            if isinstance(val, list):
                val = [str(v) for v in val]
                return ", ".join(val[:3])
            return str(val)

        result = {
            "domain": target,
            "registrar": safe(w.registrar),
            "creation_date": safe(w.creation_date),
            "expiration_date": safe(w.expiration_date),
            "updated_date": safe(w.updated_date),
            "name_servers": safe(w.name_servers),
            "status": safe(w.status),
            "emails": safe(w.emails),
            "registrant_name": safe(w.get("registrant_name", w.get("name", "Unknown"))),
            "country": safe(w.country),
            "org": safe(w.org),
            "dnssec": safe(w.get("dnssec", "Unknown")),
        }

        # Compute a risk hint
        risk = "low"
        risk_reasons = []
        if "Unknown" in result["creation_date"] or "Unknown" in result["registrar"]:
            risk = "medium"
            risk_reasons.append("Incomplete registration data")
        if result["dnssec"] in ("unsigned", "Unknown"):
            risk_reasons.append("No DNSSEC signing detected")

        summary = f"WHOIS for {target}: Registrar={result['registrar']}, Created={result['creation_date']}"
        save_scan_to_timeline(case_id, "WHOIS Lookup", summary, user, "")

        return {
            "success": True,
            "scanner": "whois",
            "target": target,
            "risk": risk,
            "risk_reasons": risk_reasons,
            "result": result,
            "scanned_at": now_iso(),
            "scanned_by": user
        }

    try:
        result_payload = run_scanner_task(execute_whois)
        insert_lookup_log(user, request.remote_addr, "whois", {"target": target, "case_id": case_id}, result_payload)
        return jsonify(result_payload)
    except Exception as e:
        return jsonify({"success": False, "error": f"WHOIS query failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 2. HTTP HEADER SCANNER
# ════════════════════════════════════════════════════════════════

SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-XSS-Protection",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Embedder-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
]

@scanners_bp.route("/scanners/headers", methods=["POST"])
@require_tool_permission("headers")
def header_scanner():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()
    case_id = data.get("case_id", "")

    if not url:
        return jsonify({"success": False, "error": "URL is required."}), 400
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    def execute_headers():
        import requests as req
        resp = req.get(url, timeout=10, allow_redirects=True, verify=False,
                       headers={"User-Agent": "CygnalScanner/1.0"})

        headers_dict = dict(resp.headers)
        security_results = []
        missing = []
        present = []

        for h in SECURITY_HEADERS:
            val = resp.headers.get(h)
            status = "present" if val else "missing"
            if val:
                present.append(h)
            else:
                missing.append(h)
            security_results.append({"header": h, "value": val or None, "status": status})

        score = int(len(present) / len(SECURITY_HEADERS) * 100)
        severity = "low" if score >= 70 else ("medium" if score >= 40 else "high")

        server_header = headers_dict.get("Server", "Not disclosed")
        powered_by = headers_dict.get("X-Powered-By", "Not disclosed")
        content_type = headers_dict.get("Content-Type", "Unknown")

        # Check for information disclosure
        warnings = []
        if server_header != "Not disclosed":
            warnings.append(f"Server version disclosed: {server_header}")
        if powered_by != "Not disclosed":
            warnings.append(f"Technology stack exposed: {powered_by}")

        summary = f"Header scan for {url}: Security score {score}%, {len(missing)} headers missing"
        save_scan_to_timeline(case_id, "HTTP Header Scanner", summary, user, "")

        return {
            "success": True,
            "scanner": "headers",
            "target": url,
            "status_code": resp.status_code,
            "security_score": score,
            "severity": severity,
            "security_headers": security_results,
            "missing_count": len(missing),
            "present_count": len(present),
            "server": server_header,
            "powered_by": powered_by,
            "content_type": content_type,
            "redirect_url": resp.url if resp.url != url else None,
            "warnings": warnings,
            "all_headers": headers_dict,
            "scanned_at": now_iso(),
            "scanned_by": user
        }

    try:
        result_payload = run_scanner_task(execute_headers)
        insert_lookup_log(user, request.remote_addr, "headers", {"url": url, "case_id": case_id}, result_payload)
        return jsonify(result_payload)
    except Exception as e:
        return jsonify({"success": False, "error": f"Header scan failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 3. METADATA EXTRACTOR
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners/metadata", methods=["POST"])
def metadata_extractor():
    user = get_current_user()
    case_id = request.form.get("case_id", "")

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"success": False, "error": "Empty filename."}), 400

    filename = file.filename
    file_bytes = file.read()
    file_size = len(file_bytes)
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    md5 = hashlib.md5(file_bytes).hexdigest()
    ext = os.path.splitext(filename)[1].lower()

    metadata = {}
    warnings = []
    iocs = []

    try:
        # Images — EXIF via exifread
        if ext in (".jpg", ".jpeg", ".png", ".tiff", ".gif", ".bmp", ".webp"):
            import io, exifread
            tags = exifread.process_file(io.BytesIO(file_bytes), details=False)
            for k, v in tags.items():
                metadata[k] = str(v)

            # GPS coordinates = high-value IOC
            if "GPS GPSLatitude" in tags or "GPS GPSLongitude" in tags:
                warnings.append("GPS coordinates embedded — potential geolocation exposure")
                iocs.append({"type": "gps", "value": f"Lat={tags.get('GPS GPSLatitude', '?')}, Lon={tags.get('GPS GPSLongitude', '?')}"})

            # Camera make/model disclosure
            if "Image Make" in tags or "Image Model" in tags:
                device = f"{tags.get('Image Make', '')} {tags.get('Image Model', '')}".strip()
                iocs.append({"type": "device", "value": device})

        # PDF — PyMuPDF
        elif ext == ".pdf":
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            meta = doc.metadata
            for k, v in meta.items():
                if v:
                    metadata[k] = v
            doc.close()

            if metadata.get("creator") or metadata.get("author"):
                author = metadata.get("author") or metadata.get("creator")
                iocs.append({"type": "author", "value": author})
                warnings.append(f"Author identity embedded: {author}")

            if metadata.get("creationDate"):
                iocs.append({"type": "creation_date", "value": metadata["creationDate"]})

        # DOCX
        elif ext in (".docx", ".doc"):
            from docx import Document
            import io
            doc = Document(io.BytesIO(file_bytes))
            core = doc.core_properties
            metadata = {
                "author": core.author or "Unknown",
                "last_modified_by": core.last_modified_by or "Unknown",
                "created": str(core.created) if core.created else "Unknown",
                "modified": str(core.modified) if core.modified else "Unknown",
                "revision": str(core.revision) if core.revision else "Unknown",
                "title": core.title or "Untitled",
                "description": core.description or "",
                "keywords": core.keywords or "",
                "category": core.category or "",
                "content_status": core.content_status or "",
            }
            if core.author:
                iocs.append({"type": "author", "value": core.author})
                warnings.append(f"Author identity embedded: {core.author}")
            if core.last_modified_by:
                iocs.append({"type": "modifier", "value": core.last_modified_by})

        else:
            metadata = {"note": f"Metadata extraction not supported for {ext} files"}

        severity = "high" if len(warnings) >= 2 else ("medium" if warnings else "low")
        confidence = min(100, 50 + len(metadata) * 2)

        summary = f"Metadata extracted from {filename}: {len(metadata)} fields, {len(iocs)} IOCs found"
        save_scan_to_timeline(case_id, "Metadata Extractor", summary, user, "")

        return jsonify({
            "success": True,
            "scanner": "metadata",
            "filename": filename,
            "file_size": file_size,
            "sha256": sha256,
            "md5": md5,
            "file_type": ext,
            "metadata": metadata,
            "iocs": iocs,
            "warnings": warnings,
            "severity": severity,
            "confidence": confidence,
            "scanned_at": now_iso(),
            "scanned_by": user
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Metadata extraction failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 4. DNS INTELLIGENCE
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners/dns", methods=["POST"])
def dns_intelligence():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    domain = data.get("domain", "").strip().lower()
    case_id = data.get("case_id", "")

    if not domain:
        return jsonify({"success": False, "error": "Domain is required."}), 400

    # Strip protocol if present
    domain = re.sub(r"^https?://", "", domain).split("/")[0]

    results = {"A": [], "AAAA": [], "MX": [], "NS": [], "TXT": [], "CNAME": [], "SOA": []}
    warnings = []
    iocs = []

    try:
        import dns.resolver, dns.exception

        resolver = dns.resolver.Resolver()
        resolver.timeout = 5
        resolver.lifetime = 5

        for rtype in ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]:
            try:
                answers = resolver.resolve(domain, rtype)
                for rdata in answers:
                    val = str(rdata)
                    results[rtype].append(val)
                    if rtype == "A":
                        iocs.append({"type": "ip", "value": val})
                    elif rtype == "MX":
                        iocs.append({"type": "mail_server", "value": val})
            except Exception:
                pass

        # SPF / DMARC checks
        spf_found = any("v=spf1" in r for r in results.get("TXT", []))
        dmarc_found = False
        try:
            dmarc_answers = resolver.resolve(f"_dmarc.{domain}", "TXT")
            dmarc_found = any("v=DMARC1" in str(r) for r in dmarc_answers)
        except Exception:
            pass

        if not spf_found:
            warnings.append("No SPF record detected — email spoofing risk")
        if not dmarc_found:
            warnings.append("No DMARC policy found — phishing protection gap")

        # Flag suspicious TXT records
        for txt in results.get("TXT", []):
            if any(kw in txt.lower() for kw in ["exfiltr", "malware", "c2", "beacon"]):
                warnings.append(f"Suspicious TXT content: {txt[:80]}")
                iocs.append({"type": "suspicious_txt", "value": txt})

        a_count = len(results["A"])
        ns_count = len(results["NS"])
        severity = "low"
        if a_count == 0:
            severity = "medium"
            warnings.append("No A records — domain may be parked or inactive")
        if ns_count == 0:
            severity = "high"
            warnings.append("No nameservers found — possible DNS misconfiguration")

        summary = f"DNS scan for {domain}: {a_count} A records, {ns_count} NS, SPF={'yes' if spf_found else 'no'}, DMARC={'yes' if dmarc_found else 'no'}"
        save_scan_to_timeline(case_id, "DNS Intelligence", summary, user, "")

        return jsonify({
            "success": True,
            "scanner": "dns",
            "domain": domain,
            "records": results,
            "spf": spf_found,
            "dmarc": dmarc_found,
            "iocs": iocs,
            "warnings": warnings,
            "severity": severity,
            "scanned_at": now_iso(),
            "scanned_by": user
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"DNS query failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 5. EMAIL HEADER ANALYZER
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners/email-headers", methods=["POST"])
def email_header_analyzer():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    raw_headers = data.get("raw_headers", "").strip()
    case_id = data.get("case_id", "")

    if not raw_headers:
        return jsonify({"success": False, "error": "Raw email headers are required."}), 400

    import email
    try:
        msg = email.message_from_string(raw_headers + "\n\nBody placeholder")

        from_addr = msg.get("From", "Unknown")
        to_addr = msg.get("To", "Unknown")
        subject = msg.get("Subject", "No Subject")
        date = msg.get("Date", "Unknown")
        message_id = msg.get("Message-ID", "Unknown")
        reply_to = msg.get("Reply-To", "")
        return_path = msg.get("Return-Path", "")

        # Parse Received hops
        received_hops = msg.get_all("Received") or []
        hops = []
        for i, hop in enumerate(received_hops):
            hops.append({"hop": i + 1, "raw": hop[:200]})

        # SPF / DKIM / DMARC authentication results
        auth_results = msg.get("Authentication-Results", "")
        spf = "pass" if "spf=pass" in auth_results.lower() else ("fail" if "spf=fail" in auth_results.lower() else "unknown")
        dkim = "pass" if "dkim=pass" in auth_results.lower() else ("fail" if "dkim=fail" in auth_results.lower() else "unknown")
        dmarc = "pass" if "dmarc=pass" in auth_results.lower() else ("fail" if "dmarc=fail" in auth_results.lower() else "unknown")

        warnings = []
        iocs = []

        # Extract IPs from Received headers
        ip_pattern = re.compile(r'\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?')
        ips_found = []
        for hop in received_hops:
            found = ip_pattern.findall(hop)
            for ip in found:
                if ip not in ips_found:
                    ips_found.append(ip)
                    iocs.append({"type": "ip", "value": ip})

        if spf in ("fail", "unknown"):
            warnings.append(f"SPF authentication: {spf} — possible spoofed sender")
        if dkim in ("fail", "unknown"):
            warnings.append(f"DKIM signature: {dkim} — email integrity unverified")
        if dmarc in ("fail", "unknown"):
            warnings.append(f"DMARC policy: {dmarc} — domain authentication failed")

        if reply_to and reply_to != from_addr:
            warnings.append(f"Reply-To mismatch: {reply_to} differs from From: {from_addr}")
            iocs.append({"type": "reply_to_mismatch", "value": reply_to})

        if return_path and "@" in return_path:
            from_domain = from_addr.split("@")[-1].strip(">") if "@" in from_addr else ""
            rp_domain = return_path.split("@")[-1].strip(">")
            if from_domain and rp_domain and from_domain not in rp_domain:
                warnings.append(f"Return-Path domain mismatch: {rp_domain} vs {from_domain}")

        severity = "high" if len(warnings) >= 3 else ("medium" if warnings else "low")
        confidence = 90 if severity == "high" else (65 if severity == "medium" else 30)

        summary = f"Email header analysis: From={from_addr}, SPF={spf}, DKIM={dkim}, DMARC={dmarc}, {len(warnings)} warnings"
        save_scan_to_timeline(case_id, "Email Header Analyzer", summary, user, "")

        return jsonify({
            "success": True,
            "scanner": "email_headers",
            "from": from_addr,
            "to": to_addr,
            "subject": subject,
            "date": date,
            "message_id": message_id,
            "reply_to": reply_to,
            "return_path": return_path,
            "hops": hops,
            "ips_found": ips_found,
            "spf": spf,
            "dkim": dkim,
            "dmarc": dmarc,
            "iocs": iocs,
            "warnings": warnings,
            "severity": severity,
            "confidence": confidence,
            "scanned_at": now_iso(),
            "scanned_by": user
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Email header parse failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 6. IP REPUTATION & GEOLOCATION
# ════════════════════════════════════════════════════════════════

# Known malicious CIDR stubs (demo — in production integrate AbuseIPDB / Shodan)
KNOWN_MALICIOUS_PREFIXES = ["185.220.", "95.216.", "5.188.", "194.165.", "91.108."]

@scanners_bp.route("/scanners/ip-reputation", methods=["POST"])
def ip_reputation():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    ip = data.get("ip", "").strip()
    case_id = data.get("case_id", "")

    if not ip:
        return jsonify({"success": False, "error": "IP address is required."}), 400

    # Basic IP format validation
    parts = ip.split(".")
    if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        return jsonify({"success": False, "error": "Invalid IPv4 address format."}), 400

    try:
        import requests as req
        # Use ipinfo.io free tier (no key required for basic info)
        resp = req.get(f"https://ipinfo.io/{ip}/json", timeout=8,
                       headers={"User-Agent": "CygnalScanner/1.0"})
        geo = resp.json()

        org = geo.get("org", "Unknown")
        asn = org.split(" ")[0] if org.startswith("AS") else "Unknown"
        isp = " ".join(org.split(" ")[1:]) if org.startswith("AS") else org
        country = geo.get("country", "Unknown")
        region = geo.get("region", "Unknown")
        city = geo.get("city", "Unknown")
        hostname = geo.get("hostname", "")
        timezone = geo.get("timezone", "Unknown")
        loc = geo.get("loc", "0,0")

        # Threat heuristics
        warnings = []
        iocs = []
        risk_score = 0

        # Check against known malicious prefixes
        for prefix in KNOWN_MALICIOUS_PREFIXES:
            if ip.startswith(prefix):
                warnings.append(f"IP falls within known threat actor subnet: {prefix}*")
                risk_score += 40
                iocs.append({"type": "malicious_subnet", "value": prefix})
                break

        # Hosting / datacenter detection
        datacenter_keywords = ["hosting", "cloud", "datacenter", "server", "digital ocean", "vultr", "linode", "ovh", "hetzner", "amazon", "google", "microsoft"]
        if any(kw in isp.lower() for kw in datacenter_keywords):
            warnings.append(f"IP belongs to hosting/cloud provider: {isp}")
            risk_score += 20

        # TOR exit node check (simplified — checks known TOR exit ranges)
        tor_ranges = ["185.220.101.", "185.220.102.", "185.220.103."]
        if any(ip.startswith(r) for r in tor_ranges):
            warnings.append("IP is a known TOR exit node")
            risk_score += 50
            iocs.append({"type": "tor_exit", "value": ip})

        severity = "high" if risk_score >= 50 else ("medium" if risk_score >= 20 else "low")
        if org:
            iocs.append({"type": "asn", "value": org})

        summary = f"IP reputation for {ip}: Country={country}, ISP={isp}, Risk={severity}"
        save_scan_to_timeline(case_id, "IP Reputation", summary, user, "")

        return jsonify({
            "success": True,
            "scanner": "ip_reputation",
            "ip": ip,
            "hostname": hostname,
            "org": org,
            "asn": asn,
            "isp": isp,
            "country": country,
            "region": region,
            "city": city,
            "timezone": timezone,
            "location": loc,
            "risk_score": min(risk_score, 100),
            "severity": severity,
            "warnings": warnings,
            "iocs": iocs,
            "scanned_at": now_iso(),
            "scanned_by": user
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"IP lookup failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 7. MALWARE FILE SCANNER
# ════════════════════════════════════════════════════════════════

# Simulated threat hash database (in production: VirusTotal / MalwareBazaar API)
KNOWN_MALICIOUS_HASHES = {
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855": "Empty file — benign",
    "44d88612fea8a8f36de82e1278abb02f": "EICAR test file detected",
    "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f": "EICAR Standard Test File",
}

DANGEROUS_EXTENSIONS = [".exe", ".dll", ".bat", ".ps1", ".vbs", ".js", ".jar", ".scr", ".com", ".pif", ".reg", ".cmd"]
SUSPICIOUS_EXTENSIONS = [".pdf", ".docx", ".doc", ".xls", ".xlsx", ".zip", ".rar", ".7z"]

@scanners_bp.route("/scanners/malware", methods=["POST"])
def malware_scanner():
    user = get_current_user()
    case_id = request.form.get("case_id", "")

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"success": False, "error": "Empty filename."}), 400

    filename = file.filename
    file_bytes = file.read()
    file_size = len(file_bytes)
    ext = os.path.splitext(filename)[1].lower()

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    md5 = hashlib.md5(file_bytes).hexdigest()
    sha1 = hashlib.sha1(file_bytes).hexdigest()

    detections = []
    warnings = []
    iocs = [
        {"type": "sha256", "value": sha256},
        {"type": "md5", "value": md5},
        {"type": "sha1", "value": sha1},
    ]

    # Hash database check
    hash_result = KNOWN_MALICIOUS_HASHES.get(sha256) or KNOWN_MALICIOUS_HASHES.get(md5)
    if hash_result:
        detections.append({"engine": "CygnalHashDB", "result": hash_result})

    # Extension risk
    if ext in DANGEROUS_EXTENSIONS:
        warnings.append(f"High-risk executable file type: {ext}")
        detections.append({"engine": "ExtensionAnalysis", "result": f"Dangerous extension: {ext}"})
    elif ext in SUSPICIOUS_EXTENSIONS:
        warnings.append(f"Potentially weaponized document type: {ext}")

    # Magic byte analysis
    magic_signatures = {
        b"MZ": "Windows Executable (PE)",
        b"PK": "ZIP archive / Office document",
        b"%PDF": "PDF document",
        b"\x7fELF": "Linux ELF Executable",
        b"#!/": "Shell script",
        b"\xd0\xcf\x11\xe0": "OLE2 Compound Document (Legacy Office)",
    }
    file_type_detected = "Unknown binary"
    for sig, label in magic_signatures.items():
        if file_bytes[:len(sig)] == sig:
            file_type_detected = label
            break

    # Entropy calculation (high entropy may indicate packing/encryption)
    import math
    if file_bytes:
        byte_counts = [0] * 256
        for b in file_bytes:
            byte_counts[b] += 1
        entropy = -sum((c / file_size) * math.log2(c / file_size) for c in byte_counts if c > 0)
    else:
        entropy = 0.0

    if entropy > 7.5:
        warnings.append(f"Very high entropy ({entropy:.2f}/8.0) — possible packing or encryption")
        detections.append({"engine": "EntropyAnalysis", "result": f"Suspicious entropy: {entropy:.2f}"})

    # Embedded URL scan (for documents / PDFs)
    url_pattern = re.compile(rb'https?://[^\s\x00-\x1f"\'<>]{4,}')
    found_urls = [u.decode("utf-8", errors="ignore") for u in url_pattern.findall(file_bytes[:50000])]
    for url in found_urls[:5]:
        iocs.append({"type": "embedded_url", "value": url})
        warnings.append(f"Embedded URL found: {url[:80]}")

    detection_count = len(detections)
    severity = "critical" if detection_count >= 2 else ("high" if detection_count == 1 else ("medium" if warnings else "low"))
    verdict = "Malicious" if detection_count >= 1 else ("Suspicious" if warnings else "Clean")

    summary = f"Malware scan of {filename}: Verdict={verdict}, {detection_count} detections, SHA-256={sha256[:16]}..."
    save_scan_to_timeline(case_id, "Malware Scanner", summary, user, "")

    return jsonify({
        "success": True,
        "scanner": "malware",
        "filename": filename,
        "file_size": file_size,
        "sha256": sha256,
        "md5": md5,
        "sha1": sha1,
        "file_type_detected": file_type_detected,
        "entropy": round(entropy, 4),
        "detections": detections,
        "detection_count": detection_count,
        "verdict": verdict,
        "severity": severity,
        "warnings": warnings,
        "iocs": iocs,
        "embedded_urls": found_urls[:10],
        "scanned_at": now_iso(),
        "scanned_by": user
    })

# ════════════════════════════════════════════════════════════════
# 8. SCREENSHOT / PAGE ARCHIVE TOOL
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners/screenshot", methods=["POST"])
def screenshot_tool():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()
    case_id = data.get("case_id", "")

    if not url:
        return jsonify({"success": False, "error": "URL is required."}), 400
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        import requests as req

        # Fetch page metadata (title, description, links, scripts)
        resp = req.get(url, timeout=12, allow_redirects=True,
                       headers={"User-Agent": "Mozilla/5.0 (CygnalScanner/1.0)"}, verify=False)

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "lxml")

        title = soup.title.string.strip() if soup.title and soup.title.string else "No title"
        meta_desc = ""
        for m in soup.find_all("meta"):
            if m.get("name", "").lower() == "description":
                meta_desc = m.get("content", "")[:300]
                break

        # External links
        external_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("http") and url.split("/")[2] not in href:
                external_links.append(href)

        # Scripts
        scripts = [s.get("src", "") for s in soup.find_all("script", src=True)]

        # Forms
        forms = []
        for f in soup.find_all("form"):
            forms.append({
                "action": f.get("action", ""),
                "method": f.get("method", "get").upper()
            })

        # Technology detection
        techs = []
        page_src = resp.text.lower()
        tech_map = {
            "react": "React.js", "angular": "Angular", "vue": "Vue.js",
            "jquery": "jQuery", "wordpress": "WordPress", "drupal": "Drupal",
            "bootstrap": "Bootstrap", "nginx": "nginx", "apache": "Apache",
            "django": "Django", "laravel": "Laravel", "asp.net": "ASP.NET"
        }
        for kw, name in tech_map.items():
            if kw in page_src:
                techs.append(name)

        warnings = []
        iocs = []
        if forms:
            warnings.append(f"{len(forms)} form(s) detected — possible data collection")
        if len(external_links) > 20:
            warnings.append(f"High number of external links: {len(external_links)}")

        summary = f"Page archive for {url}: Title='{title[:50]}', {len(external_links)} external links"
        save_scan_to_timeline(case_id, "Screenshot Tool", summary, user, "")

        return jsonify({
            "success": True,
            "scanner": "screenshot",
            "url": url,
            "final_url": resp.url,
            "status_code": resp.status_code,
            "title": title,
            "description": meta_desc,
            "content_type": resp.headers.get("Content-Type", ""),
            "page_size_bytes": len(resp.content),
            "technologies": techs,
            "external_links": external_links[:15],
            "external_link_count": len(external_links),
            "scripts": scripts[:10],
            "forms": forms[:5],
            "warnings": warnings,
            "iocs": iocs,
            "note": "Full screenshot capture requires headless browser — page metadata archived instead.",
            "scanned_at": now_iso(),
            "scanned_by": user
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Page archive failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 9. REVERSE IMAGE SEARCH / IMAGE FORENSICS
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners/reverse-image", methods=["POST"])
def reverse_image_search():
    user = get_current_user()
    case_id = request.form.get("case_id", "")

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"success": False, "error": "Empty filename."}), 400

    filename = file.filename
    file_bytes = file.read()
    file_size = len(file_bytes)
    ext = os.path.splitext(filename)[1].lower()

    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"):
        return jsonify({"success": False, "error": "Unsupported image format."}), 400

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    md5 = hashlib.md5(file_bytes).hexdigest()

    exif_data = {}
    gps_info = {}
    iocs = []
    warnings = []

    try:
        import io, exifread
        from PIL import Image

        # EXIF data — gracefully handle files without EXIF (e.g. PNG)
        try:
            tags = exifread.process_file(io.BytesIO(file_bytes), details=True)
            for k, v in tags.items():
                exif_data[k] = str(v)
        except Exception:
            pass  # No EXIF data is fine — continue with PIL analysis

        # PIL image analysis
        img = Image.open(io.BytesIO(file_bytes))

        width, height = img.size
        mode = img.mode
        format_ = img.format or ext[1:].upper()

        # GPS extraction
        def to_decimal(dms_str):
            try:
                parts = re.findall(r"[\d.]+", dms_str)
                if len(parts) >= 3:
                    return float(parts[0]) + float(parts[1]) / 60 + float(parts[2]) / 3600
            except Exception:
                pass
            return None

        if "GPS GPSLatitude" in exif_data and "GPS GPSLongitude" in exif_data:
            lat = to_decimal(exif_data["GPS GPSLatitude"])
            lon = to_decimal(exif_data["GPS GPSLongitude"])
            lat_ref = exif_data.get("GPS GPSLatitudeRef", "N")
            lon_ref = exif_data.get("GPS GPSLongitudeRef", "E")
            if lat and lon:
                if lat_ref == "S":
                    lat = -lat
                if lon_ref == "W":
                    lon = -lon
                gps_info = {
                    "latitude": round(lat, 6),
                    "longitude": round(lon, 6),
                    "maps_link": f"https://maps.google.com/?q={lat},{lon}"
                }
                warnings.append(f"GPS coordinates found: {lat:.4f}, {lon:.4f}")
                iocs.append({"type": "gps", "value": f"{lat:.6f},{lon:.6f}"})

        # Device fingerprint
        device = ""
        if "Image Make" in exif_data:
            device = exif_data["Image Make"]
            iocs.append({"type": "camera_make", "value": device})
        if "Image Model" in exif_data:
            device += f" {exif_data['Image Model']}"
            iocs.append({"type": "camera_model", "value": exif_data["Image Model"]})

        # Software watermark
        if "Image Software" in exif_data:
            software = exif_data["Image Software"]
            warnings.append(f"Software watermark detected: {software}")
            iocs.append({"type": "software", "value": software})

        # Steganography hint (high entropy + unusual dimensions)
        import math
        pixel_entropy = 0.0
        if img.mode in ("L", "RGB", "RGBA"):
            try:
                histogram = img.histogram()
                total = sum(histogram)
                pixel_entropy = -sum((c / total) * math.log2(c / total) for c in histogram if c > 0)
            except Exception:
                warnings.append("Could not calculate pixel entropy — broken image data stream")

        steg_suspect = pixel_entropy > 7.5 and file_size > 100000
        if steg_suspect:
            warnings.append(f"High pixel entropy ({pixel_entropy:.2f}) — possible steganographic content")

        severity = "high" if gps_info else ("medium" if warnings else "low")
        confidence = 85 if gps_info else (60 if exif_data else 30)

        # Generate Google/TinEye search links
        search_links = {
            "google_lens": f"https://lens.google.com/",
            "tineye": "https://tineye.com/",
            "yandex": "https://yandex.com/images/",
        }

        summary = f"Image forensics for {filename}: {len(exif_data)} EXIF fields, GPS={'yes' if gps_info else 'no'}, Device={device or 'Unknown'}"
        save_scan_to_timeline(case_id, "Reverse Image Search", summary, user, "")

        return jsonify({
            "success": True,
            "scanner": "reverse_image",
            "filename": filename,
            "file_size": file_size,
            "sha256": sha256,
            "md5": md5,
            "dimensions": f"{width}x{height}",
            "format": format_,
            "color_mode": mode,
            "exif_fields_count": len(exif_data),
            "exif_data": dict(list(exif_data.items())[:40]),
            "gps": gps_info,
            "device": device.strip(),
            "pixel_entropy": round(pixel_entropy, 4),
            "steganography_suspect": steg_suspect,
            "warnings": warnings,
            "iocs": iocs,
            "severity": severity,
            "confidence": confidence,
            "search_links": search_links,
            "scanned_at": now_iso(),
            "scanned_by": user
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Image analysis failed: {str(e)}"}), 500

# ════════════════════════════════════════════════════════════════
# 10. THREAT INTELLIGENCE — IOC LOOKUP
# ════════════════════════════════════════════════════════════════

# Simulated threat intel DB — in production: integrate OTX, MISP, VirusTotal
THREAT_INTEL_DB = {
    "185.220.101.1": {"type": "C2 Server", "tags": ["TOR", "Botnet"], "confidence": 95, "first_seen": "2024-03-01"},
    "malware-domain.ru": {"type": "Malware Distribution", "tags": ["Ransomware", "Phishing"], "confidence": 90, "first_seen": "2025-01-15"},
    "94.130.56.52": {"type": "Port Scanner", "tags": ["Mass Scanner", "Shodan"], "confidence": 80, "first_seen": "2025-06-10"},
}

CVE_PATTERNS = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)

@scanners_bp.route("/scanners/threat-intel", methods=["POST"])
def threat_intelligence():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    ioc = data.get("ioc", "").strip()
    ioc_type = data.get("ioc_type", "auto").strip()  # ip, domain, hash, cve, url
    case_id = data.get("case_id", "")

    if not ioc:
        return jsonify({"success": False, "error": "IOC value is required."}), 400

    # Auto-detect IOC type
    if ioc_type == "auto":
        if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ioc):
            ioc_type = "ip"
        elif CVE_PATTERNS.match(ioc):
            ioc_type = "cve"
        elif re.match(r"^[a-fA-F0-9]{32}$", ioc):
            ioc_type = "md5"
        elif re.match(r"^[a-fA-F0-9]{40}$", ioc):
            ioc_type = "sha1"
        elif re.match(r"^[a-fA-F0-9]{64}$", ioc):
            ioc_type = "sha256"
        elif "." in ioc and "/" not in ioc:
            ioc_type = "domain"
        else:
            ioc_type = "url"

    # Local database lookup
    local_match = THREAT_INTEL_DB.get(ioc)

    # Cross-reference scan result history in our own DB
    db_hits = []
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.description, t.timestamp, t.user, c.title, c.case_number
            FROM timeline t JOIN cases c ON t.case_id = c.id
            WHERE t.description LIKE ?
            ORDER BY t.timestamp DESC LIMIT 10;
        """, (f"%{ioc}%",))
        for row in cursor.fetchall():
            db_hits.append({
                "description": row[0][:200],
                "timestamp": row[1],
                "analyst": row[2],
                "case_title": row[3],
                "case_number": row[4],
            })
        conn.close()
    except Exception:
        pass

    # CVE lookup (simulated enrichment)
    cve_details = None
    if ioc_type == "cve":
        cve_details = {
            "id": ioc.upper(),
            "description": "CVE details would be fetched from NVD/NIST in production integration.",
            "cvss_score": "Check NVD: https://nvd.nist.gov/vuln/detail/" + ioc.upper(),
            "note": "Integrate NVD API for live CVSS scores and affected product lists."
        }

    threat_found = local_match is not None
    confidence = local_match["confidence"] if local_match else (30 if db_hits else 0)
    severity = "critical" if confidence >= 80 else ("high" if confidence >= 60 else ("medium" if confidence >= 30 else "low"))

    warnings = []
    if threat_found:
        warnings.append(f"IOC matched known threat: {local_match['type']}")
    if db_hits:
        warnings.append(f"IOC appears in {len(db_hits)} previous Cygnal investigations")

    summary = f"Threat intel lookup for {ioc} ({ioc_type}): {'THREAT DETECTED' if threat_found else 'No known threat match'}"
    save_scan_to_timeline(case_id, "Threat Intelligence", summary, user, "")

    return jsonify({
        "success": True,
        "scanner": "threat_intel",
        "ioc": ioc,
        "ioc_type": ioc_type,
        "threat_found": threat_found,
        "threat_details": local_match,
        "confidence": confidence,
        "severity": severity,
        "db_hits": db_hits,
        "cve_details": cve_details,
        "warnings": warnings,
        "enrichment_sources": ["CygnalLocalDB", "CygnalTimeline"],
        "note": "Production integrations: VirusTotal, OTX, MISP, AbuseIPDB, NVD/NIST",
        "scanned_at": now_iso(),
        "scanned_by": user
    })

# ════════════════════════════════════════════════════════════════
# SCANNER DIRECTORY LISTING
# ════════════════════════════════════════════════════════════════

@scanners_bp.route("/scanners", methods=["GET"])
def get_scanner_directory():
    user = get_current_user()
    if user == "unknown":
        return jsonify({"success": False, "error": "Authentication signature required."}), 401
    
    scanners = [
        {"slug": "whois", "name": "WHOIS Lookup", "description": "Domain/IP ownership, registrar, creation dates, nameservers", "input": "text", "category": "Reconnaissance"},
        {"slug": "headers", "name": "HTTP Header Scanner", "description": "Security headers audit, CSP/HSTS analysis, info disclosure", "input": "text", "category": "Web Security"},
        {"slug": "metadata", "name": "Metadata Extractor", "description": "EXIF, PDF/Office document properties, author identity, GPS", "input": "file", "category": "Document Forensics"},
        {"slug": "dns", "name": "DNS Intelligence", "description": "A/MX/NS/TXT/CNAME records, SPF, DMARC, historical analysis", "input": "text", "category": "Reconnaissance"},
        {"slug": "email-headers", "name": "Email Header Analyzer", "description": "Routing hops, SPF/DKIM/DMARC auth, IP extraction, spoofing detection", "input": "textarea", "category": "Email Security"},
        {"slug": "ip-reputation", "name": "IP Reputation", "description": "Geolocation, ASN, ISP, threat feeds, TOR exit node detection", "input": "text", "category": "Threat Intelligence"},
        {"slug": "malware", "name": "Malware Scanner", "description": "Hash reputation, entropy analysis, magic byte detection, URL extraction", "input": "file", "category": "Malware Analysis"},
        {"slug": "screenshot", "name": "Page Archiver", "description": "Technology detection, external links, forms, page metadata archival", "input": "text", "category": "Web Security"},
        {"slug": "reverse-image", "name": "Image Forensics", "description": "EXIF analysis, GPS extraction, device fingerprint, steganography detection", "input": "file", "category": "Digital Forensics"},
        {"slug": "threat-intel", "name": "Threat Intelligence", "description": "IOC lookup across threat feeds, CVE enrichment, timeline cross-reference", "input": "text", "category": "Threat Intelligence"},
    ]
    return jsonify({"success": True, "scanners": scanners})
