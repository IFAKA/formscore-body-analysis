import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { rangeScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmarks: 11=left shoulder, 12=right shoulder, 23=left hip, 24=right hip
export function calcShoulderHipRatio(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "shoulder-hip-ratio",
    label: "Shoulder / Hip",
    description: "The V-taper — wider shoulders vs hips signals physical dominance and muscularity.",
    ideal: "1.20–1.50",
  };

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (!visible(lShoulder) || !visible(rShoulder) || !visible(lHip) || !visible(rHip)) {
    return { ...base, value: null, score: null };
  }

  const shoulderW = Math.abs(rShoulder.x - lShoulder.x);
  const hipW = Math.abs(rHip.x - lHip.x);

  if (hipW < 0.001) return { ...base, value: null, score: null };

  const ratio = shoulderW / hipW;
  const score = rangeScore(ratio, 1.2, 1.5, 0.2);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
