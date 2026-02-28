import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Vertical eye aperture (eyelid opening) relative to face height — signals youth and alertness.
// Uses 3 lid landmarks per eye to robustly capture the maximum vertical opening,
// rather than relying on a single point that may not land at the widest part.
//
// Right eye upper lid: 158 (lateral), 159 (center), 160 (medial)
// Right eye lower lid: 144 (lateral), 145 (center), 153 (medial)
// Left eye upper lid:  385 (medial), 386 (center), 387 (lateral)
// Left eye lower lid:  373 (medial), 374 (center), 380 (lateral)
// Face height reference: 10=forehead, 152=chin
export function calcEyeOpenness(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "eye-openness",
    label: "Eye Openness",
    description: "Vertical eye aperture vs face height — larger, well-defined eyes signal youth, alertness, and vitality.",
    ideal: "4–5%",
    unit: "%",
  };

  // Right eye — 3 upper lid points, 3 lower lid points
  const rU1 = landmarks[158], rU2 = landmarks[159], rU3 = landmarks[160];
  const rL1 = landmarks[144], rL2 = landmarks[145], rL3 = landmarks[153];
  // Left eye — 3 upper lid points, 3 lower lid points
  const lU1 = landmarks[385], lU2 = landmarks[386], lU3 = landmarks[387];
  const lL1 = landmarks[373], lL2 = landmarks[374], lL3 = landmarks[380];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  if (!rU1 || !rU2 || !rU3 || !rL1 || !rL2 || !rL3 ||
      !lU1 || !lU2 || !lU3 || !lL1 || !lL2 || !lL3 ||
      !forehead || !chin) {
    return { ...base, value: null, score: null };
  }

  const faceH = Math.abs(chin.y - forehead.y);
  if (faceH < 0.01) return { ...base, value: null, score: null };

  // Maximum aperture: topmost upper lid (min y) to bottommost lower lid (max y)
  const rightUpperY = Math.min(rU1.y, rU2.y, rU3.y);
  const rightLowerY = Math.max(rL1.y, rL2.y, rL3.y);
  const leftUpperY  = Math.min(lU1.y, lU2.y, lU3.y);
  const leftLowerY  = Math.max(lL1.y, lL2.y, lL3.y);

  const rightEyeH = Math.abs(rightLowerY - rightUpperY);
  const leftEyeH  = Math.abs(leftLowerY  - leftUpperY);
  const avgEyeH   = (rightEyeH + leftEyeH) / 2;

  const pct = (avgEyeH / faceH) * 100;

  // Ideal: ~4–5% of face height. Very small (<2%) = hooded/sleepy, very large (>7%) = unusual.
  // sigma=2: population SD is ~1.5%; sigma=1.5 was too punishing for naturally smaller eyes
  const score = gaussianScore(pct, 4.5, 2);

  return { ...base, value: parseFloat(pct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
