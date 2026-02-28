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
