# api/port_scanner.py

import subprocess
import json
import re
import shutil
from typing import List, Dict
from dotenv import load_dotenv
import os

load_dotenv()

def is_valid_ip_or_domain(target: str) -> bool:
    if target.startswith("-"):
        return False
    ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
    domain_pattern = r"^(?!-)[a-zA-Z0-9.-]+(?<!-)\.[a-zA-Z]{2,}$"
    if not (re.match(ip_pattern, target) or re.match(domain_pattern, target)):
        return False
    if re.match(ip_pattern, target):
        try:
            return all(0 <= int(o) <= 255 for o in target.split("."))
        except ValueError:
            return False
    return True

def is_tool_installed(name: str) -> bool:
    return shutil.which(name) is not None

def run_nmap_scan(target: str, progress_callback=None) -> List[Dict]:
    if progress_callback:
        progress_callback(30)
    try:
        if progress_callback:
            progress_callback(50)
        result = subprocess.run(
            ["nmap", "-T4", "-sS", "-Pn", "-p-", target],
            capture_output=True,
            text=True,
            timeout=60
        )
        if progress_callback:
            progress_callback(80)
        lines = result.stdout.splitlines()
        ports = []
        in_ports_section = False
        for line in lines:
            if "PORT" in line and "STATE" in line and "SERVICE" in line:
                in_ports_section = True
                continue
            if in_ports_section:
                if line.strip() == "":
                    break
                parts = line.split()
                if len(parts) >= 3:
                    port_proto, state, service = parts[:3]
                    port, proto = port_proto.split("/")
                    ports.append({
                        "port": int(port),
                        "protocol": proto,
                        "state": state,
                        "service": service,
                        "scan_type": "nmap"
                    })
        if progress_callback:
            progress_callback(95)
        return ports
    except Exception as e:
        return [{"error": str(e)}]

def run_masscan_scan(target: str, progress_callback=None) -> List[Dict]:
    if progress_callback:
        progress_callback(30)
    interface = os.getenv("SCAN_INTERFACE", "eth0")
    try:
        if progress_callback:
            progress_callback(60)
        result = subprocess.run(
            ["sudo", "masscan", target, "--ports", "1-1000", "--rate", "1000", "-e", interface],
            capture_output=True,
            text=True,
            timeout=30
        )
        if progress_callback:
            progress_callback(85)
        lines = result.stdout.splitlines()
        ports = []
        for line in lines:
            if line.startswith("Discovered open port"):
                match = re.search(r"Discovered open port (\d+)/(\w+) on ([\d.]+)", line)
                if match:
                    port, proto, ip = match.groups()
                    ports.append({
                        "port": int(port),
                        "protocol": proto,
                        "state": "open",
                        "service": "unknown",
                        "scan_type": "masscan"
                    })
        if progress_callback:
            progress_callback(95)
        return ports
    except Exception as e:
        return [{"error": str(e)}]

def scan_target(target: str, mode: str = "fast", progress_callback=None) -> Dict:
    if not is_valid_ip_or_domain(target):
        return {"error": "Invalid IP or domain."}

    if progress_callback:
        progress_callback(15)

    if mode == "fast" and is_tool_installed("masscan"):
        return {"results": run_masscan_scan(target, progress_callback=progress_callback)}
    elif is_tool_installed("nmap"):
        return {"results": run_nmap_scan(target, progress_callback=progress_callback)}
    else:
        return {"error": "Neither Masscan nor Nmap is available on this system."}
