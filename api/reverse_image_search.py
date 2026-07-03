import os
from PIL import Image
import logging
import base64

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try importing ML dependencies optional for CI/tests
try:
    import torch
    import clip
    import faiss
    import numpy as np
    _has_deps = True
except ImportError as e:
    _has_deps = False
    logger.warning(f"Reverse image search dependencies not available: {e}. Reverse image search will be disabled.")


class ClipSearchEngine:
    def __init__(self, model_name="ViT-B/32"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load(model_name, device=self.device)
        self.index = None
        self.image_paths = []

    def add_reference_images(self, folder="reference_images"):
        vectors = []
        paths = []

        if not os.path.exists(folder):
            logger.warning(f"Reference folder '{folder}' does not exist.")
            return

        for fname in os.listdir(folder):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp", ".gif", ".tiff")):
                path = os.path.join(folder, fname)
                try:
                    image = Image.open(path).convert("RGB")
                    tensor = self.preprocess(image).unsqueeze(0).to(self.device)
                    with torch.no_grad():
                        vec = self.model.encode_image(tensor).cpu().numpy()
                    vec /= np.linalg.norm(vec)  # 🔥 Normalize
                    vectors.append(vec[0])
                    paths.append(path)
                except Exception as e:
                    logger.warning(f"Skipping image {path}: {e}")

        if not vectors:
            raise ValueError("No valid images found for indexing.")

        self.index = faiss.IndexFlatIP(len(vectors[0]))  # 🔄 Use cosine similarity (inner product)
        self.index.add(np.stack(vectors))
        self.image_paths = paths
        logger.info(f"Indexed {len(self.image_paths)} reference images.")

    def search(self, image_path, top_k=5):
        image = Image.open(image_path).convert("RGB")
        tensor = self.preprocess(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            vec = self.model.encode_image(tensor).cpu().numpy()
        vec /= np.linalg.norm(vec)  # 🔥 Normalize

        if self.index is None or not self.image_paths:
            raise ValueError("FAISS index not initialized.")

        top_k = min(top_k, len(self.image_paths))
        D, I = self.index.search(vec, top_k)  # 🔄 Cosine similarities

        results = []
        seen_paths = set()
        for j, idx in enumerate(I[0]):
            if idx == -1 or idx >= len(self.image_paths):
                continue
            similarity = float(D[0][j])  # Already cosine similarity (0 to 1)
            path = self.image_paths[idx]
            if path in seen_paths or similarity < 0:
                continue
            seen_paths.add(path)
            # Encode the matched image with error handling
            image_data = None
            try:
                with open(path, "rb") as img_file:
                    image_data = base64.b64encode(img_file.read()).decode("utf-8")
            except Exception as e:
                logger.warning(f"Failed to encode image {path}: {e}")
            results.append({
                "match_path": path,
                "match_percentage": round(similarity * 100, 2),  # ✅ As percentage
                "image_data": image_data  # Include even if None for error cases
            })
        return results

# ====== Initialize Search Engine Once ======
if _has_deps:
    search_engine = ClipSearchEngine()
    try:
        search_engine.add_reference_images("reference_images")
    except Exception as e:
        logger.error(f"Failed to add reference images: {e}")
else:
    search_engine = None

# ====== API Function to be used in backend.py ======
def perform_reverse_image_search(image_path):
    try:
        logger.info(f"Performing reverse image search for: {image_path}")
        if search_engine is None:
            raise RuntimeError("Reverse image search is disabled because torch, clip, or faiss is not installed.")
        matches = search_engine.search(image_path, top_k=5)
        return matches
    except Exception as e:
        logger.error(f"Reverse image search failed: {e}")
        return {"error": str(e)}