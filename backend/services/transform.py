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
            
            # 2. Đổi tốc độ (95% -> 105% random speed)
            speed = random.choice([0.95, 1.05])
            video = video.filter('setpts', f"{speed}*PTS")
            
            audio = stream.audio.filter('atempo', 1/speed)
            
            out = ffmpeg.output(video, audio, output_path)
            out.run(overwrite_output=True, quiet=True)
            return True
        except ffmpeg.Error as e:
            print(f"FFmpeg Error: {e.stderr}")
            return False

    def apply_md5_pad(self, file_path: str):
        try:
            with open(file_path, "ab") as f:
                f.write(os.urandom(16))
            return True
        except Exception as e:
            print(f"MD5 padding error: {e}")
            return False

    def apply_audio_mux(self, video_path: str, audio_path: str, output_path: str):
        try:
            v_stream = ffmpeg.input(video_path)
            a_stream = ffmpeg.input(audio_path)
            
            # Reduce original volume by roughly 85% (volume=0.15)
            original_audio = v_stream.audio.filter('volume', 0.15)
            
            # Loop the TTS audio infinitely (-1 = infinity), high volume
            tts_audio = a_stream.audio.filter('aloop', loop=-1, size=2e9).filter('volume', 1.5)
            
            # amix two streams, duration=first means cut to the video length
            mixed = ffmpeg.filter([original_audio, tts_audio], 'amix', inputs=2, duration='first')
            
            out = ffmpeg.output(v_stream.video, mixed, output_path, shortest=None)
            out.run(overwrite_output=True, quiet=True)
            return True
            
        except ffmpeg.Error as e:
            print(f"FFmpeg Muxing Error: {e.stderr}")
            return False
