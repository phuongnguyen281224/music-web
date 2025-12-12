from playwright.sync_api import sync_playwright
import os

def verify_focus_panel():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            # Navigate to room
            print("Navigating to room...")
            page.goto("http://localhost:3000/room/test-verification")

            # Wait for page to load
            print("Waiting for join prompt...")
            page.wait_for_selector("text=Tham gia phòng nhạc", timeout=10000)

            # Enter name to join
            print("Joining room...")
            page.fill("input[placeholder='Tên của bạn...']", "Tester")
            page.click("button:has-text('Vào phòng')")

            # Wait for room to load
            print("Waiting for room content...")
            page.wait_for_selector("text=Phòng", timeout=10000)

            # Click Focus Mode button
            print("Clicking Focus Mode...")
            # Use a more specific selector if possible, or force click
            page.click("button:has-text('Focus Mode')")

            # Wait for Focus Panel to appear
            print("Waiting for Focus Panel...")
            page.wait_for_selector("text=Thoát chế độ tập trung", timeout=5000)

            # Take screenshot
            output_path = os.path.join(os.getcwd(), "verification", "focus_panel.png")
            print(f"Taking screenshot to {output_path}...")
            page.screenshot(path=output_path)
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_focus_panel()
