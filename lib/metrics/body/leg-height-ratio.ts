import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { rangeScore, visible } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Landmarks: 0=nose, 23=left hip, 24=right hip, 27=left ankle, 28=right ankle
export function calcLegHeightRatio(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "leg-height-ratio",
    label: "Leg / Height",
    description: "Leg length as % of total height — longer legs are consistently rated more attractive across cultures.",
    ideal: "52–53%",
    unit: "%",
  };

  const nose = landmarks[0];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];

  if (!visible(nose) || !visible(lHip) || !visible(rHip) || !visible(lAnkle) || !visible(rAnkle)) return { ...base, value: null, score: null };

  const hipY = (lHip.y + rHip.y) / 2;
  const ankleY = (lAnkle.y + rAnkle.y) / 2;
  const totalHeight = Math.abs(ankleY - nose.y);

  if (totalHeight < 0.01) return { ...base, value: null, score: null };

  const legLength = Math.abs(ankleY - hipY);
  const pct = (legLength / totalHeight) * 100;
  // sigma=5: population average is ~47–50%, so sigma=3 penalised most normal legs heavily;
  // sigma=5 still rewards longer legs while not bottoming out at average proportions
  const score = rangeScore(pct, 52, 53, 5);

  return { ...base, value: parseFloat(pct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
