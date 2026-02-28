import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmarks: 234=left cheek, 454=right cheek (bizygomatic), 172=left jaw, 397=right jaw
export function calcJawProminence(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal"> = {
    id: "jaw-prominence",
    label: "Jaw",
    description: "Jaw width and angularity relative to cheekbones — a defined jaw signals testosterone and genetic fitness.",
    ideal: "prominent",
  };

  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftJaw = landmarks[172];
  const rightJaw = landmarks[397];

  if (!leftCheek || !rightCheek || !leftJaw || !rightJaw) return { ...base, value: null, score: null };

  const faceW = Math.abs(rightCheek.x - leftCheek.x);
  const jawW = Math.abs(rightJaw.x - leftJaw.x);

  if (faceW < 0.001) return { ...base, value: null, score: null };

  // Ideal: jaw width ~80% of bizygomatic width (strong but not overly wide)
  // sigma=0.12: population SD is ~0.10; tighter sigma was too punishing for narrower faces
  const ratio = jawW / faceW;
  const score = gaussianScore(ratio, 0.80, 0.12);

  return { ...base, value: parseFloat(ratio.toFixed(2)), score: parseFloat(score.toFixed(1)) };
}
