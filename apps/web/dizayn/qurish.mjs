/**
 * Qadoqlangan dizayn faylidan ishlaydigan sayt yasaydi.
 *
 * Dizayn bitta 847 KB li HTML boʻlib keldi: ichida sahifa JS satri
 * sifatida, boyliklar (Vue, shriftlar) esa gzip+base64 xarita
 * sifatida turadi. Brauzer uni ochilishda ochib, DOM ga qoʻyadi.
 *
 * Bu koʻrsatish uchun qulay, sayt uchun emas: 847 KB bitta fayl
 * keshlanmaydi, shriftlar alohida yuklanmaydi, va HTML ni oʻzgartirish
 * uchun har safar qadoqni ochish kerak.
 *
 * Shuning uchun bu skript qadoqni ochib, oddiy statik saytga aylantiradi:
 * `index.html` + `boylik/`. Skript saqlanadi — dizaynning yangi
 * versiyasi kelsa, qaytadan ishlatiladi.
 *
 *   node dizayn/qurish.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

/*
 * Yoʻllar SKRIPT joyiga nisbatan hisoblanadi, ish papkasiga emas.
 *
 * Skript uch xil joydan chaqiriladi: qoʻlda, `npm run build` dan
 * (`apps/web` ichida) va Vercel qurishidan (ombor ildizidan). Ish
 * papkasiga tayangan yoʻl ularning bittasida ishlab, boshqasida
 * "fayl topilmadi" berardi.
 */
const MANBA = join(import.meta.dirname, 'ZumSavdo-standalone.html');

/*
 * Chiqish — `public/`, yaʼni Next.js statik fayllar papkasi.
 *
 * Sahifa `sotuv.html` deb yoziladi, `index.html` deb EMAS. Next
 * `public/index.html` ni `/` da xizmat qilmaydi; oʻrniga
 * `next.config.mjs` da `/` → `/sotuv.html` yoʻnaltirishi bor.
 * Nomi boshqa boʻlgani shundan.
 */
const CHIQISH = join(import.meta.dirname, '../public');
const SAHIFA_NOMI = 'sotuv.html';

const qatorlar = readFileSync(MANBA, 'utf8').split('\n');

/** Eng uzun ikkita qator: boyliklar xaritasi va sahifaning oʻzi. */
function engUzun(n) {
  return qatorlar
    .map((q, i) => [q.trim(), i])
    .sort((a, b) => b[0].length - a[0].length)
    .slice(0, n);
}
const [xaritaQ, sahifaQ] = engUzun(2).map(([q]) => q.replace(/[;,]$/, ''));

const boyliklar = JSON.parse(xaritaQ);
let sahifa = JSON.parse(sahifaQ);

rmSync(`${CHIQISH}/boylik`, { recursive: true, force: true });
mkdirSync(`${CHIQISH}/boylik`, { recursive: true });

const KENGAYTMA = {
  'text/javascript': 'js',
  'application/javascript': 'js',
  'text/css': 'css',
  'font/woff2': 'woff2',
};

let jami = 0;
for (const [uuid, b] of Object.entries(boyliklar)) {
  let data = Buffer.from(b.data, 'base64');
  if (b.compressed) data = gunzipSync(data);
  const kengaytma = KENGAYTMA[b.mime];
  if (!kengaytma) throw new Error(`Notanish tur: ${b.mime} (${uuid})`);
  const nom = `${uuid.slice(0, 8)}.${kengaytma}`;
  writeFileSync(`${CHIQISH}/boylik/${nom}`, data);
  // Sahifa boyliklarni UUID boʻyicha chaqiradi — yoʻlga almashtiramiz.
  sahifa = sahifa.split(uuid).join(`boylik/${nom}`);
  jami += data.length;
}

// Qolib ketgan UUID boʻlmasligi kerak: bittasi qolsa, sahifa jimgina
// yarim ishlaydi — shrift yoki skript yuklanmaydi va buni faqat
// koʻz bilan sezish mumkin.
const qolgan = sahifa.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
if (qolgan) throw new Error(`Almashtirilmagan UUID qoldi: ${[...new Set(qolgan)].join(', ')}`);


