/**
 * Suhbat sahifasining sof yordamchilari — React va DOM siz, shuning
 * uchun testda toʻgʻridan-toʻgʻri sinaladi: API shakli, holat kaliti,
 * xato gapi.
 */

import type { Tr } from '../../lib/til';

/** Suhbati bor mijoz belgisi (ikkinchi koʻrik, 9-taklif): bor boʻlsa — tayyor salom koʻrsatilmaydi. */
export const SUHBAT_BOR = 'zs-suhbat-bor';

/** Bu brauzerda mijoz oldin javob berganmi (`suhbatBorDeb`). Saqlab boʻlmasa — yoʻq. */
export function suhbatBormi(): boolean {
  try { return window.localStorage.getItem(SUHBAT_BOR) === '1'; } catch { return false; }
}

/** Xabarlar orasida mijozniki boʻlsa — belgi qoʻyiladi (keyingi ochilishda server kutiladi). */
export function suhbatBorDeb(xabarlar: ReadonlyArray<{ rol: string }>): void {
  if (!xabarlar.some((x) => x.rol === 'obunachi')) return;
  try { window.localStorage.setItem(SUHBAT_BOR, '1'); } catch { /* saqlab boʻlmadi — keyingi safar ham salom darhol */ }
}

/** Fakt manbasi — mijozga koʻrinishi (`manbaKorinishi`). */
export interface ManbaKorinish {
  /** Bosiladigan saytlar (koʻpi bilan 3, sayt boʻyicha bittadan). */
  havolalar: Array<{ nom: string; url: string }>;
  /** Sayt topilmasa — manba matni (masalan «Oferta 14.08.2026, 4.17-band»); boʻlmasa `null`. */
  matn: string | null;
  /** Tekshirilgan sana «28.09.2026»; boʻlmasa `null`. */
  sana: string | null;
}

