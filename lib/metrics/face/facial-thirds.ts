import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { symmetryScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Facial thirds: forehead : midface : lower face = 1:1:1
// Division points: forehead-top → brow → subnasale (nose base) → chin
// Landmarks: 10=top forehead, 105=brow line, 2=subnasale (nose base, above lip), 152=chin
export function calcFacialThirds(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "facial-thirds",
    label: "Facial Thirds",
    description: "Forehead : midface : lower face vertical balance — a 1:1:1 ratio is the classical beauty standard.",
    ideal: "1:1:1",
    unit: "%",
  };

  const foreheadTop = landmarks[10];
  const browLine = landmarks[105];
  const noseBase = landmarks[2];   // subnasale — base of nose above upper lip
  const chin = landmarks[152];

  if (!foreheadTop || !browLine || !noseBase || !chin) return { ...base, value: null, score: null };

  const totalH = Math.abs(chin.y - foreheadTop.y);
  if (totalH < 0.001) return { ...base, value: null, score: null };

  const third1 = Math.abs(browLine.y - foreheadTop.y);
  const third2 = Math.abs(noseBase.y - browLine.y);
  const third3 = Math.abs(chin.y - noseBase.y);
  const ideal = totalH / 3;

  const d1 = Math.abs(third1 - ideal) / totalH;
  const d2 = Math.abs(third2 - ideal) / totalH;
  const d3 = Math.abs(third3 - ideal) / totalH;
  const avgDev = ((d1 + d2 + d3) / 3) * 100;

  const score = symmetryScore(avgDev, 8);
  const balance = parseFloat(((1 - avgDev / 100) * 100).toFixed(1));

  return { ...base, value: balance, score: parseFloat(score.toFixed(1)) };
}
