import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmarks: 11=left shoulder, 12=right shoulder, 23=left hip, 24=right hip
export function calcWaistHipRatio(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "waist-hip-ratio",
    label: "Waist / Hip",
    description: "Waist narrowness relative to hips (estimated) — a slim waist indicates low body fat and an athletic torso.",
    ideal: "0.80",
  };

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (!visible(lShoulder) || !visible(rShoulder) || !visible(lHip) || !visible(rHip)) return { ...base, value: null, score: null };

  const hipW = Math.abs(rHip.x - lHip.x);
  const shoulderW = Math.abs(rShoulder.x - lShoulder.x);

  if (hipW < 0.001) return { ...base, value: null, score: null };

  // Waist approximated as 85% of avg(shoulder, hip) — standard body proportion heuristic
  const waistW = ((shoulderW + hipW) / 2) * 0.85;
  const ratio = waistW / hipW;
  // sigma=0.12: waist is estimated (not directly measured), so the estimate carries ~10%
  // systematic offset; tighter sigma caused most people to score <4/10
  const score = gaussianScore(ratio, 0.80, 0.12);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
