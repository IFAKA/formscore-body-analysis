import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Iris diameter relative to visible eye width (limbal ring prominence).
// Larger iris = more youthful, perceived as more attractive (neotenous feature).
//
// MediaPipe iris refinement landmarks (available in face_landmarker model):
//   Right iris: 468=center, 469=right edge, 470=bottom, 471=left edge, 472=top
//   Left  iris: 473=center, 474=right edge, 475=bottom, 476=left edge, 477=top
//
// Eye width: outer corner to inner corner
//   Right eye: outer=33, inner=133
//   Left  eye: outer=263, inner=362
export function calcIrisScleraRatio(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "iris-sclera-ratio",
    label: "Iris Size",
    description: "Iris diameter vs visible eye width — a large, prominent iris (limbal ring) signals youth and vitality.",
    ideal: "~0.65",
  };

  // Right iris edges (horizontal diameter)
  const rightIrisL = landmarks[471]; // left edge of right iris
  const rightIrisR = landmarks[469]; // right edge of right iris
  const rightEyeOuter = landmarks[33];
  const rightEyeInner = landmarks[133];

  // Left iris edges (person's left eye = image right side)
  // 474=right edge (temple side), 476=left edge (nose side)
  const leftIrisR = landmarks[474]; // right edge of left iris (temple side)
  const leftIrisL = landmarks[476]; // left edge of left iris (nose side)
  const leftEyeOuter = landmarks[263];
  const leftEyeInner = landmarks[362];

  if (!rightIrisL || !rightIrisR || !rightEyeOuter || !rightEyeInner ||
      !leftIrisL  || !leftIrisR  || !leftEyeOuter  || !leftEyeInner) {
    return { ...base, value: null, score: null };
  }

  const rightIrisDiam = Math.abs(rightIrisR.x - rightIrisL.x);
  const rightEyeW     = Math.abs(rightEyeOuter.x - rightEyeInner.x);

  const leftIrisDiam = Math.abs(leftIrisR.x - leftIrisL.x);
  const leftEyeW     = Math.abs(leftEyeOuter.x - leftEyeInner.x);

  if (rightEyeW < 0.001 || leftEyeW < 0.001) return { ...base, value: null, score: null };

  const rightRatio = rightIrisDiam / rightEyeW;
  const leftRatio  = leftIrisDiam  / leftEyeW;
  const avgRatio   = (rightRatio + leftRatio) / 2;

  // Ideal: iris covers ~60–70% of visible eye width
  const score = gaussianScore(avgRatio, 0.65, 0.08);

  return { ...base, value: parseFloat(avgRatio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
