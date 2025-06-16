# scripts/metadata_extractor.py

import exifread
import PyPDF2
import os

def extract_image_metadata(image_path):
    print(f"\n🖼️ Extracting metadata from image: {image_path}")
    try:
        with open(image_path, 'rb') as img_file:
            tags = exifread.process_file(img_file)
            if tags:
                for tag in tags.keys():
                    print(f"{tag}: {tags[tag]}")
            else:
                print("❌ No EXIF metadata found.")
    except Exception as e:
        print(f"❌ Error reading image metadata: {e}")

def extract_pdf_metadata(pdf_path):
    print(f"\n📄 Extracting metadata from PDF: {pdf_path}")
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            info = reader.metadata
            if info:
                for key, val in info.items():
                    print(f"{key}: {val}")
            else:
                print("❌ No PDF metadata found.")
    except Exception as e:
        print(f"❌ Error reading PDF metadata: {e}")

if __name__ == "__main__":
    file_path = "samples/test.pdf"  # or change to photo.jpg
    if file_path.endswith(".pdf"):
        extract_pdf_metadata(file_path)
    elif file_path.lower().endswith((".jpg", ".jpeg")):
        extract_image_metadata(file_path)
    else:
        print("❌ Unsupported file type.")
