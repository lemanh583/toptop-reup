# SUMMARY RESEARCH

**Stack:** Python FastAPI + React/Vue Admin. Celery + Redis làm hệ thống Render Background Queue. Sử dụng lõi `JoeanAmier/TikTokDownloader` hỗ trợ down video + `FFmpeg` để Render.
**Table Stakes:** Tool có giao diện web UI thân thiện; Hàng đợi theo dõi quy trình từ lúc down về đến lúc hoàn thiện Anti-Scan.
**Watch Out For:** 
1. Treo CPU nếu render FFmpeg đồng thời quá nhiều. Phải khóa worker concurrent.
2. Quản lý việc lệch độ dài thời gian giữa âm thanh TTS đọc Script mới sinh ra với thời lượng của Video gốc tải về.
3. Tránh bị IP Block từ Tiktok khi cào số lượng lớn.
