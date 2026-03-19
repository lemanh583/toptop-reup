from fastapi import FastAPI
from backend.api.routes import download

app = FastAPI(
    title="Auto-Reup TikTok Admin API", 
    version="1.0.0",
    description="API hệ thống quản lý Tiktok Download"
)

# Đăng ký các Router module
app.include_router(download.router, prefix="/api/download", tags=["Download"])

@app.get("/")
def root():
    return {"message": "Hệ thống Backend API Tiktok Tool đang chạy!"}
