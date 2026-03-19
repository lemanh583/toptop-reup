from fastapi import APIRouter
from pydantic import BaseModel
from backend.tasks import voiceover_video_task

router = APIRouter()

class VoiceoverRequest(BaseModel):
    video_id: str
    script: str

@router.post("")
async def trigger_voiceover(req: VoiceoverRequest):
    # Gọi Celery Task
    task = voiceover_video_task.delay(req.video_id, req.script)
    return {
        "task_id": task.id, 
        "message": "Voiceover Job Queued"
    }
