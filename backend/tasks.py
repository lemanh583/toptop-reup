import os
import time
import subprocess
from backend.worker import celery_app
from backend.core.config import settings

@celery_app.task(bind=True, name="download_tiktok_video")
def download_tiktok_video(self, url: str, cookie: str = None):
    self.update_state(state='PROGRESS', meta={'progress': 10, 'status': 'Đang lấy ID chuẩn bị gọi API tĩnh...'})
    
    # Extract ID
    video_id = url.split('modal_id=')[-1].split('&')[0] if 'modal_id=' in url else url.split('/')[-1].split('?')[0]
    if not video_id or len(video_id) < 5 or "tiktok" in video_id:
        video_id = f"video_{int(time.time())}"
        
    file_path = os.path.join(settings.STORAGE_PATH, f"{video_id}.mp4")
    
    self.update_state(state='PROGRESS', meta={'progress': 30, 'status': 'Đang kết nối API Port 5555 (DouK-Downloader)...'})
    
    import httpx
    import re
    
    is_tiktok = "tiktok.com" in url or "vm.tiktok" in url or "vt.tiktok" in url
    api_domain = "http://127.0.0.1:5555"
    
    cookie_file = os.path.join(settings.STORAGE_PATH, "douyin_cookie.txt")
    if not cookie and not is_tiktok and os.path.exists(cookie_file):
        with open(cookie_file, "r") as f:
            cookie = f.read().strip()
    
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            # 1. Giải mã link ngắn (nếu có)
            if "v.douyin.com" in url or "vm.tiktok.com" in url or "vt.tiktok.com" in url:
                self.update_state(state='PROGRESS', meta={'progress': 40, 'status': 'Tiến hành giải mã Link ngắn...'})
                share_api = f"{api_domain}/tiktok/share" if is_tiktok else f"{api_domain}/douyin/share"
                r = client.post(share_api, json={"text": url})
                if r.status_code == 200 and r.json().get("url"):
                    url = r.json()["url"]
                    
            # Trích xuất detail_id sau khi đã có link dài
            detail_id = ""
            if "modal_id=" in url:
                detail_id = url.split("modal_id=")[-1].split("&")[0]
            elif "/video/" in url:
                detail_id = url.split("/video/")[-1].split("/")[0].split("?")[0]
            elif "/note/" in url:
                detail_id = url.split("/note/")[-1].split("/")[0].split("?")[0]
            else:
                match = re.search(r'\d{17,21}', url)
                if match: detail_id = match.group(0)
                
            if not detail_id and ("v.douyin.com" in url or "vm.tiktok.com" in url or "vt.tiktok.com" in url):
                try:
                    from urllib.parse import unquote
                    r_redirect = client.get(url, follow_redirects=False)
                    loc = unquote(r_redirect.headers.get("Location", ""))
                    if loc:
                        if "videoId=" in loc:
                            detail_id = loc.split("videoId=")[-1].split("&")[0]
                        elif "/video/" in loc:
                            detail_id = loc.split("/video/")[-1].split("/")[0].split("?")[0]
                        else:
                            match = re.search(r'\d{17,21}', loc)
                            if match: detail_id = match.group(0)
                except Exception:
                    pass
            
            if not detail_id:
                raise Exception("Không thể bóc tách Detail ID từ đường link!")
                
            self.update_state(state='PROGRESS', meta={'progress': 50, 'status': f'Gọi API bóc nội dung (ID: {detail_id})...'})
            
            # 2. Lấy dữ liệu Metadata (không logo URL)
            for attempt in range(2):
                detail_api = f"{api_domain}/tiktok/detail" if is_tiktok else f"{api_domain}/douyin/detail"
                payload = {"detail_id": detail_id}
                if cookie: payload["cookie"] = cookie
                r = client.post(detail_api, json=payload)
                r_data = r.json()
                
                data_obj = r_data.get("data")
                if not data_obj:
                    if not is_tiktok and attempt == 0:
                        self.update_state(state='PROGRESS', meta={'progress': 60, 'status': 'Cookie Douyin hết hạn. Đang bật Browser lấy Cookie mới...'})
                        try:
                            from backend.services.playwright_bot import BrowserBot
                            bot = BrowserBot()
                            if bot.fetch_cookie() and os.path.exists(cookie_file):
                                with open(cookie_file, "r") as f:
                                    cookie = f.read().strip()
                                continue
                        except Exception as e:
                            print(f"BrowserBot Error: {e}")
                    raise Exception(f"TikTokDownloader lỗi: {r_data.get('message', 'Không có data')}")
                break
            
            # 3. Fallback dùng httpx Native Stream (vì DouK đã trả về link trực tiếp)
            self.update_state(state='PROGRESS', meta={'progress': 70, 'status': 'Tải tệp tin media...'})
            
            downloads_url = data_obj.get("downloads")
            if not downloads_url:
                raise Exception(f"DouK-Downloader không trả về link tải. Phản hồi: {r_data.get('message', '')}")
                
            if isinstance(downloads_url, list) and len(downloads_url) > 0:
                downloads_url = downloads_url[0] # Lấy link đầu tiên nếu là list
                
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.douyin.com/" if "douyin" in downloads_url else "https://www.tiktok.com/"
            }
            
            with client.stream("GET", downloads_url, headers=headers) as response:
                response.raise_for_status()
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_bytes(chunk_size=8192):
                        f.write(chunk)
                        
            if not os.path.exists(file_path) or os.path.getsize(file_path) < 1024:
                raise Exception("File tải về quá nhỏ hoặc không tồn tại (Lỗi get stream)")
                
    except Exception as e:
        self.update_state(state='ERROR_PROGRESS', meta={'progress': 0, 'status': f'Lỗi: {str(e)}'})
        raise e
        
    self.update_state(state='SUCCESS', meta={'progress': 100, 'status': 'Tải thành công!'})
    return {"message": "Success", "file_path": file_path, "video_id": detail_id or video_id}

