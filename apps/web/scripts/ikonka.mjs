// Sayt ikonkalari — brauzer yorligʻi va telefon bosh ekrani (Next.js app ikonkalari):
//   src/app/favicon.ico      16, 32, 48 px (ICO ichida PNG)
//   src/app/icon.svg         vektor — har oʻlchamda tiniq
//   src/app/apple-icon.png   180 px, toʻliq kvadrat (iPhone burchakni oʻzi yumaloqlaydi)
// Belgi kengaytmaniki bilan bir xil (`apps/extension/gen-icons.mjs`): terrakota
// (#D2552D) yumaloq kvadrat, ichida oq "Z". Bogʻliqliksiz: node:zlib bilan PNG.
// Ishga tushirish: `node apps/web/scripts/ikonka.mjs` (repo ildizidan).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ILOVA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const ACC = [0xd2, 0x55, 0x2d];
const OQ = [0xff, 0xff, 0xff];
// Z — 100×100 birlikda (kengaytma ikonkasidagi bilan bir xil koʻpburchak).
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

/** Yumaloq kvadrat (radius 26/100). `kvadrat` — burchaksiz, toʻliq maydon (apple-icon). */
function fonda(x, y, kvadrat) {
  if (kvadrat) return x >= 0 && x <= 100 && y >= 0 && y <= 100;
  const r = 26;
  const cx = Math.min(Math.max(x, r), 100 - r);
  const cy = Math.min(Math.max(y, r), 100 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function bolak(tur, data) {
  const uz = Buffer.alloc(4);
  uz.writeUInt32BE(data.length, 0);
  const tana = Buffer.concat([Buffer.from(tur, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tana), 0);
  return Buffer.concat([uz, tana, crc]);
}

/** RGBA PNG, 8×8 qayta namunalash bilan silliq chetlar. */
function png(o, kvadrat = false) {
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
          if (fonda(x, y, kvadrat)) {
            fon++;
            if (ichidami(x, y, Z)) zet++;
          }
        }
      }
      const z = fon ? zet / fon : 0;
      const i = 1 + px * 4;
      for (let k = 0; k < 3; k++) q[i + k] = Math.round(ACC[k] * (1 - z) + OQ[k] * z);
      q[i + 3] = Math.round((fon / (N * N)) * 255);
    }
    qatorlar.push(q);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(o, 0);
  ihdr.writeUInt32BE(o, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bolak('IHDR', ihdr),
    bolak('IDAT', deflateSync(Buffer.concat(qatorlar))),
    bolak('IEND', Buffer.alloc(0)),
  ]);
}

/** ICO: sarlavha + katalog + PNG rasmlar (Windows Vista+ va hamma brauzerlar PNG li ICO ni oʻqiydi). */
function ico(olchamlar) {
  const rasmlar = olchamlar.map((o) => png(o));
  const sarlavha = Buffer.alloc(6);
  sarlavha.writeUInt16LE(0, 0);
  sarlavha.writeUInt16LE(1, 2);
  sarlavha.writeUInt16LE(rasmlar.length, 4);
  let joy = 6 + 16 * rasmlar.length;
  const katalog = rasmlar.map((r, n) => {
    const e = Buffer.alloc(16);
    e[0] = olchamlar[n] >= 256 ? 0 : olchamlar[n];
    e[1] = olchamlar[n] >= 256 ? 0 : olchamlar[n];
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(r.length, 8);
    e.writeUInt32LE(joy, 12);
    joy += r.length;
    return e;
  });
  return Buffer.concat([sarlavha, ...katalog, ...rasmlar]);
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="26" fill="#D2552D"/><path fill="#fff" d="M${Z.map(([x, y]) => `${x} ${y}`).join('L')}Z"/></svg>\n`;

writeFileSync(join(ILOVA, 'favicon.ico'), ico([16, 32, 48]));
writeFileSync(join(ILOVA, 'icon.svg'), SVG);
writeFileSync(join(ILOVA, 'apple-icon.png'), png(180, true));
console.log('Ikonkalar yaratildi: favicon.ico, icon.svg, apple-icon.png');
