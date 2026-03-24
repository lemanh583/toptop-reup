---
wave: 1
depends_on: []
files_modified:
  - backend/services/voiceover.py
  - backend/tasks.py
autonomous: true
---

# Plan 09-02: Voiceover Enhancement & Task Integration

<objective>
Nâng cấp VoiceoverService để hỗ trợ chọn giọng và tốc độ đọc. Tích hợp subtitle overlay vào pipeline tasks.py.
</objective>

<tasks>

<task>
<read_first>
- `backend/services/voiceover.py`
</read_first>
<action>
Modify `VoiceoverService.generate_tts_sync()` to accept additional parameters:
- `voice: str = "vi-VN-HoaiMyNeural"` — giọng đọc (edge-tts voice name)
- `rate: str = "+0%"` — tốc độ đọc (e.g. "+10%", "-10%")

Update the edge-tts CLI call to include `--rate` flag.

Add class method `list_voices()` that runs `edge-tts --list-voices` and returns a parsed list of available voices (name + language).
</action>
<acceptance_criteria>
- `generate_tts_sync` accepts `voice` and `rate` parameters.
- `list_voices()` returns a list of voice dicts.
</acceptance_criteria>
</task>

<task>
<read_first>
- `backend/tasks.py`
- `backend/services/transform.py`
</read_first>
<action>
Modify `transform_video_task` in `tasks.py`:
- After applying anti-scan filters (`apply_custom_transform`), check for subtitle configs:
  - `transform_configs.get("hide_old_sub")` → call `transformer.apply_subtitle_overlay()`
  - `transform_configs.get("new_subtitle_text")` or `transform_configs.get("srt_file_path")` → same method
- Subtitle overlay runs on the already-transformed output file (in-place pipeline).

Modify `voiceover_video_task`:
- Accept `voice` and `rate` parameters.
- Pass them through to `VoiceoverService.generate_tts_sync()`.
</action>
<acceptance_criteria>
- `transform_video_task` handles subtitle configs seamlessly.
- `voiceover_video_task` passes voice/rate to TTS engine.
</acceptance_criteria>
</task>

</tasks>
