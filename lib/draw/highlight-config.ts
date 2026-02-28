export interface HighlightSpec {
  landmarks: number[];
  connections: [number, number][];
  color: string;
}

export const BODY_HIGHLIGHTS: Record<string, HighlightSpec> = {
  "shoulder-hip-ratio": {
    landmarks: [11, 12, 23, 24],
    connections: [[11, 12], [23, 24]],
    color: "#22c55e",
  },
  "waist-hip-ratio": {
    landmarks: [11, 12, 23, 24],
    connections: [[11, 12], [23, 24], [11, 23], [12, 24]],
    color: "#f59e0b",
  },
  "leg-height-ratio": {
    landmarks: [23, 24, 25, 26, 27, 28],
    connections: [[23, 25], [25, 27], [24, 26], [26, 28]],
    color: "#3b82f6",
  },
  "posture-expansiveness": {
    landmarks: [11, 12],
    connections: [[11, 12]],
    color: "#a855f7",
  },
  "spinal-alignment": {
    landmarks: [0, 11, 12, 23, 24],
    connections: [[0, 11], [0, 12], [11, 12], [11, 23], [12, 24], [23, 24]],
    color: "#fbbf24",
  },
  "body-symmetry": {
    landmarks: [11, 12, 23, 24, 25, 26, 27, 28],
    connections: [[11, 12], [23, 24], [25, 26], [27, 28]],
    color: "#ec4899",
  },
  "arm-span-ratio": {
    landmarks: [11, 12, 13, 14, 15, 16],
    connections: [[11, 13], [13, 15], [12, 14], [14, 16], [15, 16]],
    color: "#06b6d4",
  },
};

export const FACE_HIGHLIGHTS: Record<string, HighlightSpec> = {
  "jaw-prominence": {
    landmarks: [172, 397, 234, 454, 152],
    connections: [[172, 397], [234, 454], [172, 152], [397, 152]],
    color: "#22c55e",
  },
  "eye-attractiveness": {
    landmarks: [133, 362, 33, 263],
    connections: [[133, 362]],
    color: "#3b82f6",
  },
  "facial-symmetry": {
    landmarks: [10, 152, 234, 454, 133, 362, 61, 291],
    connections: [[234, 454], [133, 362], [61, 291], [10, 152]],
    color: "#ec4899",
  },
  "fwhr": {
    landmarks: [234, 454, 10, 152],
    connections: [[234, 454], [10, 152]],
    color: "#f59e0b",
  },
  "facial-thirds": {
    landmarks: [10, 168, 2, 152],
    connections: [[10, 168], [168, 2], [2, 152]],
    color: "#a855f7",
  },
  "facial-averageness": {
    landmarks: [10, 152, 234, 454, 1, 61, 291],
    connections: [[10, 152], [234, 454], [61, 291]],
    color: "#fbbf24",
  },
  "canthal-tilt": {
    landmarks: [33, 133, 263, 362],
    connections: [[33, 133], [263, 362]],
    color: "#06b6d4",
  },
  "eye-openness": {
    landmarks: [159, 145, 386, 374],
    connections: [[159, 145], [386, 374]],
    color: "#22c55e",
  },
  "lip-fullness": {
    landmarks: [37, 267, 17, 0],
    connections: [[37, 267], [37, 17], [267, 17]],
    color: "#f43f5e",
  },
  "cheekbone-definition": {
    landmarks: [234, 454, 172, 397],
    connections: [[234, 454], [172, 397]],
    color: "#f59e0b",
  },
  "nose-bridge-straightness": {
    landmarks: [168, 6, 197, 4],
    connections: [[168, 6], [6, 197], [197, 4]],
    color: "#a855f7",
  },
  "brow-eye-distance": {
    landmarks: [55, 285, 159, 386],
    connections: [[55, 159], [285, 386]],
    color: "#3b82f6",
  },
  "iris-sclera-ratio": {
    landmarks: [33, 133, 263, 362, 145, 159, 374, 386],
    connections: [[33, 133], [263, 362]],
    color: "#06b6d4",
  },
  "philtrum-length": {
    landmarks: [4, 164, 0],
    connections: [[4, 164], [164, 0]],
    color: "#22c55e",
  },
  "upper-lower-lip-ratio": {
    landmarks: [0, 17, 61, 291, 13, 14],
    connections: [[61, 291], [13, 14], [0, 17]],
    color: "#f43f5e",
  },
};