/* ==================================================================
   MATN TUZATISHLARI
   ------------------------------------------------------------------
   Bular shu yerda turishi SHART. Agar qoʻlda qilinsa, dizaynning
   yangi versiyasi kelib qurish qayta ishlatilganda soxta matn
   jimgina qaytardi — va buni hech narsa koʻrsatmasdi.

   Har bir almashtirish topilmasa xato beradi: dizayn oʻzgarib matn
   koʻchsa, qurish toʻxtaydi va biz buni bilamiz.
   ================================================================== */

/**
 * Hamma uchragan joyni almashtiradi va SONINI tekshiradi.
 *
 * `almashtir()` bittasini almashtiradi. Takrorlanadigan element
 * (masalan uchta "Boshlash" tugmasi) uchun u xavfli: bittasi
 * tuzatiladi, qolgani eski holida qoladi va sahifa YARIM ishlaydi.
 * Bunday nosozlikni faqat koʻz bilan, uchala tugmani ham bosib
 * koʻrib topish mumkin.
 */
function hammasini(matn, naqsh, yangi, nom, kutilgan) {
  const topildi = matn.match(naqsh);
  const soni = topildi ? topildi.length : 0;
  if (soni !== kutilgan) {
    throw new Error(
      `Matn tuzatishi — "${nom}": ${soni} ta topildi, ${kutilgan} ta kutilgan. ` +
      'Dizayn oʻzgargan boʻlishi mumkin. Qurish toʻxtatildi.',
    );
  }
  return matn.replace(naqsh, yangi);
}

function almashtir(matn, eski, yangi, nom) {
  if (!matn.includes(eski)) {
    throw new Error(
      `Matn tuzatishi qoʻllanmadi — "${nom}". Dizayn oʻzgargan boʻlishi ` +
      'mumkin. Qurish toʻxtatildi: tuzatishsiz sayt chiqarilmaydi.',
    );
  }
  return matn.replace(eski, yangi, 1);
}

