/**
 * «ISHLARIM» (ikkinchi koʻrik K2, 2026-11-06). Chat «Ochiq ishlar yozildi: YATT ochilishi; Uzum ombor qabuli
 * (12.11.2026 gacha)» derdi, lekin bu roʻyxatni keyin koʻradigan joy yoʻq edi — mijoz eslab qolishi kerak edi.
 * Endi menyuda «Ishlarim»: ochiq ishlar muddati bilan, bajarilganini belgilash mumkin.
 *
 * Baza — `selleros.ochiq_ish` (0056; yangi jadval yoʻq), funksiyalar `so_ochiq_ishlar` va
 * `so_ochiq_ish_holat` (0083). Har mijoz faqat oʻz ishlarini koʻradi. «tekshirish» ishlari («sayt boshqacha»
 * belgisi — jamoa uchun) roʻyxatga chiqmaydi. Eslatma (Telegram) hali yoʻq — bu ochiq aytiladi.
 */

import { oyNomi } from './hisobot.js';

export interface Ish {
  id: number;
  tur: 'kutyapman' | 'tolov';
  /** Chat yozgan ichki nom («yuk kelishi», «ijtimoiy soliq (2026-yil oktyabr)»). Koʻrsatish — `ishNomi`. */
  sabab: string;
  /** `YYYY-MM-DD` yoki `null` — muddat nomaʼlum (nol emas). */
  muddat: string | null;
  holat: 'ochiq' | 'yopiq';
  yaratildi: string;
  yopildi: string | null;
}

type Rpc = <T>(nom: string, arg: unknown) => Promise<T | null>;

function ishmi(x: unknown): x is Ish {
  const i = x as Partial<Ish> | null;
  return !!i && typeof i.id === 'number' && typeof i.sabab === 'string'
    && (i.tur === 'kutyapman' || i.tur === 'tolov') && (i.holat === 'ochiq' || i.holat === 'yopiq')
    && (i.muddat === null || typeof i.muddat === 'string');
}

/** Mijozning ishlari (oxirgi 50 ta; ochiqlari oldin, muddat boʻyicha — tartibni baza beradi). */
export async function ishlarimOqi(d: { rpc: Rpc }, token: string): Promise<{ ishlar: Ish[] } | { xato: string }> {
  const r = await d.rpc<{ xato?: string; ishlar?: unknown }>('so_ochiq_ishlar', { p_token: token });
  if (r === null) return { xato: 'baza javob bermadi' };
  if (r.xato) return { xato: r.xato };
  return { ishlar: Array.isArray(r.ishlar) ? r.ishlar.filter(ishmi) : [] };
}

/**
 * «Bajarildi» (`bajarildi: true`) yoki qayta ochiq (`false`). Notoʻgʻri soʻrov — 400; begona, yoʻq yoki
 * «tekshirish» ishi — 404; sessiya yoʻq — 401; baza javob bermadi — 503.
 */
export async function ishHolatiniYoz(d: { rpc: Rpc }, token: string, tana: unknown): Promise<{ ok: true } | { xato: string; status: number }> {
  const t = (tana ?? {}) as { id?: unknown; bajarildi?: unknown };
  const id = typeof t.id === 'number' ? t.id : Number.NaN;
  if (!Number.isSafeInteger(id) || id <= 0 || typeof t.bajarildi !== 'boolean') return { xato: 'id va bajarildi kerak', status: 400 };
  const r = await d.rpc<{ xato?: string; ok?: boolean }>('so_ochiq_ish_holat', { p_token: token, p_id: id, p_bajarildi: t.bajarildi });
  if (r === null) return { xato: 'baza javob bermadi', status: 503 };
  if (r.xato) return { xato: r.xato, status: r.xato === 'ish topilmadi' ? 404 : r.xato === 'sessiya topilmadi' ? 401 : 400 };
  return { ok: true };
}

/** Muddati oʻtgan ochiq ish (`bugun` — mahalliy sana, `YYYY-MM-DD`). Muddatsiz yoki bajarilgan — yoʻq. */
export function muddatiOtgan(ish: Pick<Ish, 'holat' | 'muddat'>, bugun: string): boolean {
  return ish.holat === 'ochiq' && ish.muddat !== null && ish.muddat.slice(0, 10) < bugun;
}

