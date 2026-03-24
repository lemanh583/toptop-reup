from fastapi import APIRouter
from pydantic import BaseModel
from backend.tasks import voiceover_video_task

router = APIRouter()

class VoiceoverRequest(BaseModel):
    video_id: str
    script: str
    voice: str | None = None
    rate: str = "+0%"

@router.post("")
async def trigger_voiceover(req: VoiceoverRequest):
    task = voiceover_video_task.delay(req.video_id, req.script, voice=req.voice, rate=req.rate)
    return {
        "task_id": task.id, 
        "message": "Voiceover Job Queued"
    }

@router.get("/voices")
async def list_voices():
    from backend.services.voiceover import VoiceoverService
    voices = VoiceoverService.list_voices()
    return {"voices": voices}
