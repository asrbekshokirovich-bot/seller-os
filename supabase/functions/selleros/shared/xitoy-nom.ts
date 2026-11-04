/**
 * 1688 TAKLIFLARI — OʻZBEKCHA NOM (nazoratchi, 2026-11-04, 7-taklif: «hammasi yoqdi»).
 *
 * 1688 kartalarida xitoycha nom turardi — mijoz nima ekanini bilmasdi. Endi qidiruv natijasi
 * kelganda tez model (Haiku) bitta chaqiruvda 10 tagacha nomni qisqa oʻzbekchaga oʻgiradi; asl nomi
 * kartada kichik boʻlib qoladi. Bu — TARJIMA, tavsiya emas: raqam (oʻlcham, model) faqat asl nomda
 * boʻlsa oʻtadi, xitoycha harf qolgan yoki uzun nom — tashlanadi (oʻrniga xitoychasi koʻrinadi).
 * Ishlamasa ham yoʻl toʻxtamaydi: nom xitoycha qoladi.
 */

import { apostrofTozala } from './yozuv.ts';

export const XITOY_NOM_KORSATMA = [
  'Sen 1688 (Xitoy ulgurji bozori) tovar nomlarini oʻzbek tiliga, lotin yozuvida oʻgirasan.',
  'Har nomni qisqa va tushunarli qil: 3–8 soʻz, 60 belgigacha — tovar nima ekani va asosiy xususiyati (material, kimga, oʻlcham).',
  'Reklama soʻzlarini tashla («yangi», «issiq sotuv», «zavoddan», «ulgurji», «2026», «tez yetkazish»).',
  'Raqamni (oʻlcham, model, son) faqat asl nomda boʻlsa yoz; oʻzingdan raqam yoki brend qoʻshma.',
  'Oʻzbekcha harflarda ʻ belgisini ishlat (oʻ, gʻ). Javob — JSON: {"nomlar": [...]}: kirishdagi tartibda va sonda.',
].join('\n');

export const XITOY_NOM_SXEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { nomlar: { type: 'array', items: { type: 'string' } } },
  required: ['nomlar'],
} as const;

/** Model uchun matn: raqamlangan asl nomlar. */
export function xitoyNomMatni(sarlavhalar: readonly string[]): string {
  return `NOMLAR (${sarlavhalar.length} ta):\n${sarlavhalar.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
}

const XITOYCHA = /[㐀-鿿]/u;

/**
 * Model javobini tekshiradi: soni mos, har nom 2–80 belgi, xitoycha harfsiz va asl nomda yoʻq raqamsiz.
 * Oʻtmagan nom — `null` (xitoychasi koʻrinadi). JSON buzuq yoki soni boshqa — `null` (hammasi).
 */
export function xitoyNomlariniOqi(javob: string, sarlavhalar: readonly string[]): Array<string | null> | null {
  let j: unknown;
  try {
    j = JSON.parse(javob.replace(/^```(?:json)?\s*|\s*```$/gu, ''));
  } catch {
    return null;
  }
  const nomlar = (j as { nomlar?: unknown } | null)?.nomlar;
  if (!Array.isArray(nomlar) || nomlar.length !== sarlavhalar.length) return null;
  return nomlar.map((x, i) => {
    if (typeof x !== 'string') return null;
    const t = apostrofTozala(x.replace(/\s+/gu, ' ').trim().replace(/^["«']+|["»']+$/gu, '').trim());
    if (t.length < 2 || t.length > 80 || XITOYCHA.test(t)) return null;
    const asl = sarlavhalar[i] ?? '';
    const yangiRaqam = (t.match(/\d+/gu) ?? []).some((r) => !asl.includes(r));
    return yangiRaqam ? null : t;
  });
}
