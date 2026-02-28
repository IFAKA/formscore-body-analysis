import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Key face landmark groups for visualization
const FACE_OVAL: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
];

const MEASUREMENT_LINES: { points: [number, number]; color: string }[] = [
  { points: [234, 454], color: "#22c55e" },   // bizygomatic width
  { points: [10, 152], color: "#3b82f6" },    // face height
  { points: [133, 362], color: "#a855f7" },   // eye spacing
  { points: [61, 291], color: "#f59e0b" },    // mouth width
];

function toPixel(lm: NormalizedLandmark, w: number, h: number): [number, number] {
  return [lm.x * w, lm.y * h];
}

export function drawFace(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number
) {
  // Draw face oval
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  let first = true;
  for (const idx of FACE_OVAL) {
    const lm = landmarks[idx];
    if (!lm) continue;
    const [x, y] = toPixel(lm, w, h);
    if (first) { ctx.moveTo(x, y); first = false; }
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw measurement lines
  for (const { points, color } of MEASUREMENT_LINES) {
    const lmA = landmarks[points[0]];
    const lmB = landmarks[points[1]];
    if (!lmA || !lmB) continue;
    const [ax, ay] = toPixel(lmA, w, h);
    const [bx, by] = toPixel(lmB, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);

    // Endpoint dots
    for (const [px, py] of [[ax, ay], [bx, by]]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw symmetry axis (vertical line through nose)
  const nose = landmarks[1];
  const foreheadTop = landmarks[10];
  const chin = landmarks[152];
  if (nose && foreheadTop && chin) {
    const [nx] = toPixel(nose, w, h);
    const [, topY] = toPixel(foreheadTop, w, h);
    const [, botY] = toPixel(chin, w, h);

    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nx, topY - 10);
    ctx.lineTo(nx, botY + 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw key landmark dots
  const KEY_POINTS = [10, 152, 234, 454, 133, 362, 61, 291, 1, 4];
  for (const idx of KEY_POINTS) {
    const lm = landmarks[idx];
    if (!lm) continue;
    const [x, y] = toPixel(lm, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
