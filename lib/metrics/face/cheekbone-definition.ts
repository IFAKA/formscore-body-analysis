import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Cheekbone definition: how much wider the cheekbones are vs the jaw
// High ratio = prominent cheekbones tapering to a narrower jaw = masculine/attractive
// Landmarks: 234=left cheek, 454=right cheek (bizygomatic), 172=left jaw, 397=right jaw
export function calcCheekboneDefinition(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "cheekbone-definition",
    label: "Cheekbones",
    description: "Cheekbone width vs jaw width — high, prominent cheekbones tapering to a defined jaw are universally attractive.",
    ideal: "~1.20",
  };

  const leftCheek  = landmarks[234];
  const rightCheek = landmarks[454];
  const leftJaw    = landmarks[172];
  const rightJaw   = landmarks[397];

  if (!leftCheek || !rightCheek || !leftJaw || !rightJaw) return { ...base, value: null, score: null };

  const bizygomaticW = Math.abs(rightCheek.x - leftCheek.x);
  const jawW = Math.abs(rightJaw.x - leftJaw.x);

  if (jawW < 0.001) return { ...base, value: null, score: null };

  // ratio > 1 = cheekbones wider than jaw (desirable)
  // For males: ideal ~1.15–1.25 (prominent cheeks, strong-but-not-oversized jaw)
  const ratio = bizygomaticW / jawW;

  // Reject implausible values caused by head rotation or landmark error
  if (ratio < 0.8 || ratio > 1.8) return { ...base, value: null, score: null };

  const score = gaussianScore(ratio, 1.20, 0.12);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
