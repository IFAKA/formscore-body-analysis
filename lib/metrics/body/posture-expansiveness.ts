import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmarks: 0=nose, 11=left shoulder, 12=right shoulder, 27=left ankle, 28=right ankle
export function calcPostureExpansiveness(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "posture-expansiveness",
    label: "Posture",
    description: "Shoulder spread vs height — an upright, expansive stance signals confidence and social dominance.",
    ideal: "~0.26",
  };

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];

  if (!visible(nose) || !visible(lShoulder) || !visible(rShoulder) || !visible(lAnkle) || !visible(rAnkle)) return { ...base, value: null, score: null };

  const shoulderW = Math.abs(rShoulder.x - lShoulder.x);
  const ankleY = (lAnkle.y + rAnkle.y) / 2;
  const bodyHeight = Math.abs(ankleY - nose.y);

  if (bodyHeight < 0.01) return { ...base, value: null, score: null };

  // Ideal ratio ~0.26 (shoulder joints span ~26% of nose-to-ankle height in aspect-corrected coords)
  const ratio = shoulderW / bodyHeight;
  // sigma=0.07: ratio varies with distance from camera; sigma=0.05 was too tight
  const score = gaussianScore(ratio, 0.26, 0.07);

  return { ...base, value: parseFloat(ratio.toFixed(3)), score: parseFloat(score.toFixed(1)) };
}
