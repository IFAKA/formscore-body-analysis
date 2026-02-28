import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Arm span (wrist-to-wrist) relative to body height — Vitruvian proportion
// Landmarks: 15=left wrist, 16=right wrist, 0=nose, 27=left ankle, 28=right ankle
export function calcArmSpanRatio(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "arm-span-ratio",
    label: "Arm Span",
    description: "Wrist-to-wrist span vs height — broad arm reach (Vitruvian Man ~1.0) signals size and physical presence.",
    ideal: "~1.0",
  };

  const lWrist = landmarks[15];
  const rWrist = landmarks[16];
  const nose = landmarks[0];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];

  if (!visible(lWrist) || !visible(rWrist) || !visible(nose) || !visible(lAnkle) || !visible(rAnkle)) return { ...base, value: null, score: null };

  const armSpan = Math.abs(rWrist.x - lWrist.x);
  const ankleY = (lAnkle.y + rAnkle.y) / 2;
  const bodyHeight = Math.abs(ankleY - nose.y);

  if (bodyHeight < 0.01 || armSpan < 0.01) return { ...base, value: null, score: null };

  // Only compute when arms are raised to roughly shoulder height (T-pose / Vitruvian pose).
  // Arms at sides produce an artificially low ratio — gate on wrist-to-shoulder vertical offset.
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  if (lShoulder && rShoulder) {
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const wristY = (lWrist.y + rWrist.y) / 2;
    if (Math.abs(wristY - shoulderY) / bodyHeight > 0.18) return { ...base, value: null, score: null };
  }

  const ratio = armSpan / bodyHeight;

  // Ideal: arm span ≈ height (Vitruvian Man ratio = 1.0)
  // Arms-down resting position reads lower; arms open reads ~1.0–1.05
  const score = gaussianScore(ratio, 1.0, 0.15);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
