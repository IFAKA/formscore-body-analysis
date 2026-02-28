import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Facial Width-to-Height Ratio: bizygomatic_w / upper_face_h (brow to upper lip)
// Standard measurement (Stirrat & Perrett 2010): width = bizygomatic, height = brow midpoint → upper lip
// Landmarks: 234=left cheek, 454=right cheek, 105=left brow, 334=right brow, 0=upper lip center
export function calcFWHR(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "fwhr",
    label: "fWHR",
    description: "Facial width-to-height ratio — ~1.9 is linked to perceived social dominance and testosterone levels.",
    ideal: "~1.9",
  };

  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftBrow = landmarks[105];
  const rightBrow = landmarks[334];
  const upperLip = landmarks[0];

  if (!leftCheek || !rightCheek || !leftBrow || !rightBrow || !upperLip) return { ...base, value: null, score: null };

  const bizygomaticW = Math.abs(rightCheek.x - leftCheek.x);
  const browY = (leftBrow.y + rightBrow.y) / 2;
  const upperFaceH = Math.abs(upperLip.y - browY);

  if (upperFaceH < 0.001) return { ...base, value: null, score: null };

  const ratio = bizygomaticW / upperFaceH;

  // Reject implausible values (e.g. caused by head rotation foreshortening bizygomatic width)
  if (ratio < 0.8 || ratio > 3.0) return { ...base, value: null, score: null };

  const score = gaussianScore(ratio, 1.9, 0.3);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
