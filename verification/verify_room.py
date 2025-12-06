from playwright.sync_api import sync_playwright

def verify_room_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to a room page
        page.goto("http://localhost:3000/room/verify-room-123")

        # Wait for the page to load content
        # We expect "Phòng: verify-room-123" to appear
        page.wait_for_selector("text=Phòng:")

        # Check for status
        # Since Firebase key might be missing, it might show "Config Error" or "Trạng thái:..."
        # We just want to see the UI renders the new structure

        page.screenshot(path="verification/room_screenshot.png")
        browser.close()

if __name__ == "__main__":
    verify_room_page()