function matnniTuzat(matn) {
  // ---- 1. Toʻqib chiqarilgan guvohliklar -------------------------
  //
  // Dizaynda toʻrtta odam bor edi (Abdulaziz B., Dilnoza K.,
  // Rustam U., Sardor M.) va har birida aniq daromad raqami.
  // Bu odamlar yoʻq, bu raqamlar oʻlchanmagan. Ustidagi sarlavha esa
  // "Haqiqiy natija, toʻqib chiqarilgan raqam yoʻq" deb turardi.
  //
  // Oʻrniga bazadan olingan raqamlar. Ular tekshirilishi mumkin —
  // soxta odamdan kuchliroq dalil.
  const boshi = matn.indexOf('<div id="fikrlar"');
  const oxiri = matn.indexOf('<div id="narxlar"');
  if (boshi < 0 || oxiri < boshi) {
    throw new Error('Guvohliklar boʻlimi topilmadi — qurish toʻxtatildi.');
  }
  const karta = (son, nom, izoh) =>
    '<div style="background:#fff;border:1px solid #D9DFE8;border-radius:12px;padding:24px;' +
    'display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 12px rgba(10,26,52,.08)">' +
    '<div style="font-size:34px;font-weight:800;letter-spacing:-.02em;color:#0A1A34;' +
    "font-family:'JetBrains Mono',monospace\">" + son + '</div>' +
    '<div style="font-size:15px;font-weight:600;color:#0A1A34">' + nom + '</div>' +
    '<div style="font-size:13px;line-height:1.5;color:#52627A">' + izoh + '</div></div>';

  matn = matn.slice(0, boshi) +
`<div id="fikrlar" style="background:#F3F5F7;border-top:1px solid #D9DFE8;border-bottom:1px solid #D9DFE8">
    <div style="max-width:1200px;margin:0 auto;padding:88px 32px">
      <div style="text-align:center;margin-bottom:48px">
        <h2 style="margin:0 0 10px;font-size:34px;font-weight:700;letter-spacing:-.02em">Bazamizda bugun</h2>
        <p style="margin:0;font-size:16px;color:#52627A">Har bir raqam oʻlchangan. Hisoblab chiqarilgani yoʻq.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
        ${karta('1 528 764', 'tovar kuzatilmoqda', 'Uzum katalogi id boʻyicha aylanib chiqiladi — namuna emas, butun katalog.')}
        ${karta('82 684', 'doʻkon', 'Har biri qaysi turkumda sotishi bilan.')}
        ${karta('5 244', 'turkum', 'Narx, qoldiq va sotuvchilar soni turkum kesimida.')}
        ${karta('50 038', 'tovar kuniga oʻlchanadi', 'Kuniga uch marta. Qoldiq farqidan sotuv baholanadi.')}
      </div>
      <p style="margin:28px 0 0;text-align:center;font-size:13px;color:#8494A8">
        2026-08-24 holatiga. Raqamlar bazadan olinadi va har kuni oʻzgaradi.
      </p>
    </div>
  </div>

  ` + matn.slice(oxiri);

  // ---- 2. Nav yorligʻi boʻlim mazmuniga mos boʻlsin --------------
  matn = almashtir(matn,
    'href="#fikrlar" style="font-size:14px;font-weight:500;color:#52627A">Fikrlar<',
    'href="#fikrlar" style="font-size:14px;font-weight:500;color:#52627A">Bazamiz<',
    'nav yorligʻi');

  // ---- 3. Foyda kafolati ----------------------------------------
  //
  // "≤ $3 000 budjetli obunachilarga foyda kafolati" — moliyaviy
  // majburiyat, sharti bahsli ("rejaga rioya qilinsa" ni kim hal
  // qiladi?). Yurist koʻrmaguncha chiqmaydi.
  const k = matn.indexOf('≤ $3 000 budjetli obunachilarga foyda kafolati');
  if (k < 0) throw new Error('Kafolat bloki topilmadi — qurish toʻxtatildi.');
  const kBoshi = matn.lastIndexOf('<div', k);
  // BITTA `</div>`, ikkita emas.
  //
  // Ilgari bu yerda ikkinchi `</div>` ham olinardi va kesilgan
  // boʻlakning muvozanati −1 boʻlib qolardi: bitta `<div`, ikkita
  // `</div>`. Oʻrniga qoʻyilgan matn esa muvozanatli.
  //
  // Natijada butun hujjatda bitta yopilmagan `<div` qolardi va
  // brauzer undan keyingi HAMMA narsani oʻsha ochiq div ichiga
  // joylardi. Sotuv sahifasi baribir toʻgʻri koʻrinardi — shuning
  // uchun buni hech kim sezmadi — lekin qolgan uch EKRAN
  // (Demo chat, Marketpleys, 1688) yashirin idish ichiga tushib
  // qolgan va "Demoni boshlash" bosilganda BOʻSH sahifa chiqardi.
  const kOxiri = matn.indexOf('</div>', matn.indexOf('Shartlar ofertada')) + 6;
  matn = matn.slice(0, kBoshi) +
    '<div style="max-width:1200px;margin:0 auto;padding:0 32px 24px;text-align:center">' +
    '<span style="font-size:14px;color:#52627A">Obuna istalgan vaqtda bekor qilinadi. ' +
    'Shartlar <a href="#" style="color:#1A3A6C">ofertada</a>.</span></div>' +
    matn.slice(kOxiri);

  // ---- 4. Tekshirib boʻlmaydigan daʼvolar ------------------------
  matn = almashtir(matn, ">O'zbekistonda birinchi</div>", ">Uzum bozori tahlili</div>",
    '"Oʻzbekistonda birinchi"');
  matn = almashtir(matn, "Sizdan faqat pul kerak. Qolganini biz qilamiz.",
    "Qaror sizniki — raqamlar bizdan.", 'natija vaʼdasi');

  // ---- 5. TAYYOR / REJADA nishonlari -----------------------------
  //
  // Toʻqqiz imkoniyatdan bugun bittasi ishlaydi. Belgisiz qoldirish —
  // mavjud boʻlmagan narsani sotish.
  const TAYYOR = new Set(['Bozor analitikasi']);
  const nishon = (bormi) => bormi
    ? '<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;' +
      'background:#D4E94C;color:#0A1A34;font-size:11px;font-weight:700;letter-spacing:.04em;' +
      'vertical-align:middle">TAYYOR</span>'
    : '<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;' +
      'background:#EFF2F5;color:#52627A;font-size:11px;font-weight:600;letter-spacing:.04em;' +
      'vertical-align:middle;border:1px solid #D9DFE8">REJADA</span>';

  let soni = 0;
  matn = matn.replace(
    /<h3 style="margin:0 0 8px;font-size:17px;font-weight:600[^"]*">([^<]+)<\/h3>/g,
    (butun, nom) => { soni++; return butun.replace(`>${nom}</h3>`, `>${nom}${nishon(TAYYOR.has(nom))}</h3>`); },
  );
  if (soni !== 9) {
    throw new Error(`Imkoniyat kartalari ${soni} ta topildi, 9 ta kutilgandi — qurish toʻxtatildi.`);
  }

  matn = almashtir(matn,
    "10+ ishchi o'rnini bitta obuna bilan almashtiring",
    "10+ ishchi o'rnini bitta obuna bilan almashtiring</p>\n" +
    '        <p style="margin:10px 0 0;font-size:14px;color:#52627A">' +
    '<strong style="color:#0A1A34">TAYYOR</strong> — bugun ishlaydi. ' +
    '<strong style="color:#0A1A34">REJADA</strong> — ishlab chiqilmoqda, ' +
    'obunaga qoʻshilgach ochiladi.',
    'nishon izohi');

  // ---- 6. Qahramon qismidagi namuna ekran ------------------------
  //
  // Asl dizaynda bu joyda boʻsh kulrang quti turadi ("Dashboard
  // preview" degan placeholder). Uning oʻrniga mahsulot qanday
  // koʻrinishini koʻrsatadigan namuna kartochka qoʻyiladi.
  //
  // Bu NAMUNA, mijoz maʼlumoti emas — pastida shunday deb yozilgan.
  // Farqi muhim: soxta guvohlik "shu odam shuncha ishlab topdi"
  // deydi, namuna ekran esa "dastur shunday koʻrinadi" deydi.
  // Birinchisi yolgʻon, ikkinchisi odatiy va tushunarli.
  const qBoshi = matn.indexOf('<div style="aspect-ratio:4/3;border-radius:20px;background:rgba(255,255,255,.10)');
  if (qBoshi < 0) throw new Error('Qahramon qutisi topilmadi — qurish toʻxtatildi.');
  let qChuqurlik = 0, qj = qBoshi, qOxiri = -1;
  while (qj < matn.length) {
    if (matn.startsWith('<div', qj)) { qChuqurlik++; qj += 4; continue; }
    if (matn.startsWith('</div>', qj)) {
      qChuqurlik--; qj += 6;
      if (qChuqurlik === 0) { qOxiri = qj; break; }
      continue;
    }
    qj++;
  }
  if (qOxiri < 0) throw new Error('Qahramon qutisining yopilishi topilmadi.');

  const MONO = "font-family:'JetBrains Mono',monospace";
  const qator = (nom, summa, foiz, kenglik) =>
    '<div style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">' +
        `<span style="font-size:13px;color:#52627A">${nom}</span>` +
        `<span style="font-size:13px;color:#0A1A34;${MONO}">${summa} · ${foiz}</span>` +
      '</div>' +
      '<div style="height:6px;border-radius:999px;background:#EFF2F5;overflow:hidden">' +
        `<div style="height:100%;width:${kenglik};border-radius:999px;background:#1A3A6C"></div>` +
      '</div>' +
    '</div>';

  const qahramon =
