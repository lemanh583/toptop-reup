# PITFALLS RESEARCH

1. **Vấn đề sập server do CPU & RAM Exhaustion**
   *Warning sign*: Chạy 3 video Render FFmpeg cùng lúc, server 100% CPU và treo cứng máy.
   *Prevention*: Phải sử dụng Queue (Celery) và giới hạn cứng concurrency (chỉ cho phép chạy duy nhất 1 hoặc 2 worker Render cùng lúc). Các file khác kiên nhẫn đợi ở hàng đợi.
2. **Bị Rate limit & block bởi Tiktok khi cào hàng loạt**
   *Warning sign*: TikTokDownloader báo lỗi 403 hoặc Timeout quá nhiều.
   *Prevention*: Setup các khoản thời gian nghỉ (random delay) giữa các phiên tải Bulk (Hàng loạt).
3. **Audio-Video Desynchronization (Sai lệch đồng bộ âm thanh)**
   *Warning sign*: Giọng đọc tự động xong sớm nhưng video vẫn còn chạy, hoặc video hết trước.
   *Prevention*: Tool phải tự tính toán length Audio TTS sinh ra và độ dài Video để thực hiện Trim Audio/Video trên FFmpeg cho linh hoạt.
