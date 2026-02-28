import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Distance from lower eyebrow edge to upper eyelid, normalized by face height.
// Closer brows to eyes = more masculine/dominant (lower brow ridge).
//
// Uses 3 brow landmarks per side (inner, mid, arch) to capture the full lower brow contour,
// then takes the minimum gap (closest brow point to the eyelid) which is the most
// perceptually relevant measurement (how low the brow sits over the eye).
//
// Right brow lower edge: 107 (inner), 66 (arch center), 105 (mid-inner)
// Left  brow lower edge: 336 (inner), 296 (arch center), 334 (mid-inner)
// Upper eyelid center:   159 (right), 386 (left)
// Face height reference: 10=forehead, 152=chin
export function calcBrowEyeDistance(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "brow-eye-distance",
    label: "Brow–Eye Gap",
    description: "Vertical gap between eyebrow lower edge and upper eyelid — a closer brow ridge signals masculine dominance.",
    ideal: "3–5%",
    unit: "%",
  };

  // Right brow: inner, mid, arch-center
  const rBrow1 = landmarks[107], rBrow2 = landmarks[105], rBrow3 = landmarks[66];
  // Left brow: inner, mid, arch-center
  const lBrow1 = landmarks[336], lBrow2 = landmarks[334], lBrow3 = landmarks[296];
  const rightEyeTop = landmarks[159]; // right upper eyelid center
  const leftEyeTop  = landmarks[386]; // left upper eyelid center
  const forehead = landmarks[10];
  const chin     = landmarks[152];

  if (!rBrow1 || !rBrow2 || !rBrow3 || !lBrow1 || !lBrow2 || !lBrow3 ||
      !rightEyeTop || !leftEyeTop || !forehead || !chin) {
    return { ...base, value: null, score: null };
  }

  const faceH = Math.abs(chin.y - forehead.y);
  if (faceH < 0.01) return { ...base, value: null, score: null };

  // Average the 3 brow lower-edge points for a stable brow position reading
  const rightBrowY = (rBrow1.y + rBrow2.y + rBrow3.y) / 3;
  const leftBrowY  = (lBrow1.y + lBrow2.y + lBrow3.y) / 3;

  const rightGap = Math.abs(rightEyeTop.y - rightBrowY);
  const leftGap  = Math.abs(leftEyeTop.y  - leftBrowY);
  const avgGap   = (rightGap + leftGap) / 2;

  const pct = (avgGap / faceH) * 100;

  // Ideal for males: 3–5% of face height (low, close brows)
  // sigma=2.5: population SD is ~2%; tighter sigma (1.5) was too harsh — most people
  // naturally have 5–8% gap and were scoring <2/10
  const score = gaussianScore(pct, 4, 2.5);

  return { ...base, value: parseFloat(pct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
