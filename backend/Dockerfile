FROM python:3.11-slim

# Ngăn Python tự cache __pycache__ và in buffer
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Cài đặt các gói hệ thống cần thiết (FFmpeg, libass, font chữ)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-ubuntu \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# (Tùy chọn) Cài Playwright browsers nếu cần dùng
# ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# RUN pip install playwright && playwright install chromium --with-deps

WORKDIR /app

# Copy requirements và install packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code backend
COPY . /app

# Expose API port
EXPOSE 8000

# Entrypoint sẽ được ghi đè trong docker-compose
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
