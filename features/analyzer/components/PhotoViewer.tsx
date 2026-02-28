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
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto"
      >
        {/* Download */}
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

        {/* Reset with confirmation */}
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

      {/* Gallery strip — only if more than 1 photo */}
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
