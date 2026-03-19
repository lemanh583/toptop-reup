import os
import subprocess

class VoiceoverService:
    def __init__(self):
        self.voice = "vi-VN-HoaiMyNeural"

    def generate_tts_sync(self, text: str, output_path: str):
        try:
            # We call the CLI tool edge-tts directly 
            # to avoid async event loop nesting complexity inside a celery worker synchronously
            command = [
                "edge-tts",
                "--voice", self.voice,
                "--text", text,
                "--write-media", output_path
            ]
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Edge-TTS Error: {result.stderr}")
                return False
                
            return True
        except Exception as e:
            print(f"VoiceoverService Error: {e}")
            return False
