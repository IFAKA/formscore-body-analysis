"use client";

import { useEffect, useRef } from "react";
import { useAnalyzerStore } from "@/store/analyzer.store";
import { drawPose } from "@/lib/draw/draw-pose";
import { drawFace } from "@/lib/draw/draw-face";
import { drawHighlight } from "@/lib/draw/draw-highlight";
import { BODY_HIGHLIGHTS, FACE_HIGHLIGHTS } from "@/lib/draw/highlight-config";
import type { CapturedPhoto } from "@/types/metrics";

interface Props {
  photo: CapturedPhoto;
}

export function ResultsCanvas({ photo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredMetricId = useAnalyzerStore((s) => s.hoveredMetricId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // For face mode, crop/zoom to the face bounding box
      let sx = 0, sy = 0, sw = iw, sh = ih;
      let lmsForDraw = photo.landmarks;

      if (photo.mode === "face" && photo.landmarks.length > 0) {
        const lms = photo.landmarks;
        const xs = lms.map((l) => l.x);
        const ys = lms.map((l) => l.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        // Center + square crop with 40% padding
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const half = Math.max((maxX - minX) / 2, (maxY - minY) / 2) * 1.4;

        sx = Math.max(0, (cx - half) * iw);
        sy = Math.max(0, (cy - half) * ih);
        const ex = Math.min(1, cx + half) * iw;
        const ey = Math.min(1, cy + half) * ih;
        sw = ex - sx;
        sh = ey - sy;

        // Remap landmarks into crop-space so overlays align
        lmsForDraw = lms.map((lm) => ({
          ...lm,
          x: (lm.x * iw - sx) / sw,
          y: (lm.y * ih - sy) / sh,
        }));
      }

      canvas.width = sw;
      canvas.height = sh;

      // Draw cropped photo
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // Overlay landmarks
      if (photo.landmarks.length > 0) {
        if (photo.mode === "body") {
          drawPose(ctx, lmsForDraw, canvas.width, canvas.height);
          if (hoveredMetricId && BODY_HIGHLIGHTS[hoveredMetricId]) {
            drawHighlight(ctx, lmsForDraw, BODY_HIGHLIGHTS[hoveredMetricId], canvas.width, canvas.height);
          }
        } else {
          drawFace(ctx, lmsForDraw, canvas.width, canvas.height);
          if (hoveredMetricId && FACE_HIGHLIGHTS[hoveredMetricId]) {
            drawHighlight(ctx, lmsForDraw, FACE_HIGHLIGHTS[hoveredMetricId], canvas.width, canvas.height);
          }
        }
      }
    };
    img.src = photo.dataUrl;
  }, [photo, hoveredMetricId]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}
