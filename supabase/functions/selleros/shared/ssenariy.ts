/**
 * Suhbat ssenariysi — HOLAT MASHINASI.
 *
 * Nazoratchi topshirig'i (2026-09-25): ssenariy sun'iy intellektga
 * joylashsin, bir vaqtda BITTA savol, javob kelgach keyingisi.
 *
 * NEGA KOD, PROMPT EMAS (QOIDALAR.md, 3-bo'lim: "tavsiyani KOD
 * beradi, AI faqat tushuntiradi"). Savollar tartibini, tarmoqlanishni
 * va "keyin nima" ni shu fayl hal qiladi — deterministik. LLM ga
 * ikkita ish qoladi: tayyor jumlani odamdek aytish va obunachining
 * erkin matnini tushunish. Ikkalasi ham bo'lmasa (kalit yo'q, model
 * yiqildi) oqim TO'XTAMAYDI: har qadamda tayyor o'zbekcha jumla bor.
 *
 * ZANJIR UZILMASLIGI — asosiy talab. Har holatdan chiqish yo'li
 * bitta va aniq: `keyingi()` HAR DOIM nimadir qaytaradi — savol, kod
 * harakati, yoki "bu qadam hali qurilmagan" degan ochiq javob. Jim
 * qolish yo'q.
 *
 * NAVBAT BUZILMAYDI. `javobniQabulQil` faqat KUTILAYOTGAN savolga
 * javob oladi. Boshqa savolga javob kelsa — rad etiladi va sababi
 * aytiladi. Aks holda ikki savolga bir vaqtda javob berilib, holat
 * chalkashib ketardi.
 *
 * BO'SH JAVOB NOL EMAS (QOIDALAR.md, 4-bo'lim). "O'tkazib yuborish"
 * `null` yozadi. `Number("")` nolga teng — shuning uchun bo'shlik
 * ALOHIDA tekshiriladi. Byudjetda nol "pulim yo'q" degan javob,
 * `null` esa "aytmadi".
 *
 * 12 QADAM. Bugun 1–4 qurilgan. 5–12 ro'yxatda TURADI va mashina
 * ularga yetganda "tez orada" deb ROSTINI aytadi — bu ham zanjirning
 * bir bo'g'ini: obunachi yo'l qayerda tugaganini va nima kelishini
 * biladi.
 */

import type { ProfilJavoblari } from './profil.ts';

// ==================================================================== turlar

export type SuhbatSavolTuri = 'tanlov' | 'kopTanlov' | 'son' | 'matn';

export interface SuhbatVarianti {
  qiymat: string | number;
  nom: string;
}

export interface SuhbatSavoli {
  /** Barqaror id — bazada va mijozda shu bilan ataladi. */
  id: string;
  qadam: number;
  /** Menejerning gapi. Tayyor, o'zbekcha. LLM buni ODAMDEK aytishi mumkin, lekin MA'NOSINI o'zgartira olmaydi. */
  matn: string;
  turi: SuhbatSavolTuri;
  variantlar: readonly SuhbatVarianti[];
  /** "O'zim yozaman" — erkin qiymat qabul qilinadimi. */
  erkin: boolean;
  /** O'tkazib yuborish mumkinmi. Mumkin bo'lsa javob `null` bo'ladi. */
  otkazishMumkin: boolean;
  /** Bu javob profilning qaysi maydoniga tushadi (bo'lsa). */
  profilMaydoni: keyof ProfilJavoblari | null;
}

/** Kod bajaradigan harakat — deterministik hisob. LLM chaqirmaydi. */
export type KodHarakati = 'yonalishlar' | 'tovarlar' | 'tannarx';

export type Keyingi =
  | { tur: 'savol'; savol: SuhbatSavoli }
  | { tur: 'kod'; harakat: KodHarakati; qadam: number }
  | { tur: 'tezOrada'; qadam: number; nom: string; matn: string };

/**
 * Yo'l holati — bitta obunachining suhbatdagi o'rni.
 *
 * `javoblar` — savol id → javob (null = o'tkazib yuborilgan).
 * `natijalar` — kod harakatlari natijasi (yo'nalishlar ro'yxati va
 * h.k.); keyingi savollarning VARIANTLARI shundan yasaladi.
 */
export interface YolHolati {
  javoblar: Record<string, unknown>;
  natijalar: Partial<Record<KodHarakati, unknown>>;
}

// ==================================================================== qadamlar

