"use client";

import { motion, AnimatePresence } from "motion/react";
import type { MetricResult } from "@/types/metrics";
import { useAnalyzerStore } from "@/store/analyzer.store";

function scoreColor(score: number | null): string {
  if (score === null) return "text-zinc-500";
  if (score >= 7) return "text-emerald-400";
  if (score >= 4) return "text-amber-400";
  return "text-red-400";
}

function barColor(score: number | null): string {
  if (score === null) return "bg-zinc-700";
  if (score >= 7) return "bg-emerald-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-500";
}

interface MetricCardProps {
  metric: MetricResult;
}

export function MetricCard({ metric }: MetricCardProps) {
  const { label, description, value, score, unit, ideal } = metric;
  const pct = score !== null ? (score / 10) * 100 : 0;

  const hoveredMetricId = useAnalyzerStore((s) => s.hoveredMetricId);
  const setHoveredMetricId = useAnalyzerStore((s) => s.setHoveredMetricId);
  const isHovered = hoveredMetricId === metric.id;

  return (
    <motion.div
      className="flex flex-col gap-1.5 py-2.5 border-b border-zinc-800/60 last:border-0 rounded-md px-1.5 -mx-1.5 cursor-default transition-colors"
      animate={{
        backgroundColor: isHovered ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => setHoveredMetricId(metric.id)}
      onMouseLeave={() => setHoveredMetricId(null)}
    >
      {/* Row: label + value + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-300 font-semibold leading-none">{label}</span>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-[9px] font-medium text-zinc-500 bg-zinc-800 rounded px-1 py-0.5 leading-none"
              >
                highlighted
              </motion.span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 leading-snug line-clamp-2">{description}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {value !== null && (
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {value}{unit ?? ""}
            </span>
          )}
          <AnimatePresence mode="wait">
            <motion.span
              key={score ?? "null"}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.15 }}
              className={`text-sm font-black tabular-nums w-8 text-right ${scoreColor(score)}`}
            >
              {score !== null ? score.toFixed(1) : "—"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor(score)}`}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      {ideal && (
        <span className="text-[9px] text-zinc-600 leading-none">ideal: {ideal}</span>
      )}
    </motion.div>
  );
}