'<div style="border-radius:20px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);padding:18px">' +
  // sarlavha qatori
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:9px">' +
      '<div style="width:26px;height:26px;border-radius:8px;background:#D4E94C;color:#0A1A34;' +
      'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800">Z</div>' +
      '<span style="font-size:14px;font-weight:600;color:#fff">ZumSavdo AI</span>' +
    '</div>' +
    '<span style="font-size:10px;font-weight:700;letter-spacing:.09em;color:rgba(255,255,255,.55)">REJA TAYYOR</span>' +
  '</div>' +
  // byudjet yorligʻi
  '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">' +
    '<span style="background:#D4E94C;color:#0A1A34;border-radius:999px;padding:6px 13px;' +
    `font-size:12px;font-weight:700;${MONO}">$1 000 · Texnika aksessuar</span>` +
  '</div>' +
  // byudjet taqsimoti
  '<div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:12px">' +
    '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px">' +
      `<span style="font-size:26px;font-weight:800;color:#0A1A34;${MONO}">$1 000</span>` +
      '<span style="font-size:10px;font-weight:700;letter-spacing:.09em;color:#8494A8">BUDJET TAQSIMOTI</span>' +
    '</div>' +
    qator('Xitoy tovarlari', '$650', '65%', '65%') +
    qator('Kargo (Xitoy → UZB)', '$130', '13%', '13%') +
    qator('Restock zaxira', '$150', '15%', '15%') +
  '</div>' +
  // tanlangan tovar
  '<div style="background:#fff;border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px">' +
    '<div style="width:38px;height:38px;border-radius:9px;background:#EFF2F5;flex:none"></div>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-size:13px;font-weight:600;color:#0A1A34">iPhone 15 silikon gʻilof</div>' +
      `<div style="font-size:11px;color:#8494A8;${MONO}">1688: ¥8/dona · 50 dona</div>` +
    '</div>' +
    '<span style="background:#D4E94C;color:#0A1A34;border-radius:999px;padding:4px 10px;' +
    'font-size:11px;font-weight:700;flex:none">Marja 55%</span>' +
  '</div>' +
  '<p style="margin:12px 0 0;text-align:center;font-size:11px;color:rgba(255,255,255,.45)">' +
  'Namuna ekran — mijoz maʼlumoti emas</p>' +
