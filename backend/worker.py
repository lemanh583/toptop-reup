import os
from celery import Celery
from backend.core.config import settings

celery_app = Celery("tiktok_tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    include=["backend.tasks"]
)
