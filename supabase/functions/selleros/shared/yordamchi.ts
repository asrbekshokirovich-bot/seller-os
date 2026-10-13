/**
 * YORDAMCHI KONTEKSTI — erkin savolga javob berayotgan LLM mijozni "koʻrsin".
 *
 * Nazoratchi (2026-10-13): javob "aniq" boʻlishi kerak — yaʼni shu mijozga:
 * qaysi qadamda, puli qancha, nimaga qiziqadi, ekranda qaysi yoʻnalish va
 * tovarlar turibdi. Ilgari LLM faqat joriy savol matnini va 6 ta umumiy
 * gapni koʻrardi.
 *
 * SHAXSIY MAʼLUMOT YOʻQ: ism va telefon (va ular soʻralgan xabarlar) LLM ga
 * yuborilmaydi (maxfiylik sahifasi shuni vaʼda qiladi). Tarixdagi matnlardan
 * ism va telefon raqami ham olib tashlanadi.
 */

import type { TovarTavsiyasi, Yonalish } from './qadamlar.ts';
import { sotuvToifasi } from './qadamlar.ts';
import { SUHBAT_QADAMLARI, UZUM_DOKONI, type YolHolati } from './ssenariy.ts';
import { sohaNomi } from './soha.ts';
import { byudjetMatni } from './tanishuv.ts';

/** Shaxsiy maʼlumot soʻraladigan savollar — ular va javoblari LLM ga yuborilmaydi. */
export const SHAXSIY_SAVOLLAR: ReadonlySet<string> = new Set(['ism', 'telefon']);

const guruh = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/gu, ' ');

/** Yoʻnalish kartasidagi gaplar — LLM "nega bu yoʻnalish?" ga shu bilan javob beradi. */
function yonalishSatri(y: Yonalish): string {
  const qism = (p: string) => y.ball?.breakdown?.find((b) => b.part === p && b.used)?.score ?? null;
  const qismlar = [
    qism('talab') !== null ? `xaridor balli ${Math.round(qism('talab')!)}/100` : null,
    y.dalil?.top3Ulush !== null && y.dalil?.top3Ulush !== undefined ? `eng katta 3 doʻkon ulushi ${y.dalil.top3Ulush} %` : null,
    y.dalil?.sotuvchiSoni ? `${guruh(y.dalil.sotuvchiSoni)} ta sotuvchi` : null,
    qism('kirish') !== null && qism('kirish')! < 90 ? 'ruxsat (sertifikat/markirovka) kerak boʻlishi mumkin' : null,
    qism('mavsum') !== null && qism('mavsum')! < 70 ? 'hozir mavsumi emas' : null,
    y.optimalKirishSom ? `boshlash uchun taxminan ${guruh(y.optimalKirishSom)} soʻm` : null,
    y.yetadi === true ? 'pul yetadi' : y.yetadi === false ? 'pul yetmasligi mumkin' : null,
  ].filter(Boolean);
  const ball = y.ball?.value;
  return `«${y.name}» (${sohaNomi(y.soha ?? 'boshqa')})${ball !== null && ball !== undefined ? ` — ${Math.round(ball)} ball` : ''}${qismlar.length ? `: ${qismlar.join(', ')}` : ''}`;
}

/** Katalog kartasidagi sotuv holati — oddiy gap bilan. */
function tovarSatri(t: TovarTavsiyasi): string {
  const n = t.nomzod;
  const toifa = sotuvToifasi(n);
  const sotuv = toifa === 'sotildi' ? `oxirgi 30 kunda ~${guruh(n.soldUnits30d ?? 0)} dona sotilgan (oʻlchangan)`
    : toifa === 'tugagan' ? 'Uzumda hozir tugagan'
      : toifa === 'sotilmadi' ? '30 kunda sotuv koʻrinmadi' : 'sotuvi hali oʻlchanmagan';
  const narx = n.narxSom ? `${guruh(n.narxSom)} soʻm` : 'narx nomaʼlum';
  const baho = n.reyting && n.sharhSoni ? `, baho ${n.reyting} (${guruh(n.sharhSoni)} ta sharh)` : '';
  const ogoh = t.bayroqlar?.length ? `; ogohlantirish: ${t.bayroqlar.map((b) => b.reason).join(' ').slice(0, 160)}` : '';
  return `«${String(n.title).slice(0, 70)}» — ${narx}, ${sotuv}${baho}${ogoh}`;
}

/**
 * Mijoz holati — LLM uchun qisqa matn. Faqat holatdagi javoblar va kod
 * natijalaridan; hech narsa hisoblanmaydi.
 */
