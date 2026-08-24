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

const ILDIZ = join(import.meta.dirname, '../..');
const MAQSAD = join(ILDIZ, 'supabase/functions/selleros');

const FAYLLAR = [
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
  ['apps/backend/src/tahlil.ts', 'tahlil.ts'],
];

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
console.log(tekshirish ? 'Nusxalar manbaga mos.' : `${FAYLLAR.length} ta fayl tayyorlandi.`);
