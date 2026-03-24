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

### Phase 5: Integrate TikTokDownloader Web API and Cookie UI

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 4
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 5 to break down)

### Phase 6: Thêm quy trình đánh lừa lên giao diện, có thể chỉnh sửa thông số, khi download video gốc về thì tự động lưu 1 bản gốc và 1 bản đã chỉnh sửa

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 6 to break down)

### Phase 7: Thêm Filter nâng cao chống quét (Subtle Noise, Color, Crop, Unsharp)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 7 to break down)

### Phase 8: Tự động bật browser truy cập Douyin lấy cookie

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 7
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 8 to break down)

### Phase 9: Nghiên cứu triển khai thêm tính năng có thể che sub cũ, chèn sub mới, Thêm giọng lồng tiếng

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 8
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 9 to break down)

---
*Roadmap created: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
