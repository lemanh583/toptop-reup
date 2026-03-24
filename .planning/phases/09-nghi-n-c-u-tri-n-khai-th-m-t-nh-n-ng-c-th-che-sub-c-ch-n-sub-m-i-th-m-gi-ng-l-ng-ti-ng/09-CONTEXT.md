# Phase 9: Che sub cũ, chèn sub mới, thêm giọng lồng tiếng - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Interactive Discuss Phase

<domain>
## Phase Boundary
Mở rộng pipeline xử lý video với 3 tính năng mới: (1) che/xóa subtitle cũ, (2) chèn subtitle mới, (3) cải thiện UX lồng tiếng. Mỗi tính năng là toggle độc lập trên giao diện.
</domain>

<decisions>
## Implementation Decisions

### 1. Chiến lược che Sub cũ (Old Subtitle Removal)
- **Quyết định (1A)**: Phủ một dải blur/màu đen lên vùng sub cũ (vùng cố định phía dưới cùng video).
- **Kỹ thuật**: Dùng FFmpeg `drawbox` hoặc `crop+overlay` để che vùng cố định (ví dụ: ~15% chiều cao dưới cùng).
- **Trade-off**: Đơn giản, nhanh, phù hợp hardware yếu (ThinkCentre M93). Chấp nhận lộ vết che.

### 2. Định dạng Sub mới (New Subtitle Format)
- **Quyết định (2C)**: Hỗ trợ cả hai:
  - **Mặc định**: Nhập text thuần → hệ thống tự chia đều theo thời gian video (auto-split).
  - **Nâng cao**: Upload file `.srt` nếu muốn timestamp chính xác.
- **Kỹ thuật**: FFmpeg `drawtext` (cho text thuần) hoặc `subtitles` filter (cho file SRT).

### 3. Giọng lồng tiếng (Voiceover Enhancement)
- **Quyết định (3A)**: Giữ nguyên engine `edge-tts` (miễn phí), chỉ cải thiện UI:
  - Dropdown chọn giọng (vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural, en-US, ...)
  - Slider điều chỉnh tốc độ đọc
  - Nút preview nghe thử trước khi apply
- **Không cần** API key hay dịch vụ trả phí.

### 4. Workflow tích hợp (Integration Flow)
- **Quyết định (4B)**: Tách riêng từng bước — mỗi tính năng (che sub, chèn sub mới, lồng tiếng, anti-scan) là toggle checkbox/switch độc lập trên giao diện. User chỉ bật cái nào muốn dùng.

### Claude's Discretion
- Kiến trúc font chữ subtitle (chọn font bundled miễn phí, ví dụ Noto Sans).
- Kích thước & vị trí chính xác vùng che sub.
- Logic auto-split text thành từng dòng theo thời gian.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/services/transform.py` — `VideoTransformer.apply_custom_transform()` đã có chuỗi filter chain, dễ mở rộng thêm `drawbox`/`drawtext`/`subtitles`.
- `backend/services/voiceover.py` — `VoiceoverService.generate_tts_sync()` dùng edge-tts CLI, cần thêm param `voice` và `rate`.
- `backend/services/transform.py` — `apply_audio_mux()` đã xử lý trộn audio gốc + TTS.
- `frontend/src/App.jsx` — Giao diện Anti-scan toggles đã có pattern checkbox, dễ mở rộng thêm section Sub/Voiceover.
</code_context>

<specifics>
## Specific Ideas
- Vùng che sub: `drawbox=x=0:y=ih*0.85:w=iw:h=ih*0.15:color=black:t=fill` (che 15% dưới cùng).
- Auto-split text: chia text thành N đoạn bằng nhau, mỗi đoạn hiện trên màn hình `duration/N` giây.
</specifics>

<deferred>
## Deferred Ideas
- AI OCR để detect vùng sub chính xác (nặng CPU, xem xét v2).
- Hỗ trợ multi-language subtitle cùng lúc.
- Auto-translate subtitle sang ngôn ngữ khác.
</deferred>
