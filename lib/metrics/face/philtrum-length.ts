import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { gaussianScore } from "../scoring";
import type { MetricResult } from "@/types/metrics";

// Philtrum: the vertical groove from the base of the nose to the top of the upper lip.
// Shorter philtrum = more youthful. Elongated philtrum is associated with aging.
//
// Landmarks:
//   Nose base (columella/subnasale): 2 (sits at base of nose, above lip)
//   Upper lip outer top: average of 37 (left) and 267 (right) — the outer vermilion border
//   Face height reference: 10=forehead, 152=chin
export function calcPhiltrumLength(
  landmarks: NormalizedLandmark[]
): MetricResult {
  const base: Pick<MetricResult, "id" | "label" | "description" | "ideal" | "unit"> = {
    id: "philtrum-length",
    label: "Philtrum",
    description: "Nose-base to upper-lip distance relative to face height — a shorter philtrum is a sign of youthfulness.",
    ideal: "8–12%",
    unit: "%",
  };

  const noseBase    = landmarks[2];   // subnasale
  const upperLipL   = landmarks[37];  // left outer upper lip (top of vermilion)
  const upperLipR   = landmarks[267]; // right outer upper lip
  const forehead    = landmarks[10];
  const chin        = landmarks[152];

  if (!noseBase || !upperLipL || !upperLipR || !forehead || !chin) {
    return { ...base, value: null, score: null };
  }

  const faceH = Math.abs(chin.y - forehead.y);
  if (faceH < 0.01) return { ...base, value: null, score: null };

  const upperLipTopY  = (upperLipL.y + upperLipR.y) / 2;
  const philtrumLen   = Math.abs(upperLipTopY - noseBase.y);
  const pct           = (philtrumLen / faceH) * 100;

  // Ideal: 8–12% of face height. >14% = elongated (aging). <6% = unusually short.
  const score = gaussianScore(pct, 10, 2.5);

  return { ...base, value: parseFloat(pct.toFixed(1)), score: parseFloat(score.toFixed(1)) };
}
