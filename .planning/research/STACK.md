# STACK RESEARCH

## Recommended Stack

- **Frontend**: React (Vite) + TailwindCSS.
  *Rationale*: Cho phép thiết kế giao diện Admin nhanh chóng, React có hệ sinh thái mạnh mẽ.
- **Backend API & Queue**: Python (FastAPI) + Celery + Redis.
  *Rationale*: Python là ngôn ngữ cực mạnh để tương tác với thư viện TiktokDownloader có sẵn và xử lý FFmpeg. FastAPI hỗ trợ xử lý luồng API tốt, còn Celery/Redis giúp chạy nền các tác vụ tải và render video cực chậm mà không gây treo API.
- **Video Engine**: FFmpeg (qua thư viện `ffmpeg-python`).
  *Rationale*: Tiêu chuẩn công nghiệp tốt nhất hiện tại cho các tác vụ cắt, ghép, lật, chèn nhiễu, chèn tiếng vào video.
- **AI/TTS Engine**: Edge-TTS (Text-to-Speech) hoặc OpenAI API.
  *Rationale*: Chuyên dùng để biến Text kịch bản review của User thành giọng nói AI chèn vào video một cách tự động.
- **Tiktok Scraper Engine**: `JoeanAmier/TikTokDownloader`.
  *Rationale*: Như request của user, thư viện này đang rất phổ biến và giữ được sự ổn định.

## What NOT to use
- **Node.js**: Hạn chế dùng ở Backend của công cụ xử lý Video này, vì hệ sinh thái Python mạnh hơn hẳn về mặt FFmpeg và AI integration (cho voiceover và downloader scripts).
