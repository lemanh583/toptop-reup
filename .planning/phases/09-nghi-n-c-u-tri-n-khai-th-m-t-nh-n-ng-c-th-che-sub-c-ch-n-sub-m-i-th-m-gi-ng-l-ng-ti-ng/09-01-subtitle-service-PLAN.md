---
wave: 1
depends_on: []
files_modified:
  - backend/services/transform.py
autonomous: true
---

# Plan 09-01: Subtitle Services (Che sub cũ + Chèn sub mới)

<objective>
Mở rộng `VideoTransformer` để hỗ trợ (1) che sub cũ bằng drawbox đen, (2) chèn subtitle mới từ text thuần (auto-split) hoặc file SRT.
</objective>

<tasks>

<task>
<read_first>
- `backend/services/transform.py`
</read_first>
<action>
Add method `apply_subtitle_overlay(input_path, output_path, configs)` to `VideoTransformer`.

**Che sub cũ (`configs.get("hide_old_sub", False)`):**
- Use FFmpeg `drawbox` filter: `drawbox=x=0:y=ih*0.85:w=iw:h=ih*0.15:color=black:t=fill`
- This blacks out the bottom 15% of the video frame.

**Chèn sub mới — Text thuần (`configs.get("new_subtitle_text")`):**
- Auto-split the input text into sentences (by `.` or `\n`).
- Generate a temporary `.srt` file in `/tmp/` with evenly distributed timestamps (total_duration / N segments).
- Use FFmpeg `subtitles` filter to burn the SRT into the video.
- Use a bundled font (Noto Sans CJK or system default) with `force_style='FontSize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2'`.

**Chèn sub mới — File SRT (`configs.get("srt_file_path")`):**
- Directly use FFmpeg `subtitles` filter with the provided SRT path.
- Same styling as above.

The method should be chainable with existing `apply_custom_transform` — the caller in `tasks.py` will invoke them sequentially.
</action>
<acceptance_criteria>
- `apply_subtitle_overlay` method exists with `hide_old_sub`, `new_subtitle_text`, and `srt_file_path` support.
- Auto-split logic correctly generates a valid `.srt` file.
- FFmpeg `drawbox` and `subtitles` filters are correctly applied.
</acceptance_criteria>
</task>

</tasks>
