from fastapi import APIRouter
from pydantic import BaseModel
from backend.tasks import transform_video_task

router = APIRouter()

class TransformRequest(BaseModel):
    video_id: str
    transform_configs: dict = {}

@router.post("")
async def trigger_transform(req: TransformRequest):
    # Gọi Celery Task với kwargs do bỏ qua previous_result
    task = transform_video_task.apply_async(
        kwargs={"video_id": req.video_id, "transform_configs": req.transform_configs}
    )
    return {
        "task_id": task.id, 
        "message": "Transform Job Queued"
    }
