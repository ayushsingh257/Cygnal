import abc

class BaseSIEMParser(abc.ABC):
    @abc.abstractmethod
    def parse(self, payload: dict) -> dict:
        """
        Parses raw SIEM webhook payload.
        Returns:
            {
                "external_id": str,
                "title": str,
                "description": str,
                "severity": str # 'low', 'medium', 'high', or 'critical'
            }
        """
        pass

class SplunkParser(BaseSIEMParser):
    def parse(self, payload: dict) -> dict:
        # Splunk webhooks typically contain search_name, sid, and result fields
        search_name = payload.get("search_name", "Splunk Triggered Alert")
        sid = payload.get("sid", "unknown-splunk-sid")
        
        # Check if result contains indicators or custom severity field
        result = payload.get("result", {})
        severity = result.get("severity", "medium").lower()
        if severity not in ("low", "medium", "high", "critical"):
            severity = "medium"
            
        desc = result.get("description") or f"Splunk alert '{search_name}' triggered. SID: {sid}."
        if "description" not in result and result:
            # Flatten some result key-values as description details
            items = [f"{k}: {v}" for k, v in result.items() if k not in ("severity", "description")]
            desc += " Details: " + ", ".join(items[:5])
            
        return {
            "external_id": sid,
            "title": search_name,
            "description": desc,
            "severity": severity
        }

class SentinelParser(BaseSIEMParser):
    def parse(self, payload: dict) -> dict:
        # Microsoft Sentinel alerts usually wrap properties
        properties = payload.get("properties", {})
        external_id = payload.get("id") or properties.get("alertDisplayName") or "unknown-sentinel-id"
        title = properties.get("title") or properties.get("displayName") or payload.get("name") or "Microsoft Sentinel Alert"
        
        severity_map = {
            "high": "high",
            "medium": "medium",
            "low": "low",
            "informational": "low",
            "critical": "critical"
        }
        raw_sev = (properties.get("severity") or payload.get("severity") or "medium").lower()
        severity = severity_map.get(raw_sev, "medium")
        
        desc = properties.get("description") or f"Microsoft Sentinel alert '{title}' triggered."
        
        return {
            "external_id": str(external_id),
            "title": title,
            "description": desc,
            "severity": severity
        }

class GenericParser(BaseSIEMParser):
    def parse(self, payload: dict) -> dict:
        # Generic payload structure
        external_id = payload.get("id") or payload.get("external_id") or payload.get("alert_id") or "unknown-generic-id"
        title = payload.get("title") or payload.get("alert_name") or "Generic SIEM Alert"
        description = payload.get("description") or payload.get("message") or "No alert description provided."
        
        raw_sev = str(payload.get("severity") or "medium").lower()
        if raw_sev not in ("low", "medium", "high", "critical"):
            raw_sev = "medium"
            
        return {
            "external_id": str(external_id),
            "title": title,
            "description": description,
            "severity": raw_sev
        }

class ParserRegistry:
    def __init__(self):
        self._parsers = {}
        # Pre-register default parsers
        self.register_parser("splunk", SplunkParser())
        self.register_parser("sentinel", SentinelParser())
        self.register_parser("generic", GenericParser())

    def register_parser(self, source_name: str, parser: BaseSIEMParser):
        """Allows dynamic registration of new SIEM parsers without core changes."""
        self._parsers[source_name.lower()] = parser

    def get_parser(self, source_name: str) -> BaseSIEMParser:
        return self._parsers.get(source_name.lower(), self._parsers["generic"])

    def auto_detect(self, payload: dict) -> str:
        """Autodetect SIEM type based on payload fingerprints."""
        if "search_name" in payload and "sid" in payload:
            return "splunk"
        if "properties" in payload and ("subscriptionId" in payload or "alertDisplayName" in payload.get("properties", {})):
            return "sentinel"
        return "generic"

# Global parser registry instance
siem_parsers = ParserRegistry()
