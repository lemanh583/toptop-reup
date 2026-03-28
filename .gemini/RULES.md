# Quy tắc dự án Auto-Reup TikTok/Douyin

## Quy trình làm việc
- **Luôn trình plan trước khi code** — Viết implementation_plan.md, chờ user duyệt rồi mới thực thi. Không bao giờ nhảy thẳng vào code.
- **Viết giao diện bằng tiếng Việt** — Tất cả label, placeholder, thông báo trên UI (web + CLI) đều dùng tiếng Việt.
- **Commit thường xuyên** — Sau mỗi bước hoàn thành, commit với message mô tả rõ ràng.

## Testing
- **Link test mặc định:** `https://www.douyin.com/jingxuan/search/%E5%8E%A8%E5%B8%88?aid=aa242b93-18f0-412a-bd45-4eb0ebf809bf&modal_id=7418534055240535315&type=general`
- **Không download lại video đã có** — Trước khi download, kiểm tra `storage/{video_id}.mp4` đã tồn tại chưa. Nếu có rồi thì dùng luôn file gốc, không tải lại.
- **Tự động xử lý cookie:**
  - Ưu tiên đọc cookie từ `storage/douyin_cookie.txt`
  - Nếu cookie hết hạn (download thất bại) → tự động dùng `BrowserBot` kéo cookie mới
  - Lưu cookie mới xuống `storage/douyin_cookie.txt` để dùng lại

## Kiến trúc & Code
- **Backend:** FastAPI + Celery + Redis, code trong `backend/`
- **Frontend:** React + Vite, code trong `frontend/src/`
- **CLI:** `cli.py` ở root (backup khi không dùng web)
- **Storage:** Video lưu trong `storage/`, serve qua `/storage/` endpoint
- **Không sửa code trong `backend/vendor/`** — Đây là thư viện bên thứ 3 (TikTokDownloader), chỉ gọi API của nó

## Giao diện Web
- Dark theme
- Mobile-responsive
- Hiển thị video preview sau khi download
- Subtitle overlay có thể điều chỉnh trực quan (vị trí, kích thước)

## Deployment
- Server Ubuntu headless, qua Cloudflare Tunnel
- API base tự detect (localhost vs domain)
- Tất cả port: Backend=8000, Frontend=5173, Redis=6379