const OY_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const OY_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

/** Chat yozadigan asosiy nomlarning ruschasi (`suhbat-kod.ts` dagi `sabab` lar). Notanishi — oʻzbekcha qoladi. */
const NOM_RU: Record<string, string> = {
  'yuk kelishi': 'Прибытие груза',
  'Uzum ombor qabuli': 'Приёмка на складе Uzum',
  'YATT ochilishi': 'Открытие ИП',
  'bank hisobi ochilishi': 'Открытие банковского счёта',
  'Uzum kabineti ochilishi': 'Открытие кабинета Uzum',
  'Uzum kabinet faollashuvi': 'Активация кабинета Uzum',
  'studiya: suratlar tanlovi': 'Студия: выбор фото',
  'studiya: oʻz suratlari': 'Студия: свои фото',
  'kartochka yaratish': 'Создание карточки',
  'qadoq va yorliqlar': 'Упаковка и этикетки',
  'omborga yetkazish usuli': 'Способ доставки на склад',
  'yetkazma akti va taymslot': 'Акт поставки и таймслот',
  'omborga topshirish': 'Сдача на склад',
  'ijtimoiy soliq': 'Социальный налог',
  'aylanma soligʻi hisoboti': 'Отчёт по налогу с оборота',
  'oylik soliq hisoboti': 'Ежемесячный налоговый отчёт',
};

/** Qavs ichidagi qoʻshimcha: partiya, «YATTdan keyin», davr (oy yoki chorak). Eski yozuvlarda oy `2026-08` koʻrinishida. */
function qavsMatni(q: string, til: 'uz' | 'ru'): string {
  let m = /^(\d+)-partiya$/u.exec(q);
  if (m) return til === 'ru' ? `партия ${m[1]}` : q;
  if (til === 'ru') {
    if (q === 'YATTdan keyin') return 'после открытия ИП';
    if (q === 'taymslot kutilmoqda') return 'ждём таймслот';
    if (q === 'yetmadi') return 'не хватило';
  }
  m = /^(\d{4})-(\d{2})$/u.exec(q);
  if (m) {
    const n = Number(m[2]);
    if (n < 1 || n > 12) return q;
    return til === 'ru' ? `${OY_RU[n - 1]} ${m[1]}` : oyNomi(q);
  }
  if (til === 'uz') return q;
  m = /^(\d{4})-yil (\p{L}+)$/u.exec(q);
  if (m && OY_UZ.includes(m[2]!)) return `${OY_RU[OY_UZ.indexOf(m[2]!)]} ${m[1]}`;
  m = /^(\d{4})-yil ([1-4])-chorak$/u.exec(q);
  if (m) return `${m[2]}-й квартал ${m[1]}`;
  return q;
}

/**
 * Mijozga koʻrinadigan nom: birinchi harf katta, eski oy yozuvi odamcha («ijtimoiy soliq (2026-08)» →
 * «Ijtimoiy soliq (2026-yil avgust)»); `ru` da — tanish nomlar ruscha («Социальный налог (август 2026)»).
 * Oxiridagi qavslar bittalab ajratiladi: «omborga topshirish (taymslot kutilmoqda) (2-partiya)».
 */
export function ishNomi(sabab: string, til: 'uz' | 'ru' = 'uz'): string {
  let asos = sabab.trim();
  const qavslar: string[] = [];
  for (let m = /\s*\(([^()]*)\)$/u.exec(asos); m && m.index > 0; m = /\s*\(([^()]*)\)$/u.exec(asos)) {
    qavslar.unshift(m[1]!);
    asos = asos.slice(0, m.index);
  }
  const nom = (til === 'ru' ? NOM_RU[asos] : undefined) ?? asos;
  const bosh = nom ? nom.charAt(0).toUpperCase() + nom.slice(1) : sabab;
  return bosh + qavslar.map((q) => ` (${qavsMatni(q, til)})`).join('');
}