@celery_app.task(bind=True, name="transform_video_task")
def transform_video_task(self, previous_result=None, transform_configs: dict = None, video_id: str = None):
    # Support both chained invocation and direct invocation
    if previous_result and isinstance(previous_result, dict) and "video_id" in previous_result:
        video_id = previous_result["video_id"]
        
    if not video_id:
        raise ValueError("Missing video_id for transform_video_task")
        
    transform_configs = transform_configs or {}
    
    from backend.services.transform import VideoTransformer
    self.update_state(state='PROGRESS', meta={'progress': 10, 'status': 'Khởi tạo Transform engine...'})
    input_file = os.path.join(settings.STORAGE_PATH, f"{video_id}.mp4")
    output_file = os.path.join(settings.STORAGE_PATH, f"{video_id}_transformed.mp4")
    self.update_state(state='PROGRESS', meta={'progress': 40, 'status': 'Đang áp dụng bộ lọc tùy chỉnh...'})
    
    transformer = VideoTransformer()
    try:
         transformer.apply_custom_transform(input_file, output_file, transform_configs)
    except Exception as e:
         print(f"Transform Error: {e}")
         self.update_state(state='ERROR_PROGRESS', meta={'progress': 0, 'status': f'Lỗi Transform: {str(e)}'})
         raise e
                 
    if transform_configs.get("md5_pad", False):
        self.update_state(state='PROGRESS', meta={'progress': 80, 'status': 'Ghi thêm MD5 Data bypass...'})
        transformer.apply_md5_pad(output_file)
    
    # Phase 9: Subtitle overlay (drawbox + new sub in one FFmpeg pass)
    has_subtitle = (transform_configs.get("new_subtitle_text") or 
                    transform_configs.get("srt_file_path") or
                    transform_configs.get("sub_mode"))
    if has_subtitle:
        self.update_state(state='PROGRESS', meta={'progress': 90, 'status': 'Đang xử lý phụ đề...'})
        sub_input = output_file
        sub_output = os.path.join(settings.STORAGE_PATH, f"{video_id}_subtitled.mp4")
        
        # Build subtitle configs
        sub_configs = {}
        sub_mode = transform_configs.get("sub_mode", "blackbox")
        sub_configs["sub_mode"] = sub_mode
        if sub_mode == "blackbox":
            sub_configs["sub_cover_x"] = transform_configs.get("sub_cover_x", 10)
            sub_configs["sub_cover_y"] = transform_configs.get("sub_cover_y", 80)
            sub_configs["sub_cover_w"] = transform_configs.get("sub_cover_w", 80)
            sub_configs["sub_cover_h"] = transform_configs.get("sub_cover_h", 20)
        else:
            sub_configs["sub_style"] = transform_configs.get("sub_style", "outline")

        if transform_configs.get("new_subtitle_text"):
            sub_configs["new_subtitle_text"] = transform_configs["new_subtitle_text"]
        if transform_configs.get("srt_file_path"):
            sub_configs["srt_file_path"] = transform_configs["srt_file_path"]
        sub_configs["sub_font_size"] = transform_configs.get("sub_font_size", 14)
        sub_configs["sub_margin_v"] = transform_configs.get("sub_margin_v", 20)

        
        success = transformer.apply_subtitle_overlay(sub_input, sub_output, sub_configs)
        if success and os.path.exists(sub_output):
            import shutil
            shutil.move(sub_output, output_file)

        
    self.update_state(state='SUCCESS', meta={'progress': 100, 'status': 'Chuỗi Encode Anti-scan hoàn tất'})
    return {"message": "Success", "transformed_file": output_file}

@celery_app.task(bind=True, name="voiceover_video_task")
def voiceover_video_task(self, video_id: str, script: str, voice: str = None, rate: str = "+0%"):
    from backend.services.voiceover import VoiceoverService
    from backend.services.transform import VideoTransformer
    
    self.update_state(state='PROGRESS', meta={'progress': 10, 'status': f'Đang sinh âm thanh Voiceover TTS (Giọng: {voice or "Mặc định"})...'})
    tts_service = VoiceoverService()
    audio_path = os.path.join(settings.STORAGE_PATH, f"{video_id}_tts.mp3")
    
    # Chạy edge-tts với voice và rate
    success = tts_service.generate_tts_sync(script, audio_path, voice=voice, rate=rate)
    if not success:
        raise Exception("Edge-TTS không thể sinh âm thanh!")
            
    self.update_state(state='PROGRESS', meta={'progress': 50, 'status': 'Đang Mux FFmpeg audio và video...'})
    
    input_video = os.path.join(settings.STORAGE_PATH, f"{video_id}.mp4")
    transformed_cand = os.path.join(settings.STORAGE_PATH, f"{video_id}_transformed.mp4")
    if os.path.exists(transformed_cand):
        input_video = transformed_cand
        
    output_video = os.path.join(settings.STORAGE_PATH, f"{video_id}_voiceover.mp4")
    transformer = VideoTransformer()
    
    try:
        transformer.apply_audio_mux(input_video, audio_path, output_video)
    except Exception as e:
        raise Exception(f"FFmpeg Mux lỗi: {str(e)}")
            
    self.update_state(state='SUCCESS', meta={'progress': 100, 'status': 'Lồng tiếng thành công'})
    return {"message": "Success", "output_file": output_video}
