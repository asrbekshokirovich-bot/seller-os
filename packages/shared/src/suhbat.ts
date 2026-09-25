/**
 * SUHBAT — bitta turn: javobni qabul qil, kod harakatlarini bajar,
 * keyingi savolni ber, hammasini yoz.
 *
 * Bu modul `fetch` ham, baza ham bilmaydi. Hamma tashqi narsa
 * `SuhbatBogliqliklari` orqali BERILADI: `rpc` (baza), `kod`
 * (deterministik hisoblar), `llm` (ixtiyoriy). Shuning uchun u
 * Fastify da ham, Edge Function da ham BITTA nusxada ishlaydi va
 * testda soxta `rpc` bilan to'liq sinaladi.
 *
 * TARTIB (har turnda):
 *   1. holatni o'qi (bo'lmasa — boshlang'ich)
 *   2. javob kelgan bo'lsa — FAQAT kutilayotgan savolga qabul qil
 *   3. `keyingi()` kod harakati desa — bajar, natijani yoz, jumla qo'sh;
 *      savol chiqquncha takrorla
 *   4. menejer jumlasini (ixtiyoriy) LLM bilan odamlashtir va TEKSHIR
 *   5. hammasini bitta RPC bilan yoz
 *
 * LLM YIQILSA HECH NARSA YIQILMAYDI: kodning jumlasi ketadi.
 */

import { type Keyingi, type KodHarakati, type YolHolati, boshlangichHolat,
  javobniQabulQil, joriyQadam, keyingi, natijaniYoz, tushuntir } from './ssenariy.js';
import { natijaSonlari, tekshir } from './tekshiruv.js';
import type { ProfilJavoblari } from './profil.js';

export interface SuhbatXabari {
  rol: 'obunachi' | 'menejer' | 'kod';
  matn: string;
  savolId?: string;
  javob?: unknown;
}

export interface SuhbatBogliqliklari {
  rpc: <T>(nom: string, arg: unknown) => Promise<T | null>;
  kod: {
    yonalishlar: (profil: Partial<ProfilJavoblari>, holat: YolHolati) => Promise<unknown>;
    tovarlar: (categoryId: number, holat: YolHolati) => Promise<unknown>;
    tannarx: (holat: YolHolati) => Promise<unknown>;
    /** 5-qadam: 1688 rasm-qidiruvi (provayder, kesh, limit, kurs). */
    xitoy: (holat: YolHolati) => Promise<unknown>;
  };
  /** Jumlani odamdek aytadi. `null` — ishlatilmadi. */
  llm?: (matn: string) => Promise<string | null>;
}

export interface SuhbatJavobi {
  xato?: string;
  /** Shu turnda qo'shilgan xabarlar (mijoz ularni chizadi). */
  xabarlar: SuhbatXabari[];
  /** Keyin nima: savol yoki "tez orada". Hech qachon bo'sh emas. */
  keyingi: Keyingi;
  qadam: number;
  /** Jurnalga yozildimi — yozilmagan bo'lsa ham javob beriladi, lekin aytiladi. */
  yozildi: boolean;
}

interface OqishJavobi {
  xato?: string;
  holat: YolHolati | null;
  qadam: number | null;
  xabarlar: Array<SuhbatXabari & { seq: number; at: string }>;
}

/** Tarix + hozirgi savol. Hech narsa yozmaydi. */
export async function suhbatOqi(d: SuhbatBogliqliklari, token: string): Promise<
  (SuhbatJavobi & { tarix: OqishJavobi['xabarlar'] }) | { xato: string }
> {
  const o = await d.rpc<OqishJavobi>('so_suhbat_oqi', { p_token: token });
  if (o === null) return { xato: 'baza javob bermadi' };
  if (o.xato) return { xato: o.xato };
  const holat = o.holat ?? boshlangichHolat();
  return {
    xabarlar: [], tarix: o.xabarlar ?? [],
    keyingi: keyingi(holat), qadam: joriyQadam(holat), yozildi: true,
  };
}

/**
 * Bitta turn. `kirish` — {savolId, javob} (tugma) yoki {matn} (erkin
 * yozuv, kutilayotgan savolga javob sifatida olinadi).
 */
