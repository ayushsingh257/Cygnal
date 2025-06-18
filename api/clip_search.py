import torch
from PIL import Image
import numpy as np
import faiss
from torchvision import transforms
from transformers import CLIPProcessor, CLIPModel

class ClipSearchEngine:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.index = None
        self.image_paths = []

    def _preprocess(self, image: Image.Image):
        return self.processor(images=image, return_tensors="pt")["pixel_values"].to(self.device)

    def add_images(self, image_list: list):
        vectors = []
        for img_path in image_list:
            image = Image.open(img_path).convert("RGB")
            pixel_values = self._preprocess(image)
            with torch.no_grad():
                embedding = self.model.get_image_features(pixel_values=pixel_values)
                embedding = embedding.cpu().numpy()
                vectors.append(embedding[0])
                self.image_paths.append(img_path)

        vectors = np.array(vectors).astype("float32")
        self.index = faiss.IndexFlatL2(vectors.shape[1])
        self.index.add(vectors)

    def search(self, query_image: Image.Image, top_k=3):
        query_tensor = self._preprocess(query_image)
        with torch.no_grad():
            query_embedding = self.model.get_image_features(pixel_values=query_tensor)
        query_np = query_embedding.cpu().numpy().astype("float32")
        distances, indices = self.index.search(query_np, top_k)
        return [(self.image_paths[i], float(dist)) for i, dist in zip(indices[0], distances[0])]
