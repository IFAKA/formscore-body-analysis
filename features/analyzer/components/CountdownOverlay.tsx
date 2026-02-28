"use client";

import { motion, AnimatePresence } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { useEffect, useState } from "react";

export function CountdownOverlay() {
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const [displayNumber, setDisplayNumber] = useState(3);

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
          <div className="absolute inset-0 bg-black/30" />

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