export const SUHBAT_QADAMLARI = [
  { n: 1, nom: 'Tanishuv', qurilgan: true },
  { n: 2, nom: 'Yoʻnalish', qurilgan: true },
  { n: 3, nom: 'Tovar va miqdor', qurilgan: true },
  { n: 4, nom: 'Tannarx', qurilgan: true },
  { n: 5, nom: 'Xitoydan topish', qurilgan: false },
  { n: 6, nom: 'Buyurtma va kargo', qurilgan: false },
  { n: 7, nom: 'Rasmiylashtirish', qurilgan: false },
  { n: 8, nom: 'Qabul', qurilgan: false },
  { n: 9, nom: 'Studiya', qurilgan: false },
  { n: 10, nom: 'Yuklash', qurilgan: false },
  { n: 11, nom: 'Sotuv boshlandi', qurilgan: false },
  { n: 12, nom: 'Hisobot', qurilgan: false },
] as const;

/**
 * Byudjet tezkor tugmalari — ANIQ SON, oraliq emas.
 *
 * Nazoratchi qarori (docs/1-QADAM-SAVOLLAR.md): byudjet aniq summa.
 * Oraliq ("10–30 mln") yozilsa ball uni qaysi son deb olishini
 * taxmin qilishi kerak bo'lardi. Har tugma oraliqning PASTKI
 * chegarasini yozadi — "kamida shuncha bor" degan rost javob.
 */
export const BYUDJET_TUGMALARI: readonly SuhbatVarianti[] = [
  { qiymat: 5_000_000, nom: '5 mln soʻm' },
  { qiymat: 10_000_000, nom: '10 mln soʻm' },
  { qiymat: 30_000_000, nom: '30 mln soʻm' },
  { qiymat: 70_000_000, nom: '70 mln soʻm' },
];

export const UZUM_DOKONI = [
  { qiymat: 'sotyapman', nom: 'Ha, sotyapman' },
  { qiymat: 'kabinet_bor', nom: 'Kabinet bor, hali sotmaganman' },
  { qiymat: 'yoq', nom: 'Yoʻq' },
] as const;

export const MARJA_TUGMALARI: readonly SuhbatVarianti[] = [
  { qiymat: 20, nom: '20%' },
  { qiymat: 30, nom: '30%' },
  { qiymat: 50, nom: '50%' },
];

// ==================================================================== natija shakllari
// Mashina kod natijalaridan faqat VARIANT yasash uchun o'qiydi.
// Shuning uchun turlar tor: nomi va id si yetadi.

interface YonalishQisqa {
  categoryId: number;
  name: string;
  yetadi?: boolean | null;
  ball?: { value: number | null };
}
interface YonalishlarNatijasi {
  royxat?: YonalishQisqa[];
  olchov_yoq?: boolean;
  sabab?: string;
}
interface TovarQisqa {
  nomzod: { productId: number; title: string; narxSom?: number | null };
  miqdor: { dona: number; hisob: string } | null;
  miqdorSababi?: string | null;
}
interface TovarlarNatijasi {
  royxat?: TovarQisqa[];
  chiqarildi?: Array<{ title: string; sabab: string }>;
  olchov_yoq?: boolean;
  sabab?: string;
}

function yonalishlarNatija(h: YolHolati): YonalishlarNatijasi | null {
  const n = h.natijalar.yonalishlar as YonalishlarNatijasi | undefined;
  return n ?? null;
}
function tovarlarNatija(h: YolHolati): TovarlarNatijasi | null {
  const n = h.natijalar.tovarlar as TovarlarNatijasi | undefined;
  return n ?? null;
}

// ==================================================================== savollar

function savol(
  id: string,
  qadam: number,
  matn: string,
  turi: SuhbatSavolTuri,
  q: Partial<Omit<SuhbatSavoli, 'id' | 'qadam' | 'matn' | 'turi'>> = {},
): SuhbatSavoli {
  return {
    id, qadam, matn, turi,
    variantlar: q.variantlar ?? [],
    erkin: q.erkin ?? false,
    otkazishMumkin: q.otkazishMumkin ?? false,
    profilMaydoni: q.profilMaydoni ?? null,
  };
}

export function boshlangichHolat(): YolHolati {
  return { javoblar: {}, natijalar: {} };
}

/** Javob berilganmi (o'tkazib yuborilgan ham "berilgan" — `null`). */
function berilgan(h: YolHolati, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(h.javoblar, id);
}

