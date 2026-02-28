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

      canvas.width = iw;
      canvas.height = ih;

      // Draw photo as-is — it was captured with the same zoom/framing as the live view
      ctx.drawImage(img, 0, 0, iw, ih);

      // Remap landmarks to match the zoom transform stored at capture time
      let lmsForDraw = photo.landmarks;
      if (photo.mode === "face" && photo.faceZoom && photo.landmarks.length > 0) {
        const { txNorm, tyNorm, scale } = photo.faceZoom;
        lmsForDraw = photo.landmarks.map((lm) => ({
          ...lm,
          x: txNorm + lm.x * scale,
          y: tyNorm + lm.y * scale,
        }));
      }

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
    />
  );
}
