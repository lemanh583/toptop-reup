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

    def get_video_info(self, file_path: str) -> dict:
        """Get video width, height, duration."""
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json",
                 "-show_streams", "-show_format", file_path],
                capture_output=True, text=True
            )
            data = json.loads(result.stdout)
            video_stream = next(s for s in data["streams"] if s["codec_type"] == "video")
            return {
                "width": int(video_stream["width"]),
                "height": int(video_stream["height"]),
                "duration": float(data["format"].get("duration", 0)),
                "fps": video_stream.get("r_frame_rate", "30/1")
            }
        except Exception:
            return {"width": 720, "height": 1280, "duration": 30.0, "fps": "30/1"}

    def extract_frame(self, video_path: str, output_path: str, time_sec: float = 3.0):
        """Extract a single frame from video for preview."""
        cmd = [
            "ffmpeg", "-y", "-ss", str(time_sec),
            "-i", video_path, "-vframes", "1",
            "-q:v", "2", output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0

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

            # --- Phase 9: Subtitle cover ---
            if configs.get("hide_old_sub", False):
                # Configurable subtitle cover:
                #   sub_cover_y: Y position as % of height (default 82%)
                #   sub_cover_h: Height as % of total (default 18%)
                #   sub_cover_mode: "black" or "blur" (default "black")
                y_pct = configs.get("sub_cover_y", 82) / 100.0
                h_pct = configs.get("sub_cover_h", 18) / 100.0
                mode = configs.get("sub_cover_mode", "black")
                
                if mode == "blur":
                    # Blur the subtitle region using crop+boxblur+overlay
                    # This is complex with ffmpeg-python, use subprocess
                    pass  # Handled separately below
                else:
                    # Black fill
                    video = video.drawbox(
                        x=0, y=f'ih*{y_pct}',
                        width='iw', height=f'ih*{h_pct}',
                        color='black', t='fill'
                    )
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

    def apply_subtitle_overlay(self, input_path: str, output_path: str, configs: dict):
        """Combined subtitle pipeline with 2 modes.
        
        configs keys:
          - sub_mode: str — 'blackbox' (A: drawbox + sub) or 'overlay' (B: sub only, no bg)
          - sub_style: str — for overlay mode: 'outline' | 'shadow' | 'glass' (default 'outline')
          - sub_cover_x/y/w/h: int — for blackbox mode: position/size as %
          - new_subtitle_text: str — plain text to auto-split into SRT
          - srt_file_path: str — path to an existing .srt file
          - sub_font_size: int — font size (default 18)
          - sub_margin_v: int — bottom margin in pixels (default 20)
        """
        try:
            vf_filters = []
            sub_mode = configs.get("sub_mode", "blackbox")
            
            # Mode A: Black out old subtitle area
            if sub_mode == "blackbox":
                x_pct = configs.get("sub_cover_x", 10)
                y_pct = configs.get("sub_cover_y", 80)
                w_pct = configs.get("sub_cover_w", 80)
                h_pct = configs.get("sub_cover_h", 20)
                if y_pct and h_pct:
                    vf_filters.append(
                        f"drawbox=x=iw*{x_pct/100}:y=ih*{y_pct/100}:w=iw*{w_pct/100}:h=ih*{h_pct/100}:color=black:t=fill"
                    )
            
            # Prepare SRT file
            srt_path = configs.get("srt_file_path")
            temp_srt = None
            
            if not srt_path and configs.get("new_subtitle_text"):
                duration = self._get_video_duration(input_path)
                temp_srt = tempfile.NamedTemporaryFile(suffix=".srt", delete=False, mode="w", encoding="utf-8")
                temp_srt.close()
                srt_path = temp_srt.name
                self._generate_srt_from_text(configs["new_subtitle_text"], duration, srt_path)
            
            # Build subtitle style based on mode
            if srt_path:
                escaped_srt = srt_path.replace("\\", "\\\\").replace(":", "\\:")
                font_size = configs.get("sub_font_size", 18)
                margin_v = configs.get("sub_margin_v", 20)
                sub_style = configs.get("sub_style", "outline")
                
                if sub_mode == "blackbox":
                    # Mode A: chữ trắng viền đen nhẹ trên nền đen
                    style = (
                        f"FontSize={font_size},"
                        f"PrimaryColour=&HFFFFFF&,"
                        f"OutlineColour=&H000000&,"
                        f"Outline=2,"
                        f"BorderStyle=1,"
                        f"Shadow=0,"
                        f"MarginV={margin_v}"
                    )
                elif sub_style == "shadow":
                    # Mode B - Shadow: chữ trắng + bóng đen đậm
                    style = (
                        f"FontSize={font_size},"
                        f"PrimaryColour=&HFFFFFF&,"
                        f"OutlineColour=&H000000&,"
                        f"Outline=2,"
                        f"BorderStyle=1,"
                        f"Shadow=3,"
                        f"BackColour=&H80000000&,"
                        f"MarginV={margin_v}"
                    )
                elif sub_style == "glass":
                    # Mode B - Glass: chữ trắng + hộp nền đen 50% trong suốt
                    style = (
                        f"FontSize={font_size},"
                        f"PrimaryColour=&HFFFFFF&,"
                        f"OutlineColour=&H40000000&,"
                        f"Outline=0,"
                        f"BorderStyle=4,"
                        f"BackColour=&H80000000&,"
                        f"Shadow=0,"
                        f"MarginV={margin_v}"
                    )
                else:
                    # Mode B - Outline (default): chữ trắng viền đen dày — nổi trên mọi nền
                    style = (
                        f"FontSize={font_size},"
                        f"PrimaryColour=&HFFFFFF&,"
                        f"OutlineColour=&H000000&,"
                        f"Outline=3,"
                        f"BorderStyle=1,"
                        f"Shadow=1,"
                        f"MarginV={margin_v}"
                    )
                
                vf_filters.append(f"subtitles={escaped_srt}:force_style='{style}'")

            
            if not vf_filters:
                return False
            
            # Combine all filters in one FFmpeg pass
            vf_chain = ",".join(vf_filters)
            cmd = [
                "ffmpeg", "-y", "-i", input_path,
                "-vf", vf_chain,
                "-c:a", "copy",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Cleanup temp file
            if temp_srt and os.path.exists(temp_srt.name):
                os.unlink(temp_srt.name)
                
            if result.returncode != 0:
                print(f"Subtitle Overlay Error: {result.stderr[-500:]}")
                return False
                
            return True
        except Exception as e:
            print(f"Subtitle Overlay Error: {e}")
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

