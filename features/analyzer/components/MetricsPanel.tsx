"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { MetricCard } from "./MetricCard";
import { OverallScore } from "./OverallScore";

function gradeFromScore(score: number): string {
  if (score >= 9) return "S";
  if (score >= 8.5) return "A+";
  if (score >= 8) return "A";
  if (score >= 7.5) return "B+";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 5) return "D";
  return "F";
}

export function MetricsPanel() {
  const mode = useAnalyzerStore((s) => s.mode);
  const bodyMetrics = useAnalyzerStore((s) => s.bodyMetrics);
  const faceMetrics = useAnalyzerStore((s) => s.faceMetrics);
  const overallScore = useAnalyzerStore((s) => s.overallScore);
  const isSubjectDetected = useAnalyzerStore((s) => s.isSubjectDetected);
  const isDetecting = useAnalyzerStore((s) => s.isDetecting);
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);

  const metrics = mode === "body" ? bodyMetrics : faceMetrics;
  const waiting = isDetecting && !isSubjectDetected && capturePhase !== "results";

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const lines: string[] = [];
    const modeLabel = mode === "body" ? "Body" : "Face";

    lines.push(`FormScore — ${modeLabel} Analysis`);
    lines.push("═".repeat(36));

    if (overallScore !== null) {
      lines.push(`Overall Score: ${overallScore.toFixed(1)} / 10  (${gradeFromScore(overallScore)})`);
    } else {
      lines.push("Overall Score: — (no subject detected)");
    }
    lines.push("");

    for (const m of metrics) {
      lines.push(m.label);
      const valuePart = m.value !== null ? `${m.value}${m.unit ?? ""}` : "—";
      const scorePart = m.score !== null ? `${m.score.toFixed(1)}/10` : "—";
      const idealPart = m.ideal ? `  |  Ideal: ${m.ideal}` : "";
      lines.push(`  Measured: ${valuePart}${idealPart}  |  Score: ${scorePart}`);
      lines.push(`  ${m.description}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("Scores are 0–10 (10 = closest to the research-backed ideal).");

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [mode, metrics, overallScore]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">
            {mode === "body" ? "Body Metrics" : "Face Metrics"}
          </span>
          {capturePhase === "results" && (
            <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2 py-0.5 tracking-wider">
              PHOTO
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          <motion.button
            onClick={handleCopy}
            title="Copy metrics for AI analysis"
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 cursor-pointer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="text-emerald-400 flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5L4 8L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <rect x="3.5" y="1" width="5.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M1 3.5H2.5V9H7V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copy for AI
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Waiting indicator chip */}
          <AnimatePresence>
            {waiting && (
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-medium text-amber-400 tracking-wide">WAITING</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Metric cards */}
      <div className={`flex-1 overflow-y-auto px-4 py-2 transition-opacity duration-300 ${waiting ? "opacity-25 pointer-events-none select-none" : "opacity-100"}`}>
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Overall score */}
      <div className={`border-t border-zinc-800 p-4 transition-opacity duration-300 ${waiting ? "opacity-25 pointer-events-none select-none" : "opacity-100"}`}>
        <OverallScore />
      </div>
    </div>
  );
}
