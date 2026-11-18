/**
 * Suhbat sahifasining sof yordamchilari — React va DOM siz, shuning
 * uchun testda toʻgʻridan-toʻgʻri sinaladi: API shakli, holat kaliti,
 * xato gapi.
 */

import type { Tr } from '../../lib/til';

/** Suhbati bor mijoz belgisi (ikkinchi koʻrik, 9-taklif): bor boʻlsa — tayyor salom koʻrsatilmaydi. */
export const SUHBAT_BOR = 'zs-suhbat-bor';

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

/* ------------------------------------------------------ koʻrinish */

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

/* ------------------------------------------------------ javob berish qulayligi (2026-11-04) */
