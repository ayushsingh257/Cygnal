"""
Cygnal Entity & IOC Extraction Engine — Sprint 1
Regex-based parses for unstructured threat logs and document inputs.
"""

import re
import os
import hashlib

# Regular expression pattern index
IP_PATTERN = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
IPV6_PATTERN = re.compile(r'(?<![A-Fa-f0-9:])(?:(?:[A-Fa-f0-9]{1,4}:){1,7}:[A-Fa-f0-9]{1,4}|::[A-Fa-f0-9]{1,4}|[A-Fa-f0-9]{1,4}::|::1|(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4})(?![A-Fa-f0-9:])')
URL_PATTERN = re.compile(r'https?://[^\s/$.?#].[^\s]*')

DOMAIN_PATTERN = re.compile(r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b')
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')

SHA256_PATTERN = re.compile(r'\b[A-Fa-f0-9]{64}\b')
MD5_PATTERN = re.compile(r'\b[A-Fa-f0-9]{32}\b')
SHA1_PATTERN = re.compile(r'\b[A-Fa-f0-9]{40}\b')

CVE_PATTERN = re.compile(r'\bCVE-\d{4}-\d{4,7}\b', re.IGNORECASE)
MITRE_TACTIC_PATTERN = re.compile(r'\bTA\d{4}\b', re.IGNORECASE)
MITRE_TECHNIQUE_PATTERN = re.compile(r'\bT\d{4}(?:\.\d{3})?\b', re.IGNORECASE)

# Windows and Linux specific system entity patterns
REGISTRY_PATTERN = re.compile(
    r'\b(?:HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS|HKLM|HKCU|HKCR)\\[a-zA-Z0-9_\-\\]+\b',
    re.IGNORECASE
)
WINDOWS_PATH_PATTERN = re.compile(r'\b[a-zA-Z]:\\(?:[^\\\/:*?"<>|\s\r\n]+\\)*[^\\\/:*?"<>|\s\r\n]+\b')

LINUX_PATH_PATTERN = re.compile(r'(?<![a-zA-Z0-9])/(?:bin|boot|dev|etc|home|lib|lib64|media|mnt|opt|proc|root|run|sbin|srv|sys|tmp|usr|var)/(?:[^/\s]+/)*[^/\s]+\b')

PROCESS_PATTERN = re.compile(r'\b[a-zA-Z0-9_\-]+\.(?:exe|dll|sys|bin|sh|elf|bat|ps1)\b', re.IGNORECASE)

# Usernames: system accounts + domain\user formats
SYSTEM_USER_PATTERN = re.compile(r'\b(?:Administrator|SYSTEM|LocalService|NetworkService|guest|root|www-data|admin|NT AUTHORITY\\SYSTEM|NT AUTHORITY\\LOCAL SERVICE|NT AUTHORITY\\NETWORK SERVICE)\b', re.IGNORECASE)
DOMAIN_USER_PATTERN = re.compile(r'\b[a-zA-Z0-9._-]+\\[a-zA-Z0-9._-]+\b')




# Hostnames: FQDN hostnames or local corp hostnaming schemes
HOSTNAME_PATTERN = re.compile(r'\b[a-zA-Z0-9-]{2,63}\.(?:local|lan|internal|corp|domain)\b', re.IGNORECASE)

def extract_entities_from_text(text: str) -> list:
    """
    Parses unstructured text and extracts all supported entity types.
    Returns a list of dicts: [{"value": str, "type": str}]
    """
    if not text:
        return []

    extracted = []
    seen = set()

    def add_match(val, entity_type):
        normalized = val.strip()
        if entity_type in ('cve', 'mitre_tactic', 'mitre_technique', 'registry_path', 'process_name', 'username', 'hostname'):
            normalized = normalized.lower()
        
        dup_key = (normalized, entity_type)
        if dup_key not in seen:
            seen.add(dup_key)
            extracted.append({
                "value": val.strip(),
                "type": entity_type
            })

    # IPs & Hostnames
    for match in IP_PATTERN.findall(text):
        add_match(match, "ip")
    for match in IPV6_PATTERN.findall(text):
        add_match(match, "ip")
    for match in HOSTNAME_PATTERN.findall(text):
        add_match(match, "hostname")

    # URLs & Domains & Emails
    for match in URL_PATTERN.findall(text):
        # Prevent trailing punctuation marks often grabbed by raw URLs
        clean_url = re.sub(r'[.,;:)\]\s]+$', '', match)
        add_match(clean_url, "url")
    for match in DOMAIN_PATTERN.findall(text):
        # Skip if domain ends with internal hostname suffix
        if match.lower().endswith(('.local', '.lan', '.internal', '.corp', '.domain')):
            continue
        add_match(match, "domain")

    for match in EMAIL_PATTERN.findall(text):
        add_match(match, "email")

    # Hashes
    for match in SHA256_PATTERN.findall(text):
        add_match(match, "hash")
    for match in SHA1_PATTERN.findall(text):
        add_match(match, "hash")
    for match in MD5_PATTERN.findall(text):
        add_match(match, "hash")

    # CVE & MITRE ATT&CK
    for match in CVE_PATTERN.findall(text):
        add_match(match, "cve")
    for match in MITRE_TACTIC_PATTERN.findall(text):
        add_match(match, "mitre_tactic")
    for match in MITRE_TECHNIQUE_PATTERN.findall(text):
        add_match(match, "mitre_technique")

    # System configurations
    for match in REGISTRY_PATTERN.findall(text):
        add_match(match, "registry_path")
    for match in WINDOWS_PATH_PATTERN.findall(text):
        add_match(match, "filepath")
    for match in LINUX_PATH_PATTERN.findall(text):
        add_match(match, "filepath")
    for match in PROCESS_PATTERN.findall(text):
        add_match(match, "process_name")

    # Usernames
    for match in SYSTEM_USER_PATTERN.findall(text):
        add_match(match, "username")
    for match in DOMAIN_USER_PATTERN.findall(text):
        add_match(match, "username")

    return extracted
