---
wave: 1
depends_on: []
files_modified:
  - backend/api/routes/download.py
  - backend/tasks.py
  - backend/services/transform.py
  - frontend/src/App.jsx
autonomous: true
---

# Phase 6: Thêm quy trình đánh lừa lên giao diện & tự lưu 2 bản

## Objective
Implement UI controls for Anti-scan parameters and rewrite the backend to return chained task IDs for separated job tracking. 

## Context Assumed
Based on `06-CONTEXT.md` decisions:
- UI Config below input (1B)
- Jobs Tracking splitted into 2 independent lines (2B)
- Auto preset available, defaults to OFF (3B)

## Tasks

```xml
<task>
  <action>
    Update backend/api/routes/download.py to support transform configs and chained tasks.
    Add `transform_configs: dict = {}` and `auto_transform: bool = False` to `DownloadRequest`.
    In `trigger_download`, if `download_request.auto_transform` is true, use Celery's `chain` to queue `download_tiktok_video` then `transform_video_task`.
    Return a list of tasks in the response: `{"tasks": [{"id": ..., "name": "Download", "type": "download"}, {"id": ..., "name": "Transform", "type": "transform"}]}`. If no auto_transform, return 1 task.
  </action>
  <read_first>
    - backend/api/routes/download.py
    - backend/tasks.py
  </read_first>
  <acceptance_criteria>
    - `DownloadRequest` model validates `auto_transform`.
    - API returns `tasks` array instead of single `task_id` when triggered.
    - Celery task chaining (`chain(a.s(), b.s())`) is structurally valid.
  </acceptance_criteria>
</task>

<task>
  <action>
    Modify `transform_video_task` in `backend/tasks.py` to accept the chained input.
    When chained, `download_tiktok_video` returns a dict `{"file_path": ..., "video_id": ...}`.
    `transform_video_task` should take `(previous_result: dict, transform_configs: dict)` as arguments.
    Extract the input file from `previous_result['file_path']`. Run the transform via `VideoTransformer`.
    If configs say `hflip: true`, etc., apply them. Update status tracking to `SUCCESS` upon completion.
  </action>
  <read_first>
    - backend/tasks.py
    - backend/services/transform.py
  </read_first>
  <acceptance_criteria>
    - `transform_video_task` extracts `file_path` from its first argument.
    - Status updates correctly trace the encoding progress.
  </acceptance_criteria>
</task>

<task>
  <action>
    Update frontend/src/App.jsx with the new UI and handle multiple job tracking.
    1. Add state `transformConfigs` (hflip, speed, md5_pad) and `autoTransform` boolean.
    2. Add Checkboxes under the URL input area for these options.
    3. Update `handleDownload` to send `auto_transform` and `transform_configs` to `/api/download`.
    4. Refactor the `jobs` state to be an array of jobs (since API now returns a list of tasks). Map through the `res.data.tasks` and push ALL tasks to the UI.
    5. The websocket tracking should dynamically track multiple `job.id` concurrently (or polling).
  </action>
  <read_first>
    - frontend/src/App.jsx
  </read_first>
  <acceptance_criteria>
    - UI renders "Auto Transform" checkbox and individual parameter toggles.
    - `App.jsx` can render multiple job cards at the same time if `auto_transform` is enabled.
    - Both tasks reach `SUCCESS` independently on the UI.
  </acceptance_criteria>
</task>
```

## Verification
- Run local frontend server and FastAPI backend.
- Provide a test Douyin URL. Check "Auto Transform".
- Observe 2 job cards spawning in the UI (Download & Transform).
- Ensure "Original" file is playable, and "Transformed" file has modifications applied and is also playable.
