"""
Cygnal Entity & IOC Extraction Engine — Sprint 1
Consolidated to delegate to the primary ioc_pipeline.
"""

from services.extraction_pipeline import ioc_pipeline

def extract_entities_from_text(text: str) -> list:
    """
    Parses unstructured text and extracts all supported entity types.
    Delegates to the unified ioc_pipeline.
    Returns a list of dicts: [{"value": str, "type": str}]
    """
    if not text:
        return []

    # Get results from unified pipeline
    results = ioc_pipeline.extract(text)

    # Format return list to match original signature (remove confidence)
    return [{"value": r["value"], "type": r["type"]} for r in results]

