---
wave: 1
depends_on: []
files_modified:
  - backend/services/transform.py
  - frontend/src/App.jsx
autonomous: true
---

# Phase 7: Advanced Anti-Scan FFmpeg Filters

## Objective
Implement advanced visual filters in FFmpeg that circumvent frame-hashing and color-matching algorithm scanners without ruining the video's aesthetic quality. Integrate these filters into the Web Admin UI.

## Context Assumed
Based on `07-CONTEXT.md`:
- Dynamic Micro-Noise (`noise=alls=1:allf=t+u`)
- Micro Color Grading (`eq=brightness=0.03:contrast=1.02:saturation=1.05`)
- Smart Edge Cropping (`crop=iw*0.98:ih*0.98`)
- Unsharp Mask (`unsharp=5:5:0.5`)
- Config settings will be mapped dynamically over the existing parameter array.

## Tasks

```xml
<task>
  <action>
    Update `transform.py` to parse the 4 new configs and append them to the video filter thread sequentially if they exist. Because ffmpeg filters are chainable, just chain them onto the `video` stream variable sequentially!
    - color_shift: `.filter('eq', brightness=0.03, contrast=1.02, saturation=1.05)`
    - edge_crop: `.filter('crop', 'iw*0.98', 'ih*0.98')`
    - unsharp_mask: `.filter('unsharp', '5', '5', '0.5')`
    - dynamic_noise: `.filter('noise', alls=1, allf='t+u')`
  </action>
  <read_first>
    - backend/services/transform.py
  </read_first>
  <acceptance_criteria>
    - `apply_custom_transform` method appends filters properly to `video`.
    - Function survives compilation of concurrent multiple filters (e.g., flip + noise + unsharp together).
  </acceptance_criteria>
</task>

<task>
  <action>
    Update React frontend to include these 4 new filters in the UI configuration payload. Add these boolean variables into the initial `transformConfig` state. Add corresponding checkboxes to the UI, right next to the current ones. Ensure that checking `[AUTO]` will default to ticking ALL available filters.
  </action>
  <read_first>
    - frontend/src/App.jsx
  </read_first>
  <acceptance_criteria>
    - React UI shows 7 total checkboxes for Anti-Scan settings.
    - AUTO mode checks all of them at once.
    - Request payload to the `DOWNLOAD` and `TRANSFORM` API sends all 7 boolean state values properly to the backend.
  </acceptance_criteria>
</task>
```

## Verification
- Test checking all options locally. Check terminal output for FFmpeg arguments to ensure all filters were pipelined successfully without syntax error.
- Evaluate output file to ensure visual aesthetics are largely preserved.
