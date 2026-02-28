"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCamera } from "../hooks/useCamera";
import { useDetectionLoop } from "../hooks/useDetectionLoop";
import { useCountdown } from "../hooks/useCountdown";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { CountdownOverlay } from "./CountdownOverlay";
import { CaptureFlash } from "./CaptureFlash";
import { PhotoViewer } from "./PhotoViewer";

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

  // Stop detection loop once results are in
  useEffect(() => {
    if (isInResults) {
      stop();
      stopCamera();
    }
  }, [isInResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePhoto = isInResults ? capturedPhotos[activePhotoIndex] : null;

  const statusText = (() => {
    if (!isDetecting) return null;
    if (!isSubjectDetected) {
      return mode === "body"
        ? "Step back until your full body is visible"
        : "Look directly at the camera";
    }
    if (stableForMs < 1000) return "Hold still...";
    return null;
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

      {/* Not-in-frame overlay */}
      <AnimatePresence>
        {isDetecting && !isSubjectDetected && !isInResults && capturePhase === "positioning" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-[2px]"
          >
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

      {/* "Hold still" status strip */}
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

      {/* Green guide border when stable and ready */}
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

      {/* Photo viewer toolbar + gallery */}
      <PhotoViewer />

      {/* Phase indicator badge */}
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
