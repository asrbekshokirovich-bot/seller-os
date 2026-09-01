// Kengaytma ikonkalarini generatsiya qiladi (48x48, 128x128 PNG).
// sharp/canvas kerak emas — node:zlib bilan minimal PNG yaratadi.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function pngYarat(kenglik, balandlik, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(kenglik, 0);
  ihdr.writeUInt32BE(balandlik, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const ihdrChunk = chunk('IHDR', ihdr);

  // IDAT — har qator: filter byte (0) + RGB piksellar
  const qator = Buffer.alloc(1 + kenglik * 3);
  qator[0] = 0; // no filter
  for (let x = 0; x < kenglik; x++) {
    qator[1 + x * 3 + 0] = r;
    qator[1 + x * 3 + 1] = g;
    qator[1 + x * 3 + 2] = b;
  }

  // Har qator uchun markazda oq "S" chizish
  const raws = [];
  for (let y = 0; y < balandlik; y++) {
    const row = Buffer.from(qator);
    // Oddiy "S" harfi shakli (piksel bilan)
    const s = Math.floor(kenglik * 0.25);
    const e = Math.floor(kenglik * 0.75);
    const ym = balandlik;
    const band = Math.floor(ym / 5);

    if (y >= band && y < band * 2) {
      // Tepa chiziq
      for (let x = s; x < e; x++) { row[1+x*3]=255; row[2+x*3]=255; row[3+x*3]=255; }
    } else if (y >= band * 2 && y < band * 3) {
      // Oʻrta chiziq
      for (let x = s; x < e; x++) { row[1+x*3]=255; row[2+x*3]=255; row[3+x*3]=255; }
    } else if (y >= band * 3 && y < band * 4) {
      // Past chiziq
      for (let x = s; x < e; x++) { row[1+x*3]=255; row[2+x*3]=255; row[3+x*3]=255; }
    }

    // Chap ustun (yuqori yarim)
    if (y >= band && y < band * 2.5) {
      for (let x = s; x < s + Math.floor(kenglik * 0.12); x++) {
        row[1+x*3]=255; row[2+x*3]=255; row[3+x*3]=255;
      }
    }
    // Oʻng ustun (pastki yarim)
    if (y >= band * 2.5 && y < band * 4) {
      for (let x = e - Math.floor(kenglik * 0.12); x < e; x++) {
        row[1+x*3]=255; row[2+x*3]=255; row[3+x*3]=255;
      }
    }

    raws.push(row);
  }

  const raw = Buffer.concat(raws);
  const compressed = deflateSync(raw);
  const idatChunk = chunk('IDAT', compressed);

  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function chunk(turi, data) {
  const turiB = Buffer.from(turi, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([turiB, data]);
  const crc = crc32(body);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([len, body, crcB]);
}

// CRC-32 (PNG spetsifikatsiyasi)
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

mkdirSync('icons', { recursive: true });
// Indigo (#4f46e5) — kengaytma tugmasiga mos rang
writeFileSync('icons/icon48.png', pngYarat(48, 48, 79, 70, 229));
writeFileSync('icons/icon128.png', pngYarat(128, 128, 79, 70, 229));
console.log('Ikonkalar yaratildi: icons/icon48.png, icons/icon128.png');
