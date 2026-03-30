# Hướng dẫn triển khai Auto-Reup TikTok/Douyin

## Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu |
|---|---|
| OS | Ubuntu 20.04+ / Debian 11+ |
| Python | 3.10+ |
| Node.js | 18+ |
| Redis | 6+ |
| FFmpeg | 4.4+ (cần `libass`) |

## 1. Cài đặt môi trường

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Python + pip
sudo apt install -y python3 python3-pip python3-venv

# Node.js (qua NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# FFmpeg (cần libass cho phụ đề ASS)
sudo apt install -y ffmpeg

# Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Font Ubuntu Sans (bắt buộc cho subtitle)
sudo apt install -y fonts-ubuntu
# Kiểm tra: fc-list | grep -i "ubuntu"
```

## 2. Clone và cài đặt

```bash
# Clone repo
git clone <YOUR_REPO_URL> tool-tiktok-v2
cd tool-tiktok-v2

# Tạo thư mục storage
mkdir -p storage
```

## 3. Chạy ứng dụng bằng Docker Compose (Khuyên dùng)

Đảm bảo bạn đã cài đặt Docker và Docker Compose. 

Chỉ cần chạy lệnh sau để build và khởi động tất cả (Frontend, Backend API, Redis, Celery Worker):

```bash
docker compose up -d --build
```

Ứng dụng sẽ có sẵn tại:
- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs

*Lưu ý: Mọi video tải về đều nằm trong thư mục `storage` ở máy thật của bạn.*

## 3.1. Chạy ứng dụng thủ công (Không dùng Docker)

# Backend - Python virtualenv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Playwright (nếu dùng tính năng auto-upload)
playwright install chromium

# Frontend
cd frontend
npm install
cd ..

# Tạo thư mục storage
mkdir -p storage
```

## 3. Chạy ứng dụng

### Cách 1: Chạy thủ công (dev/test)

Mở 3 terminal riêng biệt:

```bash
# Terminal 1: Backend API (port 8000)
cd tool-tiktok-v2
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Celery Worker (xử lý video nền)
cd tool-tiktok-v2
source venv/bin/activate
celery -A backend.worker.celery_app worker --loglevel=info --concurrency=1

# Terminal 3: Frontend (port 5173)
cd tool-tiktok-v2/frontend
npm run dev -- --host 0.0.0.0
```

### Cách 2: Chạy nền (production)

```bash
cd tool-tiktok-v2
source venv/bin/activate

# Redis (nếu dùng Docker)
docker compose up -d

# Backend API
nohup uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &

# Celery Worker
nohup celery -A backend.worker.celery_app worker --loglevel=info --concurrency=1 > /tmp/celery.log 2>&1 &

# Frontend (build production)
cd frontend
npm run build
# Serve bằng nginx hoặc:
npx serve dist -l 5173
```

## 4. Cấu hình Nginx (khuyến nghị cho production)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/tool-tiktok-v2/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Video files
    location /storage/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

## 5. Kiểm tra hoạt động

```bash
# Redis OK?
redis-cli ping
# → PONG

# Backend OK?
curl http://localhost:8000/docs
# → Swagger UI

# Frontend OK?
# Mở browser: http://localhost:5173

# FFmpeg + Font OK?
ffmpeg -version | head -1
fc-list | grep -i "ubuntu sans"
```

## 6. Cấu trúc dự án

```
tool-tiktok-v2/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── worker.py             # Celery app
│   ├── tasks.py              # Background tasks
│   ├── api/routes/           # API endpoints
│   └── services/
│       └── transform.py      # FFmpeg video processing
├── frontend/
│   ├── src/App.jsx           # React UI
│   └── package.json
├── storage/                  # Video files (auto-created)
├── requirements.txt          # Python deps
├── docker-compose.yml        # Redis container
└── DEPLOY.md                 # (this file)
```

## 7. Các port mặc định

| Service | Port |
|---|---|
| Frontend (Vite) | 5173 |
| Backend API | 8000 |
| Redis | 6379 |

## 8. Troubleshooting

| Vấn đề | Giải pháp |
|---|---|
| Sub không hiện | Kiểm tra font: `fc-list \| grep ubuntu` → Cài `fonts-ubuntu` |
| FFmpeg lỗi | Cài đầy đủ: `sudo apt install ffmpeg` |
| Celery không chạy | Kiểm tra Redis: `redis-cli ping` |
| Video lỗi pixel | FFmpeg cần `libx264`: `sudo apt install libavcodec-extra` |
| Worker treo | Thêm `--concurrency=1` khi chạy Celery |
