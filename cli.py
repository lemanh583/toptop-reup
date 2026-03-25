#!/usr/bin/env python3
"""
Auto-Reup TikTok/Douyin — Terminal CLI
Giao diện dòng lệnh thay thế React frontend.
Giao tiếp với FastAPI backend qua HTTP API.

Usage:
    python cli.py
    python cli.py --api http://192.168.1.100:8000
"""

import sys
import os
import time
import json
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import requests
except ImportError:
    print("Cần cài requests: pip install requests")
    sys.exit(1)

API_BASE = "http://127.0.0.1:8000/api"

# ═══════════════════════════════════════════
# Utilities
# ═══════════════════════════════════════════

def clear():
    os.system('clear' if os.name != 'nt' else 'cls')

def header():
    print("\033[1;36m" + "═" * 60)
    print("   🎬  Auto-Reup TikTok/Douyin — Terminal CLI")
    print("═" * 60 + "\033[0m")
    print()

def success(msg):
    print(f"\033[1;32m✔ {msg}\033[0m")

def error(msg):
    print(f"\033[1;31m✘ {msg}\033[0m")

def info(msg):
    print(f"\033[1;33m→ {msg}\033[0m")

def progress_bar(percent, width=40):
    filled = int(width * percent / 100)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {percent}%"

def ask_yn(prompt, default=False):
    suffix = " [Y/n]: " if default else " [y/N]: "
    ans = input(prompt + suffix).strip().lower()
    if not ans:
        return default
    return ans in ('y', 'yes', 'có', 'co')

# ═══════════════════════════════════════════
# API Calls
# ═══════════════════════════════════════════

def api_post(endpoint, data):
    try:
        r = requests.post(f"{API_BASE}{endpoint}", json=data, timeout=30)
        return r.json()
    except requests.ConnectionError:
        error(f"Không thể kết nối đến server {API_BASE}")
        error("Hãy chắc chắn FastAPI đang chạy: uvicorn backend.main:app --port 8000")
        return None
    except Exception as e:
        error(f"Lỗi API: {e}")
        return None

def api_get(endpoint):
    try:
        r = requests.get(f"{API_BASE}{endpoint}", timeout=10)
        return r.json()
    except Exception as e:
        error(f"Lỗi API: {e}")
        return None

def poll_task(task_id, label=""):
    """Poll task status until completion."""
    print()
    while True:
        try:
            r = requests.get(f"{API_BASE}/download/status/{task_id}", timeout=5)
            data = r.json()
        except Exception:
            # Fallback: check via Celery result directly
            try:
                from celery.result import AsyncResult
                from backend.worker import celery_app
                res = AsyncResult(task_id, app=celery_app)
                data = {
                    "state": res.state,
                    "meta": res.info if isinstance(res.info, dict) else {"status": str(res.info)}
                }
            except Exception:
                time.sleep(2)
                continue

        state = data.get("state", "UNKNOWN")
        meta = data.get("meta", {})
        pct = meta.get("progress", 0)
        status = meta.get("status", "")

        # Print progress
        sys.stdout.write(f"\r  {label} {progress_bar(pct)} {status}   ")
        sys.stdout.flush()

        if state in ("SUCCESS", "FAILURE"):
            print()
            if state == "SUCCESS":
                success(f"{label} hoàn tất!")
            else:
                error(f"{label} thất bại: {status}")
            return state == "SUCCESS"

        time.sleep(2)

# ═══════════════════════════════════════════
# Feature: Download
# ═══════════════════════════════════════════

