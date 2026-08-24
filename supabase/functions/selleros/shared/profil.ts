/**
 * 1-qadam javoblari.
 *
 * Matn `docs/1-QADAM-SAVOLLAR.md` da, 2026-08-24 da tasdiqlangan.
 *
 * Bu faylning butun mavjud sababi bitta xatoni oldini olish:
 * **bo'sh javobni nolga yoki `false` ga aylantirish**. Forma bo'sh
 * maydonni `""` beradi, `Number("")` esa `0` qaytaradi; belgilanmagan
 * katakcha `false` beradi. Ikkala holatda ham "aytmadi" jimgina
 * "aytdi" ga aylanadi va buni keyin ajratib bo'lmaydi — baza to'g'ri
 * ko'rinadi, tavsiya esa noto'g'ri chiqadi.
 *
 * QOIDALAR.md 4-qoidasi: `null` — "bilmayman", 0 va `false` — javob.
 */

/** 5-savol: pul qancha vaqt bog'lanib qolishi mumkin. */
export const KAPITAL_MUDDATI = ['3_oy', '6_oy', '1_yil', 'muddatsiz'] as const;
export type KapitalMuddati = (typeof KAPITAL_MUDDATI)[number];

/** 8-savol: onlayn sotuv tajribasi. */
export const ONLAYN_TAJRIBA = ['yoq', 'biroz', 'tajribali'] as const;
export type OnlaynTajriba = (typeof ONLAYN_TAJRIBA)[number];

/** 12-savol: nimadan ko'proq qo'rqadi. */
export const RISK_TANLOVI = ['ehtiyotkor', 'tavakkal'] as const;
export type RiskTanlovi = (typeof RISK_TANLOVI)[number];

/** Bitta foydalanuvchining javoblari. Har biri `null` bo'lishi mumkin. */
export interface ProfilJavoblari {
  /** 1-savol. Bo'sh massiv "hech qaysi", `null` "aytmadi". */
  experience: string[] | null;
  /** 2-savol. */
  familyField: string[] | null;
  /** 3-savol. */
  interest: string[] | null;
  /** 4-savol. So'mda. 0 — "pulim yo'q", `null` — "aytmadi". */
  budgetUzs: number | null;
  /** 5-savol. */
  capitalLock: KapitalMuddati | null;
  /** 6-savol. Haftasiga soat. */
  hoursPerWeek: number | null;
  /** 7-savol. */
  city: string | null;
  /** 8-savol. */
  onlineExperience: OnlaynTajriba | null;
  /** 9-savol. */
  hasUzumShop: boolean | null;
  /** 10-savol. */
  importedFromChina: boolean | null;
  /** 11-savol. */
  certExperience: boolean | null;
  /** 12-savol. */
  riskPreference: RiskTanlovi | null;
}

/** Hamma maydoni `null` bo'lgan profil — hech narsa so'ralmagan holat. */
export function bosProfil(): ProfilJavoblari {
  return {
    experience: null,
    familyField: null,
    interest: null,
    budgetUzs: null,
    capitalLock: null,
    hoursPerWeek: null,
    city: null,
    onlineExperience: null,
    hasUzumShop: null,
    importedFromChina: null,
    certExperience: null,
    riskPreference: null,
  };
}

/**
 * Formadan kelgan xom qiymatni songa aylantiradi.
 *
 * `Number("")` nolga teng — shuning uchun bo'shlik ALOHIDA tekshiriladi.
 * Manfiy va son bo'lmagan qiymat ham `null`: ular javob emas, xato.
 */
export function songa(xom: unknown): number | null {
  if (xom === null || xom === undefined) return null;
  if (typeof xom === 'string' && xom.trim() === '') return null;
  if (typeof xom === 'boolean') return null;
  const son = Number(xom);
  if (!Number.isFinite(son) || son < 0) return null;
  return son;
}

/**
 * Formadan kelgan xom qiymatni ha/yo'q ga aylantiradi.
 *
 * Belgilanmagan katakcha `false` emas, `null` beradi: foydalanuvchi
 * "yo'q" demagan, u umuman javob bermagan. Faqat aniq `true`/`false`
 * yoki "ha"/"yo'q" javob deb qabul qilinadi.
 */
