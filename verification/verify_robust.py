from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to room...")
            page.goto('http://localhost:3000/room/test-guest-verification-123')

            # Wait for any network activity to settle
            page.wait_for_load_state('networkidle')
            time.sleep(2) # Allow React hydration

            print("Checking elements...")

            # Print page content to file for debugging
            with open('verification/page_dump.html', 'w', encoding='utf-8') as f:
                f.write(page.content())

            # Check for Play button
            # Trying multiple strategies
            button = page.locator('button:has-text("Phát")')
            if button.count() > 0:
                print("Found button with text 'Phát'")
            else:
                 # Try finding by SVG inside button
                 button = page.locator('button svg.lucide-play').locator('..')
                 if button.count() > 0:
                     print("Found button with Play icon")

            expect(button).to_be_visible(timeout=5000)
            print("Button is visible.")

            # Check for Input
            input_field = page.locator('input[placeholder="Dán link YouTube tại đây..."]')
            expect(input_field).to_be_visible(timeout=5000)
            print("Input is visible.")

            page.screenshot(path="verification/guest_access_success.png")
            print("SUCCESS: Verification complete.")

        except Exception as e:
            print(f"FAILURE: {e}")
            page.screenshot(path="verification/guest_access_failed.png")

        finally:
            browser.close()

if __name__ == "__main__":
    run()