def prompt_anti_scan_config():
    """Prompt user for anti-scan filter configuration."""
    print("\n\033[1;35m── Cấu hình Anti-Scan ──\033[0m")
    
    use_all = ask_yn("  Bật TẤT CẢ 7 bộ lọc (auto)?", default=True)
    if use_all:
        return {
            "hflip": True, "speed_shift": True, "md5_pad": True,
            "dynamic_noise": True, "color_shift": True,
            "edge_crop": True, "unsharp_mask": True
        }
    
    configs = {}
    filters = [
        ("hflip",         "Lật ngang (H-Flip)"),
        ("speed_shift",   "Đổi tốc độ ±5%"),
        ("md5_pad",       "Chèn 24 bytes đổi MD5"),
        ("dynamic_noise", "Phủ nhiễu động 1%"),
        ("color_shift",   "Đổi hệ màu (sáng/tương phản)"),
        ("edge_crop",     "Cắt viền 2%"),
        ("unsharp_mask",  "Làm sắc cạnh")
    ]
    for key, label in filters:
        configs[key] = ask_yn(f"  {label}?")
    
    return configs

def prompt_subtitle_config():
    """Prompt user for subtitle configuration."""
    print("\n\033[1;35m── Cấu hình Phụ đề ──\033[0m")
    
    configs = {}
    configs["hide_old_sub"] = ask_yn("  Che sub cũ (phủ đen 15% dưới cùng)?")
    
    sub_text = input("  Nhập phụ đề mới (Enter để bỏ qua): ").strip()
    if sub_text:
        configs["new_subtitle_text"] = sub_text
    else:
        srt_path = input("  Đường dẫn file .SRT (Enter để bỏ qua): ").strip()
        if srt_path and os.path.exists(srt_path):
            configs["srt_file_path"] = os.path.abspath(srt_path)
        elif srt_path:
            error(f"File không tồn tại: {srt_path}")
    
    return configs

def cmd_download(with_transform=False, with_subtitle=False):
    """Download video from URL."""
    print("\n\033[1;35m── Tải Video ──\033[0m")
    url = input("  URL TikTok/Douyin: ").strip()
    if not url:
        return error("Cần nhập URL!")
    
    cookie = input("  Cookie (Enter = tự động lấy từ file): ").strip() or None
    
    transform_configs = {}
    
    if with_transform:
        transform_configs = prompt_anti_scan_config()
    
    if with_subtitle:
        sub_configs = prompt_subtitle_config()
        transform_configs.update(sub_configs)
    
    auto_transform = with_transform or with_subtitle
    
    payload = {
        "url": url,
        "cookie": cookie,
        "auto_transform": auto_transform,
        "transform_configs": transform_configs
    }
    
    info("Đang gửi job vào hàng đợi...")
    result = api_post("/download", payload)
    
    if not result:
        return
    
    tasks = result.get("tasks", [])
    if not tasks and result.get("task_id"):
        tasks = [{"id": result["task_id"], "name": "Download"}]
    
    success(result.get("message", "Job đã được tạo"))
    print()
    
    # Poll each task
    for t in tasks:
        poll_task(t["id"], t.get("name", t.get("type", "Task")))

# ═══════════════════════════════════════════
# Feature: Voiceover
# ═══════════════════════════════════════════

def cmd_voiceover():
    """Lồng tiếng cho video đã tải."""
    print("\n\033[1;35m── Lồng Tiếng AI ──\033[0m")
    video_id = input("  Video ID (tên file không có .mp4): ").strip()
    if not video_id:
        return error("Cần nhập Video ID!")
    
    script = input("  Script lồng tiếng: ").strip()
    if not script:
        return error("Cần nhập script!")
    
    # Voice selection
    voice = None
    rate = "+0%"
    
    use_custom = ask_yn("  Chọn giọng đọc tùy chỉnh?")
    if use_custom:
        # Fetch voices
        info("Đang lấy danh sách giọng đọc...")
        voices_data = api_get("/voiceover/voices")
        voices = voices_data.get("voices", []) if voices_data else []
        
        if voices:
            print("  Giọng đọc có sẵn:")
            # Show Vietnamese voices first
            vi_voices = [v for v in voices if "vi-VN" in v]
            other_voices = [v for v in voices if "vi-VN" not in v]
            shown = vi_voices[:5] + other_voices[:10]
            
            for i, v in enumerate(shown, 1):
                marker = " ★" if "vi-VN" in v else ""
                print(f"    {i}. {v}{marker}")
            
            choice = input(f"  Chọn số (1-{len(shown)}) hoặc nhập tên giọng: ").strip()
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(shown):
                    voice = shown[idx]
            except ValueError:
                if choice:
                    voice = choice
        
        rate_input = input("  Tốc độ đọc (-30 đến +30, Enter=0): ").strip()
        if rate_input:
            try:
                rate_val = int(rate_input)
                rate = f"{'+' if rate_val >= 0 else ''}{rate_val}%"
            except ValueError:
                pass
    
    if voice:
        info(f"Giọng: {voice} | Tốc độ: {rate}")
    
    payload = {
        "video_id": video_id,
        "script": script,
        "voice": voice,
        "rate": rate
    }
    
    info("Đang gửi job lồng tiếng...")
    result = api_post("/voiceover", payload)
    if result:
        success(result.get("message", "Voiceover Job Queued"))
        if result.get("task_id"):
            poll_task(result["task_id"], "Lồng tiếng")

