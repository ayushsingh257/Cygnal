# scripts/reverse_image_search.py

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time
import os

def reverse_search(image_path):
    options = Options()
    options.headless = False
    options.add_argument("--window-size=1920,1080")

    driver_path = "driver/chromedriver.exe"  # Adjust path if needed
    service = Service(executable_path=driver_path)
    driver = webdriver.Chrome(service=service, options=options)

    try:
        print(f"🔍 Starting reverse image search for: {image_path}")
        driver.get("https://lens.google.com/upload")  # NEW endpoint, not Google Images

        # Locate file input (no need to click anything)
        file_input = driver.find_element(By.XPATH, '//input[@type="file"]')
        file_input.send_keys(os.path.abspath(image_path))

        time.sleep(7)

        # Take screenshot
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        screenshot_path = f"screenshots/reverse-search-{timestamp}.png"
        driver.save_screenshot(screenshot_path)
        print(f"✅ Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"❌ Error during reverse image search: {e}")

    finally:
        driver.quit()

if __name__ == "__main__":
    reverse_search("images/elon.jpg")
