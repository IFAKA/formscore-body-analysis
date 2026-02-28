import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Lip fullness: total lip height (top of upper lip to bottom of lower lip) relative to face height
// Landmarks:
//   0  = upper lip center top (Cupid's bow peak — the true topmost point of the upper lip)
//   40 = upper lip outer left area  (for averaging lateral height)
//   270= upper lip outer right area
//   17 = lower lip outer bottom center
// Face height: 10=forehead, 152=chin
export function calcLipFullness(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "lip-fullness",
    label: "Lip Fullness",
    description: "Total lip height relative to face height — full, well-defined lips are a strong signal of youth and attractiveness.",
    ideal: "7–9%",
    unit: "%",
  };

  // Landmark 0 is the center top of the upper lip (Cupid's bow peak).
  // 40 and 270 are lateral upper lip points — average all three for a stable, full-width
  // measurement that captures the true top of the vermilion border.
  const upperCenter = landmarks[0];   // Cupid's bow center top
  const upperLeft   = landmarks[40];  // outer upper lip left area
  const upperRight  = landmarks[270]; // outer upper lip right area
  const lowerLipBot = landmarks[17];  // lower lip outer bottom center
  const forehead = landmarks[10];
  const chin = landmarks[152];

  if (!upperCenter || !upperLeft || !upperRight || !lowerLipBot || !forehead || !chin) {
    return { ...base, value: null, score: null };
  }

  const faceH = Math.abs(chin.y - forehead.y);
  if (faceH < 0.01) return { ...base, value: null, score: null };

  // Take the minimum y (highest pixel position) across the three upper lip points —
  // this captures the true peak of the upper lip regardless of the Cupid's bow shape.
  const upperY = Math.min(upperCenter.y, upperLeft.y, upperRight.y);
  const lowerY = lowerLipBot.y;

  const lipH = Math.abs(lowerY - upperY);
  const pct = (lipH / faceH) * 100;

  // Ideal: 7–9% of face height = full lips (slightly higher than previous because
  // we now measure from the true top of the lip, not the lateral side points).
  const score = gaussianScore(pct, 8, 2);

  return { ...base, value: parseFloat(pct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
