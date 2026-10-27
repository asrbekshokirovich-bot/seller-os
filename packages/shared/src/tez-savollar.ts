/**
 * TAYYOR SAVOLLAR — har savol tagida bosiladigan 2–3 ta savol.
 *
 * Nazoratchi (2026-10-13, AI imkoniyatlari koʻrgazmasidan keyin tanladi):
 * «Nima soʻrashni oʻzi taklif qiladi». Birinchi marta kirgan mijoz nima
 * soʻrashni bilmaydi — tushunmagan joyida bitta bosish bilan soʻraydi.
 * Bosilgan savol yozilgan savol kabi ketadi (erkin xabar, `suhbat.ts`).
 *
 * HAR SAVOLNING JAVOBI BAZADA BOR (test bilan): Gemini ishlamasa ham
 * (limit tugagan, toʻlov yoqilmagan) bosilgan savolga aniq javob chiqadi —
 * `erkin.ts` tayyor javobi yoki `bilim-javob.ts`. AI yoqilsa u shu javobni
 * doʻstona va batafsil aytadi.
 *
 * Ruscha matn faqat ruscha javobi bor savollarda (`erkin.ts`): bilim bazasi
 * oʻzbekcha, rus interfeysida qolganlari koʻrsatilmaydi. Har savol "?" bilan
 * tugaydi — ism savolida ham savol deb taniladi, ism deb yozilmaydi.
 */

export interface TezSavol {
  uz: string;
  /** Ruscha — faqat ruscha javobi bor savolda. */
  ru?: string;
}

/** Savol id → tayyor savollar. */
export const TEZ_SAVOLLAR: Readonly<Record<string, readonly TezSavol[]>> = {
  // Birinchi savol — qiziqish (2026-10-26): «nima bu, bepulmi» savollari shu yerda.
  qiziqish: [
    { uz: 'ZumSavdo nima qiladi?', ru: 'Что делает ZumSavdo?' },
    { uz: 'Bu bepulmi?', ru: 'Это бесплатно?' },
    { uz: 'Qaysi soha yaxshi?' },
    { uz: 'Misol bilan tushuntirasizmi?', ru: 'Объясните на примере?' },
  ],
  // Ism va telefon — yoʻnalishdan keyin, bitta savolda (2026-10-14, 2026-10-26).
  ism: [
    { uz: 'Raqamim nima uchun kerak?', ru: 'Зачем нужен мой номер?' },
  ],
  telefon: [
    { uz: 'Raqamim nima uchun kerak?', ru: 'Зачем нужен мой номер?' },
  ],
  uzum_dokoni: [
    { uz: 'Tajribam yoʻq — boʻladimi?' },
    { uz: 'Uzumda sotish uchun nima kerak?' },
  ],
  byudjet: [
    { uz: 'Qancha pul kerak?' },
    { uz: 'Dollarda yozsam boʻladimi?' },
  ],
  yonalish: [
    { uz: 'Ball nima degani?' },
    { uz: '«Bozor ochiq» nima degani?' },
    { uz: 'Qaysi birini tanlay?' },
  ],
  tovarlar: [
    { uz: 'Maʼlumot qayerdan olinadi?' },
    { uz: 'Qaysi tovarni tanlay?' },
    { uz: 'Sertifikat kerakmi?' },
  ],
  miqdor: [
    { uz: 'Nechta olishim kerak?' },
    { uz: 'Pul qachon tushadi?' },
  ],
  marja: [
    { uz: 'Marja nima?' },
    { uz: 'Komissiya qancha?' },
    { uz: 'Chegara narx nima?' },
  ],
  xitoy_tasdiq: [
    { uz: '1688 nima?', ru: 'Что такое 1688?' },
  ],
  huquqiy_shakl: [
    { uz: 'YATT nima?' },
  ],
};

/** Savol id siga tayyor savollar. `miqdor:123` kabi idlar — oldingi qismi boʻyicha. */
export function tezSavollar(savolId: string): readonly TezSavol[] {
  return TEZ_SAVOLLAR[savolId] ?? TEZ_SAVOLLAR[savolId.split(':')[0] ?? ''] ?? [];
}

