# Phase 4: Web Admin Dashboard - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Interactive Discuss Phase

<domain>
## Phase Boundary
Thư mục `frontend/` chứa giao diện React quản trị các Job tải, transform và voiceover.
</domain>

<decisions>
## Implementation Decisions

### Framework
- **Quyết định**: Sử dụng `React (Vite) + TailwindCSS` làm công nghệ lõi vì tính ổn định và nhanh gọn.

### Deployment / Hosting Topology
- **Quyết định**: Chạy tách biệt: Frontend ở cổng 5173, Backend FastAPI ở cổng 8000. Backend sẽ được cấu hình mở CORS hoàn toàn cho các origin khác port.
</decisions>

<code_context>
## Existing Code Insights
- Backend FastAPI đã phơi bày khá nhiều API ở Phase 1, 2, 3 và mở cổng WebSocket. Giao diện có thể kết nối thẳng.
</code_context>

<specifics>
## Specific Ideas
- Có ô nhập link Tiktok, ô script lồng tiếng và Profile config.
- Trạng thái các job thể hiện thời gian thực (realtime) qua WebSocket.
</specifics>

<deferred>
## Deferred Ideas
- Triển khai Authentication Login/Jwt token cho admin dashboard (đẩy sang bản nâng cấp).
