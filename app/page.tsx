import Link from "next/link";

const BODY_METRICS = [
  "Shoulder/Hip Ratio",
  "Waist/Hip Ratio",
  "Leg/Height Ratio",
  "Posture Expansiveness",
  "Spinal Alignment",
  "Body Symmetry",
];

const FACE_METRICS = [
  "Jaw Prominence",
  "Eye Attractiveness",
  "Facial Symmetry",
  "Facial Width/Height",
  "Facial Thirds",
  "Facial Averageness",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <span className="text-lg font-black tracking-tight">
          FORM<span className="text-emerald-400">SCORE</span>
        </span>
        <Link
          href="/analyze"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Open Analyzer →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center gap-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs text-emerald-400 font-medium mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Runs entirely in your browser — no data leaves your device
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
            Real-time{" "}
            <span className="text-emerald-400">attractiveness</span>{" "}
            analysis
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Point your camera at yourself. Get live scores across 12
            scientifically-grounded physical metrics — body proportions and
            facial geometry, measured frame by frame.
          </p>
        </div>

        <Link
          href="/analyze"
          className="group relative inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-8 py-4 rounded-full transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:scale-105"
        >
          <span className="w-2 h-2 rounded-full bg-black/40 animate-pulse" />
          Start Analysis
          <span className="text-black/60 group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>

        <p className="text-xs text-zinc-600">
          Camera permission required · Works best in Chrome/Edge
        </p>
      </section>

      {/* Metrics grid */}
      <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Body */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏋️</span>
              <h2 className="font-bold text-base">Body Mode</h2>
              <span className="ml-auto text-xs text-zinc-500">Stand 1.5m back</span>
            </div>
            <ul className="flex flex-col gap-2">
              {BODY_METRICS.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Face */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧑</span>
              <h2 className="font-bold text-base">Face Mode</h2>
              <span className="ml-auto text-xs text-zinc-500">Fill frame with face</span>
            </div>
            <ul className="flex flex-col gap-2">
              {FACE_METRICS.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Powered by MediaPipe Tasks Vision · 478-point facial landmarks · 33-point pose landmarks · 30+ FPS via WebAssembly
        </p>
      </section>
    </main>
  );
}
