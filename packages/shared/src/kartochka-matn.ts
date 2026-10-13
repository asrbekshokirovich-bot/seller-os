/**
 * KARTOCHKA MATNI — 10-qadam, «Kartochka matnini yozib ber» tugmasi.
 *
 * Nazoratchi (2026-10-13): AI imkoniyatlari koʻrgazmasidagi 6-imkoniyat —
 * «Kartochka yozib beradi: Uzum qoidalariga mos nom va tavsif, oʻzbek va rus
 * tilida»; joyi — 10-qadam, tugma bilan.
 *
 * Har tanlangan tovar uchun nom, qisqa tavsif va tavsif — oʻzbek (lotin) va
 * rus (kirill). Matnni LLM yozadi (`llm.ts`, `kartochkaYozBer`), LEKIN:
 *   - Uzum qoidalari KOD bilan tekshiriladi (`kartochkaTekshir`): stop-soʻzlar,
 *     emoji, CAPS, takroriy belgilar, nomdagi taqiqlangan belgilar, kontakt va
 *     havola, sharh/reyting, nom kamida 3 soʻz, til va yozuv (qoʻllanma 5.1,
 *     0059 `uzum.kartochka.qoidalar`);
 *   - har raqam (oʻlcham, hajm, dona, foiz) manbada boʻlishi shart
 *     (`tekshiruv.ts` darvozasi) — LLM xususiyat oʻylab topmasin;
 *   - oʻtmasa — sababi bilan bir marta qayta soʻraladi; baribir oʻtmasa yoki
 *     LLM ishlamasa — matn EMAS, qolip va qoidalar (toʻqilgan matn yoʻq).
 * Kartochkani kabinetda sotuvchi yaratadi: VGT, MXIK, brend va variantlarni
 * oʻzi toʻldiradi.
 */

import type { XitoyNatijasi, YolHolati } from './ssenariy.js';
import type { Yonalish } from './qadamlar.js';
import { tekshir } from './tekshiruv.js';

/** Bitta tovar uchun matn manbasi — faqat shu maʼlumot LLM ga ketadi (shaxsiy maʼlumot yoʻq). */
export interface KartochkaManbasi {
  productId: number;
  /** Uzumdagi namuna tovar nomi (3-qadam, raqobatchi) — mazmun manbasi, nusxa emas. */
  namuna: string;
  /** Yoʻnalish (Uzum turkumi) nomi. */
  turkum: string | null;
  /** Tanlangan 1688 taklifi nomi (xitoycha, 5-qadam); tanlanmagan boʻlsa `null`. */
  xitoy: string | null;
}

export interface KartochkaMatni {
  nomUz: string;
  nomRu: string;
  qisqaUz: string;
  qisqaRu: string;
  tavsifUz: string;
  tavsifRu: string;
}

export interface KartochkaQatori {
  productId: number;
  /** Namuna nomi — kartada sarlavha. */
  title: string;
  /** `null` — matn yozilmadi (LLM ishlamadi yoki qoidadan oʻtmadi): qolip koʻrsatiladi. */
  matn: KartochkaMatni | null;
  /** Matn yozilmagan boʻlsa — oxirgi urinishdagi muammolar (boʻsh — LLM ishlamadi). */
  muammolar: string[];
}

export interface KartochkaMatniNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  qatorlar: KartochkaQatori[];
  /** Nechanchi soʻrov bajarildi — `javoblar.kartochka_matni` bilan solishtiriladi. */
  sorov: number;
  izoh: string;
}

/** Bir bosishda nechta tovar — LLM chaqiruvlari va javob vaqti chegaralansin. */
export const KARTOCHKA_MAX_TOVAR = 5;

/**
 * Uzum stop-soʻzlari va iboralari (qoʻllanma 5.1; 0059). Soʻz chegarasi —
 * `\p{L}` bilan (kirillda `\b` ishlamaydi): "topish", "sotuvchi" — stop emas.
 */
