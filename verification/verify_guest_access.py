from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Simulate a guest user (no host key in localStorage)
            page.goto('http://localhost:3000/room/test-guest-verification-123')

            # Wait for page to load
            page.wait_for_load_state('networkidle')
            time.sleep(2) # Extra wait for client side hydration

            # Take screenshot before assertions for debugging
            page.screenshot(path="verification/guest_access_debug.png")

            # Verify the "Phát" button exists (it was hidden before for guests)
            # using text locator as fallback
            play_button = page.locator("button").filter(has_text="Phát")
            expect(play_button).to_be_visible(timeout=10000)

            # Verify input exists
            input_field = page.get_by_placeholder("Dán link YouTube tại đây...")
            expect(input_field).to_be_visible(timeout=10000)

            # Verify status text
            status_text = page.get_by_text("Đang đồng bộ")
            expect(status_text).to_be_visible(timeout=10000)

            # Take final screenshot
            page.screenshot(path="verification/guest_access.png")

            print("Verification script completed successfully.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/guest_access_failed.png")
            # print(page.content())

        finally:
            browser.close()

if __name__ == "__main__":
    run()
