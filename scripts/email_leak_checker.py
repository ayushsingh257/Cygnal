# scripts/email_leak_checker.py

import requests
import re
from bs4 import BeautifulSoup

def extract_emails_from_url(url):
    try:
        print(f"🔍 Fetching page: {url}")
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()

        # Basic email regex
        emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
        unique_emails = list(set(emails))

        if unique_emails:
            print(f"\n📧 Found {len(unique_emails)} email(s):")
            for email in unique_emails:
                print(f" - {email}")
        else:
            print("❌ No email addresses found.")

        return unique_emails

    except Exception as e:
        print(f"❌ Error fetching or parsing: {e}")
        return []

def dummy_breach_check(email_list):
    print("\n💥 Dummy Breach Check Simulation:")
    for email in email_list:
        if "admin" in email.lower() or "support" in email.lower():
            print(f"⚠️ {email} → Possibly sensitive (admin/support)")
        else:
            print(f"✅ {email} → No known breach markers (simulated)")

if __name__ == "__main__":
    url = "https://cyberpulse.in"  # Change this for testing
    found_emails = extract_emails_from_url(url)
    dummy_breach_check(found_emails)
