# Phase 8: Auto Cookie Extraction - Research

## Objective
Research how to implement Phase 08: Tự động bật browser truy cập Douyin lấy cookie.
"What do I need to know to PLAN this phase well?"

## 1. Browser Engine: Playwright (Python)
Playwright is highly recommended for backend integrations because of its active community, robust async support, and headless performance.
**Installation:**
```bash
pip install playwright
playwright install chromium
```

## 2. Headless execution and Douyin Anti-Bot
TikTok and Douyin are heavily protected by anti-bot scripts (e.g., Akamai or custom JS captchas).
Standard Playwright in headless mode is often immediately detected. To evade basic detection, we need to:
- Use `playwright-stealth` (a plugin for Playwright that port `puppeteer-extra-plugin-stealth` techniques).
- Or run with a predefined standard User-Agent.
- Often, just opening a standard Douyin video page or the homepage `https://www.douyin.com/` causes a basic cookie `ttwid` to be allocated. Once the `ttwid` and other base cookies are acquired, `TikTokDownloader` will handle generating the `X-Bogus` signature natively using its internal JS runtime. The core need is just the initial session/validation cookies!

## 3. Celery Integration
Running Playwright within Celery works via the synchronous API or `asyncio.run()`.
`backend/tasks.py` will have a new task: `fetch_douyin_cookie_task`.
When `download_tiktok_video` encounters `data=null`, it can chain or synchronously invoke `fetch_douyin_cookie_task` (or just fallback asynchronously to retry). Since Celery workers process synchronously, using `sync_playwright` inside the Celely task is the safest path to avoid event-loop collisions.

## 4. Cookie Storage format
We need to save the fetched cookies in a format that `backend/vendor/TikTokDownloader/run_api.py` or `tasks.py` can read.
Writing to a simple text file: `storage/douyin_cookie.txt` containing the raw cookie string (e.g., `ttwid=...; SUB=...;`).
The `download_tiktok_video` task can try reading this file if the user hasn't provided a custom cookie on the UI.

## 5. Hook / Trigger Logic
In `backend/tasks.py`, `download_tiktok_video`:
```python
        if response_data and response_data.get('code') != 'success':
            # Auto-trigger Playwright flow if no explicit cookie was forced by user!
            # Or queue the cookie task and retry this URL.
```
This is a standard queue-and-retry pattern.

## Validation Architecture
- Validated by checking `playwright` installation on target machine.
- Validated by manually inspecting `storage/douyin_cookie.txt` format.
- Validated by observing Celery automatically recovering from a `data=null` state.

## RESEARCH COMPLETE