/** Ko'p tanlovda tanlangan tovar id lari. */
function tanlanganTovarlar(h: YolHolati): number[] {
  const q = h.javoblar['tovarlar'];
  return Array.isArray(q) ? q.map(Number).filter(Number.isInteger) : [];
}

/**
 * KEYINGI HARAKAT — mashinaning yuragi.
 *
 * Tartib qat'iy va yuqoridan pastga o'qiladi: birinchi javobsiz
 * savol yoki bajarilmagan kod harakati qaytadi. Hamma narsa
 * bajarilgan bo'lsa — keyingi qadam; u qurilmagan bo'lsa — "tez
 * orada", sababi bilan.
 */
export function keyingi(h: YolHolati): Keyingi {
  // ---------------------------------------------------------- 1. Tanishuv
  if (!berilgan(h, 'byudjet')) {
    return { tur: 'savol', savol: savol('byudjet', 1,
      'Salom. Men sizning menejeringizman — birgalikda Uzumda birinchi partiyangizni sotamiz. Boshlaymiz: birinchi partiyaga qancha pul ajratasiz?',
      'son', { variantlar: BYUDJET_TUGMALARI, erkin: true, otkazishMumkin: true, profilMaydoni: 'budgetUzs' }) };
  }
  if (!berilgan(h, 'uzum_dokoni')) {
    return { tur: 'savol', savol: savol('uzum_dokoni', 1,
      'Uzumda doʻkoningiz bormi?',
      'tanlov', { variantlar: UZUM_DOKONI, profilMaydoni: 'hasUzumShop' }) };
  }
  if (h.javoblar['uzum_dokoni'] === 'sotyapman' && !berilgan(h, 'dokon_nomi')) {
    return { tur: 'savol', savol: savol('dokon_nomi', 1,
      'Doʻkoningiz nomi qanday? Keyin oʻz sotuvingiz raqamlarini ham koʻrsata olaman.',
      'matn', { erkin: true, otkazishMumkin: true }) };
  }

  // ---------------------------------------------------------- 2. Yo'nalish
  const yn = yonalishlarNatija(h);
  if (yn === null) return { tur: 'kod', harakat: 'yonalishlar', qadam: 2 };
  const yonalishlar = yn.royxat ?? [];
  if (!berilgan(h, 'yonalish')) {
    return { tur: 'savol', savol: savol('yonalish', 2,
      yonalishlar.length
        ? 'Byudjetingiz bilan boshlash mumkin boʻlgan yoʻnalishlar shular. Ball yuqori boʻlgani birinchi turibdi — qaysi birini olamiz?'
        : `Yoʻnalishlarni hozir koʻrsata olmayman: ${yn.sabab ?? 'oʻlchov yoʻq'}. Keyinroq qayta urinib koʻramiz.`,
      'tanlov', {
        variantlar: yonalishlar.map((y) => ({ qiymat: y.categoryId, nom: y.name })),
        otkazishMumkin: yonalishlar.length === 0,
      }) };
  }

  // ---------------------------------------------------------- 3. Tovar va miqdor
  const tn = tovarlarNatija(h);
  if (tn === null) return { tur: 'kod', harakat: 'tovarlar', qadam: 3 };
  const tovarlar = tn.royxat ?? [];
  if (!berilgan(h, 'tovarlar')) {
    return { tur: 'savol', savol: savol('tovarlar', 3,
      tovarlar.length
        ? 'Birinchi partiyada aynan nima sotasiz? Bular shu yoʻnalishda oʻlchangan tovarlar — bir nechtasini belgilang.'
        : `Bu yoʻnalishda tovar roʻyxatini bera olmayman: ${tn.sabab ?? 'oʻlchov yoʻq'}.`,
      'kopTanlov', {
        variantlar: tovarlar.map((t) => ({ qiymat: t.nomzod.productId, nom: t.nomzod.title })),
        otkazishMumkin: tovarlar.length === 0,
      }) };
  }
  for (const id of tanlanganTovarlar(h)) {
    const sid = `miqdor:${id}`;
    if (berilgan(h, sid)) continue;
    const t = tovarlar.find((x) => x.nomzod.productId === id);
    const nom = t?.nomzod.title ?? `#${id}`;
    const m = t?.miqdor ?? null;
    const variantlar: SuhbatVarianti[] = m
      ? [{ qiymat: m.dona, nom: `30 kunlik zaxira — ${m.dona} dona` },
         { qiymat: m.dona * 2, nom: `60 kunlik — ${m.dona * 2} dona` }]
      : [];
    return { tur: 'savol', savol: savol(sid, 3,
      m
        ? `${nom}: ${m.hisob}. Birinchi partiya uchun nechta olasiz?`
        : `${nom}: miqdorni hisoblab bera olmadim (${t?.miqdorSababi ?? 'sotuv oʻlchanmagan'}). Oʻzingiz nechta olmoqchisiz?`,
      'son', { variantlar, erkin: true, otkazishMumkin: true }) };
  }

  // ---------------------------------------------------------- 4. Tannarx
  if (!berilgan(h, 'marja')) {
    return { tur: 'savol', savol: savol('marja', 4,
      'Roʻyxat tayyor. Endi har tovarga Xitoyda maksimum qancha toʻlash mumkinligini hisoblaymiz. Qancha marja bilan sotmoqchisiz?',
      'son', { variantlar: MARJA_TUGMALARI, erkin: true }) };
  }
  if (h.natijalar.tannarx === undefined) return { tur: 'kod', harakat: 'tannarx', qadam: 4 };
  if (!berilgan(h, 'xitoy_tasdiq')) {
    return { tur: 'savol', savol: savol('xitoy_tasdiq', 4,
      'Chegara narxlar tayyor. Shu chegaralar bilan Xitoydan qidiramizmi?',
      'tanlov', { variantlar: [
        { qiymat: 'ha', nom: 'Ha, Xitoydan topamiz' },
        { qiymat: 'miqdor', nom: 'Miqdorni oʻzgartiraman' },
      ] }) };
  }

  // ---------------------------------------------------------- 5+. Hali qurilmagan
  const q = SUHBAT_QADAMLARI[4];
  return {
    tur: 'tezOrada', qadam: q.n, nom: q.nom,
    matn: `Keyingi qadam — ${q.nom}. Bu qism hali qurilmagan: 1688 qidiruv provayderi ulanishi kutilmoqda. Tayyor boʻlganda shu chatda oʻzim aytaman. Hozircha roʻyxatingiz va chegara narxlar saqlanib turadi.`,
  };
}

