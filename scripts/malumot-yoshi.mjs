/**
 * Qorovul — maʼlumot eskirib ketmadimi.
 *
 * NEGA BU KERAK. Yigʻish allaqachon avtomatik: skreyper kuniga uch
 * marta ishlaydi va oʻzidan keyin yoʻnalish keshini, sotuvni va
 * tuzoq bayroqlarini ham yangilaydi.
 *
 * Muammo boshqa joyda: HECH KIM ishlamaganini sezmaydi.
 *
 *   * GitHub jadvali kafolatlangan emas. 2026-08-25 da 12:00 dagi
 *     supurish 58 daqiqa kechikdi va buni faqat qoʻlda qarab bildim.
 *   * Supurish butunlay toʻxtasa, panel BENUQSON koʻrinadi: qamrov
 *     99.9% va xato 0% oxirgi supurish haqida gapiradi va oʻsha
 *     yerda muzlab qoladi.
 *
 * Shuning uchun qorovul jarayonga emas, NATIJAGA qaraydi:
 * maʼlumot necha soatlik. Chegara `packages/shared/src/kpi.ts` da,
 * bitta joyda.
 *
 * Chiqish kodi 0 dan boshqa boʻlsa GitHub ishni yiqitadi va ombor
 * egasiga xat yuboradi. Yangi xizmat, hisob va toʻlov kerak emas.
 *
 * Mahalliy ishlatish:
 *   ANON=... node scripts/malumot-yoshi.mjs
 */

const UCH = process.env.SELLEROS_UCHI
  ?? 'https://duequijnnzcngzzvjqst.supabase.co/functions/v1/selleros';
const ANON = process.env.ANON ?? '';

if (!ANON) {
  console.error('ANON yoʻq — qorovul koʻr boʻlardi. Toʻxtatildi.');
  process.exit(2);
}

let javob;
try {
  const r = await fetch(`${UCH}/kpi`, {
    headers: { Authorization: `Bearer ${ANON}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    console.error(`/kpi javobi ${r.status} — holatni bilib boʻlmadi.`);
    process.exit(3);
  }
  javob = await r.json();
} catch (xato) {
  console.error(`/kpi ga ulanib boʻlmadi: ${String(xato)}`);
  process.exit(3);
}

const qator = (javob.kpi ?? []).find((k) => k.kalit === 'malumot_yoshi');

if (qator === undefined) {
  // Qator yoʻqolgan boʻlsa ham jim oʻtmaydi: yoʻqolgan qator
  // "hammasi joyida" boʻlib koʻrinardi.
  console.error('`malumot_yoshi` qatori /kpi javobida YOʻQ.');
  process.exit(4);
}

const yosh = qator.qiymat === null ? '—' : `${qator.qiymat} soat`;

if (qator.holat === 'yaxshi') {
  console.log(`Maʼlumot yangi — ${yosh}.`);
  process.exit(0);
}

if (qator.holat === 'yomon') {
  console.error(`::error::Maʼlumot ESKIRGAN — ${yosh}.`);
  console.error('Supurish toʻxtagan yoki yiqilgan boʻlishi mumkin.');
  console.error('Tekshiring: Actions → Skreyper (SellerOS).');
  process.exit(1);
}

// "Oʻlchanmadi" ham xavotir: bilmaslik "hammasi joyida" degani emas.
console.error(`::error::Maʼlumot yoshi oʻlchanmadi (${qator.holat}).`);
if (qator.sabab) console.error(`Sabab: ${qator.sabab}`);
process.exit(1);
