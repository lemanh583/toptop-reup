# Phase 8: Auto Cookie Extraction - Validation Strategy

## 1. Feature Verification

### Target Outcome
The system automatically extracts Douyin cookies without manual user input using Playwright in headless mode.

### Must Haves
1. Playwright successfully launches in the background and hits `douyin.com`.
2. Captured cookies must be seamlessly readable by the `TikTokDownloader` engine API.
3. Automatically triggered upon catching an expired session (`data=null`).
4. Saved persistently in `/storage/douyin_cookie.txt` for consecutive tasks.

## 2. Validation Flow 

### Component Tests
1. Call internal script `fetch_cookie.py` and verify `douyin_cookie.txt` is updated.
2. Intercept download failure and trace the Celery auto-retry pipeline.

### Integration Tests
1. Clear existing cookies.
2. Trigger `/api/download` with a new Douyin URL.
3. Verify the video downloads successfully without providing a cookie on the frontend UI.
