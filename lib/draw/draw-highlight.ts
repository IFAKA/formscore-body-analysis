import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { HighlightSpec } from "./highlight-config";

function toPixel(lm: NormalizedLandmark, w: number, h: number): [number, number] {
  return [lm.x * w, lm.y * h];
}

export function drawHighlight(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  spec: HighlightSpec,
  w: number,
  h: number
) {
  const { landmarks: indices, connections, color } = spec;

  // Draw connection lines with glow
  ctx.save();
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  for (const [a, b] of connections) {
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

  // Draw glowing landmark dots
  for (const idx of indices) {
    const lm = landmarks[idx];
    if (!lm) continue;
    const [x, y] = toPixel(lm, w, h);

    // Outer glow ring
    ctx.fillStyle = color + "66"; // 40% opacity
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();

    // Solid colored dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    // White center
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
