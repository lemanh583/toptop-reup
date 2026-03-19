# PROJECT: Auto-Reup TikTok Tool

## What This Is

Một công cụ quản trị trên nền Web (Web Admin) giúp tự động hóa quá trình tải, biến đổi và reup video TikTok. Công cụ cho phép tải lẻ hoặc tải hàng loạt từ kênh/hashtag (sử dụng lõi JoeanAmier/TikTokDownloader), sau đó áp dụng nhiều bộ lọc lách thuật toán quét bản quyền tự động, và hỗ trợ lồng tiếng AI từ kịch bản có sẵn (phù hợp làm video review phim).

## Core Value

Tối ưu hóa thời gian tải và lách bản quyền video TikTok quy mô lớn thông qua tự động hóa và giao diện quản lý trực quan.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Cho phép nhập tải video lẻ hoặc tải hàng loạt theo profile/hashtag.
- [ ] Tích hợp lõi JoeanAmier/TikTokDownloader để tải video gốc không logo.
- [ ] Áp dụng các kỹ thuật biến đổi video ngẫu nhiên/tùy chọn (lật, đổi tốc độ, viền, nhiễu, chỉnh màu) để chống quét.
- [ ] Chức năng lồng tiếng (Voiceover): Cho phép người dùng nhập kịch bản (text) để AI tạo Text-to-Speech và tự động chèn/ghép vào video (VD: làm review phim).
- [ ] Cung cấp giao diện Web Admin trực quan (React/Vue) để theo dõi tiến trình và quản lý video.

### Out of Scope

- Khôi phục tài khoản bị khóa — (Tool chỉ hỗ trợ tạo nội dung chống quét, không can thiệp chính sách nền tảng)
- Đăng bài tự động trực tiếp qua API không chính thức — (Tạm thời ngoài phạm vi v1 để tránh risk khóa tài khoản, tập trung vào khâu sản xuất content trước)

## Context

- Môi trường: Web application kết hợp với background workers để xử lý video.
- Sử dụng open-source JoeanAmier/TikTokDownloader làm engine tải.
- Việc lách quét thuật toán của mạng xã hội là "trò chơi mèo vờn chuột", tool cần có cơ chế tùy chỉnh linh hoạt các tham số render video (VD: ffmpeg args) thay vì hard-code cố định.

## Constraints

- **FFmpeg Lifecycle**: Việc xử lý video nặng (rendering) sẽ tốn CPU/RAM, cần cơ chế hàng đợi (Queue) đảm bảo không sập server.
- **TikTok Anti-bot**: Tốc độ tải hàng loạt cần có delay/xoay proxy (nếu cần) để tránh bị chặn IP từ TikTok.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chọn giao diện Web Admin thay vì CLI | Người dùng cần giao diện trực quan để xem danh sách & trình trạng tiến độ video đồng loạt. | — Pending |
| Hỗ trợ lồng tiếng bằng văn bản (Voiceover text) thay vì dịch tự chọn | Người làm content (Review phim) cần sự chủ động trong việc chỉnh script cho hợp văn phong. | — Pending |

---
*Last updated: 2026-03-19 after initialization*
