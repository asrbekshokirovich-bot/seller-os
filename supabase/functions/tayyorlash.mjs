/**
 * Edge Function uchun fayllarni tayyorlaydi.
 *
 * Mantiq `packages/shared` va `apps/backend` da yashaydi. Deno esa
 * `.ts` kengaytmasini talab qiladi, Node/TS esa `.js` yozadi. Shuning
 * uchun fayllar koʻchiriladi va import kengaytmasi almashtiriladi.
 *
 * Nusxa qoʻlda tahrirlanmaydi. `--tekshir` bayrogʻi bilan ishlatilsa,
 * nusxa manbadan farq qilsa xato bilan toʻxtaydi — CI shuni chaqiradi.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ILDIZ = join(import.meta.dirname, '../..');
const MAQSAD = join(ILDIZ, 'supabase/functions/selleros');

export const FAYLLAR = [
  ['packages/shared/src/index.ts', 'shared/index.ts'],
  ['packages/shared/src/thresholds.ts', 'shared/thresholds.ts'],
  ['packages/shared/src/traps.ts', 'shared/traps.ts'],
  ['packages/shared/src/formula.ts', 'shared/formula.ts'],
  ['packages/shared/src/filtrlar/turlar.ts', 'shared/filtrlar/turlar.ts'],
  ['packages/shared/src/filtrlar/yopiq_brend.ts', 'shared/filtrlar/yopiq_brend.ts'],
  ['packages/shared/src/filtrlar/monopoliya.ts', 'shared/filtrlar/monopoliya.ts'],
  ['packages/shared/src/filtrlar/sertifikat.ts', 'shared/filtrlar/sertifikat.ts'],
  ['packages/shared/src/filtrlar/demping.ts', 'shared/filtrlar/demping.ts'],
  ['packages/shared/src/profil.ts', 'shared/profil.ts'],
  ['packages/shared/src/qismlar.ts', 'shared/qismlar.ts'],
  ['packages/shared/src/qadamlar.ts', 'shared/qadamlar.ts'],
  ['packages/shared/src/savollar.ts', 'shared/savollar.ts'],
  ['apps/backend/src/tahlil.ts', 'tahlil.ts'],
];

/*
 * Fayl HAM skript, HAM modul.
 *
 * `scripts/olik-kod.mjs` yuqoridagi roʻyxatni import qiladi: nusxalar
 * MASHINA yozgan fayllar va ular "bu eksportni kimdir ishlatadi"
 * degan dalil emas. Roʻyxat ikki joyda takrorlansa u albatta
 * ajralib ketadi, shuning uchun manba bitta.
 *
 * Import qilinganda skript qismi ishlamasligi kerak — shu tekshiruv
 * oʻsha uchun.
 */
if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // Modul sifatida chaqirilgan: faqat roʻyxat kerak.
} else {
  asosiy();
}

function asosiy() {
const tekshirish = process.argv.includes('--tekshir');
let farq = 0;

for (const [manba, nusxa] of FAYLLAR) {
  let matn = readFileSync(join(ILDIZ, manba), 'utf8')
    // Deno `.ts` talab qiladi.
    .replace(/from '(\.[^']*)\.js'/g, "from '$1.ts'")
    // `tahlil.ts` paket nomi bilan import qiladi; nusxada — nisbiy yoʻl.
    .replace(/from '@selleros\/shared'/g, "from './shared/index.ts'");

  const chiqish = join(MAQSAD, nusxa);
  if (tekshirish) {
    const bor = existsSync(chiqish) ? readFileSync(chiqish, 'utf8') : '';
    if (bor !== matn) {
      console.error(`FARQ: ${nusxa} manbadan (${manba}) ajralib ketgan`);
      farq += 1;
    }
  } else {
    mkdirSync(dirname(chiqish), { recursive: true });
    writeFileSync(chiqish, matn);
  }
}

if (tekshirish && farq) {
  console.error(`\n${farq} ta fayl eskirgan. Yechim: node supabase/functions/tayyorlash.mjs`);
  process.exit(1);
}

/*
 * ROʻYXAT TOʻLIQMI.
 *
 * Yuqoridagi tekshiruv faqat roʻyxatDAGI fayllarni solishtiradi —
 * yaʼni roʻyxatga qoʻshilMAGAN faylni u koʻrmaydi. Aynan shu
 * 2026-08-24 da staging deployini uch marta qizil qilgan:
 * `shared/index.ts` `./profil.js` ni eksport qilardi, roʻyxatda esa
 * u yoʻq edi. CI yashil, deploy qizil, sabab esa boshqa joyda
 * koʻringan ("Module not found").
 *
 * Endi import grafi kuzatiladi: nusxadagi har bir nisbiy import
 * fayli haqiqatan bor boʻlishi shart. Bu Deno bundle qiladigan
 * tekshiruvning oʻzi, faqat CI da va bir soniyada.
 */
const kutilgan = new Set(FAYLLAR.map(([, nusxa]) => nusxa));
const yetishmaydi = [];

for (const [, nusxa] of FAYLLAR) {
  const yol = join(MAQSAD, nusxa);
  if (!existsSync(yol)) continue;
  const matn = readFileSync(yol, 'utf8');
  for (const [, manzil] of matn.matchAll(/from '(\.[^']*\.ts)'/g)) {
    const kerak = join(dirname(nusxa), manzil).replace(/\\/g, '/');
    if (!kutilgan.has(kerak) && !existsSync(join(MAQSAD, kerak))) {
      yetishmaydi.push(`${nusxa} → ${manzil}`);
    }
  }
}

if (yetishmaydi.length) {
  console.error('\nNusxa roʻyxati TOʻLIQ EMAS. Quyidagi importlar fayli yoʻq:');
  for (const q of yetishmaydi) console.error(`  ${q}`);
  console.error('\nYechim: FAYLLAR roʻyxatiga manbani qoʻshing.');
  process.exit(1);
}

console.log(tekshirish ? 'Nusxalar manbaga mos.' : `${FAYLLAR.length} ta fayl tayyorlandi.`);
}
