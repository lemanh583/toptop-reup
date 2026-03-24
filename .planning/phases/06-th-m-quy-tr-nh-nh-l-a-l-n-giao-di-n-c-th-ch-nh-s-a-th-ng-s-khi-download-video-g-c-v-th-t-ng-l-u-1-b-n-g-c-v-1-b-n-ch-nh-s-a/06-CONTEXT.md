# Phase 6 Context: Thêm quy trình đánh lừa lên giao diện & tự lưu 2 bản

## Goal
Tích hợp giao diện cấu hình chống quét (Anti-scan) ngay trên Web UI để người dùng có thể tự do điều chỉnh các thông số. Khi người dùng tải một video gốc, hệ thống sẽ tự động lưu 1 bản gốc và sinh ra thêm 1 bản đã qua chỉnh sửa chống quét.

## Implementation Decisions (Gray Areas Resolved)

### 1. UI Configuration Placement (1B)
- Giao diện tùy chỉnh thông số chống quét (Lật ngang, Đổi tốc độ %, độ nhạy, Chèn MD5) sẽ được **hiển thị rõ ràng ngay bên dưới ô nhập URL** (có thể dùng check-box, toggle, slider).
- Mục đích: Trực quan, người dùng luôn thấy cấu hình hiện tại trước khi bấm Tải.

### 2. Jobs Tracking Logic (2B)
- Khi một video được tải xuống và đi qua quy trình transform, nó sẽ được **tách thành 2 dòng Job độc lập** trên bảng tiến trình.
- Ví dụ: 
  - Dòng 1: Đang tải video gốc (ID: XYZ) -> SUCCESS (Mở File Gốc).
  - Dòng 2: Xử lý Anti-scan (ID gốc: XYZ) -> SUCCESS (Mở File Đã Transform).
- Giúp người dùng dễ dàng theo dõi từng tiến trình đứt đoạn thay vì chờ đợi toàn cục.

### 3. Default Parameters (3B + Auto Option)
- Khi dán link vào mặc định các thông số lách scan sẽ **TẮT** (Chủ động check-box để bật).
- Có sự xuất hiện của một nút check-box / preset tên là **"Tự động (Auto)"**. Khi nhấn vào nút Auto này, nó sẽ tự động cấu hình các thông số tối ưu nhất để lách luật (Lật ngang + Random Speed + MD5) một cách tiện lợi.

## Code Context & Integration Points
- **Frontend (`frontend/src/App.jsx`)**: 
  - Cần thêm UI form controls tương ứng cho các anti-scan parameters (checkboxes, speed slider).
  - Gửi thêm params `transform_configs` (dict) và cờ `auto_transform` (bool) lên API `/api/download`.
- **Backend API (`backend/api/routes/download.py`)**: 
  - Sửa `DownloadRequest` model để nhận cấu hình transform.
- **Backend Workers (`backend/tasks.py` & `backend/services/transform.py`)**: 
  - `download_tiktok_video` cần trigger `transform_video_task.delay()` nếu cờ `auto_transform` được bật hoặc có thông số anti-scan được truyền lên.
  - Cần trả về 2 `task_id` cho Frontend theo dõi riêng biệt (1 cho download, 1 cho transform chạy nối tiếp). Về mặt kỹ thuật, API `/api/download` có thể trả về cả 2 `task_id` luôn (task 2 bắt đầu khi task 1 kết thúc qua Celery `chain`), và UI mở websocket cho cả 2.