export async function suhbatTurn(
  d: SuhbatBogliqliklari,
  token: string,
  kirish: { savolId?: string; javob?: unknown; matn?: string },
): Promise<SuhbatJavobi> {
  const o = await d.rpc<OqishJavobi>('so_suhbat_oqi', { p_token: token });
  if (o === null) return { xato: 'baza javob bermadi', xabarlar: [], keyingi: keyingi(boshlangichHolat()), qadam: 1, yozildi: false };
  if (o.xato) return { xato: o.xato, xabarlar: [], keyingi: keyingi(boshlangichHolat()), qadam: 1, yozildi: false };

  let holat = o.holat ?? boshlangichHolat();
  const yangi: SuhbatXabari[] = [];
  let profil: Partial<ProfilJavoblari> | null = null;

  // ---- 2. javobni qabul qilish
  const k0 = keyingi(holat);
  const bor = kirish.savolId !== undefined || kirish.matn !== undefined;
  if (bor) {
    if (k0.tur !== 'savol') {
      return { xato: 'hozir savol kutilmayapti', xabarlar: [], keyingi: k0, qadam: joriyQadam(holat), yozildi: false };
    }
    const savolId = kirish.savolId ?? k0.savol.id;
    const xom = kirish.savolId !== undefined ? kirish.javob : kirish.matn;
    const q = javobniQabulQil(holat, savolId, xom);
    if (q.xato) {
      return { xato: q.xato, xabarlar: [], keyingi: k0, qadam: joriyQadam(holat), yozildi: false };
    }
    holat = q.holat;
    profil = q.profil;
    yangi.push({
      rol: 'obunachi',
      matn: javobMatni(k0.savol.variantlar, holat.javoblar[savolId]),
      savolId,
      javob: holat.javoblar[savolId] ?? null,
    });
  }

  // ---- 3. kod harakatlari, savol chiqquncha
  let k = keyingi(holat);
  let himoya = 0;
  while (k.tur === 'kod' && himoya++ < 5) {
    const natija = await bajar(d, k.harakat, holat);
    holat = natijaniYoz(holat, k.harakat, natija);
    yangi.push({ rol: 'kod', matn: tushuntir(k.harakat, natija), savolId: k.harakat, javob: natija });
    k = keyingi(holat);
  }

  // ---- 4. menejer jumlasi (+ ixtiyoriy odamlashtirish, tekshiruv bilan)
  //
  // `kod` bu yerga faqat himoya sanog'i tugaganda yetadi — ya'ni
  // ssenariy aylanib qolgan. Bu dasturchi xatosi; obunachiga rost
  // aytiladi, jim o'tmaydi.
  if (k.tur === 'kod') {
    return {
      xato: `ssenariy aylanib qoldi: "${k.harakat}" harakati takrorlanaverdi`,
      xabarlar: [], keyingi: k0, qadam: joriyQadam(holat), yozildi: false,
    };
  }
  const kodJumla = k.tur === 'savol' ? k.savol.matn : k.matn;
  const menejerMatn = await odamlashtirTekshirib(d, kodJumla, yangi);
  yangi.push({ rol: 'menejer', matn: menejerMatn, ...(k.tur === 'savol' ? { savolId: k.savol.id } : {}) });

  // ---- 5. yozish
  const qadam = joriyQadam(holat);
  const y = await d.rpc<{ xato?: string; yozildi?: number }>('so_suhbat_yoz', {
    p_token: token,
    p_xabarlar: yangi,
    p_holat: holat,
    p_qadam: qadam,
    p_profil: profil,
  });
  const yozildi = y !== null && !y.xato;

  return { xabarlar: yangi, keyingi: k, qadam, yozildi, ...(yozildi ? {} : { xato: y?.xato ?? 'jurnalga yozilmadi' }) };
}

/** Boshidan. Jurnal qoladi, holat tozalanadi. */
export async function suhbatBoshdan(d: SuhbatBogliqliklari, token: string): Promise<SuhbatJavobi> {
  const r = await d.rpc<{ xato?: string }>('so_suhbat_boshdan', { p_token: token });
  const h = boshlangichHolat();
  if (r === null || r.xato) {
    return { xato: r?.xato ?? 'baza javob bermadi', xabarlar: [], keyingi: keyingi(h), qadam: 1, yozildi: false };
  }
  return { xabarlar: [], keyingi: keyingi(h), qadam: 1, yozildi: true };
}

async function bajar(d: SuhbatBogliqliklari, harakat: KodHarakati, h: YolHolati): Promise<unknown> {
  try {
    if (harakat === 'yonalishlar') {
      const b = h.javoblar['byudjet'];
      const u = h.javoblar['uzum_dokoni'];
      return await d.kod.yonalishlar({
        budgetUzs: typeof b === 'number' ? b : null,
        hasUzumShop: u === undefined || u === null ? null : u !== 'yoq',
      }, h);
    }
    if (harakat === 'tovarlar') return await d.kod.tovarlar(Number(h.javoblar['yonalish']), h);
    if (harakat === 'xitoy') return await d.kod.xitoy(h);
    return await d.kod.tannarx(h);
  } catch (e) {
    // Yiqilish jim o'tmaydi: natija sifatida sabab qaytadi va ssenariy
    // uni "o'lchov yo'q" deb ko'rsatadi.
    return { olchov_yoq: true, sabab: `hisob yiqildi: ${String((e as Error)?.message ?? e)}` };
  }
}

/**
 * LLM bilan odamlashtirish — TEKSHIRUV bilan.
 *
 * Ruxsat hovuzi: kodning jumlasi, shu turndagi kod natijalari (faqat
 * o'lchov sonlari), obunachining javobi. LLM raqam qo'shsa yoki
 * kafolat yozsa — kod jumlasi ketadi.
 */
async function odamlashtirTekshirib(d: SuhbatBogliqliklari, kodJumla: string, yangi: SuhbatXabari[]): Promise<string> {
  if (!d.llm) return kodJumla;
  const taklif = await d.llm(kodJumla).catch(() => null);
  if (!taklif) return kodJumla;
  const t = tekshir(taklif, {
    matnlar: [kodJumla, ...yangi.map((x) => x.matn)],
    sonlar: yangi.flatMap((x) => (x.rol === 'kod' ? natijaSonlari(x.javob) : [])),
  });
  return t.ok ? taklif : kodJumla;
}

function javobMatni(variantlar: ReadonlyArray<{ qiymat: string | number; nom: string }>, q: unknown): string {
  if (q === null || q === undefined) return 'Oʻtkazib yuborildi';
  const nom = (x: unknown) => variantlar.find((v) => String(v.qiymat) === String(x))?.nom ?? String(x);
  return Array.isArray(q) ? q.map(nom).join(', ') : nom(q);
}
