import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Canthal tilt: the angle of the eye axis (inner → outer corner)
// Positive tilt = outer corner higher than inner = "hunter eyes" (more attractive in males)
// Landmarks (person's perspective): right eye outer=33, inner=133 | left eye outer=263, inner=362
export function calcCanthalTilt(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "canthal-tilt",
    label: "Canthal Tilt",
    description: "Eye axis angle — a slight upward outer-corner tilt creates the coveted 'hunter eye' look associated with dominance.",
    ideal: "2–4°",
    unit: "°",
  };

  // Person's right eye (image left side): outer corner = 33, inner corner = 133
  const outerR = landmarks[33];
  const innerR = landmarks[133];
  // Person's left eye (image right side): outer corner = 263, inner corner = 362
  const outerL = landmarks[263];
  const innerL = landmarks[362];

  if (!innerR || !outerR || !innerL || !outerL) return { ...base, value: null, score: null };

  // In screen coords: y increases downward.
  // Positive canthal tilt (attractive) = outer corner HIGHER than inner = outer.y < inner.y
  // Angle formula: always use abs(x-distance) so both eyes give consistent results
  const rightTilt = Math.atan2(innerR.y - outerR.y, Math.abs(outerR.x - innerR.x)) * (180 / Math.PI);
  const leftTilt  = Math.atan2(innerL.y - outerL.y, Math.abs(outerL.x - innerL.x)) * (180 / Math.PI);

  const avgTilt = (rightTilt + leftTilt) / 2;

  // Ideal: ~2–4° upward tilt ("hunter eyes"); 0° = neutral; negative = droopy/prey eyes
  const score = gaussianScore(avgTilt, 3, 4);

  return { ...base, value: parseFloat(avgTilt.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
