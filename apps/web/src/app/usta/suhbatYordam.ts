/**
 * Suhbat sahifasining sof yordamchilari — React va DOM siz, shuning
 * uchun testda toʻgʻridan-toʻgʻri sinaladi: API shakli, holat kaliti,
 * xato gapi.
 */

import type { Tr } from '../../lib/til';

/* ------------------------------------------------------ turlar (API shakli) */

export interface Variant { qiymat: string | number; nom: string }

export interface Savol {
  id: string;
  qadam: number;
  matn: string;
  turi: 'tanlov' | 'kopTanlov' | 'son' | 'matn';
  variantlar: Variant[];
  erkin: boolean;
  otkazishMumkin: boolean;
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

export interface SuhbatJavobi {
  xato?: string;
  xabarlar: Xabar[];
  keyingi: Keyingi;
  qadam: number;
  yozildi: boolean;
  tarix?: Xabar[];
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

/* ------------------------------------------------------ savol sarlavhasi */

/**
 * Savol kartasining sarlavhasi — toʻliq savoldagi oxirgi soʻroq gap. Uzun
 * boʻlsa kirish qismi (":" yoki " — " gacha) tashlanadi; baribir uzun boʻlsa
 * — soʻz chegarasida qisqaradi. Ilgari 88-belgida soʻz oʻrtasidan kesilardi:
 * «…miqdor va cheg…» (nazoratchi, 2026-10-06). Savolda «nom» boʻlib, soʻroq
 * gapda boʻlmasa — nom oldiga qoʻshiladi (qaysi tovar haqida ekani bilinsin).
 */
export function qisqaSavol(matn: string): string {
  const gaplar = matn.split(/(?<=[.?!])\s+/).map((g) => g.trim()).filter(Boolean);
  const soroq = gaplar.filter((g) => g.endsWith('?'));
  let g = soroq[soroq.length - 1] ?? gaplar[gaplar.length - 1] ?? matn;
  if (g.length > 90) {
    const kesim = Math.max(g.lastIndexOf(': '), g.lastIndexOf(' — '));
    const qolgan = kesim > 0 ? g.slice(kesim).replace(/^(: | — )/u, '') : '';
    if (qolgan.length >= 10) g = qolgan.charAt(0).toUpperCase() + qolgan.slice(1);
  }
  const nom = /«[^»]+»/u.exec(matn)?.[0];
  if (nom && !g.includes(nom)) {
    // Uzun nom — soʻz chegarasida, oxirgi tinish belgisisiz: «Ayollar sumkasi, katta, A4 formatda…».
    const qisqa = nom.length > 42 ? `${nom.slice(0, 41).replace(/\s+\S*$/u, '').replace(/[\s,.;:—-]+$/u, '')}…»` : nom;
    g = `${qisqa} — ${g}`;
  }
  if (g.length <= 120) return g;
  const bosh = g.slice(0, 118);
  return `${bosh.slice(0, Math.max(bosh.lastIndexOf(' '), 60)).trimEnd()}…`;
}
