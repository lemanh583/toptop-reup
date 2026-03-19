import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from celery.result import AsyncResult
from backend.tasks import download_tiktok_video

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str

@router.post("")
async def trigger_download(req: DownloadRequest):
    # Gọi Celery Task bất đồng bộ (.delay)
    task = download_tiktok_video.delay(req.url)
    return {
        "task_id": task.id, 
        "message": "Đã đưa vào hàng đợi."
    }

@router.websocket("/ws/status/{task_id}")
async def websocket_status(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        while True:
            res = AsyncResult(task_id)
            state = res.state
            
            # celery lưu meta message trong info
            meta = res.info if isinstance(res.info, dict) else {"status": str(res.info) if res.info else ""}
            
            await websocket.send_json({
                "task_id": task_id,
                "state": state,
                "meta": meta
            })
            
            if state in ["SUCCESS", "FAILURE"]:
                break
                
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        print(f"Client disconnected for task {task_id}")
