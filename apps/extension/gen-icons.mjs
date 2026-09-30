// Kengaytma ikonkalari (16, 32, 48, 128 px PNG) — sayt logotipi: terrakota
// (#D2552D) yumaloq kvadrat, ichida oq "Z" (apps/web/dizayn/ZumSavdo-Veb.html).
// Bogʻliqliksiz: shakl vektor (yumaloq kvadrat + Z koʻpburchagi), 8×8
// qayta namunalash bilan silliqlanadi, node:zlib bilan RGBA PNG yoziladi.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const ACC = [0xd2, 0x55, 0x2d];
const OQ = [0xff, 0xff, 0xff];

// Z — 100×100 birlikda (Unbounded qalin "Z" ga yaqin: qalin gorizontal chiziqlar, qiya oʻrta).
const Z = [[30, 28], [72, 28], [72, 40], [45, 61], [72, 61], [72, 73], [28, 73], [28, 61], [55, 40], [30, 40]];

function ichidami(x, y, poly) {
  let ichida = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ichida = !ichida;
  }
  return ichida;
}

/** Yumaloq kvadrat (0..100, radius 36 — dizayndagi 13/36). */
function kvadratda(x, y) {
  const r = 26;
  const cx = Math.min(Math.max(x, r), 100 - r);
  const cy = Math.min(Math.max(y, r), 100 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

function png(o) {
  const N = 8;
  const qatorlar = [];
  for (let py = 0; py < o; py++) {
    const q = Buffer.alloc(1 + o * 4);
    for (let px = 0; px < o; px++) {
      let fon = 0;
      let zet = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const x = ((px + (sx + 0.5) / N) / o) * 100;
          const y = ((py + (sy + 0.5) / N) / o) * 100;
          if (kvadratda(x, y)) {
            fon++;
            if (ichidami(x, y, Z)) zet++;
          }
        }
      }
      const a = fon / (N * N);
      const z = fon ? zet / fon : 0;
      const i = 1 + px * 4;
      for (let k = 0; k < 3; k++) q[i + k] = Math.round(ACC[k] * (1 - z) + OQ[k] * z);
      q[i + 3] = Math.round(a * 255);
    }
    qatorlar.push(q);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(o, 0);
  ihdr.writeUInt32BE(o, 4);
  ihdr[8] = 8; // bit chuqurligi
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bolak('IHDR', ihdr),
    bolak('IDAT', deflateSync(Buffer.concat(qatorlar))),
    bolak('IEND', Buffer.alloc(0)),
  ]);
}

function bolak(tur, data) {
  const t = Buffer.from(tur, 'ascii');
  const uz = Buffer.alloc(4);
  uz.writeUInt32BE(data.length, 0);
  const tana = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tana), 0);
  return Buffer.concat([uz, tana, crc]);
}

// CRC-32 (PNG spetsifikatsiyasi)
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

mkdirSync('icons', { recursive: true });
for (const o of [16, 32, 48, 128]) writeFileSync(`icons/icon${o}.png`, png(o));
console.log('Ikonkalar yaratildi: icons/icon16/32/48/128.png');
