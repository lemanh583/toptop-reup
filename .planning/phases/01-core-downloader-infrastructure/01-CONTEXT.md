# Phase 1: Core Downloader & Infrastructure - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Interactive Discuss Phase

<domain>
## Phase Boundary
Xây dựng backend tải video dùng TikTokDownloader và cơ sở dữ liệu hàng đợi.
</domain>

<decisions>
## Implementation Decisions

### Hành vi kết trả của API
- **Quyết định**: Sử dụng WebSocket / Server-Sent Events (SSE) để báo trạng thái tải (Server-Push) trực tiếp xuống Client.

### Chiến lược Tải & Metadata
- **Quyết định**: Bỏ luôn watermark, không lấy logo gắn lên video. Chỉ tập trung lấy bản video sạch (no-watermark).

### Hoạch định lưu trữ
- **Quyết định**: Gom tất cả các file tải về vào chung 1 thư mục `storage/`.

### Claude's Discretion
- Cấu trúc thư mục FastAPI.
- Logic khởi tạo worker Celery kết nối Redis broker.
- Cơ chế khởi động queue.
</decisions>

<code_context>
## Existing Code Insights
- Dự án xanh (Greenfield), chưa có sẵn FastAPI server hay Celery queue.
</code_context>

<specifics>
## Specific Ideas
- N/A
</specifics>

<deferred>
## Deferred Ideas
- N/A
</deferred>
