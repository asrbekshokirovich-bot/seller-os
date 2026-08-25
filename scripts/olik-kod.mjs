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
import { FAYLLAR } from '../supabase/functions/tayyorlash.mjs';

/** Sabab bilan istisno qilinganlar: `nom -> nega`. */
const ISTISNO = new Map([
  // 1-qadam formasi hali yozilmagan (`apps/web` boʻsh). Bu ikkitasi
  // oʻsha forma bilan ulanadi. Ular hozircha OʻLIK va bu shu yerda
  // ochiq yozilgan — "jimgina oʻlik" bilan "bilib turib oʻlik"
  // orasidagi farq shu roʻyxat. BACKLOG.md da ham qayd etilgan.
  //
  // `profilOqi` 2026-08-24 da roʻyxatdan chiqdi: `/yonalishlar`
  // uchi uni chaqiradi. Chiqarishni qorovulning oʻzi talab qildi —
  // istisno eskirganini u endi koʻradi.
  ['bosProfil', '1-qadam formasi yozilgach ulanadi — BACKLOG.md'],
  ['javobSoni', '1-qadam formasi yozilgach ulanadi — BACKLOG.md'],
]);

/** Test fayli — ham taʼrif, ham murojaat sifatida chetda qoladi. */
function testFayli(f) {
  return /(^|\/)tests?\//.test(f) || /\.test\.[cm]?[jt]s$/.test(f);
}

/*
 * MASHINA YOZGAN NUSXALAR ham chetda qoladi.
 *
 * `tayyorlash.mjs` `packages/shared` ni Edge Function papkasiga
 * koʻchiradi. Nusxa manbaning aynan oʻzi, yaʼni undagi har bir nom
 * ikki marta uchraydi — va shu bilan har qanday oʻlik eksport
 * TIRIK koʻrinib qoladi.
 *
 * Bu testlar bilan bir xil kasallik (QOIDALAR.md §8-c): murojaat
 * sanoqchisi oʻzi yaratgan murojaatni sanaydi. Nusxa "kimdir buni
 * ishlatadi" degan dalil emas — nusxa hech kimning qarori emas.
 *
 * Roʻyxat `tayyorlash.mjs` dan IMPORT qilinadi. Takrorlansa ajralib
 * ketardi va bu chetlatish jimgina kengayib borardi.
 */
const NUSXALAR = new Set(
  FAYLLAR.map(([, nusxa]) => `supabase/functions/selleros/${nusxa}`),
);
function nusxaFayli(f) {
  return NUSXALAR.has(f);
}

/*
 * Qorovulning OʻZ daftari murojaat sanalmaydi.
 *
 * `ISTISNO` roʻyxati nomlarni matn sifatida saqlaydi. Bu fayl ham
 * skanerlanadigan roʻyxatga kirgani uchun har istisno nomi "bir
 * marta ishlatilgan" boʻlib chiqardi — yaʼni qorovul oʻz
 * daftaridagi yozuvni dalil deb sanardi.
 *
 * Natijada uchala istisno "endi ishlatilmoqda" deb notoʻgʻri
 * belgilandi. Testlar (§8-c) va nusxalar bilan bir xil kasallik:
 * sanoqchi oʻzi yaratgan murojaatni sanaydi.
 */
const OZ_DAFTARI = 'scripts/olik-kod.mjs';

/*
 * FREYMVORK CHAQIRADIGAN FAYLLAR.
 *
 * Next.js `app/**\/route.ts` da `GET`/`POST` eksportlarini oʻzi
 * topib chaqiradi — kodda ularga import yoʻq. Sanoqchi uchun ular
 * "hech kim chaqirmaydi" boʻlib koʻrinadi.
 *
 * Bu chetlatish `ISTISNO` dan farq qiladi va shuning uchun alohida:
 * istisno "hozircha ulanmagan" degani, bu esa "boshqa mexanizm
 * chaqiradi" degani. Ikkalasini aralashtirsak, haqiqiy oʻlik kod
 * istisno roʻyxatida yashirinib qolardi.
 *
 * Chegara tor: faqat `route.ts`/`page.tsx`/`layout.tsx` va faqat
 * `app/` ichida. Boshqa har qanday eksport odatdagidek sanaladi.
 */
const FREYMVORK = /\/app\/.*\/(route|page|layout)\.tsx?$|\/app\/(page|layout)\.tsx?$/;
function freymvorkFayli(f) {
  return FREYMVORK.test(`/${f}`);
}

function chetda(f) {
  return testFayli(f) || nusxaFayli(f) || f === OZ_DAFTARI;
}

