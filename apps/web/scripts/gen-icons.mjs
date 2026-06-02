import sharp from "sharp";
import { mkdir } from "fs/promises";

const SRC = "apps/web/public/logo.png";
const targets = [
  { out: "apps/web/public/logo-512.png", size: 512 },
  { out: "apps/web/public/icons/icon-192.png", size: 192 },
  { out: "apps/web/public/icons/icon-512.png", size: 512 },
  { out: "apps/web/public/apple-touch-icon.png", size: 180 },
  { out: "apps/web/app/icon.png", size: 32 },
];

await mkdir("apps/web/public/icons", { recursive: true });
await mkdir("apps/web/app", { recursive: true });

for (const t of targets) {
  await sharp(SRC)
    .resize(t.size, t.size, {
      fit: "contain",
      background: { r: 0, g: 61, b: 122, alpha: 1 },
    })
    .png()
    .toFile(t.out);
  console.log("wrote", t.out);
}

// maskable: pad with safe zone
await sharp(SRC)
  .resize(410, 410, {
    fit: "contain",
    background: { r: 0, g: 61, b: 122, alpha: 1 },
  })
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: { r: 0, g: 61, b: 122, alpha: 1 },
  })
  .png()
  .toFile("apps/web/public/icons/icon-maskable-512.png");
console.log("wrote maskable");
