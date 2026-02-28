"use client";

import { create } from "zustand";
import type { AnalyzerState, AnalysisMode, MetricResult, CapturePhase, CapturedPhoto } from "@/types/metrics";
import { BODY_METRIC_IDS, FACE_METRIC_IDS } from "@/types/metrics";

interface MetricMeta { label: string; description: string }

function makeEmpty(ids: readonly string[], meta: Record<string, MetricMeta>): MetricResult[] {
  return ids.map((id) => ({
    id,
    label: meta[id]?.label ?? id,
    description: meta[id]?.description ?? "",
    value: null,
    score: null,
  }));
}

const BODY_META: Record<string, MetricMeta> = {
  "shoulder-hip-ratio":    { label: "Shoulder / Hip",  description: "The V-taper — wider shoulders vs hips signals physical dominance and muscularity." },
  "waist-hip-ratio":       { label: "Waist / Hip",     description: "Waist narrowness relative to hips — a slim waist indicates low body fat and an athletic torso." },
  "leg-height-ratio":      { label: "Leg / Height",    description: "Leg length as % of total height — longer legs are consistently rated more attractive across cultures." },
  "posture-expansiveness": { label: "Posture",         description: "Shoulder spread vs height — an upright, expansive stance signals confidence and social dominance." },
  "spinal-alignment":      { label: "Alignment",       description: "Vertical alignment of nose → shoulders → hips — good posture indicates structural health and discipline." },
  "body-symmetry":         { label: "Symmetry",        description: "Left/right bilateral symmetry across shoulders, hips, knees, and ankles — a universal marker of developmental health." },
  "arm-span-ratio":        { label: "Arm Span",        description: "Wrist-to-wrist span vs height — broad arm reach (Vitruvian Man ~1.0) signals size and physical presence." },
};

const FACE_META: Record<string, MetricMeta> = {
  "jaw-prominence":       { label: "Jaw",            description: "Jaw width and angularity relative to cheekbones — a defined jaw signals testosterone and genetic fitness." },
  "eye-attractiveness":   { label: "Eye Spacing",    description: "Interpupillary distance / face width — the most studied eye proportion. Ideal is ~46% of face width." },
  "facial-symmetry":      { label: "Face Symmetry",  description: "Mirror match of left vs right features across 17 landmark pairs — symmetry signals developmental health and genetic quality." },
  "fwhr":                 { label: "fWHR",           description: "Facial width-to-height ratio — ~1.9 is linked to perceived social dominance and testosterone levels." },
  "facial-thirds":        { label: "Facial Thirds",  description: "Forehead : midface : lower face vertical balance — a 1:1:1 ratio is the classical beauty standard." },
  "facial-averageness":   { label: "Averageness",    description: "Closeness to population-average proportions — average faces are rated most attractive (koinophilia effect)." },
  "canthal-tilt":         { label: "Canthal Tilt",   description: "Eye axis angle — a slight upward outer-corner tilt creates the coveted 'hunter eye' look associated with dominance." },
  "eye-openness":         { label: "Eye Openness",   description: "Vertical eye aperture vs face height — larger, well-defined eyes signal youth, alertness, and vitality." },
  "lip-fullness":         { label: "Lip Fullness",   description: "Total lip height relative to face height — full, well-defined lips are a strong signal of youth and attractiveness." },
  "cheekbone-definition":     { label: "Cheekbones",    description: "Cheekbone width vs jaw width — high, prominent cheekbones tapering to a defined jaw are universally attractive." },
  "nose-bridge-straightness": { label: "Nose Bridge",   description: "Straightness of the nose bridge line from nasion to tip — a straight bridge is associated with structural symmetry." },
  "brow-eye-distance":        { label: "Brow–Eye Gap",  description: "Vertical gap between eyebrow lower edge and upper eyelid — a closer brow ridge signals masculine dominance." },
  "iris-sclera-ratio":        { label: "Iris Size",     description: "Iris diameter vs visible eye width — a large, prominent iris (limbal ring) signals youth and vitality." },
  "philtrum-length":          { label: "Philtrum",      description: "Nose-base to upper-lip distance relative to face height — a shorter philtrum is a sign of youthfulness." },
  "upper-lower-lip-ratio":    { label: "Lip Ratio",     description: "Upper vs lower lip thickness — ideal ratio is ~1:1.5 (lower fuller), a hallmark of an attractive mouth." },
};

export const useAnalyzerStore = create<AnalyzerState>((set) => ({
  mode: "body",
  bodyMetrics: makeEmpty(BODY_METRIC_IDS, BODY_META),
  faceMetrics: makeEmpty(FACE_METRIC_IDS, FACE_META),
  overallScore: null,
  isReady: false,
  isDetecting: false,
  isSubjectDetected: false,
  error: null,
  hoveredMetricId: null,
  capturePhase: "positioning" as CapturePhase,
  stableForMs: 0,
  capturedPhotos: [],
  activePhotoIndex: 0,

  setMode: (mode: AnalysisMode) => set({ mode }),
  setBodyMetrics: (bodyMetrics: MetricResult[]) => set({ bodyMetrics }),
  setFaceMetrics: (faceMetrics: MetricResult[]) => set({ faceMetrics }),
  setOverallScore: (overallScore: number | null) => set({ overallScore }),
  setIsReady: (isReady: boolean) => set({ isReady }),
  setIsDetecting: (isDetecting: boolean) => set({ isDetecting }),
  setIsSubjectDetected: (isSubjectDetected: boolean) => set({ isSubjectDetected }),
  setError: (error: string | null) => set({ error }),
  setHoveredMetricId: (hoveredMetricId: string | null) => set({ hoveredMetricId }),
  setCapturePhase: (capturePhase: CapturePhase) => set({ capturePhase }),
  setStableForMs: (stableForMs: number) => set({ stableForMs }),
  addCapturedPhoto: (photo: CapturedPhoto) =>
    set((s) => ({
      capturedPhotos: [...s.capturedPhotos, photo],
      activePhotoIndex: s.capturedPhotos.length,
      capturePhase: "results" as CapturePhase,
    })),
  setActivePhotoIndex: (activePhotoIndex: number) => set({ activePhotoIndex }),
  resetCapture: () =>
    set({
      capturePhase: "positioning" as CapturePhase,
      stableForMs: 0,
      capturedPhotos: [],
      activePhotoIndex: 0,
      bodyMetrics: makeEmpty(BODY_METRIC_IDS, BODY_META),
      faceMetrics: makeEmpty(FACE_METRIC_IDS, FACE_META),
      overallScore: null,
      isSubjectDetected: false,
    }),
}));
