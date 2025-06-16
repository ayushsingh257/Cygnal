# redirect_chain_tracer.py

import requests

def trace_redirects(url):
    try:
        print(f"\n🔗 Tracing redirects for: {url}\n")
        response = requests.get(url, allow_redirects=True, timeout=10)
        
        if len(response.history) == 0:
            print("✅ No redirects. This URL leads directly to its destination.\n")
        else:
            print("📍 Redirect Chain:")
            for i, resp in enumerate(response.history, 1):
                print(f" {i}. {resp.url} -->")
            print(f" 🎯 Final Destination: {response.url}\n")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")

# Example usage
if __name__ == "__main__":
    suspicious_url = "https://bit.ly/3I6ZzrY"  # You can replace this with any URL
    trace_redirects(suspicious_url)
