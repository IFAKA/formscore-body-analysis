export type AnalysisMode = "body" | "face";

export interface MetricResult {
  id: string;
  label: string;
  description: string;
  value: number | null;
  score: number | null; // 0–10
  unit?: string;
  ideal?: string;
}

export type CapturePhase = "positioning" | "countdown" | "capturing" | "results";

export interface CapturedPhoto {
  dataUrl: string;      // base64 JPEG, no landmarks
  metrics: MetricResult[];
  overallScore: number | null;
  mode: AnalysisMode;
  takenAt: number;      // Date.now()
}

export interface AnalyzerState {
  mode: AnalysisMode;
  bodyMetrics: MetricResult[];
  faceMetrics: MetricResult[];
  overallScore: number | null;
  isReady: boolean;
  isDetecting: boolean;
  isSubjectDetected: boolean;
  error: string | null;
  hoveredMetricId: string | null;
  capturePhase: CapturePhase;
  stableForMs: number;
  capturedPhotos: CapturedPhoto[];
  activePhotoIndex: number;
  setMode: (mode: AnalysisMode) => void;
  setBodyMetrics: (metrics: MetricResult[]) => void;
  setFaceMetrics: (metrics: MetricResult[]) => void;
  setOverallScore: (score: number | null) => void;
  setIsReady: (ready: boolean) => void;
  setIsDetecting: (detecting: boolean) => void;
  setIsSubjectDetected: (detected: boolean) => void;
  setError: (error: string | null) => void;
  setHoveredMetricId: (id: string | null) => void;
  setCapturePhase: (phase: CapturePhase) => void;
  setStableForMs: (ms: number) => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  setActivePhotoIndex: (index: number) => void;
  resetCapture: () => void;
}

export const BODY_METRIC_IDS = [
  "shoulder-hip-ratio",
  "waist-hip-ratio",
  "leg-height-ratio",
  "posture-expansiveness",
  "spinal-alignment",
  "body-symmetry",
  "arm-span-ratio",
] as const;

export const FACE_METRIC_IDS = [
  "jaw-prominence",
  "eye-attractiveness",
  "facial-symmetry",
  "fwhr",
  "facial-thirds",
  "facial-averageness",
  "canthal-tilt",
  "eye-openness",
  "lip-fullness",
  "cheekbone-definition",
  "nose-bridge-straightness",
  "brow-eye-distance",
  "iris-sclera-ratio",
  "philtrum-length",
  "upper-lower-lip-ratio",
] as const;

export type BodyMetricId = (typeof BODY_METRIC_IDS)[number];
export type FaceMetricId = (typeof FACE_METRIC_IDS)[number];

// Weights must sum to 1.0 per mode
export const BODY_WEIGHTS: Record<BodyMetricId, number> = {
  "shoulder-hip-ratio":    0.22,
  "waist-hip-ratio":       0.18,
  "leg-height-ratio":      0.12,
  "posture-expansiveness": 0.18,
  "spinal-alignment":      0.10,
  "body-symmetry":         0.12,
  "arm-span-ratio":        0.08,
};

export const FACE_WEIGHTS: Record<FaceMetricId, number> = {
  "jaw-prominence":           0.11,
  "eye-attractiveness":       0.08,
  "facial-symmetry":          0.10,
  "fwhr":                     0.08,
  "facial-thirds":            0.05,
  "facial-averageness":       0.05,
  "canthal-tilt":             0.10,
  "eye-openness":             0.06,
  "lip-fullness":             0.06,
  "cheekbone-definition":     0.05,
  "nose-bridge-straightness": 0.06,
  "brow-eye-distance":        0.05,
  "iris-sclera-ratio":        0.05,
  "philtrum-length":          0.04,
  "upper-lower-lip-ratio":    0.06,
};
