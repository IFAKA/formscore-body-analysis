import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/** Returns true only if the landmark exists and MediaPipe considers it visible. */
export function visible(lm: NormalizedLandmark | undefined, threshold = 0.5): boolean {
  return !!lm && (lm.visibility ?? 1) >= threshold;
}

/**
 * Gaussian bell curve score: centered on ideal, falls off with sigma.
 * Returns 0–10 where 10 = exactly at ideal.
 */
export function gaussianScore(
  value: number,
  ideal: number,
  sigma: number
): number {
  const score = 10 * Math.exp(-0.5 * Math.pow((value - ideal) / sigma, 2));
  return Math.max(0, Math.min(10, score));
}

/**
 * Score based on how close value is to a range [low, high].
 * Within range = 10. Outside range falls off with sigma.
 */
export function rangeScore(
  value: number,
  low: number,
  high: number,
  sigma: number
): number {
  if (value >= low && value <= high) return 10;
  const mid = (low + high) / 2;
  return gaussianScore(value, mid, sigma);
}

/**
 * Score for symmetry (lower deviation = higher score).
 * deviation: 0 = perfect returns 10. At sigma deviation returns ~6.
 */
export function symmetryScore(deviation: number, sigma: number): number {
  return 10 * Math.exp(-0.5 * Math.pow(deviation / sigma, 2));
}
