import re
import abc

class BaseIOCExtractor(abc.ABC):
    @abc.abstractmethod
    def extract(self, text: str) -> list:
        """
        Parses text and extracts a list of matches.
        Returns:
            [ {"value": str, "type": str, "confidence": int} ]
        """
        pass

class IPv4Extractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        pattern = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
        results = []
        for match in re.finditer(pattern, text):
            val = match.group()
            # Local/RFC1918 IPs get slightly lower confidence score
            if val.startswith(("127.", "0.", "192.168.", "10.", "172.")):
                results.append({"value": val, "type": "ip", "confidence": 80})
            else:
                results.append({"value": val, "type": "ip", "confidence": 98})
        return results

class IPv6Extractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        # Standard IPv6 pattern matching
        pattern = r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:[0-9a-fA-F]{1,4}\b'
        results = []
        for match in re.finditer(pattern, text):
            val = match.group()
            if val != "::" and val != "::1":
                results.append({"value": val, "type": "ip", "confidence": 98})
        return results

class DomainExtractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b'
        results = []
        for match in re.finditer(pattern, text):
            val = match.group().lower()
            # Avoid matching IP-like structures as domains
            if not re.match(r'^\d+(\.\d+){3}$', val):
                results.append({"value": val, "type": "domain", "confidence": 90})
        return results

class URLExtractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        pattern = r'\bhttps?://[^\s<>"\']+'
        results = []
        for match in re.finditer(pattern, text):
            val = match.group().rstrip(".,;:")
            results.append({"value": val, "type": "url", "confidence": 97})
        return results

class EmailExtractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        results = []
        for match in re.finditer(pattern, text):
            results.append({"value": match.group().lower(), "type": "email", "confidence": 95})
        return results

class FileHashExtractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        results = []
        # MD5
        for m in re.finditer(r'\b[A-Fa-f0-9]{32}\b', text):
            results.append({"value": m.group().lower(), "type": "hash", "confidence": 95})
        # SHA-1
        for m in re.finditer(r'\b[A-Fa-f0-9]{40}\b', text):
            results.append({"value": m.group().lower(), "type": "hash", "confidence": 99})
        # SHA-256
        for m in re.finditer(r'\b[A-Fa-f0-9]{64}\b', text):
            results.append({"value": m.group().lower(), "type": "hash", "confidence": 99})
        return results

class CVEExtractor(BaseIOCExtractor):
    def extract(self, text: str) -> list:
        pattern = r'\bCVE-\d{4}-\d{4,7}\b'
        results = []
        for match in re.finditer(pattern, text, re.IGNORECASE):
            results.append({"value": match.group().upper(), "type": "cve", "confidence": 99})
        return results

class IOCExtractionPipeline:
    def __init__(self):
        self._extractors = []
        # Register default extractors in a specific dependency order (hashes, CVEs first)
        self.register_extractor(FileHashExtractor())
        self.register_extractor(CVEExtractor())
        self.register_extractor(IPv4Extractor())
        self.register_extractor(IPv6Extractor())
        self.register_extractor(URLExtractor())
        self.register_extractor(EmailExtractor())
        self.register_extractor(DomainExtractor())

    def register_extractor(self, extractor: BaseIOCExtractor):
        self._extractors.append(extractor)

    def extract(self, text: str) -> list:
        extracted = []
        seen_values = set()
        
        for extractor in self._extractors:
            items = extractor.extract(text)
            for item in items:
                val = item["value"]
                # Deduplicate by value
                if val not in seen_values:
                    seen_values.add(val)
                    extracted.append(item)
                    
        return extracted

# Global pipeline instance
ioc_pipeline = IOCExtractionPipeline()
