import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { symmetryScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Facial averageness: proximity to population-average proportions
// Research (Langlois & Roggman, 1990): average faces are rated most attractive (koinophilia)
const AVERAGE_PROPORTIONS = {
  eyeSpacing: 0.46,  // IPD / face width (inner eye corners)
  noseWidth:  0.25,  // alae width / face width (64, 294)
  mouthWidth: 0.50,  // mouth width / face width (61, 291)
};

export function calcFacialAverageness(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "facial-averageness",
    label: "Averageness",
    description: "Closeness to population-average proportions — average faces are rated most attractive (koinophilia effect).",
    ideal: "closest",
    unit: "%",
  };

  const leftCheek  = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEye    = landmarks[133];
  const rightEye   = landmarks[362];

  if (!leftCheek || !rightCheek || !leftEye || !rightEye) return { ...base, value: null, score: null };

  const faceW = Math.abs(rightCheek.x - leftCheek.x);
  if (faceW < 0.001) return { ...base, value: null, score: null };

  const deviations: number[] = [];

  // Eye spacing
  const ipd = Math.abs(rightEye.x - leftEye.x) / faceW;
  deviations.push(Math.abs(ipd - AVERAGE_PROPORTIONS.eyeSpacing));

  // Nose width (alae base)
  const leftNose  = landmarks[64];
  const rightNose = landmarks[294];
  if (leftNose && rightNose) {
    const noseW = Math.abs(rightNose.x - leftNose.x) / faceW;
    deviations.push(Math.abs(noseW - AVERAGE_PROPORTIONS.noseWidth));
  }

  // Mouth width
  const leftMouth  = landmarks[61];
  const rightMouth = landmarks[291];
  if (leftMouth && rightMouth) {
    const mouthW = Math.abs(rightMouth.x - leftMouth.x) / faceW;
    deviations.push(Math.abs(mouthW - AVERAGE_PROPORTIONS.mouthWidth));
  }

  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const avgDevPct = avgDeviation * 100;
  // sigma=10: reflects realistic population spread in 2D proportions (~8–12% SD);
  // tighter sigma caused false-low scores from MediaPipe 2D noise + demographic variation
  const score = symmetryScore(avgDevPct, 10);
  const averageness = parseFloat(((1 - avgDeviation) * 100).toFixed(1));

  return { ...base, value: averageness, score: parseFloat(score.toFixed(1)) };
}