# ═══════════════════════════════════════════
# Feature: Transform standalone
# ═══════════════════════════════════════════

def cmd_transform():
    """Anti-scan cho video đã tải."""
    print("\n\033[1;35m── Anti-Scan Video ──\033[0m")
    video_id = input("  Video ID (tên file không có .mp4): ").strip()
    if not video_id:
        return error("Cần nhập Video ID!")
    
    transform_configs = prompt_anti_scan_config()
    
    # Also ask about subtitles
    add_sub = ask_yn("  Thêm phụ đề?")
    if add_sub:
        sub_configs = prompt_subtitle_config()
        transform_configs.update(sub_configs)
    
    payload = {
        "video_id": video_id,
        "transform_configs": transform_configs
    }
    
    info("Đang gửi job Anti-scan...")
    result = api_post("/transform", payload)
    if result:
        success(result.get("message", "Transform Job Queued"))
        if result.get("task_id"):
            poll_task(result["task_id"], "Anti-scan")

# ═══════════════════════════════════════════
# Feature: List voices
# ═══════════════════════════════════════════

def cmd_voices():
    """Liệt kê giọng đọc edge-tts."""
    info("Đang lấy danh sách giọng đọc...")
    data = api_get("/voiceover/voices")
    if not data:
        return
    
    voices = data.get("voices", [])
    if not voices:
        return error("Không tìm thấy giọng đọc nào!")
    
    vi_voices = [v for v in voices if "vi-VN" in v]
    en_voices = [v for v in voices if "en-" in v]
    other = [v for v in voices if "vi-VN" not in v and "en-" not in v]
    
    print(f"\n  Tổng cộng: {len(voices)} giọng")
    
    if vi_voices:
        print("\n  \033[1;32m🇻🇳 Tiếng Việt:\033[0m")
        for v in vi_voices:
            print(f"    ★ {v}")
    
    if en_voices:
        print(f"\n  \033[1;34m🇺🇸 English ({len(en_voices)} giọng):\033[0m")
        for v in en_voices[:10]:
            print(f"    • {v}")
        if len(en_voices) > 10:
            print(f"    ... và {len(en_voices)-10} giọng khác")
    
    if other:
        print(f"\n  🌐 Ngôn ngữ khác: {len(other)} giọng")

# ═══════════════════════════════════════════
# Feature: List storage files
# ═══════════════════════════════════════════

def cmd_list_files():
    """Liệt kê video trong storage."""
    storage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
    if not os.path.exists(storage):
        return error("Thư mục storage/ không tồn tại!")
    
    files = sorted([f for f in os.listdir(storage) if f.endswith('.mp4')])
    if not files:
        return info("Chưa có video nào trong storage/")
    
    print(f"\n  📁 storage/ ({len(files)} video):")
    for f in files:
        size_mb = os.path.getsize(os.path.join(storage, f)) / (1024*1024)
        # Extract video_id
        vid = f.replace('.mp4', '').replace('_transformed', '').replace('_voiceover', '').replace('_test', '')
        suffix = ""
        if "_transformed" in f:
            suffix = " \033[33m[anti-scan]\033[0m"
        elif "_voiceover" in f:
            suffix = " \033[35m[voiceover]\033[0m"
        elif "_test" in f:
            suffix = " \033[36m[test]\033[0m"
        else:
            suffix = " \033[32m[gốc]\033[0m"
        
        print(f"    {f} ({size_mb:.1f} MB){suffix}")