/** Ichki hujjat («docs/RASMIYLASHTIRISH-FAKTLAR.md») — mijozga koʻrsatilmaydi. */
const ICHKI_HUJJAT = /\bdocs\/[A-Z0-9-]+\.md\b/u;
/** Sayt manzili: «lex.uz/docs/-7681520», «seller.uzum.uz/manual/uz», «buxgalter.uz». */
const SAYT = /(?<![\w./-])((?:[a-z0-9-]+\.)+(?:uz|com|org|net|ru))(\/[^\s,;()«»"]*)?/giu;

/**
 * Fakt manbasi mijozga (ikkinchi koʻrik, 1-taklif): ichki hujjat qismi tashlanadi, saytlar bosiladigan
 * havola boʻladi, «(ikkilamchi)» kabi ichki belgi olinadi, sana «28.09.2026» koʻrinishida.
 */
export function manbaKorinishi(manba: string | null, olchandi: string | null): ManbaKorinish {
  const qismlar = (manba ?? '').split(';').map((x) => x.trim()).filter((x) => x !== '' && !ICHKI_HUJJAT.test(x));
  const havolalar: Array<{ nom: string; url: string }> = [];
  for (const q of qismlar) {
    for (const m of q.matchAll(SAYT)) {
      const nom = m[1]!.toLowerCase().replace(/^www\./u, '');
      if (havolalar.length < 3 && !havolalar.some((h) => h.nom === nom)) havolalar.push({ nom, url: `https://${m[1]!.toLowerCase()}${m[2] ?? ''}` });
    }
  }
  const matn = havolalar.length > 0 ? null
    : qismlar.join('; ').replace(/\s*[(—-]*\s*ikkilamchi\s*\)?/giu, '').trim() || null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(olchandi ?? '');
  return { havolalar, matn, sana: iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : (olchandi || null) };
}

/* ------------------------------------------------------ turlar (API shakli) */

export interface Variant {
  qiymat: string | number;
  nom: string;
  /** Ruscha nomi (4-taklif, 2026-11-04) — rus sahifasida shu koʻrinadi. */
  ru?: string;
  /** Tugma ostidagi izoh (6-taklif): marjada foyda soʻmda. */
  izoh?: string;
  izohRu?: string;
}

export interface Savol {
  id: string;
  qadam: number;
  matn: string;
  turi: 'tanlov' | 'kopTanlov' | 'son' | 'matn';
  variantlar: Variant[];
  erkin: boolean;
  otkazishMumkin: boolean;
  /** Koʻp tanlovda oldindan belgilanganlar — mijoz oldingi javobida aytgani (2026-10-15). */
  tanlangan?: Array<string | number>;
  /** «Oʻtkazib yuborish» oʻrniga oddiy tugma shu nom bilan (pul savolida «Hali bilmayman», 2026-11-04). */
  otkazishNomi?: string;
  /** Ism va telefon — alohida maydonlar (5-taklif, 2026-11-04). */
  forma?: 'ism_telefon' | 'ism' | 'telefon';
  /** Ruscha matn (4-taklif) — salom va asosiy savollar; boʻlmasa — `matn`. */
  ru?: string;
  otkazishNomiRu?: string;
  /** Salomning davomi — yopiq «Batafsil» (11-taklif); faqat birinchi kirishda. */
  batafsil?: string;
  batafsilRu?: string;
  /** Orqada ish ketyapti (8-taklif): 1688 qidiruvi paytidagi savol — sahifa qidiruvni tekshirib turadi. */
  fonda?: boolean;
}

/**
 * Yangi savol chiqqanda tanlov nimadan boshlanadi: server oldindan belgilaganlari
 * (faqat shu savol variantlaridan), boʻlmasa — boʻsh. Nazoratchi (2026-10-15):
 * «maishiy texnika sotganman» deb yozdim — keyingi savolda hech narsa belgilanmagan.
 */
export function boshlangichTanlov(k: Keyingi | null): Array<string | number> {
  if (k?.tur !== 'savol' || k.savol.turi !== 'kopTanlov' || !Array.isArray(k.savol.tanlangan)) return [];
  const bor = new Set(k.savol.variantlar.map((v) => String(v.qiymat)));
  return k.savol.tanlangan.filter((x) => bor.has(String(x)));
}

export type Keyingi =
  | { tur: 'savol'; savol: Savol }
  | { tur: 'kod'; harakat: string; qadam: number }
  | { tur: 'kutish'; qadam: number; matn: string; boshlandi: string | null }
  | { tur: 'tezOrada'; qadam: number; nom: string; matn: string };

export interface Xabar {
  rol: 'obunachi' | 'menejer' | 'kod';
  matn: string;
  savolId?: string;
  javob?: unknown;
  seq?: number;
}

/**
 * «Batafsil» xabari (2026-10-27, 3-taklif): yordamchining uzun tushuntirishi — chatda yopiq
 * turadi, «Batafsil» tugmasi bilan ochiladi (`{rol: 'menejer', javob: {batafsil: true}}`).
 */
export function batafsilmi(x: Xabar): boolean {
  return x.rol === 'menejer' && (x.javob as { batafsil?: unknown } | null | undefined)?.batafsil === true;
}

/**
 * «Siz haqingizda» belgisi (5-taklif, 2026-10-28): yozib olingan javob — soha, pul, tajriba.
 * `tahrir` — hozir oʻzgartirsa boʻladi (bosilsa savol qayta ochiladi).
 */
export interface SizBelgi { id: string; matn: string; ru?: string; tahrir: boolean }

/** «Profilim» uchun (10-taklif, 2026-11-04): chatda aytilgan ism va yashirilgan telefon. */
export interface Aloqa { ism: string | null; telefon: string | null }

export interface SuhbatJavobi {
  xato?: string;
  xabarlar: Xabar[];
  keyingi: Keyingi;
  qadam: number;
  yozildi: boolean;
  tarix?: Xabar[];
  /** Holat oʻzgargan javoblarda; yoʻq boʻlsa — oldingisi qoladi. */
  sizHaqingizda?: SizBelgi[];
  aloqa?: Aloqa;
}

/* ------------------------------------------------------ holat */

/**
 * Hozir nima kutilmoqda — shu kalit almashsa, savol almashgan. Kutish
 * matni (urinish sanogʻi) kalitga kirmaydi: 5/9-qadamda har tekshiruv
 * yangi obyekt qaytaradi, lekin savol oʻsha.
 */
export function keyingiKaliti(k: Keyingi | null): string {
  if (k === null) return '';
  if (k.tur === 'savol') return `savol:${k.savol.id}`;
  if (k.tur === 'kod') return `kod:${k.harakat}`;
  return `${k.tur}:${k.qadam}`;
}

/**
 * Javob tanasi. JSON boʻlmasa (vaqt tugash sahifasi, proksi xatosi) —
 * `null`: sahifa yiqilmaydi va "SyntaxError: Unexpected token" degan
 * matnni odamga koʻrsatmaydi.
 */
export async function jsonOl(r: Pick<Response, 'json'>): Promise<SuhbatJavobi | null> {
  try {
    const d = (await r.json()) as unknown;
    return d !== null && typeof d === 'object' ? (d as SuhbatJavobi) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------ xato gapi */

/*
 * Xato holati: serverning xom matni yoki oʻzimizning belgisi. Odamga
 * koʻrinadigan gap RENDERDA tanlanadi (`xatoGapi`) — til almashsa ham
 * toʻgʻri tilda chiqadi. Xom matn ("TypeError: Failed to fetch") konsolga
 * yoziladi, ekranga emas (audit, 2026-10-05).
 */
export const XATO = {
  /** `fetch` yiqildi — internet uzildi yoki server yetib boʻlmadi. */
  tarmoq: '§tarmoq',
  /** Javob keldi, lekin JSON emas yoki shakli buzuq. */
  buzuq: '§buzuq',
  /** Suhbat boshqa oynada oldinga ketgan — holat qayta oʻqildi. */
  yangilandi: '§yangilandi',
  /** Turn hisoblandi, lekin jurnalga yozilmadi. */
  saqlanmadi: '§saqlanmadi',
} as const;

/** Ssenariyning qisqa rad matnlari — ikki tilda (qolganlari oʻzicha chiqadi). */
const RAD: Readonly<Record<string, readonly [string, string]>> = {
  'bu savolga javob kerak': ['Bu savolga javob kerak.', 'На этот вопрос нужен ответ.'],
  'variantlardan birini tanlang': ['Variantlardan birini tanlang.', 'Выберите один из вариантов.'],
  'variantlardan kamida bittasini tanlang': ['Kamida bittasini tanlang.', 'Выберите хотя бы один вариант.'],
};

/** Xato holatini odam tiliga oʻgiradi. Tanish boʻlmagan ssenariy matni — oʻzicha. */
export function xatoGapi(x: string, tr: Tr): string {
  if (x === XATO.tarmoq) return tr('Internet aloqasi uzildi. Qayta urinib koʻring.', 'Связь с интернетом прервалась. Попробуйте ещё раз.');
  if (x === XATO.buzuq) return tr('Server javob bermadi. Qayta urinib koʻring.', 'Сервер не ответил. Попробуйте ещё раз.');
  if (x === XATO.yangilandi) return tr('Suhbat boshqa oynada davom etgan ekan — yangiladim.', 'Чат продолжился в другой вкладке — я его обновил.');
  if (x === XATO.saqlanmadi || /jurnalga yozilmadi/.test(x)) return tr('Javob saqlanmadi — qayta yuboring.', 'Ответ не сохранился — отправьте ещё раз.');
  if (/baza javob bermadi/.test(x)) return tr('Baza hozir javob bermayapti — birozdan keyin qayta urinib koʻring.', 'База сейчас не отвечает — попробуйте чуть позже.');
  if (/sessiya ochilmadi|ulanib boʻlmadi|sozlanmagan/.test(x)) return tr('Server bilan aloqa boʻlmadi. Qayta urinib koʻring.', 'Нет связи с сервером. Попробуйте ещё раз.');
  if (/sessiya/.test(x)) return tr('Sessiya topilmadi — sahifani yangilang.', 'Сессия не найдена — обновите страницу.');
  if (/ssenariy aylanib qoldi/.test(x)) return tr('Keyingi qadam ochilmadi (ichki xato). Birozdan keyin qayta urinib koʻring.', 'Следующий шаг не открылся (внутренняя ошибка). Попробуйте чуть позже.');
  const rad = RAD[x];
  if (rad) return tr(rad[0], rad[1]);
  return x;
}

/** Suhbat boshqa oynada oldinga ketganini bildiradigan server javoblari. */
export function navbatBuzildimi(x: string | undefined): boolean {
  return x !== undefined && /^(navbat buzildi|hozir savol kutilmayapti)/.test(x);
}

/* ------------------------------------------------------ koʻrinish */

/**
 * Son ichida qator uzilmasin: mingliklar orasidagi boʻshliq va «≈ » dan
 * keyingisi — uzilmas boʻshliq (U+00A0). Telefonda «≈ 108 / 920» va
 * «komissiya 24 / 503» boʻlib qolardi (2026-10-07). `son()` oʻzi oddiy
 * boʻshliq beradi (matn va nusxa uchun) — bu faqat ekranga chiqarishda.
 */
export function uzilmasSon(s: string): string {
  return s.replace(/(\d) (?=\d{3}(?!\d))/gu, '$1 ').replace(/≈ /gu, '≈ ');
}

/**
 * 1688 rasmi kartada kichik nusxada. Asl fayl 50–500 KB (1500×1500 gacha),
 * kartada esa ~380×210 px koʻrinadi; alicdn oʻlcham qoʻshimchasi
 * (`_600x600.jpg`) — 20–70 KB, retina ekranga ham yetadi. Faqat alicdn
 * manzili: studiya (imzoli) va Uzum rasmlariga tegilmaydi; qoʻshimcha
 * bor boʻlsa — ikkinchi marta qoʻshilmaydi.
 */
export function kichikRasm(url: string): string {
  if (!/^https?:\/\/[a-z0-9.-]+\.alicdn\.com\/[^?#]+\.(jpe?g|png|webp)$/iu.test(url)) return url;
  if (/_\d+x\d+[^/]*$|\.\d+x\d+\.(jpe?g|png|webp)$/iu.test(url)) return url;
  return `${url}_600x600.jpg`;
}

/**
 * Matnni oddiy matn va `https://` havolalarga boʻladi — chat pufagida
 * manzil bosiladigan boʻlsin (telefonda «https://logistics.uzum.uz» ni
 * qoʻlda koʻchirish kerak edi, 2026-10-07). Oxiridagi tinish belgisi
 * («…uzum.uz.», «…uz),») havolaga kirmaydi.
 */
export function havolaQismlari(matn: string): Array<{ matn: string; havola: boolean }> {
  return matn
    .split(/(https?:\/\/[^\s«»"'<>]*[^\s«»"'<>.,;:!?)\]])/u)
    .map((q, i) => ({ matn: q, havola: i % 2 === 1 }))
    .filter((q) => q.matn !== '');
}

/* ------------------------------------------------------ aylantirish (2026-11-03) */

/**
 * Aylantirish LANGARI (nazoratchi, 2026-11-03: «variant yoki tovar tanlaganda scroll pastga
 * tushib ketyapti»). Ilgari har yangi xabarda chat eng PASTGA aylanardi: uzun javob kelsa mijoz
 * uning boshini emas, oxirini koʻrardi (telefonda pul tanlagach +2 600 px, ism yozgach +10 900 px).
 *   - `men`   — mijozning oxirgi pufagi ekran tepasiga chiqadi, javob uning ostida boshlanadi;
 *   - `xitoy` — 1688 da taklif tanlangach: shu kartadagi keyingi tovar (oxirgisidan keyin — `men`);
 *   - `tepa`  — yangi suhbat.
 * `qolda` — mijoz oʻzi aylantirdi: keyingi javobigacha hech narsa uni tortmaydi.
 * `sakra` — bir martalik oʻtish (ochilganda, boshidan, «Suhbatlarim»dan qaytganda).
 */
export interface Langar { tur: 'men' | 'xitoy' | 'tepa'; qolda: boolean; sakra: boolean }

/**
 * Yuborilgan soʻrovdan keyingi langar: boshidan — `tepa`; 1688 tanlovi (oʻtkazib yuborish ham) —
 * `xitoy`; chatda koʻrinadigan gap (tugma, yozilgan matn) — `men`. Boshqasi (kod qadami,
 * tekshiruv) — `null`: langar oʻzgarmaydi, javob oldingi gap ostida davom etadi.
 */
export function sorovLangari(tana: Record<string, unknown>, korinish: string | null): Langar['tur'] | null {
  if (tana.boshdan === true) return 'tepa';
  if (typeof tana.savolId === 'string' && tana.savolId.startsWith('xitoy_tanlov:')) return 'xitoy';
  return korinish !== null ? 'men' : null;
}

/**
 * Qayerga aylantirish kerak — `null`: joyida qolsin.
 *   - `sakra` — istalgan tomonga, darhol (nuqta topilmasa — eng tepa);
 *   - mijoz oʻzi aylantirgan yoki 1688 tanlovi yoʻlda — joyida;
 *   - javob TUGADI (`tugadi`) — langar oʻz joyiga, tepaga ham: javob kelganda tepadagi savolning
 *     tugmalari yigʻiladi (savol pufagi qisqaradi), qoralama haqiqiy xabarlarga almashadi — langar
 *     siljiydi (brauzerda oʻlchandi: mijoz gapi 352 px tepaga chiqib ketardi). 1688 da — silliq:
 *     bu keyingi tovarga oʻtish;
 *   - aks holda faqat PASTGA va faqat langar nuqtasigacha: javob ortidan quvmaydi.
 * `nuqta` — langar elementi tepasi aylanuvchi quti koordinatasida (chegaralangan); `null` — topilmadi.
 */
export function langarQarori(l: Langar, band: boolean, joriy: number, nuqta: number | null, tugadi = false): { top: number; darhol: boolean } | null {
  if (l.sakra) return { top: nuqta ?? 0, darhol: true };
  if (l.qolda || (l.tur === 'xitoy' && band) || nuqta === null) return null;
  if (tugadi) return Math.abs(nuqta - joriy) > 1 ? { top: nuqta, darhol: l.tur !== 'xitoy' } : null;
  return nuqta > joriy + 1 ? { top: nuqta, darhol: false } : null;
}

/**
 * «↓ Savolga» tugmasi: savol (1688 da — tanlanadigan tovar) ekran pastidan tashqarida — `savol`;
 * savol yoʻq yoki javob kutilmoqda, pastda esa koʻp narsa qolgan — `past`; aks holda tugma yoʻq.
 * `savolTepasi` — savol tepasining ekrandagi oʻrni (quti tepasidan, px), `null` — savol yoʻq.
 */
export function pastgaHolati(savolTepasi: number | null, qutiBoyi: number, pastQoldi: number): 'savol' | 'past' | null {
  if (savolTepasi !== null) return savolTepasi > qutiBoyi - 60 ? 'savol' : null;
  return pastQoldi > 160 ? 'past' : null;
}

/** Yonma-yon kartalarda hozirgisi (0 dan): surilgan masofa / bitta karta qadami, chegaralangan. */
export function yonmaJoriy(chapdan: number, qadam: number, soni: number): number {
  if (!(qadam > 0) || soni < 1) return 0;
  return Math.min(soni - 1, Math.max(0, Math.round(chapdan / qadam)));
}

/* ------------------------------------------------------ javob berish qulayligi (2026-11-04) */

/**
 * Formadagi telefon → 9 xonali milliy raqam («901234567»), boʻlmasa `null`. Maydon oldida «+998»
 * turadi; brauzer toʻldirsa yoki mijoz koʻchirib qoʻysa — «+998 90 123-45-67», «998901234567»,
 * «8 90 123 45 67» ham boʻladi. Serverdagi `telefonniOqi` bilan bir xil qoida (birinchi raqam 2–9).
 */
export function formaTelefoni(xom: string): string | null {
  let r = xom.replace(/\D/gu, '');
  if (r.length === 12 && r.startsWith('998')) r = r.slice(3);
  else if (r.length === 10 && r.startsWith('8')) r = r.slice(1);
  return /^[2-9]\d{8}$/u.test(r) ? r : null;
}

/** «901234567» → «90 123 45 67». */
export function telefonGuruhla(r: string): string {
  return r.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/u, '$1 $2 $3 $4');
}

/**
 * Aloqa formasi (5-taklif): maydonlardan bitta javob — server uni bitta gapdek oʻqiydi
 * (`ismVaTelefonniOqi`). `korinish` — chatda darhol koʻrinadigan gap. Xato — qaysi maydon.
 * Ism kamida ikki soʻz (ism va familiya), raqamsiz — serverdagi kabi.
 */
export function aloqaJavobi(forma: NonNullable<Savol['forma']>, ism: string, telefon: string):
  { javob: string; korinish: string } | { xato: 'ism' | 'telefon' } {
  const i = ism.normalize('NFC').trim().replace(/\s+/gu, ' ');
  const ismKerak = forma !== 'telefon';
  const telKerak = forma !== 'ism';
  if (ismKerak && (/\d/u.test(i) || i.split(' ').filter((s) => /\p{L}{2,}/u.test(s)).length < 2)) return { xato: 'ism' };
  const t = telKerak ? formaTelefoni(telefon) : null;
  if (telKerak && t === null) return { xato: 'telefon' };
  const tel = t === null ? null : `+998${t}`;
  const telKor = t === null ? null : `+998 ${telefonGuruhla(t)}`;
  return {
    javob: [ismKerak ? i : null, tel].filter(Boolean).join(', '),
    korinish: [ismKerak ? i : null, telKor].filter(Boolean).join(', '),
  };
}

/**
 * Raqam klaviaturasi (11-taklif): faqat son soʻraladigan savollarda — marja (%) va dona. Pul
 * savolida emas: u yerda «70 mln», «5000 $» deb yozishadi va savol ham berishadi.
 */
export function raqamSavolimi(savolId: string): boolean {
  return savolId === 'marja' || savolId.startsWith('miqdor:') || savolId.startsWith('partiya_miqdor:');
}

/**
 * «Dollarda yozaman» (1-taklif): pul savolida faqat son yozilsa — oxiriga «$» qoʻshiladi
 * («5000» → «5000 $»); birlik yozilgan boʻlsa (soʻm, mln, $) — oʻzicha.
 */
export function dollarMatni(matn: string): string {
  const t = matn.trim();
  return /^\d[\d\s.,]*$/u.test(t) ? `${t} $` : t;
}

/** Koʻp tanlov paneli (3-taklif): tanlanganlar nomi — variantlar tartibida. */
export function tanlanganNomlar(variantlar: readonly Variant[], tanlangan: ReadonlyArray<string | number>): string[] {
  const bor = new Set(tanlangan.map(String));
  return variantlar.filter((v) => bor.has(String(v.qiymat))).map((v) => v.nom);
}

/**
 * Salom va savol (11-taklif): «Batafsil» salomdan (birinchi xatboshidan) keyin turadi. Xatboshi
 * boʻlmasa — hammasi bitta boʻlak, «Batafsil» oxirida.
 */
export function salomBolagi(matn: string): [string, string | null] {
  const i = matn.indexOf('\n\n');
  if (i < 0) return [matn, null];
  return [matn.slice(0, i).trim(), matn.slice(i + 2).trim() || null];
}
