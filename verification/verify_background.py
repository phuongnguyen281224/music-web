
import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_chat_background(page):
    print("Navigating to home page...")
    # Navigate to the home page
    page.goto("http://localhost:3000")

    # Wait for the page to load
    page.wait_for_load_state("networkidle")
    print("Home page loaded.")

    # Create a room (click "Tạo phòng mới")
    print("Clicking 'Tạo phòng mới'...")
    page.get_by_text("Tạo phòng mới").click()

    # Wait for room to load and modal to appear
    print("Waiting for name modal...")
    # The modal title is "Tham gia phòng nhạc"
    page.wait_for_selector("text=Tham gia phòng nhạc", timeout=10000)

    # Enter name and join
    print("Entering name...")
    page.fill("input[placeholder='Tên của bạn...']", "Tester")
    page.click("text=Vào phòng")

    # Wait for chat panel to be ready
    print("Waiting for chat panel...")
    page.wait_for_selector("text=Chat Room")

    # Open settings (gear icon)
    # The gear icon is in the header of the chat panel.
    # It has title="Cài đặt giao diện"
    print("Opening settings...")
    page.click("button[title='Cài đặt giao diện']")

    # Upload image
    print("Uploading image...")
    # Using existing image.png
    if not os.path.exists("image.png"):
        # create a dummy image if not exists
        with open("image.png", "wb") as f:
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

    file_input = page.locator("input[type='file']")
    file_input.set_input_files("image.png")

    # Wait for image to be applied.
    # We can check if 'bgImage' state is set by checking for the Remove button (Trash icon) inside the settings panel
    print("Waiting for image upload to apply...")
    page.wait_for_selector("button[title='Xóa ảnh nền']", timeout=10000)

    # Take screenshot of the chat panel with the new background
    print("Taking screenshot...")
    time.sleep(2) # Give it a moment to render blur/overlay
    page.screenshot(path="verification/chat_background.png")
    print("Screenshot taken: verification/chat_background.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_chat_background(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/debug_error.png")
        finally:
            browser.close()
