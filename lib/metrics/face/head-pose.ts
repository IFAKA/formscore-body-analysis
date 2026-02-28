// Extract yaw and pitch from a 4×4 column-major transformation matrix (MediaPipe format).
// The matrix is stored column-major, so element indices are:
//   col 0: m[0] m[1] m[2] m[3]
//   col 1: m[4] m[5] m[6] m[7]
//   col 2: m[8] m[9] m[10] m[11]
//   col 3: m[12] m[13] m[14] m[15]
// Rotation sub-matrix (rows × cols):
//   R = | m[0] m[4] m[8]  |
//       | m[1] m[5] m[9]  |
//       | m[2] m[6] m[10] |
export function getHeadPose(m: number[]): { yaw: number; pitch: number } {
  const yaw = Math.atan2(m[8], m[10]) * (180 / Math.PI);
  const pitch = Math.atan2(-m[9], Math.sqrt(m[1] ** 2 + m[5] ** 2)) * (180 / Math.PI);
  return { yaw, pitch };
}
