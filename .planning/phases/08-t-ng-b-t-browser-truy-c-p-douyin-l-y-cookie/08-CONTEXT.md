# Phase 8: Tự động bật browser truy cập Douyin lấy cookie - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary
Tự động hóa quy trình dùng trình duyệt ẩn (Headless) lấy "cookie tươi" từ Douyin để tải video khi Cookie cũ hết hạn hoặc bị lỗi, tự lưu vào ổ cứng để tiến trình tải hàng loạt không bị đứt đoạn.
</domain>

<decisions>
## Implementation Decisions

### 1. Chế độ hiển thị (Visibility)
- **Quyết định**: Chạy chế độ Headless (Trình duyệt ẩn) hoàn toàn.

### 2. Cơ chế kích hoạt (Trigger Mechanism)
- **Quyết định**: Tự động (Auto-trigger). Mỗi khi tải video bị lỗi do API trả về data=null (do cookie hết hạn), hệ thống tự động spawn job mở trình duyệt lấy Cookie mới rồi Retry tải lại.

### 3. Lưu trữ (Storage)
- **Quyết định**: Lưu trữ Cookie text trực tiếp xuống đĩa cứng (disk), ví dụ file `storage/douyin_cookie.txt`, để Backend đọc và dùng trực tiếp các lần sau mà không cần trả về giao diện UI.

### Claude's Discretion
- Kiến trúc thư viện cấp thấp (Browser Engine): Claude tự chọn công cụ tối ưu (đề xuất: Playwright for Python vì hỗ trợ async tốt với Celery/FastAPI).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend & Vendor Check
- `backend/tasks.py` — Chứa hàm bắt lỗi API trả `data=null` hiện tại để móc nối trigger.
- `backend/api/routes/download.py` — Tham khảo logic gọi Celery task hiện tại.
</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- `backend/tasks.py`: Chỗ gọi `download_tiktok_video` đang log lỗi hoặc fail khi `result.get('code') != 'success'`. Đây chính là hook (cổng gắn) lý tưởng để gắn `AutoCookieTask` trước khi retry.
</code_context>

<specifics>
## Specific Ideas
- Tham khảo sử dụng thư viện `playwright` (Python) để điều hướng tới `https://www.douyin.com/`, đợi load xong và chạy lệnh `document.cookie` để lấy chuỗi raw cookies.
</specifics>

<deferred>
## Deferred Ideas
- Giải quyết Captcha phức tạp thủ công bằng UI popup (bị từ chối vì chốt Headless, nếu Headless bị kẹt captcha sẽ xem xét ở v2).
</deferred>

---

*Phase: 08-t-ng-b-t-browser-truy-c-p-douyin-l-y-cookie*
*Context gathered: 2026-03-24*
