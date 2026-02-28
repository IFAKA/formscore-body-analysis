# Photo Capture Flow — Design Document
_2026-02-28_

## Overview

Replace the real-time analysis loop with a guided photo capture flow. The user positions themselves, the system auto-detects alignment + stability, triggers a 3-second countdown, captures a clean photo, and presents analysis results.

---

## Phase State Machine

```
positioning  →  countdown (3s)  →  capturing (flash)  →  results
     ↑                                                        |
     └────────────────── reset (with confirmation) ──────────┘
```

---

## Phases

### 1. Positioning
- Camera + MediaPipe detection overlay runs normally
- Guide overlay: body silhouette outline (body mode) or face oval (face mode)
- Status strip at bottom of camera:
  - `"Step back until your full body is visible"` — landmarks not detected
  - `"Hold still..."` — landmarks detected, waiting for stability
  - Guide border turns green once stable → countdown starts

**Alignment criteria:**
- Body: landmarks 0, 11, 12, 23, 24 all ≥ 0.5 confidence
- Face: face bounding box detected
- Stability: landmark centroid moves < 5% of frame width for ≥ 1 second

### 2. Countdown
- Large animated number (3 → 2 → 1) centered on canvas, Motion spring animation
- Detection overlay still renders (user sees if they moved)
- If alignment breaks: countdown resets, returns to "Hold still..."

### 3. Capturing
- White flash effect (200ms overlay)
- Clean photo captured to offscreen canvas (no landmarks drawn)
- Detection loop stops, camera feed freezes

### 4. Results
- Captured photo replaces camera feed (same size/position)
- Metrics panel shows analysis results
- Gallery strip at bottom: thumbnails of all captured photos, click to switch
- **Download button** on current photo → clean JPEG, no overlay
- **Reset button** (top-right) with confirmation dialog:
  > "Take a new photo? This will clear your current results."
  > [Cancel] [Reset]
- Mode toggle still accessible

---

## Architecture

### Store Changes (Zustand)
New fields added to `AnalyzerState`:
```ts
capturePhase: 'positioning' | 'countdown' | 'capturing' | 'results'
capturedPhotos: string[]        // base64 data URLs, clean (no overlay)
activePhotoIndex: number
```

### New Hooks
- **`useAlignmentStability`** — runs inside detection loop, measures centroid drift, exposes `stableForMs: number`
- **`useCountdown`** — when `isAligned && stableForMs >= 1000`, starts 3s countdown. Resets if alignment breaks.

### Modified Hooks
- **`useDetectionLoop`** — adds `capturePhoto(): string` that draws video to offscreen canvas without landmarks, returns data URL. Single-shot analysis replaces continuous loop after capture.

### New Components
- **`CountdownOverlay`** — large animated number + progress ring over canvas
- **`CaptureFlash`** — white overlay with quick fade on capture
- **`PhotoViewer`** — replaces camera area in results phase; shows clean photo
- **`GalleryStrip`** — horizontal scrollable thumbnails at bottom
- **`ResetConfirmDialog`** — shadcn AlertDialog for reset confirmation

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `store/analyzer.store.ts` | Add capture phase, photos, activePhotoIndex |
| `types/metrics.ts` | Add `CapturePhase` type |
| `features/analyzer/hooks/useDetectionLoop.ts` | Add capturePhoto(), stability tracking |
| `features/analyzer/hooks/useAlignmentStability.ts` | New hook |
| `features/analyzer/hooks/useCountdown.ts` | New hook |
| `features/analyzer/components/CameraCanvas.tsx` | Add positioning/countdown overlays |
| `features/analyzer/components/CountdownOverlay.tsx` | New component |
| `features/analyzer/components/CaptureFlash.tsx` | New component |
| `features/analyzer/components/PhotoViewer.tsx` | New component |
| `features/analyzer/components/GalleryStrip.tsx` | New component |
| `features/analyzer/components/ResetConfirmDialog.tsx` | New component |
| `app/analyze/page.tsx` | Conditionally render PhotoViewer vs CameraCanvas |

---

## Out of Scope
- Video recording
- Server-side storage of photos
- Sharing features
- Multiple person detection
