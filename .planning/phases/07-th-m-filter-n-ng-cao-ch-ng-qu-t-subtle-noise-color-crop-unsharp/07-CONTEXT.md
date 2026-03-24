# Phase 7 Context

## Objective
The user wants to implement 4 advanced FFmpeg visual filters to make the videos harder for AI scanners (like TikTok/Douyin's framework) to detect, without making them unwatchable for human eyes.
The chosen filters are:
1. Dynamic Micro-Noise (1% strength)
2. Micro Color Grading (Brightness, Contrast, Saturation)
3. Smart Edge Cropping (Crop 2% of the edges)
4. Unsharp Mask (Sharpen edges)

## Existing Infrastructure
Phase 6 laid down the foundational boilerplate logic:
- The UI currently triggers API calls pushing an arbitrary `transform_configs: dict` payload to the backend.
- The `apply_custom_transform` method in `backend/services/transform.py` uses `ffmpeg-python` to apply filters conditionally (e.g. `configs.get("hflip", False)`).

## Decisions
- Expand `transform_configs` with 4 new boolean keys corresponding to the 4 advanced visual filters.
- Inject these filters into the current `ffmpeg-python` compilation sequence.
- Add these toggles onto the `App.jsx` React component under the Anti-Scan Configuration block.
- Leave the pre-existing options (H-flip, Speed shift, MD5 padding) active so they can all be combined simultaneously.
