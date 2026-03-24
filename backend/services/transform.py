import os
import random
import tempfile
import subprocess
import json
import ffmpeg

class VideoTransformer:
    def __init__(self):
        pass

    def _get_video_duration(self, file_path: str) -> float:
        """Get video duration in seconds using ffprobe."""
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", file_path],
                capture_output=True, text=True
            )
            info = json.loads(result.stdout)
            return float(info["format"]["duration"])
        except Exception:
            return 30.0  # fallback default

    def _generate_srt_from_text(self, text: str, duration: float, output_path: str):
        """Auto-split plain text into evenly-timed SRT segments."""
        # Split by newlines or periods, filter empty
        segments = [s.strip() for s in text.replace('\n', '. ').split('.') if s.strip()]
        if not segments:
            segments = [text.strip()]
        
        n = len(segments)
        seg_duration = duration / n
        
        with open(output_path, "w", encoding="utf-8") as f:
            for i, seg in enumerate(segments):
                start = i * seg_duration
                end = (i + 1) * seg_duration
                # SRT timestamp format: HH:MM:SS,mmm
                start_ts = f"{int(start//3600):02d}:{int((start%3600)//60):02d}:{int(start%60):02d},{int((start%1)*1000):03d}"
                end_ts = f"{int(end//3600):02d}:{int((end%3600)//60):02d}:{int(end%60):02d},{int((end%1)*1000):03d}"
                f.write(f"{i+1}\n{start_ts} --> {end_ts}\n{seg}\n\n")

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

    def apply_custom_transform(self, input_path: str, output_path: str, configs: dict):
        try:
            stream = ffmpeg.input(input_path)
            video = stream.video
            audio = stream.audio
            
            needs_reencode = False
            
            if configs.get("hflip", False):
                video = video.hflip()
                needs_reencode = True
                
            if configs.get("edge_crop", False):
                # Cắt đi 2% diện tích (cả bề ngang lẫn dọc)
                video = video.crop(x='iw*0.01', y='ih*0.01', width='iw*0.98', height='ih*0.98')
                needs_reencode = True

            if configs.get("color_shift", False):
                # Tăng sáng 3%, tương phản 2%, đậm màu 5%
                video = video.filter('eq', brightness=0.03, contrast=1.02, saturation=1.05)
                needs_reencode = True

            if configs.get("unsharp_mask", False):
                # Làm sắc cạnh cấu trúc
                video = video.filter('unsharp', luma_msize_x=5, luma_msize_y=5, luma_amount=0.5)
                needs_reencode = True

            if configs.get("dynamic_noise", False):
                # Phủ nhiễu động từng khung hình (mức 1)
                video = video.filter('noise', alls=1, allf='t+u')
                needs_reencode = True
                
            if configs.get("speed_shift", False):
                speed = random.choice([0.95, 1.05])
                video = video.filter('setpts', f"{speed}*PTS")
                audio = audio.filter('atempo', 1/speed)
                needs_reencode = True

            # --- Phase 9: Subtitle features ---
            if configs.get("hide_old_sub", False):
                # Che sub cũ: phủ dải đen 15% dưới cùng video
                video = video.drawbox(x=0, y='ih*0.85', width='iw', height='ih*0.15', color='black', t='fill')
                needs_reencode = True
                
            if needs_reencode:
                out = ffmpeg.output(video, audio, output_path)
                out.run(overwrite_output=True, quiet=True)
            else:
                import shutil
                shutil.copy2(input_path, output_path)
                
            return True
        except ffmpeg.Error as e:
            print(f"FFmpeg Error: {e.stderr}")
            return False

    def apply_subtitle_burn(self, input_path: str, output_path: str, configs: dict):
        """Burn subtitles into video from text or SRT file.
        
        configs keys:
          - new_subtitle_text: str — plain text to auto-split into SRT
          - srt_file_path: str — path to an existing .srt file
        """
        try:
            srt_path = configs.get("srt_file_path")
            temp_srt = None
            
            if not srt_path and configs.get("new_subtitle_text"):
                # Auto-generate SRT from plain text
                duration = self._get_video_duration(input_path)
                temp_srt = tempfile.NamedTemporaryFile(suffix=".srt", delete=False, mode="w", encoding="utf-8")
                temp_srt.close()
                srt_path = temp_srt.name
                self._generate_srt_from_text(configs["new_subtitle_text"], duration, srt_path)
            
            if not srt_path:
                return False
            
            # Escape path for FFmpeg subtitles filter (colons and backslashes)
            escaped_srt = srt_path.replace("\\", "\\\\").replace(":", "\\:")
            
            # Build FFmpeg command manually for subtitles filter (ffmpeg-python has issues with it)
            cmd = [
                "ffmpeg", "-y", "-i", input_path,
                "-vf", f"subtitles={escaped_srt}:force_style='FontSize=22,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,MarginV=30'",
                "-c:a", "copy",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Cleanup temp file
            if temp_srt and os.path.exists(temp_srt.name):
                os.unlink(temp_srt.name)
                
            if result.returncode != 0:
                print(f"Subtitle Burn Error: {result.stderr[-500:]}")
                return False
                
            return True
        except Exception as e:
            print(f"Subtitle Burn Error: {e}")
            return False

    def apply_md5_pad(self, file_path: str):
        try:
            with open(file_path, "ab") as f:
                import uuid
                # Write a valid MP4 'free' atom header (8 bytes) + 16 bytes random data
                # Length = 24 bytes (0x00, 0x00, 0x00, 0x18)
                # Type = 'free' (0x66, 0x72, 0x65, 0x65)
                f.write(b'\x00\x00\x00\x18free' + uuid.uuid4().bytes)
            return True
        except Exception as e:
            print(f"MD5 Pad Error: {e}")
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