'</div>';

  matn = matn.slice(0, qBoshi) + qahramon + matn.slice(qOxiri);

  // ---- 7. Dizayn asbobining ekran almashtirgichi -----------------
  //
  // Pastki oʻng burchakda "EKRAN · 1 Landing · 2 Demo chat · …"
  // paneli turadi. U dizayn asbobi ichida ekranlar orasida yurish
  // uchun. Ochiq saytda u ortiqcha va gʻalati koʻrinadi.
  //
  // Demo bundan yoʻqolmaydi: "Demoni boshlash" tugmasi `startDemo`
  // ni chaqiradi, yaʼni demo asosiy tugmadan ochilaveradi.
  const eBoshi = matn.indexOf('<div style="position:fixed;bottom:16px;right:16px;');
  if (eBoshi < 0) {
    throw new Error('Ekran almashtirgichi topilmadi — qurish toʻxtatildi.');
  }
  // Mos yopiluvchi `</div>` ni sanab topamiz: ichida bir necha
  // ichma-ich div bor, shuning uchun oddiy indexOf yetarli emas.
  let chuqurlik = 0, j = eBoshi, eOxiri = -1;
  while (j < matn.length) {
    if (matn.startsWith('<div', j)) { chuqurlik++; j += 4; continue; }
    if (matn.startsWith('</div>', j)) {
      chuqurlik--;
      j += 6;
      if (chuqurlik === 0) { eOxiri = j; break; }
      continue;
    }
    j++;
  }
  if (eOxiri < 0) throw new Error('Almashtirgichning yopilishi topilmadi.');
  matn = matn.slice(0, eBoshi) + matn.slice(eOxiri);


  // ---- N. "Boshlash" tugmalari HECH QAYERGA olib bormasdi --------
  //
  // Uchala tugmada ham `sc-camel-on-click="{{ startDemo }}"` turgan
  // — bu dizayn vositasining bogʻlanishi va statik saytda u hech
  // narsa qilmaydi. Yaʼni sotuv sahifasidagi ASOSIY tugma bosilganda
  // hech nima boʻlmasdi.
  //
  // Bu eng zararli jim nosozlik turi: sahifa benuqson koʻrinadi,
  // odam tugmani bosadi, hech nima boʻlmaydi va u ketadi. Hech
  // qayerda xato yozilmaydi.
  //
  // `<button>` oʻrniga havolaga oʻraladi, `onclick` emas: havolani
  // yangi oynada ochish, nusxalash va qidiruv tizimi koʻrishi
  // mumkin. `onclick` bularning hech birini bermaydi.
  matn = hammasini(
    matn,
    /<button sc-camel-on-click="\{\{ startDemo \}\}"([^>]*)>Boshlash<\/button>/g,
    '<a href="/usta" style="text-decoration:none;display:block">' +
    '<button$1>Boshlash</button></a>',
    'Boshlash tugmalari /usta ga ulanadi',
    3,
  );

  // ---- N+1. Sahifada <title> va tavsif YOʻQ EDI ------------------
  //
  // Dizayn vositasi `<head>` ga faqat `charset` va `viewport`
  // qoʻygan. Natijada brauzer yorligʻida manzil turardi, qidiruv
  // tizimi esa koʻrsatadigan matn topmasdi.
  //
  // Bu ham jimgina nosozlik: sahifa toʻliq ishlaydi, xato yoʻq —
  // faqat uni hech kim topa olmaydi.
  //
  // `canonical` ATAYLAB qoʻyilmadi: saytning yakuniy manzili hali
  // maʼlum emas. Notoʻgʻri `canonical` — yoʻqidan yomonroq, chunki u
  // qidiruv tizimiga "asl nusxa boshqa joyda" deb ayta boshlaydi.
  matn = almashtir(
    matn,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>ZumSavdo — Uzumda nima sotishni raqamlar bilan tanlang</title>\n' +
    '<meta name="description" content="1,5 mln tovar va 82 ming doʻkon ' +
    'oʻlchovi asosida yoʻnalish tanlash. Taxmin emas — oʻlchangan raqam.">\n' +
    '<meta property="og:title" content="ZumSavdo">\n' +
    '<meta property="og:description" content="Uzumda nima sotishni ' +
    'raqamlar bilan tanlang.">\n' +
    '<meta property="og:type" content="website">',
    'sahifa sarlavhasi va tavsifi',
  );

  // Til belgisi — ekran oʻqigichlar va qidiruv tizimi uchun.
  matn = almashtir(matn, '<html><head>', '<html lang="uz"><head>',
    'html lang="uz"');

  // ---- N+2. Ishlamaydigan "Kirish" olib tashlandi ---------------
  //
  // Hisob tizimi YOʻQ: sessiya birinchi tashrifda avtomatik
  // ochiladi va javoblar oʻshanga bogʻlanadi. Yaʼni "Kirish"
  // tugmasi bosilsa koʻrsatadigan narsa yoʻq.
  //
  // Ishlamaydigan tugmani turgʻizib qoʻyish — sahifa benuqson
  // koʻrinadi, odam bosadi, hech nima boʻlmaydi va u ketadi.
  // Telegram ulanganda qaytariladi.
  //
  // DIQQAT: sahifada ikkita "Kirish" bor. Ikkinchisi — 1688
  // simulatsiyasining menyusida (oq matn) va u OʻSHA YERDA
  // qolishi kerak: demo boshqa saytni koʻrsatadi. Shuning uchun
  // naqsh rangga ham bogʻlangan.
  matn = hammasini(
    matn,
    /<a href="#" style="font-size:14px;font-weight:600;color:#1A3A6C">Kirish<\/a>/g,
    '',
    'saytning oʻz "Kirish" havolasi olib tashlandi',
    1,
  );

  // ---- N+3. Maxfiylik sahifasi ----------------------------------
  matn = hammasini(
    matn,
    /<a href="#">Maxfiylik<\/a>/g,
    '<a href="/maxfiylik">Maxfiylik</a>',
    'Maxfiylik havolasi ulandi',
    1,
  );

  olikHavolalar(matn);
  return matn;
}

