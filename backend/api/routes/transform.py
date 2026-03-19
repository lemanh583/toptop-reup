from fastapi import APIRouter
from pydantic import BaseModel
from backend.tasks import transform_video_task

router = APIRouter()

class TransformRequest(BaseModel):
    video_id: str
    profile: str = "basic"

@router.post("")
async def trigger_transform(req: TransformRequest):
    # Gọi Celery Task
    task = transform_video_task.delay(req.video_id, req.profile)
    return {
        "task_id": task.id, 
        "message": "Transform Job Queued"
    }
