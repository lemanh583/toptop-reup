# Phase 5: Integrate TikTokDownloader Web API and Cookie UI - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning
**Source:** User Directive

<domain>
## Phase Boundary
Thêm tính năng nhập Cookie vào giao diện Web Admin và vận hành `TikTokDownloader` như một nền tảng Web API ở cổng 5555 để bóc link không logo cho mọi thể loại kể cả Douyin nội địa.
</domain>

<decisions>
## Implementation Decisions

### 1. Khởi chạy TikTokDownloader Web API
- Do `TikTokDownloader` cung cấp chế độ Web API (Lựa chọn số 8 trên menu tương tác), ta sẽ cấu hình `settings.json` của thư viện này để tiêm `run_command: "8"` giúp bypass menu và mở API luôn ở cổng 5555 do startup event của FastAPI hoặc Celery kích hoạt ngầm, hoặc yêu cầu User chủ động khởi chạy. Để đơn giản, ta sẽ gọi API thủ công.

### 2. Cookie Input ở Frontend
- Tạo thêm React Input trên `frontend/src/App.jsx` để pass `cookie` string xuống backend.

### 3. Celery Fetching logic
- Cập nhật `backend/tasks.py`: Gọi HTTP POST sang `http://127.0.0.1:5555/douyin/detail` hoặc `/tiktok/detail`.
- Lấy `video_url` trong json response.
- Dùng thư viện `httpx` Python tải stream mp4 lưu vào storage.
</decisions>
