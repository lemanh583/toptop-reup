import os
import random
import tempfile
import subprocess
import json
import ffmpeg
import datetime
import traceback

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
            
            width = int(video_stream["width"])
            height = int(video_stream["height"])
            
            # Detect rotation (often -90 or 90 for mobile videos)
            rotate = 0
            if "tags" in video_stream and "rotate" in video_stream["tags"]:
                rotate = int(video_stream["tags"]["rotate"])
            elif "side_data_list" in video_stream:
                for sd in video_stream["side_data_list"]:
                    if sd.get("side_data_type") == "Display Matrix":
                        rotate = int(sd.get("rotation", 0))
            
            if rotate in [90, 270, -90, -270]:
                width, height = height, width
                
            return {
                "width": width,
                "height": height,
                "duration": float(data["format"].get("duration", 0)),
                "fps": video_stream.get("r_frame_rate", "30/1"),
                "rotate": rotate
            }
        except Exception:
            return {"width": 720, "height": 1280, "duration": 30.0, "fps": "30/1", "rotate": 0}

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
        """Hybrid SRT generator: respects manual 'S-E | Text' and auto-fills gaps with plain text."""
        import re
        manual_pattern = re.compile(r"^([\d\.\:]+)\s*-\s*([\d\.\:]+)\s*\|\s*(.*)$")
        
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        fixed_segments = []
        plain_texts = []

        def parse_time(t_str: str) -> float | None:
            try:
                if ':' in t_str:
                    parts = t_str.split(':')
                    return float(parts[0]) * 60 + float(parts[1])
                return float(t_str)
            except Exception:
                return None

        for line in lines:
            match = manual_pattern.match(line)
            if match:
                s_val = parse_time(match.group(1))
                e_val = parse_time(match.group(2))
                txt = match.group(3)
                if s_val is not None and e_val is not None:
                    fixed_segments.append({'start': float(s_val), 'end': float(min(e_val, duration)), 'text': str(txt)})
            else:
                # Nếu không phải định dạng thủ công, coi là text tự động
                # Tách tiếp theo dấu câu nếu dòng đó dài
                subs = re.split(r'[.!?]', line)
                for s in subs:
                    if s.strip():
                        plain_texts.append(s.strip())

        # Sắp xếp các đoạn cố định
        fixed_segments.sort(key=lambda x: x['start'])
        
        # Tìm các khoảng trống (gaps)
        gaps = []
        last_end = 0.0
        for seg in fixed_segments:
            s_time = float(seg['start'])
            if s_time > last_end + 0.1:
                gaps.append({'start': last_end, 'end': s_time, 'duration': s_time - last_end})
            last_end = max(last_end, float(seg['end']))
        
        v_dur = float(duration)
        if last_end < v_dur - 0.1:
            gaps.append({'start': last_end, 'end': v_dur, 'duration': v_dur - last_end})

        final_segments = []
        
        # Nếu có text tự động, phân bổ vào các gaps
        if plain_texts:
            total_plain_chars = sum(len(t) for t in plain_texts)
            total_gap_duration = sum(float(g['duration']) for g in gaps)
            
            if total_gap_duration > 0 and total_plain_chars > 0:
                # Phân bổ text vào từng gap tỉ lệ theo độ dài gap
                current_plain_idx = 0
                for gap in gaps:
                    g_start = float(gap['start'])
                    g_dur = float(gap['duration'])
                    
                    # Text cho gap này = text chưa dùng
                    if current_plain_idx >= len(plain_texts):
                        break
                    
                    # Tính xem gap này chứa được bao nhiêu % text dựa theo thời gian gap / tổng thời gian trống
                    gap_weight = g_dur / total_gap_duration
                    gap_char_target = float(total_plain_chars) * gap_weight
                    
                    # Lấy các câu cho đến khi gần bằng target chars
                    gap_texts = []
                    acc_chars = 0
                    while current_plain_idx < len(plain_texts):
                        t = plain_texts[current_plain_idx]
                        if acc_chars > 0 and acc_chars + len(t) > gap_char_target * 1.3: # allow overflow
                            break
                        gap_texts.append(t)
                        acc_chars += len(t)
                        current_plain_idx += 1
                    
                    if gap_texts:
                        # Phân bổ nội bộ gap này theo weight chars của chính gap_texts
                        gap_acc_chars = float(sum(len(t) for t in gap_texts))
                        curr_gap_start = g_start
                        for t in gap_texts:
                            t_weight = len(t) / gap_acc_chars
                            t_dur = g_dur * t_weight
                            final_segments.append({'start': curr_gap_start, 'end': curr_gap_start + t_dur, 'text': t})
                            curr_gap_start += t_dur
            else:
                # Trưòng hợp không có gap nào (manual phủ kín) nhưng vẫn còn plain text
                # Có thể append vào cuối nếu còn chỗ
                pass
        
        # Gộp fixed và auto-timed, sắp xếp lại
        final_segments.extend(fixed_segments)
        final_segments.sort(key=lambda x: float(x['start']))

        def format_ts(seconds):
            h = int(seconds // 3600); m = int((seconds % 3600) // 60)
            s = int(seconds % 60); ms = int((seconds % 1) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

        with open(output_path, "w", encoding="utf-8") as f:
            for i, seg in enumerate(final_segments):
                f.write(f"{i+1}\n{format_ts(seg['start'])} --> {format_ts(seg['end'])}\n{seg['text']}\n\n")

    def _generate_ass_from_text(self, text: str, duration: float, output_path: str,
                                 width: int, height: int, font_size: int,
                                 margin_v: int, alignment: int = 2):
        """Generate ASS subtitle file with PlayResX/PlayResY for pixel-accurate rendering."""
        # Reuse SRT generator logic to get timed segments
        import re
        manual_pattern = re.compile(r"^([\d\.\:]+)\s*-\s*([\d\.\:]+)\s*\|\s*(.*)$")
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        fixed_segments = []
        plain_texts = []

        def parse_time(t_str: str):
            try:
                if ':' in t_str:
                    parts = t_str.split(':')
                    return float(parts[0]) * 60 + float(parts[1])
                return float(t_str)
            except Exception:
                return None

        for line in lines:
            match = manual_pattern.match(line)
            if match:
                s_val = parse_time(match.group(1))
                e_val = parse_time(match.group(2))
                txt = match.group(3)
                if s_val is not None and e_val is not None:
                    fixed_segments.append({'start': float(s_val), 'end': float(min(e_val, duration)), 'text': str(txt)})
            else:
                subs = re.split(r'[.!?]', line)
                for s in subs:
                    if s.strip():
                        plain_texts.append(s.strip())

        fixed_segments.sort(key=lambda x: x['start'])
        gaps = []
        last_end = 0.0
        for seg in fixed_segments:
            s_time = float(seg['start'])
            if s_time > last_end + 0.1:
                gaps.append({'start': last_end, 'end': s_time, 'duration': s_time - last_end})
            last_end = max(last_end, float(seg['end']))
        v_dur = float(duration)
        if last_end < v_dur - 0.1:
            gaps.append({'start': last_end, 'end': v_dur, 'duration': v_dur - last_end})

        final_segments = []
        if plain_texts:
            total_plain_chars = sum(len(t) for t in plain_texts)
            total_gap_duration = sum(float(g['duration']) for g in gaps)
            if total_gap_duration > 0 and total_plain_chars > 0:
                current_plain_idx = 0
                for gap in gaps:
                    g_start = float(gap['start'])
                    g_dur = float(gap['duration'])
                    if current_plain_idx >= len(plain_texts):
                        break
                    gap_weight = g_dur / total_gap_duration
                    gap_char_target = float(total_plain_chars) * gap_weight
                    gap_texts = []
                    acc_chars = 0
                    while current_plain_idx < len(plain_texts):
                        t = plain_texts[current_plain_idx]
                        if acc_chars > 0 and acc_chars + len(t) > gap_char_target * 1.3:
                            break
                        gap_texts.append(t)
                        acc_chars += len(t)
                        current_plain_idx += 1
                    if gap_texts:
                        gap_acc_chars = float(sum(len(t) for t in gap_texts))
                        curr_gap_start = g_start
                        for t in gap_texts:
                            t_weight = len(t) / gap_acc_chars
                            t_dur = g_dur * t_weight
                            final_segments.append({'start': curr_gap_start, 'end': curr_gap_start + t_dur, 'text': t})
                            curr_gap_start += t_dur

        final_segments.extend(fixed_segments)
        final_segments.sort(key=lambda x: float(x['start']))

        def fmt_ass_ts(seconds):
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = int(seconds % 60)
            cs = int((seconds % 1) * 100)
            return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("[Script Info]\n")
            f.write("ScriptType: v4.00+\n")
            f.write(f"PlayResX: {width}\n")
            f.write(f"PlayResY: {height}\n")
            f.write("WrapStyle: 0\n")
            f.write("ScaledBorderAndShadow: yes\n\n")
            f.write("[V4+ Styles]\n")
            f.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
            f.write(f"Style: Default,DejaVu Sans,{font_size},&Hffffff,&H000000,&H000000,&H000000,0,0,0,0,100,100,0,0,1,2,1,{alignment},0,0,{margin_v},1\n\n")
            f.write("[Events]\n")
            f.write("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
            for seg in final_segments:
                f.write(f"Dialogue: 0,{fmt_ass_ts(seg['start'])},{fmt_ass_ts(seg['end'])},Default,,0,0,0,,{seg['text']}\n")

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
                out = ffmpeg.output(video, audio, output_path).global_args('-nostdin')
                out.run(overwrite_output=True, quiet=True)
            else:
                import shutil
                shutil.copy2(input_path, output_path)
                
            return True
        except ffmpeg.Error as e:
            print(f"FFmpeg Error: {e.stderr}")
            return False

    def apply_subtitle_overlay(self, input_path: str, output_path: str, configs: dict):
        """
        Two-pass approach: 1. Cover area, 2. Burn subtitles.
        """
        def log_debug(msg):
            with open("/tmp/transform_debug.log", "a") as f:
                f.write(f"[{datetime.datetime.now().isoformat()}] {msg}\n")

        try:
            log_debug(f"[OVERLAY_START] VIDEO={os.path.basename(input_path)} configs={configs}")

            # 1. Config & Video Info
            sub_mode = configs.get("sub_mode", "blackbox")
            cover_style = configs.get("cover_style", "black")
            sub_position = configs.get("sub_position", "cover")
            need_cover = (sub_mode == "blackbox")

            video_info = self.get_video_info(input_path)
            height = video_info.get("height", 1280)
            width = video_info.get("width", 720)

            # 2. Pixel Calculations (Even numbers for x264)
            x_pct = float(configs.get("sub_cover_x", 10))
            y_pct = float(configs.get("sub_cover_y", 75))
            w_pct = float(configs.get("sub_cover_w", 80))
            h_pct = float(configs.get("sub_cover_h", 12))

            x_px = int((width * x_pct / 100.0) // 2) * 2
            y_px = int((height * y_pct / 100.0) // 2) * 2
            w_px = int((width * w_pct / 100.0) // 2) * 2
            h_px = int((height * h_pct / 100.0) // 2) * 2

            # Safety Bounds
            x_px = max(0, min(width - 4, x_px))
            y_px = max(0, min(height - 4, y_px))
            w_px = max(4, min(width - x_px, w_px))
            h_px = max(4, min(height - y_px, h_px))

            # 3. PASS 1: Apply Cover
            intermediate = input_path
            if need_cover:
                intermediate = output_path + ".pass1.mp4"
                if cover_style == "blur":
                    vf = (
                        f"[0:v]split[main][blur];"
                        f"[blur]crop={w_px}:{h_px}:{x_px}:{y_px},boxblur=20:5[blurred];"
                        f"[main][blurred]overlay={x_px}:{y_px}[out]"
                    )
                    cmd1 = [
                        "ffmpeg", "-nostdin", "-y", "-i", input_path,
                        "-filter_complex", vf,
                        "-map", "[out]", "-map", "0:a?",
                        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                        "-c:a", "copy", intermediate
                    ]
                else: # black
                    cmd1 = [
                        "ffmpeg", "-nostdin", "-y", "-i", input_path,
                        "-vf", f"drawbox=x={x_px}:y={y_px}:w={w_px}:h={h_px}:color=black:t=fill",
                        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                        "-c:a", "copy", intermediate
                    ]

                log_debug(f"EXEC CMD1: {' '.join(cmd1)}")
                r1 = subprocess.run(cmd1, capture_output=True, text=True)
                if r1.returncode != 0:
                    log_debug(f"PASS 1 FAILED: {r1.stderr[-1000:]}")
                    return False

            # 4. PASS 2: Subtitles (using ASS for pixel-accurate rendering)
            temp_ass = None
            has_subtitle_text = configs.get("new_subtitle_text") or configs.get("srt_file_path")
            if has_subtitle_text:
                duration = video_info.get("duration", 30.0)
                sub_font_size = int(configs.get("sub_font_size", 14))
                sub_margin_v = int(configs.get("sub_margin_v", 20))

                # Scale font: slider_value * height / 540
                # e.g. slider=14 on 1920p → 14*1920/540 ≈ 50px (readable but not huge)
                font_size = max(16, int(sub_font_size * height / 540.0))

                if sub_position == "cover" and need_cover:
                    cover_center = y_px + (h_px / 2.0)
                    margin_v = max(0, int(height - cover_center))
                    alignment = 2
                else:
                    # Bottom: slider as % of height
                    margin_v = max(0, int(sub_margin_v * height / 100.0))
                    alignment = 2

                # Generate ASS file
                temp_ass = tempfile.NamedTemporaryFile(suffix=".ass", delete=False, mode="w", encoding="utf-8")
                temp_ass.close()
                ass_path = temp_ass.name

                sub_text = configs.get("new_subtitle_text", "")
                self._generate_ass_from_text(
                    sub_text, duration, ass_path,
                    width, height, font_size, margin_v, alignment
                )

                escaped_ass = ass_path.replace("\\", "\\\\").replace(":", "\\:")
                sub_vf = f"ass={escaped_ass}"
                cmd2 = [
                    "ffmpeg", "-nostdin", "-y", "-i", intermediate,
                    "-vf", sub_vf,
                    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                    "-c:a", "copy", output_path
                ]

                log_debug(f"EXEC CMD2: {' '.join(cmd2)}")
                r2 = subprocess.run(cmd2, capture_output=True, text=True)

                # Cleanup
                if intermediate != input_path and os.path.exists(intermediate):
                    os.unlink(intermediate)
                if temp_ass and os.path.exists(temp_ass.name):
                    os.unlink(temp_ass.name)

                if r2.returncode != 0:
                    log_debug(f"PASS 2 FAILED: {r2.stderr[-1000:]}")
                    return False
                return True


            elif need_cover:
                # No sub, only cover
                if intermediate != output_path:
                    os.rename(intermediate, output_path)
                return True

            return False

        except Exception as e:
            msg = f"OVERLAY_CRITICAL_ERROR: {e}\n{traceback.format_exc()}"
            log_debug(msg)
            print(msg)
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

    def apply_audio_mux(self, video_path: str, audio_path: str, output_path: str, orig_vol: float = 0.5, tts_vol: float = 1.0):
        try:
            v_stream = ffmpeg.input(video_path)
            a_stream = ffmpeg.input(audio_path)
            
            # Use provided volume levels (0.0 to 2.0 range recommendation)
            original_audio = v_stream.audio.filter('volume', orig_vol)
            
            # Loop the TTS audio infinitely, set volume
            tts_audio = a_stream.audio.filter('aloop', loop=-1, size=2e9).filter('volume', tts_vol)
            
            # amix two streams, duration=first means cut to the video length
            mixed = ffmpeg.filter([original_audio, tts_audio], 'amix', inputs=2, duration='first')
            
            out = ffmpeg.output(v_stream.video, mixed, output_path, shortest=None).global_args('-nostdin')
            out.run(overwrite_output=True, quiet=True)
            return True
            
        except ffmpeg.Error as e:
            print(f"FFmpeg Muxing Error: {e.stderr}")
            return False

