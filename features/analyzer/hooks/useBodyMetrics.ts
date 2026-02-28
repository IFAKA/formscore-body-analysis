"use client";

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { calcShoulderHipRatio } from "@/lib/metrics/body/shoulder-hip-ratio";
import { calcWaistHipRatio } from "@/lib/metrics/body/waist-hip-ratio";
import { calcLegHeightRatio } from "@/lib/metrics/body/leg-height-ratio";
import { calcPostureExpansiveness } from "@/lib/metrics/body/posture-expansiveness";
import { calcSpinalAlignment } from "@/lib/metrics/body/spinal-alignment";
import { calcBodySymmetry } from "@/lib/metrics/body/body-symmetry";
import { calcArmSpanRatio } from "@/lib/metrics/body/arm-span-ratio";
import type { MetricResult } from "@/types/metrics";
import { BODY_WEIGHTS } from "@/types/metrics";

export function calcBodyMetrics(landmarks: NormalizedLandmark[]): {
  metrics: MetricResult[];
  overall: number | null;
} {
  const metrics = [
    calcShoulderHipRatio(landmarks),
    calcWaistHipRatio(landmarks),
    calcLegHeightRatio(landmarks),
    calcPostureExpansiveness(landmarks),
    calcSpinalAlignment(landmarks),
    calcBodySymmetry(landmarks),
    calcArmSpanRatio(landmarks),
  ];

  const scoredMetrics = metrics.filter((m) => m.score !== null);
  if (scoredMetrics.length === 0) return { metrics, overall: null };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const m of scoredMetrics) {
    const weight = BODY_WEIGHTS[m.id as keyof typeof BODY_WEIGHTS] ?? 0;
    weightedSum += (m.score ?? 0) * weight;
    totalWeight += weight;
  }

  const overall = totalWeight > 0 ? weightedSum / totalWeight : null;
  return { metrics, overall: overall !== null ? parseFloat(overall.toFixed(1)) : null };
}
