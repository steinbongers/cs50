/**
 * Maakt PWA-iconen als PNG zonder externe bibliotheken: een afgerond vierkant
 * in de hoofdkleur met een wit potje. Placeholder tot er een echt logo is.
 * Gebruik: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const PRIMARY = [0x00, 0x75, 0xff];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(width, height, pixels, { alpha = true } = {}) {
  // alpha: false schrijft RGB zonder alfakanaal (vereist voor het App Store-icoon).
  const bpp = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * bpp + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * bpp + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = rowStart + 1 + x * bpp;
      raw[dst] = pixels[src]; raw[dst + 1] = pixels[src + 1]; raw[dst + 2] = pixels[src + 2];
      if (alpha) raw[dst + 3] = pixels[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function roundedRect(x, y, w, h, r, px, py) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

/** Tekent met 4x4 supersampling voor zachte randen. */
function render(size, { background, maskablePadding = 0, square = false }) {
  const pixels = Buffer.alloc(size * size * 4);
  const pad = size * maskablePadding;
  const inner = size - pad * 2;
  const radius = inner * 0.22;
  // potje: romp + deksel + hals
  const bodyW = inner * 0.46, bodyH = inner * 0.40, bodyX = pad + (inner - bodyW) / 2, bodyY = pad + inner * 0.40, bodyR = inner * 0.08;
  const neckW = inner * 0.30, neckH = inner * 0.08, neckX = pad + (inner - neckW) / 2, neckY = bodyY - neckH + inner * 0.01;
  const lidW = inner * 0.38, lidH = inner * 0.07, lidX = pad + (inner - lidW) / 2, lidY = neckY - lidH - inner * 0.015, lidR = inner * 0.035;
  const S = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S, py = y + (sy + 0.5) / S;
          // square: volledig gevuld en ondoorzichtig (iOS rondt de hoeken zelf af)
          const inBg = background ? square || roundedRect(pad, pad, inner, inner, radius, px, py) : false;
          const inFg =
            roundedRect(bodyX, bodyY, bodyW, bodyH, bodyR, px, py) ||
            roundedRect(neckX, neckY, neckW, neckH, inner * 0.01, px, py) ||
            roundedRect(lidX, lidY, lidW, lidH, lidR, px, py);
          if (inBg) bg++;
          if (inFg) fg++;
        }
      }
      const i = (y * size + x) * 4;
      const bgA = bg / (S * S), fgA = fg / (S * S);
      if (background) {
        // achtergrond blauw, potje wit erbovenop
        const a = Math.max(bgA, fgA);
        const r = PRIMARY[0] * (1 - fgA) + 255 * fgA;
        const g = PRIMARY[1] * (1 - fgA) + 255 * fgA;
        const b = PRIMARY[2] * (1 - fgA) + 255 * fgA;
        pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = Math.round(a * 255);
      } else {
        // badge: alleen het witte potje op transparant
        pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = Math.round(fgA * 255);
      }
    }
  }
  return png(size, size, pixels, { alpha: !square });
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", render(192, { background: true }));
writeFileSync("public/icons/icon-512.png", render(512, { background: true }));
writeFileSync("public/icons/icon-maskable-512.png", render(512, { background: true, maskablePadding: 0.1 }));
writeFileSync("public/icons/apple-touch-icon.png", render(180, { background: true }));
writeFileSync("public/icons/badge-72.png", render(72, { background: false }));
console.log("iconen geschreven naar public/icons/");

// iOS-appicoon (native app): 1024x1024, vierkant en zonder transparantie.
mkdirSync("ios/App/App/Assets.xcassets/AppIcon.appiconset", { recursive: true });
writeFileSync("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", render(1024, { background: true, square: true }));