// ==================================================================== javob qabul

export interface QabulNatijasi {
  holat: YolHolati;
  /** `null` — qabul qilindi. Aks holda sabab, obunachiga ko'rsatiladi. */
  xato: string | null;
  /** Profilga yoziladigan maydon va qiymat (bo'lsa). */
  profil: Partial<ProfilJavoblari> | null;
}

/**
 * Javobni qabul qiladi. FAQAT kutilayotgan savolga.
 *
 * `undefined` / `''` / bo'sh massiv — o'tkazib yuborish; ruxsat bo'lsa
 * `null` yoziladi, bo'lmasa xato. Nol yoki `false` — JAVOB.
 */
export function javobniQabulQil(h: YolHolati, savolId: string, xom: unknown): QabulNatijasi {
  const k = keyingi(h);
  if (k.tur !== 'savol') {
    return { holat: h, xato: 'hozir savol kutilmayapti', profil: null };
  }
  const s = k.savol;
  if (s.id !== savolId) {
    return { holat: h, xato: `navbat buzildi: hozir "${s.id}" savoli kutilmoqda`, profil: null };
  }

  const bosh = xom === undefined || xom === null || xom === ''
    || (Array.isArray(xom) && xom.length === 0);
  if (bosh) {
    if (!s.otkazishMumkin) return { holat: h, xato: 'bu savolga javob kerak', profil: null };
    return yoz(h, s, null);
  }

  let qiymat: unknown;
  switch (s.turi) {
    case 'son': {
      if (typeof xom === 'boolean') return { holat: h, xato: 'son kutilgan edi', profil: null };
      const n = Number(xom);
      if (!Number.isFinite(n) || n < 0) return { holat: h, xato: 'son kutilgan edi', profil: null };
      if (!s.erkin && !s.variantlar.some((v) => Number(v.qiymat) === n)) {
        return { holat: h, xato: 'variantlardan birini tanlang', profil: null };
      }
      qiymat = n;
      break;
    }
    case 'tanlov': {
      const bor = s.variantlar.some((v) => String(v.qiymat) === String(xom));
      if (!bor && !s.erkin) return { holat: h, xato: 'variantlardan birini tanlang', profil: null };
      const v = s.variantlar.find((x) => String(x.qiymat) === String(xom));
      qiymat = v ? v.qiymat : String(xom);
      break;
    }
    case 'kopTanlov': {
      const royxat = Array.isArray(xom) ? xom : [xom];
      const ruxsat = new Set(s.variantlar.map((v) => String(v.qiymat)));
      const tanlangan = royxat.filter((x) => ruxsat.has(String(x)));
      if (!tanlangan.length) return { holat: h, xato: 'variantlardan kamida bittasini tanlang', profil: null };
      qiymat = tanlangan.map((x) => s.variantlar.find((v) => String(v.qiymat) === String(x))!.qiymat);
      break;
    }
    case 'matn': {
      const t = String(xom).trim();
      if (!t) return yoz(h, s, null);
      qiymat = t.slice(0, 200);
      break;
    }
  }
  return yoz(h, s, qiymat);
}

