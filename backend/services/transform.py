import os
import random
import ffmpeg

class VideoTransformer:
    def __init__(self):
        pass

    def apply_basic_transform(self, input_path: str, output_path: str):
        try:
            stream = ffmpeg.input(input_path)
            
            # 1. hflip (Mirror)
            video = stream.video.hflip()
            
            # 2. Đổi tốc độ (95% -> 105% random speed để lách MD5/length)
            speed = random.choice([0.95, 1.05])
            video = video.filter('setpts', f"{speed}*PTS")
            
            # Audio cũng phải đổi speed tương ứng với atempo
            audio = stream.audio.filter('atempo', 1/speed)
            
            out = ffmpeg.output(video, audio, output_path)
            out.run(overwrite_output=True, quiet=True)
            return True
        except ffmpeg.Error as e:
            print(f"FFmpeg Error: {e.stderr}")
            return False

    def apply_md5_pad(self, file_path: str):
        """Append random bytes to the end of the file to change its MD5 hash."""
        try:
            with open(file_path, "ab") as f:
                f.write(os.urandom(16))
            return True
        except Exception as e:
            print(f"MD5 padding error: {e}")
            return False
