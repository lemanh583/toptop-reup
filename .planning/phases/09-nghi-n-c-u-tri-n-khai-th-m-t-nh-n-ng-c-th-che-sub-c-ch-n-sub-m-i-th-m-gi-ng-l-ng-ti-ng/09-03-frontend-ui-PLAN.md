---
wave: 2
depends_on: [09-01, 09-02]
files_modified:
  - frontend/src/App.jsx
  - backend/api/routes/download.py
  - backend/api/routes/voiceover.py
autonomous: true
---

# Plan 09-03: Frontend UI — Subtitle & Voiceover Controls

<objective>
Thêm các toggle/control mới lên giao diện React cho tính năng che sub, chèn sub mới, chọn giọng/tốc độ lồng tiếng.
</objective>

<tasks>

<task>
<read_first>
- `backend/api/routes/download.py`
</read_first>
<action>
Update `DownloadRequest` model in `download.py` to accept new fields in `transform_configs`:
- `hide_old_sub: bool`
- `new_subtitle_text: str` (optional)
- `srt_file_path: str` (optional — for uploaded SRT)

Create a new API endpoint `GET /api/voiceover/voices` that calls `VoiceoverService.list_voices()` and returns the list.

Update voiceover endpoint to accept `voice` and `rate` params.
</action>
<acceptance_criteria>
- API accepts subtitle configs in transform_configs dict.
- `/api/voiceover/voices` returns available TTS voices.
</acceptance_criteria>
</task>

<task>
<read_first>
- `frontend/src/App.jsx`
</read_first>
<action>
Add a new collapsible section **"Subtitle & Phụ đề"** below the Anti-Scan config block:

1. **Checkbox "Che Sub cũ"** → maps to `transform_configs.hide_old_sub`
2. **Textarea "Phụ đề mới (Text)"** → maps to `transform_configs.new_subtitle_text`
3. **File upload "Hoặc upload file .SRT"** → uploads to backend, maps to `transform_configs.srt_file_path`

Expand the **Voiceover section**:
1. **Dropdown "Giọng đọc"** → fetches from `/api/voiceover/voices`, maps to `voice` param
2. **Range slider "Tốc độ đọc"** → maps to `rate` param (e.g. -20% to +20%)
3. Keep existing script textarea.

All new fields are independent toggles (per decision 4B).
</action>
<acceptance_criteria>
- New UI section renders correctly with checkboxes, textarea, file upload, dropdown, and slider.
- Payload includes subtitle/voiceover params when submitting.
- Each feature is independently toggleable.
</acceptance_criteria>
</task>

</tasks>
