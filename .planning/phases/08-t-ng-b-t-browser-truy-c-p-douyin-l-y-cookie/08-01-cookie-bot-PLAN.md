---
wave: 1
depends_on: []
files_modified:
  - backend/requirements.txt
  - backend/services/playwright_bot.py
  - backend/tasks.py
autonomous: true
---

# Plan 08-01: Auto Cookie Bot Integration

<objective>
Implement a mechanism using Playwright to automatically extract fresh Douyin cookies to `storage/douyin_cookie.txt` when download sessions fail, and naturally retry the stream.
</objective>

<tasks>

<task>
<read_first>
- `backend/requirements.txt`
</read_first>
<action>
Add `playwright` to `backend/requirements.txt`.
Also, run a post-install hook to install the chromium browser binaries (e.g. `playwright install chromium`).
</action>
<acceptance_criteria>
- `requirements.txt` contains `playwright`.
- Running `pip install -r requirements.txt` and `playwright install chromium` succeeds in the celery environment.
</acceptance_criteria>
</task>

<task>
<read_first>
- `backend/services/playwright_bot.py` (To be created)
</read_first>
<action>
Create `backend/services/playwright_bot.py` containing a `BrowserBot` class.
The class should use `playwright.sync_api` to launch chromium silently.
Navigate to `https://www.douyin.com/` and wait for cookies to populate (specifically `ttwid`).
Format the cookies into a raw `name=value; name2=value2` string and write it into `storage/douyin_cookie.txt`.
</action>
<acceptance_criteria>
- `backend/services/playwright_bot.py` contains `class BrowserBot` with a `fetch_cookie` method using `sync_playwright`.
- The method correctly writes a formatted cookie string to `storage/douyin_cookie.txt`.
</acceptance_criteria>
</task>

<task>
<read_first>
- `backend/tasks.py`
</read_first>
<action>
Modify `backend/tasks.py`.
In `download_tiktok_video`, before executing the fallback or returning fail for `result.get('code') != 'success'`, if the URL is from Douyin, instantiate `BrowserBot().fetch_cookie()`, wait for it to generate the `storage/douyin_cookie.txt`, read the newly fetched cookie, and re-attempt the inner loop exactly once.
Additionally, when `cookie` is unprovided (None or empty), `tasks.py` should attempt to read `storage/douyin_cookie.txt` automatically as the fallback cookie source.
</action>
<acceptance_criteria>
- `backend/tasks.py` is capable of handling auto-fetching of cookies via Playwright.
- Missing explicit cookie correctly falls back to `storage/douyin_cookie.txt`.
- Celery Task seamlessly calls `fetch_cookie()` on Douyin link failure and retries.
</acceptance_criteria>
</task>

</tasks>