# ═══════════════════════════════════════════
# Batch mode
# ═══════════════════════════════════════════

def cmd_batch():
    """Xử lý hàng loạt từ file danh sách URL."""
    print("\n\033[1;35m── Batch Download ──\033[0m")
    file_path = input("  Đường dẫn file chứa danh sách URL (mỗi dòng 1 URL): ").strip()
    if not file_path or not os.path.exists(file_path):
        return error("File không tồn tại!")
    
    with open(file_path, 'r') as f:
        urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    
    if not urls:
        return error("File rỗng!")
    
    info(f"Tìm thấy {len(urls)} URL")
    
    cookie = input("  Cookie (Enter = tự động): ").strip() or None
    with_transform = ask_yn("  Bật Anti-scan cho tất cả?", default=True)
    
    transform_configs = {}
    if with_transform:
        transform_configs = prompt_anti_scan_config()
    
    # Submit all jobs
    all_tasks = []
    for i, url in enumerate(urls, 1):
        info(f"[{i}/{len(urls)}] Gửi: {url[:60]}...")
        result = api_post("/download", {
            "url": url,
            "cookie": cookie,
            "auto_transform": with_transform,
            "transform_configs": transform_configs
        })
        if result and result.get("tasks"):
            for t in result["tasks"]:
                all_tasks.append(t)
        time.sleep(0.5)  # Rate limit
    
    success(f"Đã gửi {len(urls)} jobs, tổng {len(all_tasks)} tasks")
    
    # Poll all tasks
    if ask_yn("  Theo dõi tiến trình?", default=True):
        for t in all_tasks:
            poll_task(t["id"], t.get("name", "Task"))

# ═══════════════════════════════════════════
# Main Menu
# ═══════════════════════════════════════════

def main_menu():
    parser = argparse.ArgumentParser(description="Auto-Reup TikTok/Douyin CLI")
    parser.add_argument("--api", default="http://127.0.0.1:8000", help="API server URL")
    args = parser.parse_args()
    
    global API_BASE
    API_BASE = f"{args.api}/api"
    
    while True:
        clear()
        header()
        
        print("  \033[1m1\033[0m │ 📥 Tải video (chỉ download)")
        print("  \033[1m2\033[0m │ 🛡️  Tải + Anti-Scan (download + 7 bộ lọc)")
        print("  \033[1m3\033[0m │ 📝 Tải + Anti-Scan + Phụ đề")
        print("  \033[1m4\033[0m │ 🎙️  Lồng tiếng AI (Voiceover)")
        print("  \033[1m5\033[0m │ 🔧 Anti-Scan riêng (video đã tải)")
        print("  \033[1m6\033[0m │ 🗣️  Liệt kê giọng đọc")
        print("  \033[1m7\033[0m │ 📁 Xem video trong storage")
        print("  \033[1m8\033[0m │ 📋 Batch download (từ file)")
        print("  \033[1m0\033[0m │ 🚪 Thoát")
        print()
        
        choice = input("  ▸ Chọn: ").strip()
        
        if choice == '1':
            cmd_download(with_transform=False)
        elif choice == '2':
            cmd_download(with_transform=True)
        elif choice == '3':
            cmd_download(with_transform=True, with_subtitle=True)
        elif choice == '4':
            cmd_voiceover()
        elif choice == '5':
            cmd_transform()
        elif choice == '6':
            cmd_voices()
        elif choice == '7':
            cmd_list_files()
        elif choice == '8':
            cmd_batch()
        elif choice == '0':
            print("\n  👋 Bye!")
            sys.exit(0)
        else:
            error("Lựa chọn không hợp lệ!")
        
        print()
        input("  Nhấn Enter để tiếp tục...")

if __name__ == "__main__":
    main_menu()
