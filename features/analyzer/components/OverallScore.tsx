"use client";

import { motion, AnimatePresence } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";

function scoreGrade(score: number): string {
  if (score >= 9) return "S";
  if (score >= 8.5) return "A+";
  if (score >= 8) return "A";
  if (score >= 7.5) return "B+";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 5) return "D";
  return "F";
}

function scoreColorClass(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 4) return "text-amber-400";
  return "text-red-400";
}

function barColorClass(score: number): string {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-500";
}

export function OverallScore() {
  const overallScore = useAnalyzerStore((s) => s.overallScore);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">
        Overall
      </span>

      <div className="flex items-end justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={overallScore ?? "null"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex items-end gap-2"
          >
            <span
              className={`text-4xl font-black tabular-nums ${
                overallScore !== null ? scoreColorClass(overallScore) : "text-zinc-600"
              }`}
            >
              {overallScore !== null ? overallScore.toFixed(1) : "—"}
            </span>
            {overallScore !== null && (
              <span className="text-sm font-bold text-zinc-500 mb-1">
                / 10
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {overallScore !== null && (
          <span className={`text-2xl font-black ${scoreColorClass(overallScore)}`}>
            {scoreGrade(overallScore)}
          </span>
        )}
      </div>

      {/* Score bar */}
      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            overallScore !== null ? barColorClass(overallScore) : "bg-zinc-700"
          }`}
          animate={{ width: overallScore !== null ? `${(overallScore / 10) * 100}%` : "0%" }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
      </div>

      {overallScore === null && (
        <p className="text-xs text-zinc-600">
          {`Point camera at yourself to begin`}
        </p>
      )}
    </div>
  );
}
