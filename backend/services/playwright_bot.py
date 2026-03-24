import os
from playwright.sync_api import sync_playwright
import time
from backend.core.config import settings

class BrowserBot:
    def __init__(self):
        self.cookie_file = os.path.join(settings.STORAGE_PATH, "douyin_cookie.txt")

    def fetch_cookie(self) -> bool:
        """
        Launches headless Chromium, navigates to douyin.com,
        interacts with video content to trigger full cookie generation,
        and saves the raw cookie string to storage/douyin_cookie.txt.
        Returns True if successful, False otherwise.
        """
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-blink-features=AutomationControlled",
                        "--disable-dev-shm-usage",
                    ]
                )
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1920, "height": 1080},
                    locale="zh-CN",
                )

                # Remove webdriver flag
                context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

                page = context.new_page()

                # Step 1: Navigate to Douyin homepage
                print("[Playwright] Step 1: Navigating to https://www.douyin.com/")
                page.goto("https://www.douyin.com/", wait_until="domcontentloaded", timeout=60000)
                time.sleep(3)

                # Step 2: Navigate to a popular channel to trigger more cookie assignments
                print("[Playwright] Step 2: Navigating to a recommend page for richer cookies...")
                try:
                    page.goto("https://www.douyin.com/recommend", wait_until="domcontentloaded", timeout=30000)
                    time.sleep(3)
                except Exception:
                    pass  # Fallback - homepage cookies should be sufficient

                # Step 3: Scroll the page to trigger lazy-load cookie JS
                try:
                    page.mouse.wheel(0, 300)
                    time.sleep(2)
                except Exception:
                    pass

                cookies = context.cookies()
                cookie_str = ""
                ttwid_found = False
                cookie_count = 0

                for c in cookies:
                    # Skip empty-name cookies
                    if not c['name']:
                        continue
                    cookie_str += f"{c['name']}={c['value']}; "
                    cookie_count += 1
                    if c['name'] == 'ttwid':
                        ttwid_found = True

                browser.close()

                cookie_str = cookie_str.strip().rstrip(';').strip()
                if cookie_str:
                    os.makedirs(os.path.dirname(self.cookie_file), exist_ok=True)
                    with open(self.cookie_file, "w") as f:
                        f.write(cookie_str)
                    print(f"[Playwright] Đã lưu Cookie thành công. ttwid={ttwid_found}, total={cookie_count}")
                    return True
                else:
                    print("[Playwright] Lỗi: Không bắt được cookie nào từ Douyin!")
                    return False

        except Exception as e:
            print(f"[Playwright Error]: {str(e)}")
            return False

if __name__ == "__main__":
    bot = BrowserBot()
    bot.fetch_cookie()
