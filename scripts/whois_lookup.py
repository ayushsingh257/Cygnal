# whois_lookup.py

import whois

def perform_whois(domain):
    try:
        print(f"\n🌐 Performing WHOIS lookup for: {domain}\n")
        result = whois.whois(domain)
        
        print("📄 WHOIS Result:\n")
        print(f"Domain Name: {result.domain_name}")
        print(f"Registrar: {result.registrar}")
        print(f"Creation Date: {result.creation_date}")
        print(f"Expiration Date: {result.expiration_date}")
        print(f"Name Servers: {result.name_servers}")
        print(f"Country: {result.country}")
        print(f"Emails: {result.emails}")
        
    except Exception as e:
        print(f"❌ Error during WHOIS lookup: {e}")

# Example usage
if __name__ == "__main__":
    domain = "cyberpulse.in"  # Replace with any domain you want to investigate
    perform_whois(domain)
