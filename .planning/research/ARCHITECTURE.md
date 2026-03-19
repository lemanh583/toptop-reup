# ARCHITECTURE RESEARCH

## Component Flow
1. **Web Admin (React)**: Người dùng nhập thông tin -> Gọi REST API -> Nhận ID Job và Polling kết quả.
2. **Backend API (FastAPI)**: Controller nhận yêu cầu, kiểm tra input, bốc đẩy dũ liệu vào Redis Broker.
3. **Queue System (Redis + Celery Worker)**: 
    - *Worker 1 (Downloader)*: Kích hoạt code TiktokDownloader, lấy file raw về ổ cứng.
    - *Worker 2 (TTS & Audio)*: Đọc Script -> kết nối API TTS -> Lưu file Audio MP3.
    - *Worker 3 (FFmpeg Renderer)*: Áp dụng chuỗi script FFmpeg (chống quét, chèn MP3) vào file raw -> Sinh ra file Output.
4. **Storage**: Thư mục Local trên server để hosting trực tiếp qua HTTP cho Admin down về.

## Data Flow
`User UI` -> `FastAPI` -> `PostgreSQL/SQLite (Job Data)` -> `Redis (Queue)` -> `Celery Worker (Downloader -> Audio -> FFmpeg)` -> `Storage`.
