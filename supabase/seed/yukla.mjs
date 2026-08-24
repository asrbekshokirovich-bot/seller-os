/**
 * `category_requirements.csv` ni bazaga yuklaydi.
 *
 * NEGA BU FAYL KERAK EDI. CSV yozilgan, ustunlari hujjatlashtirilgan
 * va nazoratchi uni toʻldirishi kutilgan — lekin uni OʻQIYDIGAN
 * hech narsa yoʻq edi. Yaʼni odam bilimi bazaga kiradigan yoʻl
 * umuman qurilmagan. Shu sababdan bugun `optimal_entry_uzs` va
 * `seasonality` da nol qator, `kirish` va `mavsum` ballari esa
 * doim `null`.
 *
 * ENG MUHIM QOIDA: BOʻSH KATAK — `null`, NOL YOKI `false` EMAS.
 *
 * `marking_required` boʻsh boʻlsa "markirovka kerak emas" degani
 * EMAS, "bilmaymiz" degani. Ularni aralashtirish eng qimmat xato
 * boʻlardi: odam sota olmaydigan tovarga butun partiya pulini
 * tikadi. Aynan shu xato 2026-08-24 gacha bazada turgan edi
 * (`NOT NULL boolean` + boʻsh jadval → har turkum "sertifikat
 * kerak emas" deb oʻqilardi).
 *
 * Ishlatish:
 *   node supabase/seed/yukla.mjs --tekshir   faqat tekshiradi
 *   node supabase/seed/yukla.mjs             tekshiradi va yozadi
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ILDIZ = join(import.meta.dirname, '../..');
const CSV = join(ILDIZ, 'supabase/seed/category_requirements.csv');

/*
 * `source` — MAJBURIY emas, lekin bekorga qoʻyilmagan.
 *
 * Bazada allaqachon uchta qator bor va ularning `source` i huquqiy
 * havola: "VMQ 148, 02.04.2022 (lex.uz/...), 1-guruh". Agar yuklovchi
 * `source` ni oʻzi (`seed-csv` deb) yozganida, shu havola yoʻqolardi
 * — yaʼni "markirovka kerak" degan daʼvo qolardi, uning DALILI esa
 * yoʻqolardi.
 *
 * Manba maʼlumotning bir qismi, yuklash usulining emas. CSV da boʻsh
 * qoldirilsa `seed-csv` yoziladi.
 */
const USTUNLAR = [
  'category_external_id', 'marking_required', 'certificate_required',
  'entry_cost_uzs', 'entry_weeks', 'optimal_entry_uzs', 'seasonality',
  'source', 'note',
];

/** CSV ni qatorlarga ajratadi. Tirnoq ichidagi vergul saqlanadi. */
export function csvOqi(matn) {
  const satrlar = matn.split(/\r?\n/).filter((s) => s.trim() !== '');
  if (!satrlar.length) throw new Error('CSV boʻsh — sarlavha ham yoʻq.');

  const sarlavha = bol(satrlar[0]);
  const kutilgan = USTUNLAR.join(',');
  if (sarlavha.join(',') !== kutilgan) {
    throw new Error(
      `CSV sarlavhasi mos emas.\n  kutilgan: ${kutilgan}\n  topilgan: ${sarlavha.join(',')}`,
    );
  }

  return satrlar.slice(1).map((satr, i) => {
    const q = bol(satr);
    if (q.length !== USTUNLAR.length) {
      throw new Error(
        `${i + 2}-satrda ${q.length} ta katak, ${USTUNLAR.length} ta kutilgan.`,
      );
    }
    return Object.fromEntries(USTUNLAR.map((u, j) => [u, q[j]]));
  });
}

function bol(satr) {
  const natija = [];
  let joriy = '';
  let tirnoqda = false;
  for (const belgi of satr) {
    if (belgi === '"') { tirnoqda = !tirnoqda; continue; }
    if (belgi === ',' && !tirnoqda) { natija.push(joriy.trim()); joriy = ''; continue; }
    joriy += belgi;
  }
  natija.push(joriy.trim());
  return natija;
}

/** Boʻsh katak — `null`. Bu faylning butun mavjud sababi shu. */
function bosMi(x) {
  return x === undefined || x === null || String(x).trim() === '';
}

function haYoq(xom, qayer) {
  if (bosMi(xom)) return null;
  const t = String(xom).trim().toLowerCase();
  if (t === '1' || t === 'true' || t === 'ha') return true;
  if (t === '0' || t === 'false' || t === 'yoq' || t === "yo'q") return false;
  throw new Error(`${qayer}: "${xom}" — 0/1 kutilgan. Bilmasangiz BOʻSH qoldiring.`);
}

