import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Upper vs lower lip thickness ratio.
// Upper lip height: outer top (avg 37, 267) → inner (13)
// Lower lip height: inner (14) → outer bottom (17)
// Ideal ratio upper:lower ≈ 1:1.5 — lower lip slightly fuller.
//
// Landmarks:
//   Upper lip outer top: 37 (left), 267 (right)
//   Upper lip inner edge: 13
//   Lower lip inner edge: 14
//   Lower lip outer bottom: 17
export function calcUpperLowerLipRatio(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "upper-lower-lip-ratio",
    label: "Lip Ratio",
    description: "Upper vs lower lip thickness — ideal ratio is ~1:1.5 (lower fuller), a hallmark of an attractive mouth.",
    ideal: "~0.67",
  };

  const upperOuterL = landmarks[37];  // outer top of upper lip (left)
  const upperOuterR = landmarks[267]; // outer top of upper lip (right)
  const upperInner  = landmarks[13];  // inner upper lip (wet line)
  const lowerInner  = landmarks[14];  // inner lower lip (wet line)
  const lowerOuter  = landmarks[17];  // outer bottom of lower lip

  if (!upperOuterL || !upperOuterR || !upperInner || !lowerInner || !lowerOuter) {
    return { ...base, value: null, score: null };
  }

  const upperLipTopY = (upperOuterL.y + upperOuterR.y) / 2;
  const upperH = Math.abs(upperInner.y - upperLipTopY);
  const lowerH = Math.abs(lowerOuter.y - lowerInner.y);

  if (lowerH < 0.0005) return { ...base, value: null, score: null };

  const ratio = upperH / lowerH; // ideal ~0.67 (upper is 2/3 height of lower)
  const score = gaussianScore(ratio, 0.67, 0.12);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
