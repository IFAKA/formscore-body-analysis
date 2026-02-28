import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { symmetryScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Measures how straight the nose bridge is by checking x-deviation of
// bridge midpoints from the line connecting nasion (6) to nose tip (4).
// Landmarks: 6=nasion (top bridge), 197=mid-bridge, 195=lower bridge, 4=nose tip
// Face width reference: 234, 454
export function calcNoseBridgeStraightness(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "nose-bridge-straightness",
    label: "Nose Bridge",
    description: "Straightness of the nose bridge line from nasion to tip — a straight bridge is associated with structural symmetry.",
    ideal: "straight",
    unit: "%",
  };

  const nasion  = landmarks[6];   // top of bridge (between eyes)
  const midBridge = landmarks[197]; // mid-bridge
  const lowerBridge = landmarks[195]; // lower bridge
  const noseTip = landmarks[4];   // pronasale (tip)
  const leftCheek  = landmarks[234];
  const rightCheek = landmarks[454];

  if (!nasion || !midBridge || !lowerBridge || !noseTip || !leftCheek || !rightCheek) {
    return { ...base, value: null, score: null };
  }

  const faceW = Math.abs(rightCheek.x - leftCheek.x);
  if (faceW < 0.001) return { ...base, value: null, score: null };

  // For each intermediate point, compute its perpendicular deviation from the
  // line segment nasion → noseTip.
  const dx = noseTip.x - nasion.x;
  const dy = noseTip.y - nasion.y;
  const lineLen = Math.sqrt(dx * dx + dy * dy);

  if (lineLen < 0.001) return { ...base, value: null, score: null };

  function perpDist(pt: NormalizedLandmark): number {
    // Perpendicular distance from point to line defined by nasion→noseTip
    return Math.abs(dy * pt.x - dx * pt.y + noseTip.x * nasion.y - noseTip.y * nasion.x) / lineLen;
  }

  const d1 = perpDist(midBridge);
  const d2 = perpDist(lowerBridge);
  const avgDeviation = ((d1 + d2) / 2 / faceW) * 100;

  const score = symmetryScore(avgDeviation, 2); // 2% sigma
  const straightness = parseFloat(Math.max(0, 100 - avgDeviation * 10).toFixed(1));

  return { ...base, value: straightness, score: parseFloat(score.toFixed(1)) };
}
