# Phase 3: AI Voiceover Integration - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Interactive Discuss Phase

<domain>
## Phase Boundary
Sinh âm thanh từ Text và ghép vào video, chuyên cho việc Review phim tự động.
</domain>

<decisions>
## Implementation Decisions

### Công nghệ Text-to-Speech (TTS Engine)
- **Quyết định**: Dùng `edge-tts` (Thư viện Python miễn phí lấy giọng của Microsoft/Edge, có giọng Tiếng Việt tự nhiên miễn phí 100%).

### Chiến lược Ghép âm & Tiếng gốc (Audio Muxing)
- **Quyết định**: Giữ lại âm thanh gốc làm nhạc nền (chỉnh Volume gốc xuống còn 10%-20%), giọng AI chèn lên làm âm chính (100%).

### Cơ chế căn thời gian lồng tiếng (Scripting Flow)
- **Quyết định**: Dạng Auto-loop: Truyền Text ngắn 1 đoạn, đọc xong thì lặp lại đoạn mp3 ghi âm (aloop) hoặc stretch/giãn tốc độ để khớp 100% độ dài video. Quyết định dùng loop (ffmpeg `aloop`) cho gọn.

### Claude's Discretion
- Cấu trúc tích hợp luồng Ffmpeg.
- Job queue tracking.
</decisions>

<code_context>
## Existing Code Insights
- Phase 1 & 2 đã cung cấp sẵn FastAPI, WebSocket theo dõi tiến độ Job id, FFmpeg service và Queue redis.
</code_context>

<specifics>
## Specific Ideas
- N/A
</specifics>

<deferred>
## Deferred Ideas
- N/A
</deferred>
