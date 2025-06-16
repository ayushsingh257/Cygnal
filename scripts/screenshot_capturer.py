# screenshot_capturer.py

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from datetime import datetime
import os

def capture_screenshot(url, save_path):
    print(f"\n📸 Capturing screenshot of: {url}\n")

    options = Options()
    options.headless = True
    options.add_argument("--window-size=1920,1080")

    driver_path = "driver/chromedriver.exe"
    service = Service(executable_path=driver_path)
    driver = webdriver.Chrome(service=service, options=options)

    try:
        driver.get(url)
        driver.save_screenshot(save_path)
        print(f"✅ Screenshot saved to {save_path}")
    except Exception as e:
        print(f"❌ Error capturing screenshot: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    url = "https://cyberpulse.in"
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    save_path = f"screenshots/cyberpulse-screenshot-{timestamp}.png"
    capture_screenshot(url, save_path)
