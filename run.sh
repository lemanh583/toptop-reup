#!/bin/bash
set -e

# ============================================================
#  Auto-Reup TikTok/Douyin — One-click Setup & Run
#  Usage: chmod +x run.sh && ./run.sh
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# ============================================================
#  1. CHECK & INSTALL SYSTEM DEPENDENCIES
# ============================================================
log "Kiểm tra môi trường hệ thống..."

NEED_APT=false

# --- Python 3 ---
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version 2>&1 | awk '{print $2}')
    ok "Python $PY_VER"
else
    warn "Python3 chưa cài"
    NEED_APT=true
    APT_PKGS="$APT_PKGS python3 python3-pip python3-venv"
fi

# --- Node.js ---
if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    ok "Node.js $NODE_VER"
else
    warn "Node.js chưa cài"
    NEED_APT=true
    APT_PKGS="$APT_PKGS nodejs npm"
fi

# --- FFmpeg ---
if command -v ffmpeg &>/dev/null; then
    FF_VER=$(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')
    ok "FFmpeg $FF_VER"
else
    warn "FFmpeg chưa cài"
    NEED_APT=true
    APT_PKGS="$APT_PKGS ffmpeg"
fi

# --- Redis ---
if command -v redis-server &>/dev/null; then
    ok "Redis $(redis-server --version | awk '{print $3}')"
else
    warn "Redis chưa cài"
    NEED_APT=true
    APT_PKGS="$APT_PKGS redis-server"
fi

# --- Font Ubuntu Sans ---
if fc-list 2>/dev/null | grep -qi "ubuntu"; then
    ok "Font Ubuntu Sans"
else
    warn "Font Ubuntu Sans chưa cài"
    NEED_APT=true
    APT_PKGS="$APT_PKGS fonts-ubuntu"
fi

# --- Install missing packages ---
if [ "$NEED_APT" = true ]; then
    log "Cài đặt packages thiếu: $APT_PKGS"
    sudo apt update
    sudo apt install -y $APT_PKGS
    ok "Đã cài xong system packages"
fi

# --- Ensure Node.js >= 18 (install via NodeSource if old) ---
if command -v node &>/dev/null; then
    NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        warn "Node.js quá cũ (v$NODE_MAJOR), cần >= 18. Đang cài bản mới..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
        ok "Node.js $(node --version)"
    fi
fi

# ============================================================
#  2. PYTHON VIRTUAL ENV & DEPENDENCIES
# ============================================================
log "Thiết lập Python virtualenv..."

if [ ! -d "$PROJECT_DIR/venv" ]; then
    python3 -m venv venv
    ok "Tạo virtualenv mới"
fi

source "$PROJECT_DIR/venv/bin/activate"

pip install -q --upgrade pip
pip install -q -r requirements.txt
ok "Python dependencies đã sẵn sàng"

# ============================================================
#  3. FRONTEND DEPENDENCIES
# ============================================================
log "Thiết lập Frontend..."

if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    log "Cài npm packages..."
    cd "$PROJECT_DIR/frontend"
    npm install
    cd "$PROJECT_DIR"
    ok "Frontend dependencies đã sẵn sàng"
else
    ok "Frontend node_modules đã có"
fi

# ============================================================
#  4. CREATE STORAGE DIR
# ============================================================
mkdir -p "$PROJECT_DIR/storage"

# ============================================================
#  5. START SERVICES
# ============================================================
log "Khởi động services..."

# --- Stop any existing instances ---
pkill -f "uvicorn backend.main:app" 2>/dev/null || true
pkill -f "celery -A backend.worker" 2>/dev/null || true
sleep 1

# --- Redis ---
if ! redis-cli ping &>/dev/null; then
    log "Khởi động Redis..."
    if command -v systemctl &>/dev/null; then
        sudo systemctl start redis-server 2>/dev/null || true
    fi
    # Fallback: Docker
    if ! redis-cli ping &>/dev/null; then
        if command -v docker &>/dev/null; then
            docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || true
        fi
    fi
    sleep 1
    if redis-cli ping &>/dev/null; then
        ok "Redis PONG"
    else
        fail "Không thể khởi động Redis! Hãy cài redis-server hoặc docker."
    fi
else
    ok "Redis đang chạy"
fi

# --- Backend API (port 8000) ---
log "Khởi động Backend API (port 8000)..."
cd "$PROJECT_DIR"
source "$PROJECT_DIR/venv/bin/activate"
nohup uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

if kill -0 $BACKEND_PID 2>/dev/null; then
    ok "Backend API đang chạy (PID: $BACKEND_PID)"
else
    fail "Backend API không khởi động được! Xem log: /tmp/backend.log"
fi

# --- Celery Worker ---
log "Khởi động Celery Worker..."
nohup celery -A backend.worker.celery_app worker --loglevel=info --concurrency=1 > /tmp/celery.log 2>&1 &
CELERY_PID=$!
sleep 2

if kill -0 $CELERY_PID 2>/dev/null; then
    ok "Celery Worker đang chạy (PID: $CELERY_PID)"
else
    fail "Celery Worker không khởi động được! Xem log: /tmp/celery.log"
fi

# --- Frontend (port 5173) ---
log "Khởi động Frontend (port 5173)..."
cd "$PROJECT_DIR/frontend"
nohup npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_DIR"
sleep 3

if kill -0 $FRONTEND_PID 2>/dev/null; then
    ok "Frontend đang chạy (PID: $FRONTEND_PID)"
else
    fail "Frontend không khởi động được! Xem log: /tmp/frontend.log"
fi

# ============================================================
#  6. SUMMARY
# ============================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Tất cả services đã sẵn sàng!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  🌐 Frontend:  ${CYAN}http://localhost:5173${NC}"
echo -e "  🔧 Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "  📄 API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "  Logs:"
echo -e "    Backend:  /tmp/backend.log"
echo -e "    Celery:   /tmp/celery.log"
echo -e "    Frontend: /tmp/frontend.log"
echo ""
echo -e "  Dừng tất cả: ${YELLOW}pkill -f uvicorn; pkill -f celery; pkill -f vite${NC}"
echo ""
