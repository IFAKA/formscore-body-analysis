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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function computeCentroid(landmarks: { x: number; y: number }[]): { x: number; y: number } {
  const n = landmarks.length;
  if (n === 0) return { x: 0.5, y: 0.5 };
  const sx = landmarks.reduce((a, l) => a + l.x, 0);
  const sy = landmarks.reduce((a, l) => a + l.y, 0);
  return { x: sx / n, y: sy / n };
}

const STABILITY_THRESHOLD = 0.05;   // 5% of frame width
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

  const modeRef = useRef(mode);
  useEffect(() => {
    if (mode === "face") {
      faceZoomRef.current = { cx: 0.5, cy: 0.5, scale: 1.0 };
    }
    modeRef.current = mode;
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

  const capturePhoto = useCallback((): string => {
    const video = videoRef.current;
    if (!video) return "";
    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return "";
    // Draw raw video (no landmarks — CSS mirror handles display)
    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    return offscreen.toDataURL("image/jpeg", 0.92);
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

            // Stability tracking (body)
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

            if (landmarks) {
              drawPose(ctx, landmarks, canvas.width, canvas.height);
              if (hoveredId && BODY_HIGHLIGHTS[hoveredId]) {
                drawHighlight(ctx, landmarks, BODY_HIGHLIGHTS[hoveredId], canvas.width, canvas.height);
              }
            }

            if (fullyVisible && landmarks && shouldUpdateUI) {
              const { metrics, overall } = calcBodyMetrics(landmarks);
              setBodyMetrics(metrics);
              setOverallScore(overall);
              lastUIUpdateRef.current = timestamp;
            }
          } else {
            // Face mode — detect first, then draw with zoom transform
            const face = await getFaceLandmarker();
            const result = face.detectForVideo(video, timestamp);

            const detected = result.faceLandmarks.length > 0;
            setIsSubjectDetected(detected);

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
              const landmarks = result.faceLandmarks[0];
              drawFace(ctx, landmarks, cw, ch);

              if (hoveredId && FACE_HIGHLIGHTS[hoveredId]) {
                drawHighlight(ctx, landmarks, FACE_HIGHLIGHTS[hoveredId], cw, ch);
              }

              if (shouldUpdateUI) {
                const { metrics, overall } = calcFaceMetrics(landmarks);
                setFaceMetrics(metrics);
                setOverallScore(overall);
                lastUIUpdateRef.current = timestamp;
              }
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
  }, [videoRef, canvasRef, setBodyMetrics, setFaceMetrics, setOverallScore, setIsReady, setIsDetecting, setIsSubjectDetected, setError, setStableForMs]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, capturePhoto };
}
