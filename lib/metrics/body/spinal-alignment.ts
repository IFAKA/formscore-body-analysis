import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { symmetryScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmarks: 0=nose, 11=left shoulder, 12=right shoulder, 23=left hip, 24=right hip
export function calcSpinalAlignment(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "spinal-alignment",
    label: "Alignment",
    description: "Vertical alignment of nose → shoulders → hips — good posture indicates structural health and discipline.",
    ideal: "< 3%",
    unit: "%",
  };

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (!visible(nose) || !visible(lShoulder) || !visible(rShoulder) || !visible(lHip) || !visible(rHip)) return { ...base, value: null, score: null };

  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
  const hipMidX = (lHip.x + rHip.x) / 2;

  const d1 = Math.abs(shoulderMidX - nose.x);
  const d2 = Math.abs(hipMidX - nose.x);
  const maxDeviation = Math.max(d1, d2);

  const shoulderW = Math.abs(rShoulder.x - lShoulder.x);
  const deviationPct = shoulderW > 0.001 ? (maxDeviation / shoulderW) * 100 : 100;

  // sigma=5: MediaPipe pose jitter on a static frame is 2–5%, so sigma=3 was scoring
  // even good posture poorly; sigma=5 still penalises visible lean
  const score = symmetryScore(deviationPct, 5);

  return { ...base, value: parseFloat(deviationPct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