export function haYoqqa(xom: unknown): boolean | null {
  if (typeof xom === 'boolean') return xom;
  if (typeof xom === 'string') {
    const t = xom.trim().toLowerCase();
    if (t === 'ha' || t === 'true' || t === 'yes') return true;
    if (t === "yo'q" || t === 'yoq' || t === 'yoʻq' || t === 'false' || t === 'no') return false;
  }
  return null;
}

/** Ro'yxatdagi qiymatmi. Notanish qiymat `null` — jimgina qabul qilinmaydi. */
export function royxatdan<T extends string>(
  xom: unknown,
  royxat: readonly T[],
): T | null {
  if (typeof xom !== 'string') return null;
  const t = xom.trim();
  return (royxat as readonly string[]).includes(t) ? (t as T) : null;
}

/** Ko'p tanlovli javob. Bo'sh massiv va `null` FARQLANADI. */
export function royxatga(xom: unknown): string[] | null {
  if (!Array.isArray(xom)) return null;
  return xom.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

/** Formadan kelgan xom obyektni profilga aylantiradi. */
export function profilOqi(xom: Record<string, unknown>): ProfilJavoblari {
  return {
    experience: royxatga(xom.experience),
    familyField: royxatga(xom.familyField),
    interest: royxatga(xom.interest),
    budgetUzs: songa(xom.budgetUzs),
    capitalLock: royxatdan(xom.capitalLock, KAPITAL_MUDDATI),
    hoursPerWeek: songa(xom.hoursPerWeek),
    city: typeof xom.city === 'string' && xom.city.trim() !== '' ? xom.city.trim() : null,
    onlineExperience: royxatdan(xom.onlineExperience, ONLAYN_TAJRIBA),
    hasUzumShop: haYoqqa(xom.hasUzumShop),
    importedFromChina: haYoqqa(xom.importedFromChina),
    certExperience: haYoqqa(xom.certExperience),
    riskPreference: royxatdan(xom.riskPreference, RISK_TANLOVI),
  };
}

/**
 * Nechta savolga javob berilgan.
 *
 * Panel "profil to'liqmi" deb ko'rsatishi uchun. Ball hisobiga
 * kirmaydi — `FORMULA.md` "Ma'lumot yetishmasa" qoidasi `null`
 * qismni vazndan chiqaradi, ballni pasaytirmaydi.
 */
export function javobSoni(p: ProfilJavoblari): number {
  return Object.values(p).filter((q) => q !== null).length;
}

/**
 * Profildagi soha javoblarini bitta roʻyxatga yigʻadi.
 *
 * Uchta savol ham sohani soʻraydi va uchalasi ham "shu yoʻnalishda
 * nimadir bilaman" degan foydani beradi: tajriba, oiladagi ish va
 * qiziqish. Ball uchun ular TENG deb olinadi — qaysi biri kuchliroq
 * ekanini bugun oʻlchaydigan hech narsa yoʻq, va oʻlchovsiz vazn
 * qoʻyish taxmin boʻlardi (QOIDALAR.md, 3-boʻlim).
 *
 * Hech biriga javob berilmagan boʻlsa `null` — boʻsh massiv EMAS.
 * Boʻsh massiv "hech qaysi sohada tajribam yoʻq" degan javob, `null`
 * esa "soʻralmagan". `profil()` qismi ikkalasida ham neytral beradi,
 * lekin farq panelda va keyingi savollarda kerak boʻladi.
 *
 * Takrorlar olib tashlanadi: bitta soha ikki savolda aytilgani uchun
 * ball ikki barobar oshib ketmasin.
 */
export function sohalar(p: ProfilJavoblari): string[] | null {
  const manbalar = [p.experience, p.familyField, p.interest];
  if (manbalar.every((m) => m === null)) return null;
  const hammasi = manbalar.flatMap((m) => m ?? []).map((x) => x.trim().toLowerCase());
  return [...new Set(hammasi.filter((x) => x !== ''))];
}
