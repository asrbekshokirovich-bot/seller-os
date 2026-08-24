/**
 * Oʻlik kod qidiruvi — hech qayerda ishlatilmaydigan eksportlar.
 *
 * Nega kerak. 2026-08-24 da topilgan yettita jim kamchilikning
 * ikkitasi aynan shu shaklda edi: kod yozilgan, izohlangan, testi
 * yashil — lekin uni HECH KIM CHAQIRMAYDI.
 *
 *   - `PRODUCT_QUERY_STOK` yozilgan va batafsil izohlangan, lekin
 *     hech qayerdan chaqirilmagan. Natijada `stock` har doim `None`
 *     boʻlgan va sotuv baholash umuman ishlay olmagan.
 *   - Skreyperning ishga tushirish nuqtasi yoʻq edi. Butun paket
 *     yozilgan, 29 ta testi yashil, `selleros` sxemasi esa boʻsh.
 *
 * QOIDA: eksport qilingan nom ISHLAB CHIQARISH kodida kamida bir
 * marta uchrashi kerak. Testdagi murojaat SANALMAYDI.
 *
 * Test sanalmasligi qoidaning eng muhim qismi va u qimmatga tushib
 * topildi. Bu skriptning birinchi versiyasi testni ham sanardi.
 * Sinab koʻrilganda maʼlum boʻldi: `PRODUCT_QUERY_STOK` chaqiruvini
 * qaytadan olib tashlasak ham qorovul jim qolardi — chunki
 * `test_cli.py` uni import qiladi. Yaʼni qorovulning oʻzida u
 * tekshirmoqchi boʻlgan kasallik bor edi: TEST OʻLIK KODNI TIRIK
 * KOʻRSATADI. Aynan shu sababdan 29 ta yashil test bilan birga
 * skreyper hech qachon ishlamagan.
 *
 * TURLAR TEKSHIRILMAYDI. Tur bajarilmaydi, yaʼni u jimgina ishlamay
 * qola olmaydi. `Holat` kabi tur faqat qaytish qiymati sifatida
 * ishlatilishi va nomi hech qayerda koʻrinmasligi mumkin — bu xato
 * emas.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Sabab bilan istisno qilinganlar: `nom -> nega`. */
const ISTISNO = new Map([
  // 1-qadam formasi hali yozilmagan (`apps/web` boʻsh). Bu uchtasi
  // oʻsha forma bilan ulanadi. Ular hozircha OʻLIK va bu shu yerda
  // ochiq yozilgan — "jimgina oʻlik" bilan "bilib turib oʻlik"
  // orasidagi farq shu roʻyxat. BACKLOG.md da ham qayd etilgan.
  ['profilOqi', '1-qadam formasi yozilgach ulanadi — BACKLOG.md'],
  ['bosProfil', '1-qadam formasi yozilgach ulanadi — BACKLOG.md'],
  ['javobSoni', '1-qadam formasi yozilgach ulanadi — BACKLOG.md'],
]);

/** Test fayli — ham taʼrif, ham murojaat sifatida chetda qoladi. */
function testFayli(f) {
  return /(^|\/)tests?\//.test(f) || /\.test\.[cm]?[jt]s$/.test(f);
}

const fayllar = execSync(
  "git ls-files '*.ts' '*.mjs' '*.py' | grep -v node_modules | grep -v dist",
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const manbalar = fayllar.map((f) => [f, readFileSync(f, 'utf8')]);

/** Bajariladigan eksportlar: funksiya, oʻzgarmas, sinf. Turlar emas. */
const TS_EKSPORT = /^export\s+(?:async\s+)?(?:function|const|class|enum)\s+([A-Za-z_$][\w$]*)/gm;
/** Python: modul darajasidagi UPPER_CASE oʻzgarmaslar, `def`, `class`. */
const PY_EKSPORT = /^(?:([A-Z][A-Z0-9_]{2,})\s*[:=]|(?:async\s+)?def\s+([a-z_]\w*)|class\s+([A-Z]\w*))/gm;

const olik = [];
for (const [fayl, matn] of manbalar) {
  if (testFayli(fayl)) continue;
  const py = fayl.endsWith('.py');
  for (const m of matn.matchAll(py ? PY_EKSPORT : TS_EKSPORT)) {
    const nom = m[1] ?? m[2] ?? m[3];
    if (!nom || ISTISNO.has(nom)) continue;
    // Python ichki nomlari modul ichida ishlatilsa yetarli.
    if (py && nom.startsWith('_')) continue;

    let uchradi = 0;
    const nomNaqsh = new RegExp(`\\b${nom}\\b`, 'g');
    for (const [f2, m2] of manbalar) {
      if (testFayli(f2)) continue;
      uchradi += (m2.match(nomNaqsh) ?? []).length;
    }
    // 1 = faqat oʻz taʼrifi, boshqa hech qayerda yoʻq.
    if (uchradi <= 1) olik.push(`${fayl}: ${nom}`);
  }
}

if (olik.length) {
  console.error('Ishlab chiqarish kodida ishlatilmaydigan eksportlar:\n');
  for (const s of olik) console.error(`  ${s}`);
  console.error(
    `\n${olik.length} ta. Har biri uchun javob kerak: yo chaqiriladi, ` +
    'yo oʻchiriladi, yo ISTISNO roʻyxatiga SABAB bilan qoʻshiladi.\n' +
    'Test ishlatishi yetarli emas — aynan shu holat 2026-08-24 gacha ' +
    'skreyperni butunlay ishlamay turishiga olib kelgan.',
  );
  process.exit(1);
}
console.log('Ishlab chiqarish kodida ishlatilmaydigan eksport topilmadi.');
