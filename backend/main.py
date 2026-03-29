from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.api.routes import download, transform, voiceover
import os

app = FastAPI(
    title="Auto-Reup TikTok Admin API", 
    version="1.0.0",
    description="API hệ thống quản lý Tiktok Download"
)

# Thêm CORS để cho phép origin frontend localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Router module
app.include_router(download.router, prefix="/api/download", tags=["Download"])
app.include_router(transform.router, prefix="/api/transform", tags=["Transform"])
app.include_router(voiceover.router, prefix="/api/voiceover", tags=["Voiceover"])

# Mount storage directory for serving video files
STORAGE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage")
os.makedirs(STORAGE_PATH, exist_ok=True)
app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")

@app.get("/")
def root():
    return {"message": "Hệ thống Backend API Tiktok Tool đang chạy!"}

@app.get("/api/files")
def list_files():
    """List video files in storage."""
    files = []
    for f in sorted(os.listdir(STORAGE_PATH)):
        if f.endswith('.mp4'):
            fpath = os.path.join(STORAGE_PATH, f)
            size_mb = os.path.getsize(fpath) / (1024 * 1024)
            tag = "gốc"
            if "_voiceover" in f:
                tag = "voiceover"
            elif "_transformed" in f:
                tag = "anti-scan"
            files.append({
                "name": f,
                "size_mb": round(size_mb, 1),
                "tag": tag,
                "url": f"/storage/{f}"
            })
    return {"files": files}

@app.delete("/api/files/{filename}")
def delete_file(filename: str):
    """Delete a video file from storage."""
    # Security: ensure only .mp4 files in STORAGE_PATH can be deleted
    if not filename.endswith('.mp4') or ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    file_path = os.path.join(STORAGE_PATH, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": f"Deleted {filename}"}
    raise HTTPException(status_code=404, detail="File not found")