const STOP: ReadonlyArray<[RegExp, string]> = [
  [/(?<!\p{L})aksiya|акци/iu, 'aksiya'],
  [/(?<!\p{L})bepul(?!\p{L})|бесплатн/iu, 'bepul'],
  [/buyurtma ber|заказыва|закажите/iu, 'buyurtma berish'],
  [/sotib ol|(?<!\p{L})купи(ть|те)?(?!\p{L})/iu, 'sotib olish'],
  [/keshbek|cashback|кешб[эе]к|кэшб[эе]к/iu, 'keshbek'],
  [/(?<!\p{L})yangilik|новинк/iu, 'yangilik'],
  [/(?<!\p{L})(new|sale|top|xit|hit|trend|тренд|топ|хит)(?!\p{L})/iu, 'stop-soʻz (new, sale, top, xit, trend)'],
  [/asl nusxa|оригинал/iu, 'asl nusxa'],
  [/(?<!\p{L})sotuv(?!chi)|распродаж/iu, 'sotuv'],
  [/chegirma|скидк/iu, 'chegirma'],
  [/eng arzon|eng yaxshi|eng zoʻr|eng zo'r|самы[йеяе]\s+(дешев|лучш)|лучший|лучшая|лучшее/iu, 'qiyosiy maqtov («eng arzon», «eng yaxshi»)'],
  [/1-raqamli|№\s?1(?!\d)|номер\s?1(?!\d)/iu, '«1-raqamli»'],
];

/** Kontakt, havola, sharh/reyting yoki buyurtmalar soni — kartochkada taqiqlangan (5.1). */
const KONTAKT = /https?:|www\.|\.(uz|ru|com|net)(?!\p{L})|t\.me|@|\+?998[\s\d-]{7,}/iu;
const SHARH = /sharh|reyting|buyurtmalar soni|отзыв|рейтинг|кол-во заказов|количество заказов/iu;

/** Nomda ruxsat etilgan belgilar: harf, raqam, boʻsh joy, , . : ; - – ( ) / “ ” % x * va oʻzbek apostroflari. */
const NOM_BELGILARI = /^[\p{L}\p{N}\s,.:;\-–()/“”"%*'ʻʼ‘’]+$/u;

const KIRILL = /[Ѐ-ӿ]/u;

function capsmi(s: string): boolean {
  const harflar = s.replace(/[^\p{L}]/gu, '');
  if (harflar.length < 8) return false;
  const katta = harflar.replace(/[^\p{Lu}]/gu, '').length;
  return katta / harflar.length > 0.6;
}

/**
 * Uzum qoidalariga tekshiruv. Boʻsh roʻyxat — oʻtdi. `manbalar` — raqam
 * darvozasi uchun (namuna, xitoy nomi, turkum): matndagi har raqam shu yerda
 * boʻlishi kerak.
 */
export function kartochkaTekshir(m: KartochkaMatni, manbalar: readonly string[]): string[] {
  const muammo: string[] = [];
  const maydonlar: Array<[string, string, 'uz' | 'ru', boolean]> = [
    ['nom (oʻzbekcha)', m.nomUz, 'uz', true], ['nom (ruscha)', m.nomRu, 'ru', true],
    ['qisqa tavsif (oʻzbekcha)', m.qisqaUz, 'uz', false], ['qisqa tavsif (ruscha)', m.qisqaRu, 'ru', false],
    ['tavsif (oʻzbekcha)', m.tavsifUz, 'uz', false], ['tavsif (ruscha)', m.tavsifRu, 'ru', false],
  ];
  for (const [nom, matn, til, nommi] of maydonlar) {
    const t = String(matn ?? '').trim();
    if (!t) { muammo.push(`${nom} boʻsh`); continue; }
    for (const [re, sabab] of STOP) if (re.test(t)) muammo.push(`${nom}: taqiqlangan soʻz — ${sabab}`);
    if (/\p{Extended_Pictographic}/u.test(t)) muammo.push(`${nom}: emoji`);
    if (capsmi(t)) muammo.push(`${nom}: katta harflar (CAPS)`);
    if (/([!?.,;:])\1/u.test(t)) muammo.push(`${nom}: takroriy belgilar`);
    if (KONTAKT.test(t)) muammo.push(`${nom}: kontakt yoki havola`);
    if (SHARH.test(t)) muammo.push(`${nom}: sharh, reyting yoki buyurtmalar soni`);
    if (til === 'uz' && KIRILL.test(t)) muammo.push(`${nom}: lotin yozuvida boʻlishi kerak`);
    if (til === 'ru' && !KIRILL.test(t)) muammo.push(`${nom}: rus tilida (kirill) boʻlishi kerak`);
    if (nommi) {
      if (!NOM_BELGILARI.test(t)) muammo.push(`${nom}: ruxsat etilmagan belgi (faqat , . : ; - – ( ) / “ ” % x *)`);
      if (t.split(/\s+/u).filter((w) => /\p{L}/u.test(w)).length < 3) muammo.push(`${nom}: kamida 3 soʻz`);
      if (t.length > 150) muammo.push(`${nom}: juda uzun`);
    }
  }
  // Raqamlar — faqat manbadan (oʻlcham, dona, foiz oʻylab topilmasin).
  const r = tekshir(maydonlar.map(([, t]) => t).join('\n'), { matnlar: [...manbalar] });
  if (r.dalilsiz.length) muammo.push(`manbada yoʻq raqamlar: ${r.dalilsiz.join(', ')}`);
  if (r.taqiq.length) muammo.push(`vaʼda: ${r.taqiq.join(', ')}`);
  return [...new Set(muammo)];
}

/**
 * Holatdan — har tanlangan tovar uchun manba: buyurtma varaqasidagi tayyor
 * qatorlar (6-qadam), boʻlmasa 3-qadamda tanlangan tovarlar; turkum —
 * tanlangan yoʻnalish; xitoy — 5-qadamda tanlangan 1688 taklifi nomi.
 */
export function kartochkaManbalari(h: YolHolati): KartochkaManbasi[] {
  const j = h.javoblar;
  const bn = h.natijalar.buyurtma as { qatorlar?: Array<{ productId: number; title: string; holat: string }> } | undefined;
  let tovarlar = (bn?.qatorlar ?? []).filter((q) => q.holat === 'tayyor').map((q) => ({ productId: q.productId, title: q.title }));
  if (tovarlar.length === 0) {
    const tanlangan = Array.isArray(j['tovarlar']) ? (j['tovarlar'] as unknown[]).map(Number).filter(Number.isInteger) : [];
    const tn = h.natijalar.tovarlar as { royxat?: Array<{ nomzod: { productId: number; title: string } }> } | undefined;
    tovarlar = tanlangan.map((id) => ({ productId: id, title: tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod.title ?? '' }))
      .filter((t) => t.title);
  }
  const yid = Number(j['yonalish']);
  const yn = h.natijalar.yonalishlar as { royxat?: Yonalish[]; keyingilar?: Yonalish[] } | undefined;
  const qidiruv = (h.natijalar.yonalish_qidiruv as { royxat?: Yonalish[] } | undefined)?.royxat ?? [];
  const turkum = [...(yn?.royxat ?? []), ...(yn?.keyingilar ?? []), ...qidiruv].find((y) => y.categoryId === yid)?.name ?? null;
  const xn = h.natijalar.xitoy as XitoyNatijasi | undefined;
  return tovarlar.slice(0, KARTOCHKA_MAX_TOVAR).map((t) => {
    const tanlov = j[`xitoy_tanlov:${t.productId}`];
    const taklif = typeof tanlov === 'string'
      ? xn?.qatorlar?.find((q) => q.productId === t.productId)?.takliflar?.find((x) => x.sourceId === tanlov) : undefined;
    return { productId: t.productId, namuna: t.title, turkum, xitoy: taklif?.title ?? null };
  });
}

/** Raqam darvozasi uchun manba matnlari. */
export function kartochkaManbaMatnlari(m: KartochkaManbasi): string[] {
  return [m.namuna, m.turkum ?? '', m.xitoy ?? ''];
}
