import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { symmetryScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// 17 mirrored landmark pairs — deviation from perfect mirror symmetry around nose vertical axis
const FACE_PAIRS: [number, number][] = [
  [33, 263],   // eye outer corners
  [133, 362],  // eye inner corners
  [70, 300],   // eyebrow outer
  [107, 336],  // eyebrow inner
  [61, 291],   // mouth corners
  [40, 270],   // upper lip outer
  [37, 267],   // upper lip
  [234, 454],  // cheeks (bizygomatic)
  [172, 397],  // jaw
  [58, 288],   // lower jaw
  [132, 361],  // cheekbone
  [93, 323],   // mid jaw
  [177, 400],  // lower cheek
  [137, 366],  // mid cheek
  [227, 447],  // temple
  [116, 345],  // upper cheek
  [123, 352],  // mid-upper cheek
];

export function calcFacialSymmetry(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "facial-symmetry",
    label: "Face Symmetry",
    description: "Mirror match of left vs right features across 17 landmark pairs — symmetry signals developmental health and genetic quality.",
    ideal: "85–92%",
    unit: "%",
  };

  const noseX = landmarks[1]?.x;
  if (noseX === undefined) return { ...base, value: null, score: null };

  const faceW = landmarks[454] && landmarks[234]
    ? Math.abs(landmarks[454].x - landmarks[234].x)
    : null;

  if (!faceW || faceW < 0.001) return { ...base, value: null, score: null };

  const deviations: number[] = [];
  for (const [li, ri] of FACE_PAIRS) {
    const left = landmarks[li];
    const right = landmarks[ri];
    if (!left || !right) continue;
    const leftDist = Math.abs(left.x - noseX);
    const rightDist = Math.abs(right.x - noseX);
    deviations.push(Math.abs(leftDist - rightDist) / faceW);
  }

  if (deviations.length === 0) return { ...base, value: null, score: null };

  const avgAsymmetry = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const symmetryPct = (1 - avgAsymmetry) * 100;
  const score = symmetryScore(avgAsymmetry * 100, 8);

  return { ...base, value: parseFloat(symmetryPct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
