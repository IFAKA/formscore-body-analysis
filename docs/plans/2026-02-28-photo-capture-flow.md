# Photo Capture Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace real-time analysis loop with a guided photo capture flow: position → countdown → capture → results with download and reset.

**Architecture:** Single-page state machine (`positioning → countdown → capturing → results`) driven by a new `capturePhase` field in the Zustand store. Alignment/stability detection runs inside the existing detection loop via a new `useAlignmentStability` hook. On capture, a clean offscreen canvas snapshot is taken (no landmarks), the detection loop stops, and a single-shot analysis is run. Results stay in the store so multiple photos can accumulate in a gallery.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand 5, Motion 12 (Framer Motion), MediaPipe Tasks Vision 0.10.32, Tailwind CSS 4, shadcn/ui (AlertDialog already available), TypeScript strict.

---

## Context You Need

- `@/` alias maps to the project root (not `src/`)
- Store lives in `store/analyzer.store.ts` — exports `useAnalyzerStore`
- Types live in `types/metrics.ts` — `AnalyzerState` is the store interface
- `useDetectionLoop` runs a RAF loop drawing video → landmarks → canvas at 60fps
- `isSubjectDetected` is already true when all key landmarks are visible
- `calcBodyMetrics` / `calcFaceMetrics` accept `NormalizedLandmark[]` and return `{ metrics, overall }`
- Canvas has `transform: scaleX(-1)` for mirror view
- Motion is imported as `from "motion/react"` (not framer-motion)
- Run dev server: `npm run dev` (port 3001)
- Check build: `npm run build`

---

## Task 1: Extend types and store

**Files:**
- Modify: `types/metrics.ts`
- Modify: `store/analyzer.store.ts`

**Step 1: Add `CapturePhase` type and extend `AnalyzerState`**

In `types/metrics.ts`, add after line 11 (after the `MetricResult` interface):

```ts
export type CapturePhase = "positioning" | "countdown" | "capturing" | "results";

export interface CapturedPhoto {
  dataUrl: string;      // base64 JPEG, no landmarks
  metrics: MetricResult[];
  overallScore: number | null;
  mode: AnalysisMode;
  takenAt: number;      // Date.now()
}
```

In `types/metrics.ts`, extend `AnalyzerState` with these fields and actions:

```ts
// Add to AnalyzerState interface:
capturePhase: CapturePhase;
stableForMs: number;
capturedPhotos: CapturedPhoto[];
activePhotoIndex: number;

setCapturePhase: (phase: CapturePhase) => void;
setStableForMs: (ms: number) => void;
addCapturedPhoto: (photo: CapturedPhoto) => void;
setActivePhotoIndex: (index: number) => void;
resetCapture: () => void;  // clears photos, resets to positioning
```

**Step 2: Update the store implementation**

In `store/analyzer.store.ts`, add initial values and actions:

```ts
// Add to initial state (inside create()):
capturePhase: "positioning" as CapturePhase,
stableForMs: 0,
capturedPhotos: [],
activePhotoIndex: 0,

// Add actions:
setCapturePhase: (capturePhase) => set({ capturePhase }),
setStableForMs: (stableForMs) => set({ stableForMs }),
addCapturedPhoto: (photo) =>
  set((s) => ({
    capturedPhotos: [...s.capturedPhotos, photo],
    activePhotoIndex: s.capturedPhotos.length,  // point to new photo
    capturePhase: "results",
  })),
setActivePhotoIndex: (activePhotoIndex) => set({ activePhotoIndex }),
resetCapture: () =>
  set({
    capturePhase: "positioning",
    stableForMs: 0,
    capturedPhotos: [],
    activePhotoIndex: 0,
    bodyMetrics: makeEmpty(BODY_METRIC_IDS, BODY_META),
    faceMetrics: makeEmpty(FACE_METRIC_IDS, FACE_META),
    overallScore: null,
    isSubjectDetected: false,
  }),
```

Also add the import at top of store file:
```ts
import type { AnalyzerState, AnalysisMode, MetricResult, CapturePhase, CapturedPhoto } from "@/types/metrics";
```

**Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error"
```
Expected: no errors.

**Step 4: Commit**

```bash
git add types/metrics.ts store/analyzer.store.ts
git commit -m "feat: extend store with capture phase + photo gallery state"
```

---

## Task 2: Alignment stability tracking in detection loop

**Files:**
- Modify: `features/analyzer/hooks/useDetectionLoop.ts`

**Goal:** Track how long the subject has been stable (not moving). Update `stableForMs` in the store. Also expose a `capturePhoto()` function that draws just the raw video to an offscreen canvas and returns a data URL.

**Step 1: Add stability tracking inside the loop**

In `useDetectionLoop.ts`, add these imports at the top:

```ts
import { calcBodyMetrics } from "./useBodyMetrics";
import { calcFaceMetrics } from "./useFaceMetrics";
// (already imported — no change needed)
```

Add these refs near the top of the `useDetectionLoop` function body (after existing refs):

```ts
const stableStartRef = useRef<number | null>(null);
const lastCentroidRef = useRef<{ x: number; y: number } | null>(null);
```

Add these store selectors alongside the existing ones:

```ts
const capturePhase = useAnalyzerStore((s) => s.capturePhase);
const setCapturePhase = useAnalyzerStore((s) => s.setCapturePhase);
const setStableForMs = useAnalyzerStore((s) => s.setStableForMs);
const addCapturedPhoto = useAnalyzerStore((s) => s.addCapturedPhoto);
```

Add refs so the loop can read current values without stale closure:

```ts
const capturePhaseRef = useRef(capturePhase);
useEffect(() => { capturePhaseRef.current = capturePhase; }, [capturePhase]);
```

**Step 2: Add centroid stability helper**

Add this helper function outside the hook (below the `lerp` function already there):

```ts
function computeCentroid(landmarks: { x: number; y: number }[]): { x: number; y: number } {
  const n = landmarks.length;
  if (n === 0) return { x: 0.5, y: 0.5 };
  const sx = landmarks.reduce((a, l) => a + l.x, 0);
  const sy = landmarks.reduce((a, l) => a + l.y, 0);
  return { x: sx / n, y: sy / n };
}

const STABILITY_THRESHOLD = 0.05;   // 5% of frame width
const STABILITY_REQUIRED_MS = 1000; // 1 second
```

**Step 3: Add stability logic inside the body branch of the loop**

Find the section inside the body mode branch where `setIsSubjectDetected(fullyVisible)` is called. After that call, add:

```ts
// Stability tracking
if (fullyVisible && landmarks) {
  const phase = capturePhaseRef.current;
  if (phase === "positioning" || phase === "countdown") {
    const keyLandmarks = [0, 11, 12, 23, 24].map(i => landmarks[i]);
    const centroid = computeCentroid(keyLandmarks);
    const last = lastCentroidRef.current;
    const isStable = last
      ? Math.abs(centroid.x - last.x) < STABILITY_THRESHOLD &&
        Math.abs(centroid.y - last.y) < STABILITY_THRESHOLD
      : true;

    lastCentroidRef.current = centroid;

    if (isStable) {
      if (stableStartRef.current === null) stableStartRef.current = timestamp;
      setStableForMs(timestamp - stableStartRef.current);
    } else {
      stableStartRef.current = null;
      setStableForMs(0);
    }
  }
} else if (!fullyVisible) {
  stableStartRef.current = null;
  lastCentroidRef.current = null;
  setStableForMs(0);
}
```

**Step 4: Add stability logic inside the face branch of the loop**

Find `setIsSubjectDetected(detected)` in the face branch. After it, add:

```ts
// Stability tracking (face)
if (detected) {
  const phase = capturePhaseRef.current;
  if (phase === "positioning" || phase === "countdown") {
    const lms = result.faceLandmarks[0];
    const centroid = computeCentroid(lms);
    const last = lastCentroidRef.current;
    const isStable = last
      ? Math.abs(centroid.x - last.x) < STABILITY_THRESHOLD &&
        Math.abs(centroid.y - last.y) < STABILITY_THRESHOLD
      : true;

    lastCentroidRef.current = centroid;

    if (isStable) {
      if (stableStartRef.current === null) stableStartRef.current = timestamp;
      setStableForMs(timestamp - stableStartRef.current);
    } else {
      stableStartRef.current = null;
      setStableForMs(0);
    }
  }
} else {
  stableStartRef.current = null;
  lastCentroidRef.current = null;
  setStableForMs(0);
}
```

**Step 5: Add `capturePhoto` function**

Add this inside `useDetectionLoop`, after the `stop` callback:

```ts
const capturePhoto = useCallback((): string => {
  const video = videoRef.current;
  if (!video) return "";
  const offscreen = document.createElement("canvas");
  offscreen.width = video.videoWidth;
  offscreen.height = video.videoHeight;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return "";
  // Draw raw video (no landmarks, no transform — CSS mirror handles display)
  ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
  return offscreen.toDataURL("image/jpeg", 0.92);
}, [videoRef]);
```

Update the return statement of `useDetectionLoop` to include it:

```ts
return { start, stop, capturePhoto };
```

**Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```
Expected: no errors.

