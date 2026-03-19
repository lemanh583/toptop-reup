import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    REDIS_URL: str = "redis://localhost:6379/0"
    STORAGE_PATH: str = "./storage"
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_PATH, exist_ok=True)
