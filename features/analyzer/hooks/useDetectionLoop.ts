"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { getPoseLandmarker } from "@/lib/mediapipe/pose-landmarker";
import { getFaceLandmarker } from "@/lib/mediapipe/face-landmarker";
import { calcBodyMetrics } from "./useBodyMetrics";
import { calcFaceMetrics } from "./useFaceMetrics";
import { drawPose } from "@/lib/draw/draw-pose";
import { drawFace } from "@/lib/draw/draw-face";
import { drawHighlight } from "@/lib/draw/draw-highlight";
import { BODY_HIGHLIGHTS, FACE_HIGHLIGHTS } from "@/lib/draw/highlight-config";
import { getHeadPose } from "@/lib/metrics/face/head-pose";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}


const STABILITY_THRESHOLD = 0.02;      // per-frame delta
const STABILITY_BASE_THRESHOLD = 0.04; // drift from where you were when stability started
const UI_UPDATE_INTERVAL_MS = 100; // 10 Hz UI updates

export function useDetectionLoop(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const rafRef = useRef<number | null>(null);
  const lastUIUpdateRef = useRef<number>(0);
  const faceZoomRef = useRef({ cx: 0.5, cy: 0.5, scale: 1.0 });
  const stableStartRef = useRef<number | null>(null);
  const lastCentroidRef = useRef<{ x: number; y: number } | null>(null);
  const stableBaseRef = useRef<{ x: number; y: number } | null>(null);
  // EMA buffers for face landmark smoothing (alpha = 0.25, ~478 landmarks with iris refinement)
  const emaXRef = useRef<Float32Array | null>(null);
  const emaYRef = useRef<Float32Array | null>(null);

  const mode = useAnalyzerStore((s) => s.mode);
  const setBodyMetrics = useAnalyzerStore((s) => s.setBodyMetrics);
  const setFaceMetrics = useAnalyzerStore((s) => s.setFaceMetrics);
  const setOverallScore = useAnalyzerStore((s) => s.setOverallScore);
  const setIsReady = useAnalyzerStore((s) => s.setIsReady);
  const setIsDetecting = useAnalyzerStore((s) => s.setIsDetecting);
  const setIsSubjectDetected = useAnalyzerStore((s) => s.setIsSubjectDetected);
  const setError = useAnalyzerStore((s) => s.setError);
  const hoveredMetricId = useAnalyzerStore((s) => s.hoveredMetricId);
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const setStableForMs = useAnalyzerStore((s) => s.setStableForMs);
  const setFaceQuality = useAnalyzerStore((s) => s.setFaceQuality);
  const setBodyQuality = useAnalyzerStore((s) => s.setBodyQuality);

  const modeRef = useRef(mode);
  useEffect(() => {
    if (mode === "face") {
      faceZoomRef.current = { cx: 0.5, cy: 0.5, scale: 1.0 };
      // Reset EMA buffers so a mode switch starts fresh
      emaXRef.current = null;
      emaYRef.current = null;
    }
    modeRef.current = mode;
    // Reset stability refs so the new mode starts fresh
    stableStartRef.current = null;
    lastCentroidRef.current = null;
    stableBaseRef.current = null;
  }, [mode]);

  const hoveredMetricIdRef = useRef(hoveredMetricId);
  useEffect(() => { hoveredMetricIdRef.current = hoveredMetricId; }, [hoveredMetricId]);

  const capturePhaseRef = useRef(capturePhase);
  useEffect(() => { capturePhaseRef.current = capturePhase; }, [capturePhase]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsDetecting(false);
  }, [setIsDetecting]);

  const capturePhoto = useCallback((): { dataUrl: string; faceZoom?: import("@/types/metrics").FaceZoom } => {
    const video = videoRef.current;
    if (!video) return { dataUrl: "" };
    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return { dataUrl: "" };

    if (modeRef.current === "face") {
      const { cx, cy, scale } = faceZoomRef.current;
      const cw = offscreen.width, ch = offscreen.height;
      const rawTx = cw / 2 - cx * cw * scale;
      const rawTy = ch / 2 - cy * ch * scale;
      const tx = Math.min(0, Math.max(cw * (1 - scale), rawTx));
      const ty = Math.min(0, Math.max(ch * (1 - scale), rawTy));
      ctx.setTransform(scale, 0, 0, scale, tx, ty);
      ctx.drawImage(video, 0, 0, cw, ch);
      return {
        dataUrl: offscreen.toDataURL("image/jpeg", 0.92),
        faceZoom: { txNorm: tx / cw, tyNorm: ty / ch, scale },
      };
    }

    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    return { dataUrl: offscreen.toDataURL("image/jpeg", 0.92) };
  }, [videoRef]);

  const start = useCallback(async () => {
    try {
      setIsReady(false);
      // Preload both models in parallel
      await Promise.all([getPoseLandmarker(), getFaceLandmarker()]);
      setIsReady(true);
      setIsDetecting(true);

      let lastTimestamp = -1;

      const loop = async (timestamp: number) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        if (timestamp === lastTimestamp) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastTimestamp = timestamp;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        // Sync canvas size to video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const currentMode = modeRef.current;
        const shouldUpdateUI = timestamp - lastUIUpdateRef.current >= UI_UPDATE_INTERVAL_MS;
        const hoveredId = hoveredMetricIdRef.current;

        try {
          if (currentMode === "body") {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const pose = await getPoseLandmarker();
            const result = pose.detectForVideo(video, timestamp);

            const anyDetected = result.landmarks.length > 0;
            const landmarks = anyDetected ? result.landmarks[0] : null;
            // Require nose + shoulders + hips all visible for full measurement
            const fullyVisible = landmarks
              ? [0, 11, 12, 23, 24].every(i => (landmarks[i]?.visibility ?? 0) >= 0.5)
              : false;
            setIsSubjectDetected(fullyVisible);

            // Stability tracking (body) — use nose only, compare vs base position
            if (fullyVisible && landmarks) {
              const phase = capturePhaseRef.current;
              if (phase === "positioning" || phase === "countdown") {
                const pos = { x: landmarks[0].x, y: landmarks[0].y };
                const last = lastCentroidRef.current;
                const base = stableBaseRef.current;
                const movedFromLast = last
                  ? Math.abs(pos.x - last.x) > STABILITY_THRESHOLD ||
                    Math.abs(pos.y - last.y) > STABILITY_THRESHOLD
                  : false;
                const driftedFromBase = base
                  ? Math.abs(pos.x - base.x) > STABILITY_BASE_THRESHOLD ||
                    Math.abs(pos.y - base.y) > STABILITY_BASE_THRESHOLD
                  : false;
                const isStable = !movedFromLast && !driftedFromBase;

                lastCentroidRef.current = pos;

                if (isStable) {
                  if (stableStartRef.current === null) {
                    stableStartRef.current = timestamp;
                    stableBaseRef.current = pos;
                  }
                  setStableForMs(timestamp - stableStartRef.current);
                } else {
                  stableStartRef.current = null;
                  stableBaseRef.current = null;
                  setStableForMs(0);
                }
              }
            } else if (!fullyVisible) {
              stableStartRef.current = null;
              lastCentroidRef.current = null;
              stableBaseRef.current = null;
              setStableForMs(0);
              setBodyQuality(null);
            }

            if (landmarks) {
              drawPose(ctx, landmarks, canvas.width, canvas.height);
              if (hoveredId && BODY_HIGHLIGHTS[hoveredId]) {
                drawHighlight(ctx, landmarks, BODY_HIGHLIGHTS[hoveredId], canvas.width, canvas.height);
              }
            }

            if (fullyVisible && landmarks && shouldUpdateUI) {
              // Check that person is facing the camera (not sideways)
              const shoulderWidth = Math.abs(landmarks[12].x - landmarks[11].x);
              const ankleY = (landmarks[27].y + landmarks[28].y) / 2;
              const bodyHeight = Math.abs(ankleY - landmarks[0].y);
              const isFacingCamera = bodyHeight > 0.01 && (shoulderWidth / bodyHeight) > 0.18;

              if (isFacingCamera) {
                setBodyQuality("ok");
                // Scale x by aspect ratio so x/y distances are in the same units
                const ar = canvas.width / canvas.height;
                const arLandmarks = landmarks.map(l => ({ ...l, x: l.x * ar }));
                const { metrics, overall } = calcBodyMetrics(arLandmarks);
                setBodyMetrics(metrics);
                setOverallScore(overall);
              } else {
                setBodyQuality("angle");
              }
              lastUIUpdateRef.current = timestamp;
            }
          } else {
            // Face mode — detect first, then draw with zoom transform
            const face = await getFaceLandmarker();
            const result = face.detectForVideo(video, timestamp);

            const detected = result.faceLandmarks.length > 0;
            setIsSubjectDetected(detected);

            // Stability tracking (face) — use nose tip only, compare vs base position
            if (detected) {
              const phase = capturePhaseRef.current;
              if (phase === "positioning" || phase === "countdown") {
                const lms = result.faceLandmarks[0];
                const pos = { x: lms[1].x, y: lms[1].y }; // nose tip
                const last = lastCentroidRef.current;
                const base = stableBaseRef.current;
                const movedFromLast = last
                  ? Math.abs(pos.x - last.x) > STABILITY_THRESHOLD ||
                    Math.abs(pos.y - last.y) > STABILITY_THRESHOLD
                  : false;
                const driftedFromBase = base
                  ? Math.abs(pos.x - base.x) > STABILITY_BASE_THRESHOLD ||
                    Math.abs(pos.y - base.y) > STABILITY_BASE_THRESHOLD
                  : false;
                const isStable = !movedFromLast && !driftedFromBase;

                lastCentroidRef.current = pos;

                if (isStable) {
                  if (stableStartRef.current === null) {
                    stableStartRef.current = timestamp;
                    stableBaseRef.current = pos;
                  }
                  setStableForMs(timestamp - stableStartRef.current);
                } else {
                  stableStartRef.current = null;
                  stableBaseRef.current = null;
                  setStableForMs(0);
                }
              }
            } else {
              stableStartRef.current = null;
              lastCentroidRef.current = null;
              stableBaseRef.current = null;
              setStableForMs(0);
            }

            // Update smooth zoom state
            const FACE_FILL_RATIO = 0.65; // face height fills this fraction of canvas
            if (detected) {
              const lms = result.faceLandmarks[0];
              const xs = lms.map(l => l.x);
              const ys = lms.map(l => l.y);
              const minY = Math.min(...ys), maxY = Math.max(...ys);
              const faceH = maxY - minY;
              const targetScale = Math.max(1.0, Math.min(3.5, FACE_FILL_RATIO / faceH));
              const targetCx = (Math.min(...xs) + Math.max(...xs)) / 2;
              const targetCy = (minY + maxY) / 2;
              faceZoomRef.current.scale = lerp(faceZoomRef.current.scale, targetScale, 0.08);
              faceZoomRef.current.cx = lerp(faceZoomRef.current.cx, targetCx, 0.08);
              faceZoomRef.current.cy = lerp(faceZoomRef.current.cy, targetCy, 0.08);
            } else {
              faceZoomRef.current.scale = lerp(faceZoomRef.current.scale, 1.0, 0.05);
              faceZoomRef.current.cx = lerp(faceZoomRef.current.cx, 0.5, 0.05);
              faceZoomRef.current.cy = lerp(faceZoomRef.current.cy, 0.5, 0.05);
            }

            // Compute transform: maps video coords → zoomed canvas view
            const { cx, cy, scale } = faceZoomRef.current;
            const cw = canvas.width, ch = canvas.height;
            const rawTx = cw / 2 - cx * cw * scale;
            const rawTy = ch / 2 - cy * ch * scale;
            // Clamp so video always covers the canvas (no black edges)
            const tx = Math.min(0, Math.max(cw * (1 - scale), rawTx));
            const ty = Math.min(0, Math.max(ch * (1 - scale), rawTy));

            ctx.save();
            ctx.setTransform(scale, 0, 0, scale, tx, ty);
            ctx.drawImage(video, 0, 0, cw, ch);

            if (detected) {
              const rawLandmarks = result.faceLandmarks[0];

              // Apply EMA smoothing (alpha=0.25) to landmark positions to reduce jitter
              const n = rawLandmarks.length;
              if (!emaXRef.current || emaXRef.current.length !== n) {
                emaXRef.current = new Float32Array(rawLandmarks.map(l => l.x));
                emaYRef.current = new Float32Array(rawLandmarks.map(l => l.y));
              } else {
                const alpha = 0.25;
                for (let i = 0; i < n; i++) {
                  emaXRef.current[i] = alpha * rawLandmarks[i].x + (1 - alpha) * emaXRef.current[i];
                  emaYRef.current![i] = alpha * rawLandmarks[i].y + (1 - alpha) * emaYRef.current![i];
                }
              }
              const smoothedLandmarks: NormalizedLandmark[] = rawLandmarks.map((l, i) => ({
                ...l,
                x: emaXRef.current![i],
                y: emaYRef.current![i],
              }));

              drawFace(ctx, smoothedLandmarks, cw, ch);

              if (hoveredId && FACE_HIGHLIGHTS[hoveredId]) {
                drawHighlight(ctx, smoothedLandmarks, FACE_HIGHLIGHTS[hoveredId], cw, ch);
              }

              if (shouldUpdateUI) {
                // Head pose quality gate — skip metrics when face is too angled
                const matrixData = result.facialTransformationMatrixes?.[0]?.data;
                let poseOk = true;
                if (matrixData) {
                  const { yaw, pitch } = getHeadPose(Array.from(matrixData));
                  if (Math.abs(yaw) > 18 || Math.abs(pitch) > 18) {
                    poseOk = false;
                  }
                }

                if (poseOk) {
                  setFaceQuality("ok");
                  // Scale x by aspect ratio so x/y distances are in the same units
                  const ar = canvas.width / canvas.height;
                  const arSmoothed = smoothedLandmarks.map(l => ({ ...l, x: l.x * ar }));
                  const { metrics, overall } = calcFaceMetrics(arSmoothed);
                  setFaceMetrics(metrics);
                  setOverallScore(overall);
                } else {
                  setFaceQuality("angle");
                }
                lastUIUpdateRef.current = timestamp;
              }
            } else {
              setFaceQuality(null);
              emaXRef.current = null;
              emaYRef.current = null;
            }

            ctx.restore();
          }
        } catch {
          // Detection errors are non-fatal; continue loop
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Model load failed";
      setError(`Detection error: ${msg}`);
      setIsReady(false);
    }
  }, [videoRef, canvasRef, setBodyMetrics, setFaceMetrics, setOverallScore, setIsReady, setIsDetecting, setIsSubjectDetected, setError, setStableForMs, setFaceQuality, setBodyQuality]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, capturePhoto };
}