function butun(xom, qayer, { manfiy = false } = {}) {
  if (bosMi(xom)) return null;
  const n = Number(String(xom).replaceAll(' ', '').replaceAll('_', ''));
  if (!Number.isInteger(n)) throw new Error(`${qayer}: "${xom}" — butun son kutilgan.`);
  if (!manfiy && n < 0) throw new Error(`${qayer}: "${xom}" — manfiy boʻlmasligi kerak.`);
  return n;
}

/**
 * 12 ta koeffitsient. Yarim toʻldirilgan massiv QABUL QILINMAYDI.
 *
 * `mavsum()` qismi uzunligi 12 boʻlmasa `null` qaytaradi — yaʼni
 * 8 ta son yozilsa ball jimgina hisoblanmay qolardi va sababi
 * hech qayerda koʻrinmasdi.
 */
function mavsumiylik(xom, qayer) {
  if (bosMi(xom)) return null;
  const qismlar = String(xom).split(',').map((s) => s.trim());
  if (qismlar.length !== 12) {
    throw new Error(
      `${qayer}: ${qismlar.length} ta son — roppa-rosa 12 ta kerak ` +
      '(yanvardan dekabrgacha). Toʻliq bilmasangiz BOʻSH qoldiring: ' +
      'yarim massivdan chiqqan ball notoʻgʻri boʻladi va buni hech ' +
      'narsa koʻrsatmaydi.',
    );
  }
  return qismlar.map((s) => {
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${qayer}: "${s}" — musbat son kutilgan.`);
    }
    return n;
  });
}

export function qatorniTekshir(xom, satr) {
  const q = (u) => `${satr}-satr, ${u}`;
  const id = butun(xom.category_external_id, q('category_external_id'));
  if (id === null) throw new Error(`${satr}-satr: category_external_id boʻsh boʻlmaydi.`);

  return {
    category_external_id: id,
    marking_required: haYoq(xom.marking_required, q('marking_required')),
    certificate_required: haYoq(xom.certificate_required, q('certificate_required')),
    entry_cost_uzs: butun(xom.entry_cost_uzs, q('entry_cost_uzs')),
    entry_weeks: butun(xom.entry_weeks, q('entry_weeks')),
    optimal_entry_uzs: butun(xom.optimal_entry_uzs, q('optimal_entry_uzs')),
    seasonality: mavsumiylik(xom.seasonality, q('seasonality')),
    source: bosMi(xom.source) ? null : String(xom.source).trim(),
    note: bosMi(xom.note) ? null : String(xom.note).trim(),
  };
}

/** Butun faylni oʻqiydi va tekshiradi. Xato boʻlsa otadi. */
export function faylniOqi(matn) {
  const xomlar = csvOqi(matn);
  const korilgan = new Set();
  return xomlar.map((xom, i) => {
    const q = qatorniTekshir(xom, i + 2);
    if (korilgan.has(q.category_external_id)) {
      throw new Error(
        `${i + 2}-satr: ${q.category_external_id} takrorlanmoqda. ` +
        'Qaysi qator yozilishi tasodifga qolardi.',
      );
    }
    korilgan.add(q.category_external_id);
    return q;
  });
}

// ---------------------------------------------------------------- skript

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tekshirish = process.argv.includes('--tekshir');
  const qatorlar = faylniOqi(readFileSync(CSV, 'utf8'));

  const toliq = (n) => qatorlar.filter((q) => q[n] !== null).length;
  console.log(`${qatorlar.length} ta qator oʻqildi.`);
  for (const u of USTUNLAR.slice(1)) {
    console.log(`  ${u.padEnd(22)} ${toliq(u)} ta toʻldirilgan`);
  }

  if (tekshirish) {
    console.log('CSV shakli toʻgʻri.');
    process.exit(0);
  }

  if (!qatorlar.length) {
    // Boʻsh CSV bilan yozishga urinish — bazaga hech narsa qilmaydi,
    // lekin "yuklandi" degan yashil xabar CHALGʻITARDI.
    console.error('CSV da bitta ham qator yoʻq — yozadigan narsa yoʻq.');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY yoʻq.');
    process.exit(1);
  }

  const javob = await fetch(`${url}/rest/v1/rpc/so_talablarni_yoz`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_qatorlar: qatorlar }),
  });

  const matn = await javob.text();
  if (!javob.ok) {
    console.error(`Yozilmadi (${javob.status}): ${matn}`);
    process.exit(1);
  }
  console.log(`Yozildi: ${matn}`);
}