export function mijozHolati(h: YolHolati, qadam: number): string {
  const j = h.javoblar;
  const q = SUHBAT_QADAMLARI.find((x) => x.n === qadam);
  const s: string[] = [`- Hozir: ${qadam}-qadam «${q?.nom ?? ''}» (jami 12 qadam).`];

  const tajriba = j['uzum_dokoni'];
  if (typeof tajriba === 'string') {
    s.push(`- Savdo tajribasi: ${UZUM_DOKONI.find((v) => v.qiymat === tajriba)?.nom ?? `«${tajriba.slice(0, 200)}»`}.`);
  }
  const qiziqish = Array.isArray(j['qiziqish']) ? (j['qiziqish'] as string[]) : null;
  if (qiziqish) {
    s.push(`- Qiziqqan sohasi: ${qiziqish.includes('bilmayman') ? 'aniq emas («Bilmayman»)' : qiziqish.map(sohaNomi).join(', ')}.`);
  }
  if (typeof j['byudjet'] === 'number') {
    const usd = typeof j['byudjet_usd'] === 'number' ? (j['byudjet_usd'] as number) : null;
    s.push(`- Boshlash puli: ${byudjetMatni(j['byudjet'] as number, usd)}.`);
  } else if (j['byudjet'] === null) {
    s.push('- Boshlash puli: aytilmagan.');
  }

  const yn = h.natijalar.yonalishlar as { royxat?: Yonalish[]; keyingilar?: Yonalish[] } | undefined;
  if (yn?.royxat?.length) {
    const sahifa = Number(j['yonalish_sahifa'] ?? 0) || 0;
    const qidiruv = (h.natijalar.yonalish_qidiruv as { royxat?: Yonalish[] } | undefined)?.royxat ?? [];
    const korilgan = new Set<number>();
    const ekranda = [...yn.royxat, ...(yn.keyingilar ?? []).slice(0, sahifa * 6), ...qidiruv]
      .filter((y) => (korilgan.has(y.categoryId) ? false : (korilgan.add(y.categoryId), true)))
      .slice(0, 14);
    s.push('- Ekrandagi yoʻnalishlar:', ...ekranda.map((y) => `  · ${yonalishSatri(y)}`));
  }
  const tanlangan = Number(j['yonalish']);
  if (Number.isInteger(tanlangan) && tanlangan > 0) {
    const nom = [...(yn?.royxat ?? []), ...(yn?.keyingilar ?? []),
      ...((h.natijalar.yonalish_qidiruv as { royxat?: Yonalish[] } | undefined)?.royxat ?? [])]
      .find((y) => y.categoryId === tanlangan)?.name;
    if (nom) s.push(`- Tanlagan yoʻnalishi: «${nom}».`);
  }

  const tn = h.natijalar.tovarlar as { royxat?: TovarTavsiyasi[] } | undefined;
  if (tn?.royxat?.length) {
    const tanlanganlar = Array.isArray(j['tovarlar']) ? (j['tovarlar'] as unknown[]).map(String) : [];
    const korsat = tanlanganlar.length
      ? tn.royxat.filter((t) => tanlanganlar.includes(String(t.nomzod.productId)))
      : tn.royxat.slice(0, 8);
    s.push(tanlanganlar.length ? '- Tanlagan tovarlari:' : `- Ekrandagi katalog (${tn.royxat.length} ta tovar, birinchilari):`,
      ...korsat.map((t) => `  · ${tovarSatri(t)}`));
  }
  return s.join('\n');
}

interface TarixXabari { rol: string; matn: string; savolId?: string | null }

/**
 * Suhbatning oxirgi xabarlari — LLM keyingi savolni oldingisiga bogʻlab
 * tushunsin ("80 mlnmi?" — nimaning 80 mlni?). Shaxsiy savollar va
 * javoblari tashlanadi; qolgan matnlardan ism va telefon olib tashlanadi.
 */
export function suhbatTarixi(xabarlar: readonly TarixXabari[], h: YolHolati, nechta = 8): string {
  const ism = typeof h.javoblar['ism'] === 'string' ? (h.javoblar['ism'] as string) : '';
  const telefon = typeof h.javoblar['telefon'] === 'string' ? (h.javoblar['telefon'] as string) : '';
  const sozlar = ism.split(/\s+/u).filter((x) => x.length >= 3);
  const tozala = (t: string) => {
    let m = t;
    for (const w of sozlar) m = m.split(w).join('…');
    if (telefon) m = m.split(telefon).join('…').replace(/\+?998[\s\d-]{9,}/gu, '…');
    return m;
  };
  return xabarlar
    .filter((x) => !(x.savolId && SHAXSIY_SAVOLLAR.has(x.savolId)))
    .slice(-nechta)
    .map((x) => `${x.rol === 'obunachi' ? 'Mijoz' : x.rol === 'menejer' ? 'Yordamchi' : 'Ekrandagi hisob'}: ${tozala(x.matn).slice(0, 500)}`)
    .join('\n');
}
