# ROADMAP: Auto-Reup TikTok Tool

**Vision:** Tối ưu hóa thời gian tải và lách bản quyền video TikTok quy mô lớn.

## Phases

### Phase 1: Core Downloader & Infrastructure
**Goal:** Xây dựng backend tải video dùng TikTokDownloader và cơ sở dữ liệu hàng đợi.
- Thiết lập FastAPI và Celery/Redis.
- Tích hợp thư viện JoeanAmier/TikTokDownloader.
- Viết API `POST /api/download` cho phép nhận URL và push job vào queue.
- Ghi nhận trạng thái download và lưu video vào thư mục kết quả.

### Phase 2: Video Transformation Engine
**Goal:** Tích hợp FFmpeg để áp dụng các bộ lọc chống quét (Anti-scan).
- Xây dựng module FFmpeg thực thi lệnh biến đổi cơ bản (Mirror, MD5, Speed).
- Xây dựng module FFmpeg nâng cao (Color grading, Noise, Zoom ngẫu nhiên).
- Viết API `POST /api/transform` nhận yêu cầu áp dụng profile anti-scan.

### Phase 3: AI Voiceover Integration
**Goal:** Sinh âm thanh từ Text và ghép vào video (chuyên cho Review phim).
- Tích hợp hệ thống Text-to-Speech (như edge-tts).
- Viết endpoint nhận Script dạng text, tải file Audio và dùng FFmpeg ghép đè âm thanh vào video gốc.

### Phase 4: Web Admin Dashboard
**Goal:** Xây dựng giao diện React/Vue quản lý toàn bộ quy trình tải, render và check job.
- Hiển thị danh sách video theo Table.
- Component yêu cầu Download, Transform + Box nhập kịch bản Voiceover.
- Tracker theo dõi tiến trình (Pending/Running/Done) real-time.

---
*Roadmap created: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
