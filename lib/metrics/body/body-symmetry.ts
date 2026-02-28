import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { symmetryScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmark pairs: shoulders(11,12), hips(23,24), knees(25,26), ankles(27,28)
const LANDMARK_PAIRS: [number, number][] = [
  [11, 12],
  [23, 24],
  [25, 26],
  [27, 28],
];

export function calcBodySymmetry(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "body-symmetry",
    label: "Symmetry",
    description: "Left/right bilateral symmetry across shoulders, hips, knees, and ankles — a universal marker of developmental health.",
    ideal: "< 5%",
    unit: "%",
  };

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  if (!visible(lShoulder) || !visible(rShoulder)) return { ...base, value: null, score: null };

  const centerX = (lShoulder.x + rShoulder.x) / 2;
  const scaleW = Math.abs(rShoulder.x - lShoulder.x);

  if (scaleW < 0.001) return { ...base, value: null, score: null };

  const deviations: number[] = [];
  for (const [li, ri] of LANDMARK_PAIRS) {
    const left = landmarks[li];
    const right = landmarks[ri];
    if (!visible(left) || !visible(right)) continue;
    const leftDist = Math.abs(left.x - centerX);
    const rightDist = Math.abs(right.x - centerX);
    deviations.push(Math.abs(leftDist - rightDist) / scaleW);
  }

  if (deviations.length === 0) return { ...base, value: null, score: null };

  const avgAsymmetry = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const asymmetryPct = avgAsymmetry * 100;
  const score = symmetryScore(asymmetryPct, 5);

  return { ...base, value: parseFloat(asymmetryPct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
