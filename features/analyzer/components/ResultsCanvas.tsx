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
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw clean photo as background
      ctx.drawImage(img, 0, 0);

      // Overlay landmarks if available
      if (photo.landmarks.length > 0) {
        const lms = photo.landmarks;

        if (photo.mode === "body") {
          drawPose(ctx, lms, canvas.width, canvas.height);
          if (hoveredMetricId && BODY_HIGHLIGHTS[hoveredMetricId]) {
            drawHighlight(ctx, lms, BODY_HIGHLIGHTS[hoveredMetricId], canvas.width, canvas.height);
          }
        } else {
          drawFace(ctx, lms, canvas.width, canvas.height);
          if (hoveredMetricId && FACE_HIGHLIGHTS[hoveredMetricId]) {
            drawHighlight(ctx, lms, FACE_HIGHLIGHTS[hoveredMetricId], canvas.width, canvas.height);
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