/*
 * OʻLIK HAVOLALAR OʻSIB KETMASIN.
 *
 * Sahifada `href="#"` boʻlgan havolalar bor — bosilganda hech
 * qayerga olib bormaydi. Ularning bir qismi dizayn qadogʻidagi
 * 1688 SIMULATSIYASI ichida va u yerda oʻrinli: demo boshqa saytni
 * koʻrsatadi, uning menyusi ishlashi shart emas.
 *
 * Lekin saytning OʻZIDA ham beshtasi bor: Kirish, Roʻyxatdan
 * oʻtish, Oferta, Maxfiylik, Yordam. Ular haqiqiy sahifa kutadi va
 * ularsiz sayt tugallanmagan.
 *
 * Bu qorovul ularni tuzatmaydi — SANAB turadi. Yangi oʻlik havola
 * qoʻshilsa qurish toʻxtaydi va nomini aytadi. Aks holda roʻyxat
 * jimgina oʻsib borardi va "keyin tuzatamiz" abadiy choʻzilardi.
 */
const KUTILGAN_OLIK = [
  // 'Kirish' va 'Roʻyxatdan oʻtish' — 1688 simulatsiyasining menyusida
  // qolgani. Saytning oʻzinikisi olib tashlandi (N+2).
  'Kirish', 'Roʻyxatdan oʻtish', 'Oferta', 'Yordam', 'ofertada',
  // 1688 simulatsiyasi menyusi — boshqa saytning taqlidi.
  'Bosh sahifa', 'Brend markazlari', 'Sanoat markazlari', 'Ishlab chiqaruvchilar',
  'Yetkazib beruvchi', 'Yangi tovarlar', 'Chegirmalar', 'Koʻp sotilganlar',
  // Simulatsiyadagi qidiruv taklifi.
  'iPhone 15 gʻilof', 'Samsung A34 gʻilof', 'MagSafe', 'Shishaviy plyonka',
];

