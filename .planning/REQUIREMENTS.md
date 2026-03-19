# Requirements: Auto-Reup TikTok Tool

**Defined:** 2026-03-19
**Core Value:** Tối ưu hóa thời gian tải và lách bản quyền video TikTok quy mô lớn thông qua tự động hóa.

## v1 Requirements

### Download Subsystem
- [ ] **DL-01**: Tải một/nhiều video TikTok lẻ không logo từ URL (Dùng TiktokDownloader).
- [ ] **DL-02**: Tải hàng loạt video thuộc 1 User Profile/Hashtag.

### Transformation (Chống thuật toán quét mẫu)
- [ ] **TRANS-01**: Tự động sinh thay đổi MD5 & sửa thông tin Metadata gốc.
- [ ] **TRANS-02**: Biến đổi hình ảnh cơ bản (Lật Flip dọc/ngang ngẫu nhiên, đổi nhẹ tốc độ).
- [ ] **TRANS-03**: Biến đổi hình ảnh nâng cao để lách AI quét (Thêm nhiễu noise/grain ảo, thay đổi bộ lọc màu sắc, thêm background bo viền nếu cần).

### AI Voiceover
- [ ] **AUD-01**: Giao diện tiếp nhận kịch bản Text (Review) của User.
- [ ] **AUD-02**: Sinh âm thanh đọc TTS (Text To Speech) từ script.
- [ ] **AUD-03**: Mix âm thanh mới gán đè vào Video đã Transform, tự động mute tiếng gốc.

### Web Admin
- [ ] **UI-01**: Giao diện đăng nhập cơ bản và thêm tác vụ (Submit Task).
- [ ] **UI-02**: Trang hiển thị danh sách các Video, kèm trạng thái hàng đợi (Pending -> Processing -> Done -> Failed).
- [ ] **UI-03**: Nút xem trực tiếp hoặc Download kết quả hoàn chỉnh bằng 1 click.

## Out of Scope
| Feature | Reason |
|---------|--------|
| Auto-post tự động lên kênh | Việc dùng API lậu up video gây nguy hiểm và dễ bị shadowban Tiktok, loại hoàn toàn khỏi v1. |

## Traceability
| Requirement | Phase | Status |
|-------------|-------|--------|
| DL-01 | Phase 1 | Pending |
| DL-02 | Phase 1 | Pending |
| TRANS-01 | Phase 2 | Pending |
| TRANS-02 | Phase 2 | Pending |
| TRANS-03 | Phase 2 | Pending |
| AUD-01 | Phase 3 | Pending |
| AUD-02 | Phase 3 | Pending |
| AUD-03 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
