"use client";

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { calcJawProminence } from "@/lib/metrics/face/jaw-prominence";
import { calcEyeAttractiveness } from "@/lib/metrics/face/eye-attractiveness";
import { calcFacialSymmetry } from "@/lib/metrics/face/facial-symmetry";
import { calcFWHR } from "@/lib/metrics/face/fwhr";
import { calcFacialThirds } from "@/lib/metrics/face/facial-thirds";
import { calcFacialAverageness } from "@/lib/metrics/face/facial-averageness";
import { calcCanthalTilt } from "@/lib/metrics/face/canthal-tilt";
import { calcEyeOpenness } from "@/lib/metrics/face/eye-openness";
import { calcLipFullness } from "@/lib/metrics/face/lip-fullness";
import { calcCheekboneDefinition } from "@/lib/metrics/face/cheekbone-definition";
import { calcNoseBridgeStraightness } from "@/lib/metrics/face/nose-bridge-straightness";
import { calcBrowEyeDistance } from "@/lib/metrics/face/brow-eye-distance";
import { calcIrisScleraRatio } from "@/lib/metrics/face/iris-sclera-ratio";
import { calcPhiltrumLength } from "@/lib/metrics/face/philtrum-length";
import { calcUpperLowerLipRatio } from "@/lib/metrics/face/upper-lower-lip-ratio";
import type { MetricResult } from "@/types/metrics";
import { FACE_WEIGHTS } from "@/types/metrics";

export function calcFaceMetrics(landmarks: NormalizedLandmark[]): {
  metrics: MetricResult[];
  overall: number | null;
} {
  const metrics = [
    calcJawProminence(landmarks),
    calcEyeAttractiveness(landmarks),
    calcFacialSymmetry(landmarks),
    calcFWHR(landmarks),
    calcFacialThirds(landmarks),
    calcFacialAverageness(landmarks),
    calcCanthalTilt(landmarks),
    calcEyeOpenness(landmarks),
    calcLipFullness(landmarks),
    calcCheekboneDefinition(landmarks),
    calcNoseBridgeStraightness(landmarks),
    calcBrowEyeDistance(landmarks),
    calcIrisScleraRatio(landmarks),
    calcPhiltrumLength(landmarks),
    calcUpperLowerLipRatio(landmarks),
  ];

  const scoredMetrics = metrics.filter((m) => m.score !== null);
  if (scoredMetrics.length === 0) return { metrics, overall: null };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const m of scoredMetrics) {
    const weight = FACE_WEIGHTS[m.id as keyof typeof FACE_WEIGHTS] ?? 0;
    weightedSum += (m.score ?? 0) * weight;
    totalWeight += weight;
  }

  const overall = totalWeight > 0 ? weightedSum / totalWeight : null;
  return { metrics, overall: overall !== null ? parseFloat(overall.toFixed(1)) : null };
}
