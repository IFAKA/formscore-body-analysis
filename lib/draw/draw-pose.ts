import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Skeleton connections for pose drawing
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 23], // left torso
  [12, 24], // right torso
  [23, 24], // hips
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
];

// Key measurement lines (drawn in different colors)
const MEASUREMENT_LINES: { pair: [number, number]; color: string; label: string }[] = [
  { pair: [11, 12], color: "#22c55e", label: "shoulders" },
  { pair: [23, 24], color: "#22c55e", label: "hips" },
];

function toPixel(lm: NormalizedLandmark, w: number, h: number): [number, number] {
  return [lm.x * w, lm.y * h];
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number
) {
  // Draw skeleton connections
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  for (const [a, b] of POSE_CONNECTIONS) {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    if (!lmA || !lmB) continue;
    const [ax, ay] = toPixel(lmA, w, h);
    const [bx, by] = toPixel(lmB, w, h);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // Draw measurement lines
  for (const { pair, color } of MEASUREMENT_LINES) {
    const lmA = landmarks[pair[0]];
    const lmB = landmarks[pair[1]];
    if (!lmA || !lmB) continue;
    const [ax, ay] = toPixel(lmA, w, h);
    const [bx, by] = toPixel(lmB, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw landmark dots
  for (const lm of landmarks) {
    if (!lm) continue;
    const [x, y] = toPixel(lm, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw spinal axis: nose → shoulder mid → hip mid
  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (nose && lShoulder && rShoulder && lHip && rHip) {
    const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
    const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
    const hipMidX = (lHip.x + rHip.x) / 2;
    const hipMidY = (lHip.y + rHip.y) / 2;

    ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nose.x * w, nose.y * h);
    ctx.lineTo(shoulderMidX * w, shoulderMidY * h);
    ctx.lineTo(hipMidX * w, hipMidY * h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
