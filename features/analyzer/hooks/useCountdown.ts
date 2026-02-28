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
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

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

    // Guard against empty capture (camera stopped early)
    if (!dataUrl) {
      setCapturePhase("positioning");
      return;
    }

    const video = videoRef.current;
    let metrics: ReturnType<typeof calcBodyMetrics> | null = null;
    const currentMode = modeRef.current;

    if (video) {
      try {
        // Use performance.now() + 1 to avoid "timestamp must be strictly greater" error
        const ts = performance.now() + 1;
        if (currentMode === "body") {
          const pose = await getPoseLandmarker();
          const result = pose.detectForVideo(video, ts);
          if (result.landmarks.length > 0) {
            metrics = calcBodyMetrics(result.landmarks[0]);
          }
        } else {
          const face = await getFaceLandmarker();
          const result = face.detectForVideo(video, ts);
          if (result.faceLandmarks.length > 0) {
            metrics = calcFaceMetrics(result.faceLandmarks[0]);
          }
        }
      } catch {
        // non-fatal — photo still saved, metrics just empty
      }
    }

    const photo: CapturedPhoto = {
      dataUrl,
      metrics: metrics?.metrics ?? [],
      overallScore: metrics?.overall ?? null,
      mode: currentMode,
      takenAt: Date.now(),
    };

    if (metrics) {
      if (currentMode === "body") setBodyMetrics(metrics.metrics);
      else setFaceMetrics(metrics.metrics);
      setOverallScore(metrics.overall);
    }

    addCapturedPhoto(photo); // also sets capturePhase to "results"
  }, [capturePhoto, videoRef, setCapturePhase, addCapturedPhoto, setBodyMetrics, setFaceMetrics, setOverallScore]);

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

  // Reset countdown if mode changes mid-countdown
  useEffect(() => {
    if (capturePhase === "countdown") {
      stopCountdown();
      setCapturePhase("positioning");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    return () => stopCountdown();
  }, [stopCountdown]);
}
