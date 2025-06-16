# email_header_analyzer.py

import re

def analyze_email_header(file_path):
    with open(file_path, 'r') as f:
        header = f.read()

    print("\n📨 Analyzing Email Header...\n")

    # Extract sending IP
    ip_match = re.search(r'Received: from .* \((.*)\)', header)
    if ip_match:
        print(f"🔍 Possible Sender IP: {ip_match.group(1)}")
    else:
        print("⚠️ Could not extract sender IP.")

    # Extract SPF result
    spf_match = re.search(r'spf=(pass|fail)', header)
    if spf_match:
        print(f"✅ SPF Check: {spf_match.group(1).upper()}")
    else:
        print("⚠️ SPF result not found.")

    # DKIM result
    dkim_match = re.search(r'dkim=(pass|fail)', header)
    if dkim_match:
        print(f"✅ DKIM Check: {dkim_match.group(1).upper()}")
    else:
        print("⚠️ DKIM result not found.")

    # DMARC result
    dmarc_match = re.search(r'dmarc=(pass|fail)', header)
    if dmarc_match:
        print(f"✅ DMARC Check: {dmarc_match.group(1).upper()}")
    else:
        print("⚠️ DMARC result not found.")

    # From address
    from_match = re.search(r'From: .*<(.+)>', header)
    if from_match:
        print(f"📩 Claimed Sender: {from_match.group(1)}")
    else:
        print("⚠️ Claimed sender not found.")

# Example usage
if __name__ == "__main__":
    analyze_email_header("sample_headers/sample-email.txt")
