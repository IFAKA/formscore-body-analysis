"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import type { AnalysisMode } from "@/types/metrics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MODES: { id: AnalysisMode; label: string; emoji: string; hint: string }[] = [
  { id: "body", label: "Body", emoji: "🏋️", hint: "Stand 1.5m back" },
  { id: "face", label: "Face", emoji: "🧑", hint: "Fill frame with face" },
];

export function ModeToggle() {
  const mode = useAnalyzerStore((s) => s.mode);
  const setMode = useAnalyzerStore((s) => s.setMode);
  const capturePhase = useAnalyzerStore((s) => s.capturePhase);
  const resetCapture = useAnalyzerStore((s) => s.resetCapture);

  const [pendingMode, setPendingMode] = useState<AnalysisMode | null>(null);

  function handleModeClick(id: AnalysisMode) {
    if (id === mode) return;
    if (capturePhase === "results") {
      setPendingMode(id);
    } else {
      setMode(id);
    }
  }

  function confirmSwitch() {
    if (!pendingMode) return;
    resetCapture();
    setMode(pendingMode);
    setPendingMode(null);
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          {MODES.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => handleModeClick(id)}
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              aria-pressed={mode === id}
            >
              {mode === id && (
                <motion.div
                  layoutId="mode-indicator"
                  className="absolute inset-0 bg-zinc-700 rounded-md"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 text-sm">{emoji}</span>
              <span
                className={`relative z-10 ${
                  mode === id ? "text-white" : "text-zinc-400"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 text-center">
          {MODES.find((m) => m.id === mode)?.hint}
        </p>
      </div>

      <AlertDialog open={!!pendingMode} onOpenChange={(open) => !open && setPendingMode(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {pendingMode} mode?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will clear your current results and restart the camera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              onClick={() => setPendingMode(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSwitch}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
