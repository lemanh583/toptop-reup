import os
import subprocess

class VoiceoverService:
    def __init__(self):
        self.default_voice = "vi-VN-HoaiMyNeural"

    def generate_tts_sync(self, text: str, output_path: str, voice: str = None, rate: str = "+0%"):
        """Generate TTS audio using edge-tts CLI.
        
        Args:
            text: Script text to speak
            output_path: Where to save the audio file
            voice: edge-tts voice name (default: vi-VN-HoaiMyNeural)
            rate: Speed modifier (e.g. "+10%", "-10%", "+0%")
        """
        try:
            voice = voice or self.default_voice
            
            command = [
                "edge-tts",
                "--voice", voice,
                "--rate", rate,
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

    @staticmethod
    def list_voices():
        """List available edge-tts voices with language info."""
        try:
            result = subprocess.run(
                ["edge-tts", "--list-voices"],
                capture_output=True, text=True
            )
            
            if result.returncode != 0:
                return []
            
            voices = []
            for line in result.stdout.strip().split("\n"):
                if line.startswith("Name:"):
                    name = line.split("Name:")[-1].strip()
                    voices.append(name)
            
            return voices
        except Exception:
            return []