**Step 7: Commit**

```bash
git add features/analyzer/hooks/useDetectionLoop.ts
git commit -m "feat: add stability tracking and capturePhoto to detection loop"
```

---

## Task 3: `useCountdown` hook

**Files:**
- Create: `features/analyzer/hooks/useCountdown.ts`

**Goal:** When `isSubjectDetected && stableForMs >= 1000` and phase is `positioning`, start a 3-second countdown. Update phase to `countdown`. Count 3→2→1→0, then trigger capture. If alignment breaks mid-countdown, reset.

```ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import type { CapturedPhoto } from "@/types/metrics";
import { calcBodyMetrics } from "./useBodyMetrics";
import { calcFaceMetrics } from "./useFaceMetrics";
import { getPoseLandmarker } from "@/lib/mediapipe/pose-landmarker";
import { getFaceLandmarker } from "@/lib/mediapipe/face-landmarker";

const COUNTDOWN_SECONDS = 3;
const STABILITY_REQUIRED_MS = 1000;

export function useCountdown(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  capturePhoto: () => string
) {
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const stableForMs = useAnalyzerStore((s) => s.stableForMs);
  const isSubjectDetected = useAnalyzerStore((s) => s.isSubjectDetected);
  const mode = useAnalyzerStore((s) => s.mode);
  const setCapturePhase = useAnalyzerStore((s) => s.setCapturePhase);
  const addCapturedPhoto = useAnalyzerStore((s) => s.addCapturedPhoto);
  const setBodyMetrics = useAnalyzerStore((s) => s.setBodyMetrics);
  const setFaceMetrics = useAnalyzerStore((s) => s.setFaceMetrics);
  const setOverallScore = useAnalyzerStore((s) => s.setOverallScore);

  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef(COUNTDOWN_SECONDS);
  const isCountingRef = useRef(false);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
    isCountingRef.current = false;
    countRef.current = COUNTDOWN_SECONDS;
  }, []);

  const doCapture = useCallback(async () => {
    setCapturePhase("capturing");
    const dataUrl = capturePhoto();

    // Single-shot analysis on the captured frame
    const video = videoRef.current;
    let metrics: ReturnType<typeof calcBodyMetrics> | null = null;

    if (video && dataUrl) {
      // Use the last detected landmarks — already in the store from the loop
      // Trigger one more detection on the video frame to get fresh landmarks
      try {
        if (mode === "body") {
          const pose = await getPoseLandmarker();
          const result = pose.detectForVideo(video, performance.now());
          if (result.landmarks.length > 0) {
            const lms = result.landmarks[0];
            metrics = calcBodyMetrics(lms);
          }
        } else {
          const face = await getFaceLandmarker();
          const result = face.detectForVideo(video, performance.now());
          if (result.faceLandmarks.length > 0) {
            const lms = result.faceLandmarks[0];
            metrics = calcFaceMetrics(lms);
          }
        }
      } catch {
        // non-fatal
      }
    }

    const photo: CapturedPhoto = {
      dataUrl,
      metrics: metrics?.metrics ?? [],
      overallScore: metrics?.overall ?? null,
      mode,
      takenAt: Date.now(),
    };

    if (metrics) {
      if (mode === "body") setBodyMetrics(metrics.metrics);
      else setFaceMetrics(metrics.metrics);
      setOverallScore(metrics.overall);
    }

    addCapturedPhoto(photo);  // also sets phase to "results"
  }, [capturePhoto, videoRef, mode, setCapturePhase, addCapturedPhoto, setBodyMetrics, setFaceMetrics, setOverallScore]);

  // Start counting when aligned + stable
  useEffect(() => {
    if (capturePhase !== "positioning") return;
    if (isSubjectDetected && stableForMs >= STABILITY_REQUIRED_MS) {
      if (!isCountingRef.current) {
        isCountingRef.current = true;
        countRef.current = COUNTDOWN_SECONDS;
        setCapturePhase("countdown");

        const tick = () => {
          countRef.current -= 1;
          if (countRef.current <= 0) {
            doCapture();
          } else {
            countdownRef.current = setTimeout(tick, 1000);
          }
        };
        countdownRef.current = setTimeout(tick, 1000);
      }
    }
  }, [capturePhase, isSubjectDetected, stableForMs, setCapturePhase, doCapture]);

  // Reset countdown if subject leaves frame during countdown
  useEffect(() => {
    if (capturePhase === "countdown" && !isSubjectDetected) {
      stopCountdown();
      setCapturePhase("positioning");
    }
  }, [capturePhase, isSubjectDetected, stopCountdown, setCapturePhase]);

  useEffect(() => {
    return () => stopCountdown();
  }, [stopCountdown]);

  // Expose current countdown number reactively
  return { countdownNumber: countRef.current };
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

**Step 3: Commit**

```bash
git add features/analyzer/hooks/useCountdown.ts
git commit -m "feat: add useCountdown hook — triggers capture after alignment + stability"
```

---

## Task 4: `CountdownOverlay` and `CaptureFlash` components

**Files:**
- Create: `features/analyzer/components/CountdownOverlay.tsx`
- Create: `features/analyzer/components/CaptureFlash.tsx`

**Step 1: Create `CountdownOverlay`**

This renders a large animated countdown number + a circular progress ring over the camera canvas. It's shown during the `countdown` phase.

```tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { useEffect, useState } from "react";