function olikHavolalar(matn) {
  const topilgan = [...matn.matchAll(/<a[^>]*href="#"[^>]*>(.*?)<\/a>/gs)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    // Uzum va ZumSavdo apostrofi ikki xil yoziladi — bir shaklga keltiramiz.
    .map((t) => t.replace(/['\u2019]/g, 'ʻ'))
    .filter(Boolean);

  const yangi = topilgan.filter((t) => !KUTILGAN_OLIK.includes(t));
  if (yangi.length > 0) {
    throw new Error(
      `Yangi oʻlik havola (href="#"): ${[...new Set(yangi)].join(', ')}.\n`
      + 'Yo haqiqiy manzil qoʻying, yo KUTILGAN_OLIK roʻyxatiga SABAB bilan qoʻshing.',
    );
  }

  const oz = KUTILGAN_OLIK.filter((k) => !topilgan.includes(k));
  if (oz.length > 0) {
    // Roʻyxat ham eskiradi: havola tuzatilgach undan oʻchirilishi kerak.
    throw new Error(
      `KUTILGAN_OLIK roʻyxati eskirgan — bular endi oʻlik emas: ${oz.join(', ')}.\n`
      + 'Ularni roʻyxatdan oʻchiring.',
    );
  }

  console.log(`oʻlik havola — ${topilgan.length} ta, hammasi roʻyxatda`);
}
/**
 * `<div>` MUVOZANATI — tuzatishlardan keyin.
 *
 * Bu qorovul aynan bitta xato uchun qoʻyilgan va u xato allaqachon
 * bir marta chiqarilgan saytga tushgan:
 *
 * 3-tuzatish (foyda kafolati) kesilayotgan boʻlakda bitta `<div` va
 * IKKITA `</div>` olardi, oʻrniga qoʻyilgani esa muvozanatli edi.
 * Hujjatda bitta yopilmagan `<div` qolardi.
 *
 * Sotuv sahifasi baribir toʻgʻri koʻrinardi — brauzer buzilgan
 * ichma-ichlikni jimgina tuzatadi va xato bermaydi. Lekin qolgan
 * uchta EKRAN (Demo chat, Marketpleys, 1688 sim) oʻsha ochiq div
 * ichiga tushib qolgan va "Demoni boshlash" bosilganda BOʻSH sahifa
 * chiqardi.
 *
 * Yaʼni: HTML ni satr sifatida kesish muvozanatni buzishi mumkin va
 * brauzer bu haqda hech narsa demaydi. Shuning uchun sanoq shu yerda.
 */
function muvozanatniTekshir(oldin, keyin) {
  const sana = (m, t) => (m.match(new RegExp(t, 'g')) ?? []).length;
  const a = sana(oldin, '<div') - sana(oldin, '</div>');
  const b = sana(keyin, '<div') - sana(keyin, '</div>');
  if (a !== b) {
    throw new Error(
      `<div> muvozanati buzildi: ${a} → ${b}. Matn tuzatishlaridan ` +
      'biri ochilish va yopilishni teng olmayapti. Sotuv sahifasi ' +
      'baribir toʻgʻri koʻrinishi mumkin, lekin boshqa ekranlar ' +
      'yashirin idish ichiga tushib qoladi va boʻsh chiqadi.',
    );
  }
}


const sahifaOldin = sahifa;

sahifa = matnniTuzat(sahifa);

muvozanatniTekshir(sahifaOldin, sahifa);

// React ni MAHALLIY fayldan ulaymiz.
//
// Yuklovchi (`dc-runtime`) React va ReactDOM ni unpkg.com dan
// soʻraydi. Qadoqda ularning mahalliy nusxasi BOR, lekin yuklovchi
// baribir internetga chiqadi — va u yerga yeta olmasa sahifa
// BUTUNLAY boʻsh qoladi. Oʻlchandi: 0px balandlik, 0 belgi matn,
// konsolda "failed to load react.production.min.js".
//
// Yuklovchining oʻzida yoʻl bor:
//   if (w.React && w.ReactDOM) return Promise.resolve();
// Yaʼni React allaqachon `window` da boʻlsa, u CDN ga bormaydi.
// Shuning uchun mahalliy nusxalarni yuklovchidan OLDIN qoʻyamiz.
//
// Bu tezlik uchun emas, ishonchlilik uchun: sayt begona xizmatning
// ishlashiga bogʻliq boʻlmasligi kerak.
const REACT = Object.entries(boyliklar)
  .filter(([, b]) => b.mime.includes('javascript'))
  .map(([uuid]) => `boylik/${uuid.slice(0, 8)}.js`);

function topFayl(qism) {
  const nom = REACT.find((f) => {
    const matn = readFileSync(`${CHIQISH}/${f}`, 'utf8').slice(0, 400);
    return matn.includes(qism);
  });
  if (!nom) throw new Error(`Topilmadi: ${qism}`);
  return nom;
}

const reactJs = topFayl('react.production.min.js');
const reactDomJs = topFayl('react-dom.production.min.js');
const runtimeJs = topFayl('dc-runtime');

sahifa = sahifa.replace(
  `<script src="${runtimeJs}"></script>`,
  `<script src="${reactJs}"></script>\n` +
  `<script src="${reactDomJs}"></script>\n` +
  `<script src="${runtimeJs}"></script>`,
);
if (!sahifa.includes(`<script src="${reactJs}"></script>`)) {
  throw new Error('React skript tegi qoʻshilmadi — yuklovchi tegi topilmadi.');
}

writeFileSync(`${CHIQISH}/${SAHIFA_NOMI}`, sahifa);
console.log(
  `${SAHIFA_NOMI} — ${(sahifa.length / 1024).toFixed(0)} KB\n` +
  `boylik/ — ${Object.keys(boyliklar).length} fayl, ` +
  `${(jami / 1024).toFixed(0)} KB`,
);
