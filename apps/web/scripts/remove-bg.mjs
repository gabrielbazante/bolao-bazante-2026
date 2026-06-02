// One-off: remove the white background from the logo via flood-fill from the 4 corners.
// Preserves white pixels that are NOT connected to the canvas edge (text, ball, trophy highlights).
//
// Usage: node apps/web/scripts/remove-bg.mjs <input.png> <output.png> [tolerance]
//   tolerance: integer 0..255, max RGB distance from pure white treated as bg. Default 18.

import sharp from "sharp";

const [, , INPUT, OUTPUT, TOL = "18"] = process.argv;
if (!INPUT || !OUTPUT) {
  console.error("usage: node remove-bg.mjs <input> <output> [tolerance]");
  process.exit(1);
}
const tolerance = Number(TOL);

const img = sharp(INPUT).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
console.log(`loaded ${width}x${height}x${channels}, tolerance ${tolerance}`);

const pixels = new Uint8ClampedArray(data); // mutable copy
const visited = new Uint8Array(width * height);

function isWhiteish(idx) {
  const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
  return 255 - r <= tolerance && 255 - g <= tolerance && 255 - b <= tolerance;
}

// Iterative BFS flood-fill from each corner.
const queue = [];
const seeds = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
];
for (const [sx, sy] of seeds) {
  const sIdx = (sy * width + sx);
  if (visited[sIdx]) continue;
  const sPxIdx = sIdx * channels;
  if (!isWhiteish(sPxIdx)) continue;
  queue.push([sx, sy]);
  visited[sIdx] = 1;
}

let removed = 0;
while (queue.length) {
  const [x, y] = queue.shift();
  const idx = y * width + x;
  const pxIdx = idx * channels;
  pixels[pxIdx + 3] = 0; // alpha → 0
  removed++;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const nIdx = ny * width + nx;
    if (visited[nIdx]) continue;
    const nPxIdx = nIdx * channels;
    if (!isWhiteish(nPxIdx)) continue;
    visited[nIdx] = 1;
    queue.push([nx, ny]);
  }
}

console.log(`removed ${removed} pixels (${((removed / (width * height)) * 100).toFixed(1)}% of canvas)`);

await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
  .png()
  .toFile(OUTPUT);

console.log(`wrote ${OUTPUT}`);