export function CountdownOverlay() {
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const [displayNumber, setDisplayNumber] = useState(3);

  // Reset to 3 each time countdown starts
  useEffect(() => {
    if (capturePhase === "countdown") {
      setDisplayNumber(3);
      const t1 = setTimeout(() => setDisplayNumber(2), 1000);
      const t2 = setTimeout(() => setDisplayNumber(1), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [capturePhase]);

  const show = capturePhase === "countdown";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          {/* Semi-transparent dark vignette */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Countdown number */}
          <AnimatePresence mode="wait">
            <motion.span
              key={displayNumber}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10 text-[120px] font-black text-white tabular-nums select-none"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}
            >
              {displayNumber}
            </motion.span>
          </AnimatePresence>

          {/* "Hold still" label */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-2 text-sm font-semibold text-white/80 tracking-wide select-none"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
          >
            Hold still
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Create `CaptureFlash`**

```tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";

export function CaptureFlash() {
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);

  return (
    <AnimatePresence>
      {capturePhase === "capturing" && (
        <motion.div
          key="flash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute inset-0 bg-white pointer-events-none z-20"
        />
      )}
    </AnimatePresence>
  );
}
```

**Step 3: Commit**

```bash
git add features/analyzer/components/CountdownOverlay.tsx features/analyzer/components/CaptureFlash.tsx
git commit -m "feat: add CountdownOverlay and CaptureFlash components"
```

---

## Task 5: Positioning guide overlay in `CameraCanvas`

**Files:**
- Modify: `features/analyzer/components/CameraCanvas.tsx`

**Goal:** Show a positioning status bar at the bottom with contextual text, and a guide border that turns green when stable. Wire up `useCountdown`.

**Step 1: Replace `CameraCanvas.tsx` content**

The key changes:
1. Import and call `useCountdown`
2. Add positioning guide at bottom (status text based on phase + detection)
3. Replace `LIVE` badge with phase-aware indicator
4. Add `CountdownOverlay` and `CaptureFlash` inside the component
5. Skip rendering overlays (not-in-frame, live indicator) during `results` phase

```tsx
"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCamera } from "../hooks/useCamera";
import { useDetectionLoop } from "../hooks/useDetectionLoop";
import { useCountdown } from "../hooks/useCountdown";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { CountdownOverlay } from "./CountdownOverlay";
import { CaptureFlash } from "./CaptureFlash";

export function CameraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { videoRef, startCamera, stopCamera } = useCamera();
  const { start, stop, capturePhoto } = useDetectionLoop(videoRef, canvasRef);
  const isReady = useAnalyzerStore((s) => s.isReady);
  const isDetecting = useAnalyzerStore((s) => s.isDetecting);
  const isSubjectDetected = useAnalyzerStore((s) => s.isSubjectDetected);
  const stableForMs = useAnalyzerStore((s) => s.stableForMs);
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const mode = useAnalyzerStore((s) => s.mode);
  const error = useAnalyzerStore((s) => s.error);
  const capturedPhotos = useAnalyzerStore((s) => s.capturedPhotos);
  const activePhotoIndex = useAnalyzerStore((s) => s.activePhotoIndex);

  useCountdown(videoRef, capturePhoto);

  const isInResults = capturePhase === "results";

  useEffect(() => {
    if (isInResults) return;
    let mounted = true;

    async function init() {
      await startCamera();
      if (mounted) await start();
    }

    init();

    return () => {
      mounted = false;
      stop();
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop loop once we hit results
  useEffect(() => {
    if (isInResults) {
      stop();
      stopCamera();
    }
  }, [isInResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePhoto = isInResults ? capturedPhotos[activePhotoIndex] : null;

  // Positioning status text
  const statusText = (() => {
    if (!isDetecting) return null;
    if (!isSubjectDetected) {
      return mode === "body"
        ? "Step back until your full body is visible"
        : "Look directly at the camera";
    }
    if (stableForMs < 1000) return "Hold still...";
    return null; // countdown will take over
  })();

  const guideColor = isSubjectDetected && stableForMs >= 1000
    ? "border-emerald-400/80"
    : "border-amber-400/60";

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        muted
        playsInline
        autoPlay
      />

      {/* Results phase: show captured photo */}
      {isInResults && activePhoto ? (
        <img
          src={activePhoto.dataUrl}
          alt="Captured photo"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
      ) : (
        /* Live canvas overlay (shows video + drawing) */
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
      )}

      {/* Loading state */}
      <AnimatePresence>
        {!isReady && !error && !isInResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3"
          >
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Loading AI models...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-3 p-6"
          >
            <div className="text-3xl">⚠️</div>
            <p className="text-sm text-red-400 text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-zinc-400 underline"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Positioning guide — only when detecting and not in results */}
      <AnimatePresence>
        {isDetecting && !isSubjectDetected && !isInResults && capturePhase === "positioning" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-[2px]"
          >
            {/* Guide frame */}
            <div className={`absolute inset-8 rounded-2xl border-2 border-dashed ${guideColor} pointer-events-none transition-colors duration-500`} />

            <div className="flex flex-col items-center gap-2 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-amber-400 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {mode === "body" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                  )}
                </svg>
              </div>
              <p className="text-sm font-semibold text-white drop-shadow">
                {mode === "body" ? "Full body not in frame" : "Face not detected"}
              </p>
              <p className="text-xs text-amber-300/90 drop-shadow">
                {mode === "body"
                  ? "Step back until your head and hips are visible"
                  : "Look directly at the camera"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status strip — "Hold still" during positioning when subject is detected */}
      <AnimatePresence>
        {statusText && capturePhase === "positioning" && isSubjectDetected && !isInResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 pointer-events-none"
          >
            <p className="text-sm font-semibold text-white whitespace-nowrap">{statusText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Green guide border when stable */}
      <AnimatePresence>
        {isSubjectDetected && stableForMs >= 1000 && capturePhase === "positioning" && !isInResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-4 rounded-2xl border-2 border-emerald-400/70 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Countdown overlay */}
      <CountdownOverlay />

      {/* Capture flash */}
      <CaptureFlash />

      {/* Phase indicator badge (replaces LIVE) */}
      <AnimatePresence>
        {!isInResults && isDetecting && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-medium text-white uppercase">
              {capturePhase === "countdown" ? "Counting" : "Live"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

**Step 3: Commit**

```bash
git add features/analyzer/components/CameraCanvas.tsx
git commit -m "feat: update CameraCanvas with positioning guide, countdown, and results photo view"
```

---

## Task 6: `PhotoViewer` toolbar (download + reset)

**Files:**
- Create: `features/analyzer/components/PhotoViewer.tsx`

**Goal:** A toolbar rendered over the camera area (when in results phase) with: (a) download button, (b) reset button that opens a confirmation dialog.

shadcn AlertDialog is already installed. Check with:
```bash
ls components/ui/alert-dialog.tsx 2>/dev/null && echo "exists" || echo "need to install"
```

If not installed:
```bash
npx shadcn@latest add alert-dialog
```

**Step 1: Create `PhotoViewer.tsx`**

```tsx
"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PhotoViewer() {
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const capturedPhotos = useAnalyzerStore((s) => s.capturedPhotos);
  const activePhotoIndex = useAnalyzerStore((s) => s.activePhotoIndex);
  const setActivePhotoIndex = useAnalyzerStore((s) => s.setActivePhotoIndex);
  const resetCapture = useAnalyzerStore((s) => s.resetCapture);

  const activePhoto = capturedPhotos[activePhotoIndex];

  const handleDownload = useCallback(() => {
    if (!activePhoto) return;
    const link = document.createElement("a");
    link.href = activePhoto.dataUrl;
    link.download = `formscore-${activePhoto.mode}-${new Date(activePhoto.takenAt).toISOString().slice(0, 19).replace(/:/g, "-")}.jpg`;
    link.click();
  }, [activePhoto]);

  if (capturePhase !== "results") return null;

  return (
    <>
      {/* Toolbar — top of camera area */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto"
      >
        {/* Download button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/90 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
          </svg>
          Download
        </motion.button>

        {/* Photo counter */}
        {capturedPhotos.length > 1 && (
          <span className="text-xs text-white/60 bg-black/50 rounded-full px-2.5 py-1">
            {activePhotoIndex + 1} / {capturedPhotos.length}
          </span>
        )}

        {/* Reset button with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              New Photo
            </motion.button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Take a new photo?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                This will clear your current results and start over.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={resetCapture}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>

      {/* Gallery strip — bottom of camera area, only if > 1 photo */}
      <AnimatePresence>
        {capturedPhotos.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto z-10 pointer-events-auto"
          >
            {capturedPhotos.map((photo, i) => (
              <motion.button
                key={photo.takenAt}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActivePhotoIndex(i)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activePhotoIndex ? "border-emerald-400" : "border-zinc-600 hover:border-zinc-400"
                }`}
              >
                <img
                  src={photo.dataUrl}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add features/analyzer/components/PhotoViewer.tsx
git commit -m "feat: add PhotoViewer with download, gallery strip, and reset confirmation"
```

---

## Task 7: Wire `PhotoViewer` into `CameraCanvas` and update `MetricsPanel`

**Files:**
- Modify: `features/analyzer/components/CameraCanvas.tsx`
- Modify: `features/analyzer/components/MetricsPanel.tsx`

**Step 1: Add `PhotoViewer` to `CameraCanvas`**

In `CameraCanvas.tsx`, add the import:
```ts
import { PhotoViewer } from "./PhotoViewer";
```

Inside the JSX, add `<PhotoViewer />` right after `<CaptureFlash />`:
```tsx
<CaptureFlash />
<PhotoViewer />
```

**Step 2: Update `MetricsPanel` — hide WAITING chip in results phase**

In `MetricsPanel.tsx`, add this store selector:
```ts
const capturePhase = useAnalyzerStore((s) => s.capturePhase);
```

Change the `waiting` variable to:
```ts
const waiting = isDetecting && !isSubjectDetected && capturePhase !== "results";
```

**Step 3: Verify build and test manually**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Open `http://localhost:3001/analyze`. Flow to test:
1. Stand back until full body detected → "Hold still..." appears
2. Hold still 1 second → green border + 3-2-1 countdown
3. Move during countdown → countdown resets
4. Hold still again → countdown completes → flash → photo + metrics appear
5. Click Download → JPEG downloads (no landmarks)
6. Click "New Photo" → confirmation dialog → Cancel doesn't reset → Reset clears and restarts
7. Repeat → second photo appears → gallery strip with thumbnails shows

**Step 4: Commit**

```bash
git add features/analyzer/components/CameraCanvas.tsx features/analyzer/components/MetricsPanel.tsx
git commit -m "feat: wire PhotoViewer into CameraCanvas; fix MetricsPanel waiting state in results phase"
```

---

## Task 8: Update `MetricsPanel` header text for results phase

**Files:**
- Modify: `features/analyzer/components/MetricsPanel.tsx`

**Goal:** In results phase, the "WAITING" chip is irrelevant and the copy button should still work. Add a small "PHOTO" badge to show the user results are from a captured photo.

**Step 1: Add results-phase badge**

In `MetricsPanel.tsx`, add a "PHOTO" badge next to the header title when in results phase:

```tsx
const capturePhase = useAnalyzerStore((s) => s.capturePhase);
const isResults = capturePhase === "results";
```

In the header `<div>`, after the `<span>` with "Body Metrics" / "Face Metrics":
```tsx
{isResults && (
  <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2 py-0.5 tracking-wider">
    PHOTO
  </span>
)}
```

**Step 2: Commit**

```bash
git add features/analyzer/components/MetricsPanel.tsx
git commit -m "feat: add PHOTO badge to MetricsPanel header during results phase"
```

---

## Task 9: Final cleanup + build check

**Step 1: Remove "Real-time attractiveness analysis" subtitle in page header**

In `app/analyze/page.tsx`, change the subtitle:
```tsx
// From:
<span className="hidden sm:block text-xs text-zinc-500">
  Real-time attractiveness analysis
</span>
// To:
<span className="hidden sm:block text-xs text-zinc-500">
  AI attractiveness analysis
</span>
```

**Step 2: Full build**

```bash
npm run build
```
Expected: zero TypeScript errors, successful build.

**Step 3: Final commit**

```bash
git add app/analyze/page.tsx
git commit -m "chore: update subtitle copy for photo capture flow"
```

---

## Known Edge Cases

- **Camera stopped before countdown ends:** `stop()` cancels RAF loop; countdown timer still runs but `capturePhoto()` will return empty string. `addCapturedPhoto` will receive an empty `dataUrl` — the `PhotoViewer` img will render blank. Mitigation: check `dataUrl.length > 0` before calling `addCapturedPhoto` in `doCapture`.
- **Mode switch during countdown:** Countdown uses `modeRef` — but the store `mode` is read at call time in `doCapture`. If user switches modes mid-countdown, the analysis may be mismatched. Mitigation: reset countdown on mode change (add a `useEffect` in `useCountdown` watching `mode`).
- **Single-shot `detectForVideo` timestamp:** Calling `detectForVideo` twice with the same `performance.now()` may error ("timestamp must be strictly greater"). Mitigation: use `performance.now() + 1` in `doCapture`.
