import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from celery.result import AsyncResult
from backend.tasks import download_tiktok_video

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str
    cookie: str | None = None
    auto_transform: bool = False
    transform_configs: dict = {}

@router.post("")
async def trigger_download(req: DownloadRequest):
    if req.auto_transform:
        from celery import chain
        from backend.tasks import transform_video_task
        
        workflow = chain(
            download_tiktok_video.s(req.url, req.cookie),
            transform_video_task.s(req.transform_configs)
        )
        res = workflow.apply_async()
        
        return {
            "tasks": [
                {"id": res.parent.id, "name": "Tải luồng Video gốc", "type": "download"},
                {"id": res.id, "name": "Encode lách bản quyền (Anti-scan)", "type": "transform"}
            ],
            "message": "Đã đưa chuỗi 2 tiến trình vào hàng đợi."
        }
    else:
        # Gọi Celery Task bất đồng bộ (.delay)
        task = download_tiktok_video.delay(req.url, req.cookie)
        return {
            "tasks": [
                {"id": task.id, "name": "Tải luồng Video gốc", "type": "download"}
            ],
            "message": "Đã đưa 1 tiến trình vào hàng đợi."
        }

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """REST endpoint for polling task status (used by CLI)."""
    res = AsyncResult(task_id)
    state = res.state
    meta = res.info if isinstance(res.info, dict) else {"status": str(res.info) if res.info else ""}
    return {
        "task_id": task_id,
        "state": state,
        "meta": meta
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