/*
 * KUZATILMAGAN FAYLLAR HAM SANALADI.
 *
 * `git ls-files` faqat KUZATILADIGAN fayllarni beradi. Yaʼni yangi
 * yozilgan, hali `git add` qilinmagan fayl bu qorovulga umuman
 * koʻrinmasdi: mahalliy tekshiruv yashil, CI esa (fayl commit
 * boʻlgach) qizil.
 *
 * Oʻlchandi 2026-08-25: `packages/shared/src/tannarx.ts` yozildi,
 * `npm run olik-kod` yashil dedi; `git add` dan keyin oʻsha buyruq
 * oʻlik eksportni topdi. Yaʼni xato bir commit kechikardi.
 *
 * Aynan shu xato sirlarni tekshiruvchida ham boʻlgan (QOIDALAR.md
 * §8-f) va u yerda `--untracked` bilan tuzatilgan. Bu ikkinchi
 * marta — demak `git ls-files` ning oʻzi shu loyihada ishonchsiz.
 */
const royxat = (buyruq) =>
  execSync(buyruq, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const fayllar = [...new Set([
  ...royxat("git ls-files '*.ts' '*.mjs' '*.py' | grep -v node_modules | grep -v dist"),
  ...royxat(
    "git ls-files --others --exclude-standard '*.ts' '*.mjs' '*.py' "
    + '| grep -v node_modules | grep -v dist || true',
  ),
])];

const manbalar = fayllar.map((f) => [f, readFileSync(f, 'utf8')]);

/** Bajariladigan eksportlar: funksiya, oʻzgarmas, sinf. Turlar emas. */
const TS_EKSPORT = /^export\s+(?:async\s+)?(?:function|const|class|enum)\s+([A-Za-z_$][\w$]*)/gm;
/** Python: modul darajasidagi UPPER_CASE oʻzgarmaslar, `def`, `class`. */
const PY_EKSPORT = /^(?:([A-Z][A-Z0-9_]{2,})\s*[:=]|(?:async\s+)?def\s+([a-z_]\w*)|class\s+([A-Z]\w*))/gm;

const olik = [];

/*
 * ESKIRGAN ISTISNOLAR.
 *
 * Istisno roʻyxati oʻzi ham jim oʻlim manbai: nom bir marta yozilsa,
 * u kod TIRILGANDAN keyin ham chetda qolaveradi. Yaʼni roʻyxat
 * vaqt oʻtishi bilan qorovulning koʻzini yumib boradi va buni hech
 * narsa koʻrsatmaydi.
 *
 * Shuning uchun endi teskarisi ham tekshiriladi: istisnodagi nom
 * ishlab chiqarishda ISHLATILSA — tekshiruv qizaradi va roʻyxatdan
 * oʻchirishni talab qiladi. Istisno "hozircha" degan soʻzni
 * bildiradi, "abadiy" ni emas.
 */
const eskirgan = [];
for (const [fayl, matn] of manbalar) {
  if (chetda(fayl) || freymvorkFayli(fayl)) continue;
  const py = fayl.endsWith('.py');
  for (const m of matn.matchAll(py ? PY_EKSPORT : TS_EKSPORT)) {
    const nom = m[1] ?? m[2] ?? m[3];
    if (!nom) continue;
    // Python ichki nomlari modul ichida ishlatilsa yetarli.
    if (py && nom.startsWith('_')) continue;

    let uchradi = 0;
    const nomNaqsh = new RegExp(`\\b${nom}\\b`, 'g');
    for (const [f2, m2] of manbalar) {
      if (chetda(f2)) continue;
      uchradi += (m2.match(nomNaqsh) ?? []).length;
    }
    // 1 = faqat oʻz taʼrifi, boshqa hech qayerda yoʻq.
    const oquv = uchradi <= 1;
    if (ISTISNO.has(nom)) {
      // Istisno endi kerak emasmi — shu yerda hal qilinadi.
      if (!oquv) eskirgan.push(`${nom} — ${ISTISNO.get(nom)}`);
      continue;
    }
    if (oquv) olik.push(`${fayl}: ${nom}`);
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
if (eskirgan.length) {
  console.error('ISTISNO roʻyxati eskirgan — bular endi ishlatilmoqda:\n');
  for (const q of eskirgan) console.error(`  ${q}`);
  console.error(
    '\nYechim: shu nomlarni ISTISNO roʻyxatidan oʻchiring. Kerak ' +
    'boʻlmagan istisno qorovulning koʻzini yumadi va buni hech narsa ' +
    'koʻrsatmaydi.',
  );
  process.exit(1);
}
console.log('Ishlab chiqarish kodida ishlatilmaydigan eksport topilmadi.');
