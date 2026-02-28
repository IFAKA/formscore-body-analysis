# FormScore — Measurement Accuracy & Quality Gating

## Research Sources

This document records the sources used to design the measurement quality system.
Future changes should validate against these same sources.

| Source | What It Informed |
|--------|-----------------|
| [MediaPipe Face Landmarker Web JS Docs](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) | Configuration defaults (0.5 thresholds), `outputFacialTransformationMatrixes` option, single model variant confirmation |
| [MediaPipe Pose Landmarker Docs](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) | 3 model URL variants (lite/full/heavy), confidence threshold defaults (keep at 0.5) |
| [Face landmark detection evaluation in surgical setting (arXiv 2025)](https://arxiv.org/pdf/2507.18248) | Accuracy degrades at >30° head rotation; scatter increases with yaw — informed 18° gate |
| [Deep learning facial symmetry scoring (Nature 2025)](https://www.nature.com/articles/s41598-025-17172-1) | Frontal pose requirement for reliable bilateral measurements (bizygomatic width, symmetry) |
| [Survey: MediaPipe Face Mesh for emotion recognition (IEEE 2024)](https://ieeexplore.ieee.org/document/10775188/) | 96%+ accuracy under frontal, well-lit conditions; degrades with pose/lighting |
| [Reliability of MediaPipe for human rehabilitation motions (ScienceDirect 2023)](https://www.sciencedirect.com/science/article/abs/pii/S0263224123003901) | Visibility thresholds and filtering best practices for pose landmarks |
| [GitHub Issue #6099: Face Landmarker lacks per-landmark confidence](https://github.com/google-ai-edge/mediapipe/issues/6099) | Confirms no per-landmark confidence → head pose matrix is the correct proxy |
| [Smoothing filters for MediaPipe (Medium 2024)](https://medium.com/@debasishraut.dev/setting-up-smoothing-filters-for-mediapipe-pose-estimation-pipeline-a-practical-guide-fcc03f462196) | EMA/OneEuroFilter post-processing as community best practice; alpha=0.25 |
| [BlazePose GHUM research (arXiv 2022)](https://arxiv.org/abs/2206.11678) | Body measurement accuracy characteristics for pose model variants |

---

## Key Decisions

### Face quality gate (18° yaw/pitch threshold)
- `outputFacialTransformationMatrixes: true` exposes the 4×4 head pose matrix
- `lib/metrics/face/head-pose.ts` extracts yaw and pitch from column-major matrix
- If `|yaw| > 18°` or `|pitch| > 18°`, face metrics are skipped and user sees "Face the camera straight"
- 18° is conservative (literature suggests errors compound above ~20–30°)

### EMA landmark smoothing (alpha = 0.25)
- Applied to face landmark x/y before metric computation
- Reduces frame-to-frame jitter in ratio calculations
- MediaPipe's internal smoothing applies to detection, not to derived metric ratios
- alpha = 0.25 is the community convention (25% new frame, 75% history)

### Body facing check (shoulderWidth / bodyHeight > 0.18)
- Detects sideways stance that produces misleading shoulder/hip/symmetry readings
- If not facing, metrics are skipped and user sees "Face the camera directly"

### Pose model upgrade (lite → full)
- Full model URL: `pose_landmarker_full` — higher accuracy, slightly more CPU
- Confidence thresholds kept at 0.5 (docs recommend not raising above default)

### Arm-span gate
- Only computed when wrists are at roughly shoulder height (T-pose)
- Arms at sides read ~0.3–0.5 ratio (false low); T-pose reads ~1.0 (Vitruvian)
- Gate: `|wristY − shoulderY| / bodyHeight ≤ 0.18`

### Metric sanity bounds (outlier rejection)
- fWHR: reject if ratio < 0.8 or > 3.0
- Eye spacing: reject if ratio < 0.25 or > 0.65
- Cheekbone definition: reject if ratio < 0.8 or > 1.8

---

## Known Limitations
- 2D projection error (screen coordinates, not real-world 3D) — fundamental webcam limitation
- Per-landmark confidence not exposed by MediaPipe (GitHub issue #6099 open)
- True waist measurement requires depth camera — waist-hip ratio is labeled "(estimated)"
