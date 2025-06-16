import requests

# Target website
url = "https://poki.com/"  # <- change this later as needed

# Security headers to check
required_headers = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy"
]

def analyze_headers(response_headers):
    print(f"\nAnalyzing security headers for: {url}\n")
    for header in required_headers:
        if header in response_headers:
            print(f"[+] {header}: Present ✅")
        else:
            print(f"[-] {header}: Missing ❌")

def fetch_headers(url):
    try:
        response = requests.get(url)
        analyze_headers(response.headers)
    except requests.exceptions.RequestException as e:
        print(f"[!] Error connecting to {url}: {e}")

# Run the function
fetch_headers(url)
