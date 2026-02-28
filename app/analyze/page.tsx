"use client";

import { CameraCanvas } from "@/features/analyzer/components/CameraCanvas";
import { MetricsPanel } from "@/features/analyzer/components/MetricsPanel";
import { ModeToggle } from "@/features/analyzer/components/ModeToggle";

export default function AnalyzePage() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black tracking-tight text-white">
            FORM<span className="text-emerald-400">SCORE</span>
          </span>
          <span className="hidden sm:block text-xs text-zinc-500">
            AI attractiveness analysis
          </span>
        </div>
        <div className="w-48 sm:w-56">
          <ModeToggle />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Camera feed — 65% */}
        <div className="flex-1 min-w-0">
          <CameraCanvas />
        </div>

        {/* Metrics sidebar — 35%, min 240px, max 320px */}
        <div className="w-[280px] sm:w-[300px] lg:w-[320px] shrink-0 overflow-hidden">
          <MetricsPanel />
        </div>
      </div>
    </div>
  );
}
