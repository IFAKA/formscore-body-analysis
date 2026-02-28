import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Interpupillary distance relative to face width
// Landmarks: 468=left pupil, 473=right pupil (with refinement), fallback to 133/362 eye corners
export function calcEyeAttractiveness(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "eye-attractiveness",
    label: "Eye Spacing",
    description: "Interpupillary distance / face width — the most studied eye proportion. Ideal is ~46% of face width.",
    ideal: "0.46",
  };

  const leftPupil = landmarks[468] ?? landmarks[133];
  const rightPupil = landmarks[473] ?? landmarks[362];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  if (!leftPupil || !rightPupil || !leftCheek || !rightCheek) return { ...base, value: null, score: null };

  const faceW = Math.abs(rightCheek.x - leftCheek.x);
  const ipd = Math.abs(rightPupil.x - leftPupil.x);

  if (faceW < 0.001) return { ...base, value: null, score: null };

  const ratio = ipd / faceW;

  // Reject implausible values (foreshortening or occlusion artifact)
  if (ratio < 0.25 || ratio > 0.65) return { ...base, value: null, score: null };

  const score = gaussianScore(ratio, 0.46, 0.05);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