function yoz(h: YolHolati, s: SuhbatSavoli, qiymat: unknown): QabulNatijasi {
  const holat: YolHolati = { ...h, javoblar: { ...h.javoblar, [s.id]: qiymat } };

  // "Miqdorni o'zgartiraman" — 3-qadamdagi miqdor javoblari ochiladi.
  if (s.id === 'xitoy_tasdiq' && qiymat === 'miqdor') {
    const yangi = { ...holat.javoblar };
    for (const id of Object.keys(yangi)) if (id.startsWith('miqdor:')) delete yangi[id];
    delete yangi['xitoy_tasdiq'];
    const natijalar = { ...holat.natijalar };
    delete natijalar.tannarx;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  let profil: Partial<ProfilJavoblari> | null = null;
  if (s.profilMaydoni === 'budgetUzs') profil = { budgetUzs: qiymat === null ? null : Number(qiymat) };
  if (s.profilMaydoni === 'hasUzumShop') {
    profil = { hasUzumShop: qiymat === null ? null : qiymat !== 'yoq' };
  }
  return { holat, xato: null, profil };
}

/** Kod harakati natijasini holatga yozadi. */
export function natijaniYoz(h: YolHolati, harakat: KodHarakati, natija: unknown): YolHolati {
  return { ...h, natijalar: { ...h.natijalar, [harakat]: natija } };
}

/** Joriy qadam raqami — yon panel uchun. */
export function joriyQadam(h: YolHolati): number {
  const k = keyingi(h);
  if (k.tur === 'savol') return k.savol.qadam;
  return k.qadam;
}

// ==================================================================== tushuntirish

/**
 * Kod harakati natijasi uchun TAYYOR jumla.
 *
 * Bu LLM siz ham ishlaydigan matn. Undagi har raqam natijaning
 * o'zidan; hech narsa hisoblanmaydi, hech narsa taxmin qilinmaydi.
 * LLM bu jumlani odamdek qayta aytishi mumkin, lekin tekshiruv
 * darvozasi undagi raqamlar shu jumladagilar bilan bir xil bo'lishini
 * talab qiladi.
 */
export function tushuntir(harakat: KodHarakati, natija: unknown): string {
  if (harakat === 'yonalishlar') {
    const n = natija as YonalishlarNatijasi;
    if (n.olchov_yoq || !n.royxat?.length) {
      return `Yoʻnalishlarni hozir hisoblab bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "sizga mos yoʻnalish yoʻq" degani emas — hisob hali yoʻq.`;
    }
    const eng = n.royxat[0]!;
    const yetadi = n.royxat.filter((y) => y.yetadi === true).length;
    const ball = eng.ball?.value ?? null;
    return `${n.royxat.length} ta yoʻnalish baholandi. Eng yuqori ball — "${eng.name}"${ball !== null ? `, ${ball} ball` : ''}. `
      + (yetadi ? `${yetadi} tasiga byudjetingiz yetadi.` : 'Byudjet yetadimi — hali aytib boʻlmaydi.')
      + ' Tanlov sizniki: ball tartib beradi, qaror bermaydi.';
  }
  if (harakat === 'tovarlar') {
    const n = natija as TovarlarNatijasi;
    if (n.olchov_yoq || !n.royxat?.length) {
      return `Bu yoʻnalishda tovar roʻyxatini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    }
    const chiq = n.chiqarildi?.length ?? 0;
    return `${n.royxat.length} ta tovar oʻlchangan va 8 ta tuzoq-filtrdan oʻtdi.`
      + (chiq ? ` ${chiq} tasi tuzoq sababli roʻyxatdan chiqarildi — sababi har birida yozilgan.` : '')
      + ' Sotuv raqamlari zaxira kamayishidan chiqarilgan taxmin, Uzum bermaydi.';
  }
  return 'Tannarx hisoblandi. Har tovar uchun Xitoydagi chegara narx jadvalda.';
}
