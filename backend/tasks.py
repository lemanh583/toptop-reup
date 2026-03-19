import os
import time
from backend.worker import celery_app
from backend.core.config import settings

@celery_app.task(bind=True, name="download_tiktok_video")
def download_tiktok_video(self, url: str):
    # Cập nhật trạng thái Job đang tiến hành
    self.update_state(state='PROGRESS', meta={'progress': 10, 'status': 'Khởi tạo tải...'})
    
    # Ở đây chúng ta sẽ giả lập gọi lệnh CLI của TiktokDownloader bằng subprocess
    # Ví dụ: subprocess.run([python, "backend/vendor/TikTokDownloader/main.py", "--url", url])
    # Tạm thời để sleep để mock delay của việc tải
    time.sleep(2)  
    
    self.update_state(state='PROGRESS', meta={'progress': 50, 'status': 'Đang lấy dữ liệu từ Tiktok no-watermark...'})
    time.sleep(3)  
    
    # Giả lập file video đã được lưu vào Storage
    video_id = url.split('/')[-1] if '/' in url else "unknown_video"
    file_path = os.path.join(settings.STORAGE_PATH, f"{video_id}.mp4")
    
    with open(file_path, "w") as f:
        f.write("mock video mp4 data từ TiktokDownloader")
        
    self.update_state(state='SUCCESS', meta={'progress': 100, 'status': 'Tải thành công!'})
    return {"message": "Success", "file_path": file_path, "video_id": video_id}
