# Phase 2: Video Transformation Engine - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Auto Discuss Phase

<domain>
## Phase Boundary
Tích hợp FFmpeg để áp dụng các bộ lọc chống quét (Anti-scan) vào video đã tải.
</domain>

<decisions>
## Implementation Decisions

### FFmpeg Integration
- **Quyết định**: Sử dụng thư viện `ffmpeg-python` để dễ dàng binding lệnh FFmpeg CLI từ Python code.

### Transformation Strategy
- **Quyết định**: Video có đầu vào là `.mp4` ở thư mục storage, sau khi biến đổi sẽ chèn kèm hậu tố `_transformed` vào cuối tên (VD: `video_transformed.mp4`). Tính năng thay đổi MD5 (thêm dummy byte) sẽ được làm mặc định.

### API Behaviour
- **Quyết định**: Tương tự Phase 1, `POST /api/transform` trả về Job ID qua Celery và dùng chung WebSocket channel `/ws/status` đã có để Frontend theo dõi tiến trình render FFmpeg.
</decisions>

<code_context>
## Existing Code Insights
- Phase 1 đã thiết lập sẵn Celery workers (`backend.tasks`) và cấu trúc FastAPI configs.
</code_context>

<specifics>
## Specific Ideas
- N/A
</specifics>

<deferred>
## Deferred Ideas
- N/A
</deferred>
