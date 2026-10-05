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
 *
 * KUTISH (5-qadam). 1688 qidiruvi 30–90 s — bitta HTTP soʻrovga
 * sigʻmaydi. Kod harakati yurishni boshlab `kutilmoqda` qaytaradi,
 * `keyingi()` esa `kutish` beradi (kod EMAS — aks holda aylanib qolardi).
 * Mijoz `{tekshir: true}` bilan soʻrab turadi: shunda kod harakati
 * yurish holatini tekshiradi; oʻzgarish boʻlmasa HECH NARSA yozilmaydi,
 * tugagach kod xabari + keyingi savol odatdagidek yoziladi.
 */

import { type Keyingi, type KodHarakati, type YolHolati, boshlangichHolat,
  javobniQabulQil, joriyQadam, keyingi, kutilayotganHarakat, natijaniYoz, tushuntir } from './ssenariy.js';
import { natijaSonlari, tekshir } from './tekshiruv.js';
import { minglik } from './fakt.js';
import { ERKIN_BILIM, tayyorJavob } from './erkin.js';
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
    /** 6-qadam: buyurtma varaqasi (tanlovlar + fakt kargo + kurs). */
    buyurtma: (holat: YolHolati) => Promise<unknown>;
    /** 6-qadam: "yuk kelishini kutyapman" ochiq ishi. */
    ochiqIsh: (holat: YolHolati) => Promise<unknown>;
    /** 7-qadam: rasmiylashtirish faktlari (BHM, boj, soliq, banklar, Uzum). */
    rasmiy: (holat: YolHolati) => Promise<unknown>;
    /** 7-qadam: "keyin / kutyapman / sayt boshqacha" javoblari → ochiq ishlar. */
    rasmiyYakun: (holat: YolHolati) => Promise<unknown>;
    /** 8-qadam: qabul faktlari + varaqadan tekshiruv roʻyxati (qadoq tavsiyasi). */
    qabul: (holat: YolHolati) => Promise<unknown>;
    /** 8-qadam: kam/brak, keyin, topshirildi → ochiq ishlar. */
    qabulYakun: (holat: YolHolati) => Promise<unknown>;
    /** 9-qadam: oq fonli suratlar (tanlangan 1688 taklif galereyasi, Cloudflare Worker manzillari). Asinxron. */
    studiya: (holat: YolHolati) => Promise<unknown>;
    /** 9-qadam: "yetmadi / keyin" → ochiq ishlar. */
    studiyaYakun: (holat: YolHolati) => Promise<unknown>;
    /** 10-qadam: kartochka qoidalari + omborga topshirish faktlari. */
    yuklash: (holat: YolHolati) => Promise<unknown>;
    /** 10-qadam: kartochka, qadoq, yetkazma javoblari → ochiq ishlar. */
    yuklashYakun: (holat: YolHolati) => Promise<unknown>;
    /** 11-qadam: oʻz kartochkalarni kuzatuvga qoʻshish, oʻlchov va signallar. */
    sotuv: (holat: YolHolati) => Promise<unknown>;
    /** 12-qadam: oy hisoboti uchun faktlar va oʻlchovdan taxmin. */
    hisobot: (holat: YolHolati) => Promise<unknown>;
    /** 12-qadam: sotuv, komissiya, soliq va muddatlar (sotuvchi yozgan summa bilan). */
    hisobotHisob: (holat: YolHolati) => Promise<unknown>;
    /** 12-qadam: ochiq ishlar (soliq toʻlovi) va keyingi oy rejasi. */
    hisobotYakun: (holat: YolHolati) => Promise<unknown>;
  };
  /** Jumlani odamdek aytadi. `null` — ishlatilmadi. */
  llm?: (matn: string) => Promise<string | null>;
  /**
   * Obunachi savolga javob oʻrniga boshqa narsa yozdi — menejerning qisqa
   * javobi (LLM). `null` — ishlatilmadi, kod shabloni ketadi.
   */
  erkinLlm?: (k: ErkinSorov) => Promise<string | null>;
}

/** Erkin xabar uchun LLM ga beriladigan narsa — faqat shu, boshqa maʼlumot yoʻq. */
export interface ErkinSorov {
  /** Joriy savol matni (kod yozgan). */
  savol: string;
  /** Joriy savol variantlari nomlari (boʻsh boʻlishi mumkin). */
  variantlar: string[];
  /** Obunachi yozgan matn (500 belgigacha). */
  xabar: string;
  /** Javob sifatida nega qabul qilinmadi (`null` — savol berdi). */
  sabab: string | null;
  /** Koʻp soʻraladigan savolga koddagi tayyor javob (`erkin.ts`), boʻlmasa `null`. */
  tayyor: string | null;
  /** ZumSavdo haqida faktlar — LLM faqat shulardan foydalanadi. */
  bilim: string;
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
  kirish: { savolId?: string; javob?: unknown; matn?: string; tekshir?: boolean },
): Promise<SuhbatJavobi> {
  const o = await d.rpc<OqishJavobi>('so_suhbat_oqi', { p_token: token });
  if (o === null) return { xato: 'baza javob bermadi', xabarlar: [], keyingi: keyingi(boshlangichHolat()), qadam: 1, yozildi: false };
  if (o.xato) return { xato: o.xato, xabarlar: [], keyingi: keyingi(boshlangichHolat()), qadam: 1, yozildi: false };

  let holat = o.holat ?? boshlangichHolat();
  const yangi: SuhbatXabari[] = [];
  let profil: Partial<ProfilJavoblari> | null = null;

  // ---- 1b. kutilayotgan ishni tekshirish (`tekshir`)
  if (kirish.tekshir === true) {
    // Kutilayotgan ish: 5-qadam (1688) yoki 9-qadam (internet suratlari).
    const kutilgan = kutilayotganHarakat(holat);
    if (kutilgan === null) {
      return { xabarlar: [], keyingi: keyingi(holat), qadam: joriyQadam(holat), yozildi: true };
    }
    const natija = await bajar(d, kutilgan, holat);
    const yangiHolat = natijaniYoz(holat, kutilgan, natija);
    if ((natija as { kutilmoqda?: unknown } | null)?.kutilmoqda) {
      // Hali tugamagan: holat oʻzgargan boʻlsa ham (urinish sanogʻi)
      // jurnalga xabar yozilmaydi; holat yoziladi.
      await d.rpc('so_suhbat_yoz', { p_token: token, p_xabarlar: [], p_holat: yangiHolat, p_qadam: joriyQadam(yangiHolat), p_profil: null });
      return { xabarlar: [], keyingi: keyingi(yangiHolat), qadam: joriyQadam(yangiHolat), yozildi: true };
    }
    holat = yangiHolat;
    yangi.push({ rol: 'kod', matn: tushuntir(kutilgan, natija), savolId: kutilgan, javob: natija });
  }

  // ---- 2. javobni qabul qilish
  const k0 = keyingi(holat);
  const bor = kirish.savolId !== undefined || kirish.matn !== undefined;
  if (bor) {
    if (k0.tur !== 'savol') {
      return { xato: 'hozir savol kutilmayapti', xabarlar: [], keyingi: k0, qadam: joriyQadam(holat), yozildi: false };
    }
    const savolId = kirish.savolId ?? k0.savol.id;
    const xom = kirish.javob !== undefined ? kirish.javob : kirish.matn;
    // Obunachi YOZGAN matn (tugma emas). Savol boʻlsa yoki javob sifatida
    // oʻtmasa — erkin xabar: menejer javob beradi, joriy savol eslatiladi,
    // yoʻl holati oʻzgarmaydi. Eskirgan savolId — avvalgidek navbat xatosi.
    const yozgan = kirish.javob === undefined && typeof kirish.matn === 'string' && kirish.matn.trim()
      ? kirish.matn.trim() : null;
    const savolBerdi = yozgan !== null && savolmi(yozgan);
    // Tanlov savolida variant nomini yozsa ("ha", "yoʻq") — oʻsha variant.
    const tanlanganVariant = yozgan !== null && !savolBerdi && k0.savol.turi === 'tanlov'
      ? variantniTop(k0.savol.variantlar, yozgan) : undefined;
    const q = savolBerdi ? null : javobniQabulQil(holat, savolId, tanlanganVariant ?? xom);
    if (yozgan !== null && savolId === k0.savol.id && (q === null || q.xato)) {
      return erkinXabar(d, token, holat, k0, yozgan, q?.xato ?? null);
    }
    if (q === null || q.xato) {
      return { xato: q?.xato ?? 'javob qabul qilinmadi', xabarlar: [], keyingi: k0, qadam: joriyQadam(holat), yozildi: false };
    }
    holat = q.holat;
    profil = q.profil;
    // Ayrim javoblar yoʻlni qayta ochadi («Yangilash», «Qayta qidir», «Boshlaymiz»
    // — yangi oy): `yoz()` ularni holatdan oʻchiradi. Chatda baribir obunachi
    // BOSGAN narsa koʻrinsin, "oʻtkazib yuborildi" emas.
    const yozilgan = Object.prototype.hasOwnProperty.call(holat.javoblar, savolId)
      ? holat.javoblar[savolId]
      : k0.savol.variantlar.find((v) => String(v.qiymat) === String(xom))?.qiymat ?? xom ?? null;
    yangi.push({
      rol: 'obunachi',
      matn: javobMatni(k0.savol.variantlar, yozilgan),
      savolId,
      javob: yozilgan ?? null,
    });
  }

  // ---- 3. kod harakatlari, savol chiqquncha
  let k = keyingi(holat);
  let himoya = 0;
  while (k.tur === 'kod' && himoya++ < 5) {
    const natija = await bajar(d, k.harakat, holat);
    holat = natijaniYoz(holat, k.harakat, natija);
    // Yurish endigina boshlangan bo'lsa kod xabari YOZILMAYDI — natija
    // kelganda (`tekshir`) yoziladi; hozircha menejerning "kutish" gapi yetadi.
    if (!(natija as { kutilmoqda?: unknown } | null)?.kutilmoqda) {
      yangi.push({ rol: 'kod', matn: tushuntir(k.harakat, natija), savolId: k.harakat, javob: natija });
    }
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
    if (harakat === 'buyurtma') return await d.kod.buyurtma(h);
    if (harakat === 'ochiq_ish') return await d.kod.ochiqIsh(h);
    if (harakat === 'rasmiy') return await d.kod.rasmiy(h);
    if (harakat === 'rasmiy_yakun') return await d.kod.rasmiyYakun(h);
    if (harakat === 'qabul') return await d.kod.qabul(h);
    if (harakat === 'qabul_yakun') return await d.kod.qabulYakun(h);
    if (harakat === 'studiya') return await d.kod.studiya(h);
    if (harakat === 'studiya_yakun') return await d.kod.studiyaYakun(h);
    if (harakat === 'yuklash') return await d.kod.yuklash(h);
    if (harakat === 'yuklash_yakun') return await d.kod.yuklashYakun(h);
    if (harakat === 'sotuv') return await d.kod.sotuv(h);
    if (harakat === 'hisobot') return await d.kod.hisobot(h);
    if (harakat === 'hisobot_hisob') return await d.kod.hisobotHisob(h);
    if (harakat === 'hisobot_yakun') return await d.kod.hisobotYakun(h);
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

// ------------------------------------------------------------ erkin xabar

type JoriySavol = Extract<Keyingi, { tur: 'savol' }>;

/** Erkin matn uzunligi chegarasi (chat va LLM uchun). */
const ERKIN_MAX = 500;

/**
 * Savolmi: "?" bilan tugaydi yoki soʻroq soʻzidan boshlanadi ("bu nima?",
 * "qanday ishlaydi", "сколько стоит"). Matn turidagi savolda (doʻkon nomi)
 * shunday matn javob sifatida yozilib ketmasin.
 */
function savolmi(t: string): boolean {
  if (/[?？]\s*$/u.test(t)) return true;
  return /^(nima|nimaga|nega|qanday|qancha|qachon|qayer|qaysi|kim|что|как|почему|зачем|сколько|когда|где|какой|какая|какие)(\s|$)/iu.test(t);
}

/**
 * Yozilgan matn — variant nomi yoki uning BUTUN soʻzlar bilan boshi ("ha" →
 * «Ha, sotyapman», "yoʻq" → «Yoʻq», "kabinet bor" → «Kabinet bor, …»). Faqat
 * BITTA variant mos kelsa — aks holda taxmin qilinmaydi.
 */
function variantniTop(variantlar: ReadonlyArray<{ qiymat: string | number; nom: string }>, t: string): string | number | undefined {
  const norm = (x: string) => x.toLowerCase()
    .replace(/['\u2018\u2019\u02bb\u02bc`]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  const n = norm(t);
  if (n.length < 2) return undefined;
  const aniq = variantlar.filter((v) => norm(v.nom) === n || norm(String(v.qiymat)) === n);
  if (aniq.length === 1) return aniq[0]!.qiymat;
  const bosh = variantlar.filter((v) => `${norm(v.nom)} `.startsWith(`${n} `));
  return bosh.length === 1 ? bosh[0]!.qiymat : undefined;
}

/** Gapni bosh harf bilan boshlab, oxiriga nuqta qoʻyadi (sabab matnlari kichik harfli). */
function gap(t: string): string {
  const s = t.trim();
  if (!s) return s;
  const b = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?…]$/u.test(b) ? b : `${b}.`;
}

/** Uzun savol matnidan — oxirgi soʻroq jumla (eslatma uchun). */
function qisqaSavol(matn: string): string {
  const jumlalar = matn.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const soroq = [...jumlalar].reverse().find((j) => j.trim().endsWith('?'));
  const t = (soroq ?? matn).trim();
  return t.length > 180 ? `${t.slice(0, 180)}…` : t;
}

/** Obunachi rus tilida yozdimi (kirill harflari). */
function ruschami(matn: string): boolean {
  return /[\u0400-\u04FF]/u.test(matn);
}

/**
 * LLM boʻlmasa yoki tekshiruvdan oʻtmasa — kod shabloni: salomga alik,
 * keyin koʻp soʻraladigan savolga TAYYOR javob (`erkin.ts`), boʻlmasa
 * nega javob qabul qilinmagani, oxirida joriy savol. Variantlar va
 * «Oʻtkazib yuborish» qaytarilmaydi — ular pastda tugma boʻlib turibdi.
 */
function erkinShablon(s: JoriySavol['savol'], matn: string, sabab: string | null): string {
  const ruscha = ruschami(matn);
  const salom = /^(salom|assalomu?\s*alaykum|assalom|hello|hi|привет|здравствуй\p{L}*|добрый)/iu.test(matn);
  const tayyor = tayyorJavob(matn);
  const savol = qisqaSavol(s.matn);
  if (ruscha) {
    return [
      salom ? 'Здравствуйте!' : null,
      tayyor ? tayyor.ru : sabab ? `Не получилось принять ответ: ${gap(sabab)}` : 'На этот вопрос сейчас точно не отвечу — я веду вас по шагам.',
      `Сейчас вопрос: «${savol}»`,
    ].filter(Boolean).join(' ');
  }
  return [
    salom ? 'Vaalaykum assalom!' : null,
    tayyor ? tayyor.uz : sabab ? gap(sabab) : 'Bu savolingizga hozir aniq javob bera olmayman — men sizni yoʻl boʻyicha olib boryapman.',
    `Hozirgi savol: «${savol}»`,
  ].filter(Boolean).join(' ');
}

/** Menejer javobi: LLM (tekshiruv bilan) yoki shablon. */
async function erkinJavob(d: SuhbatBogliqliklari, s: JoriySavol['savol'], matn: string, sabab: string | null): Promise<string> {
  const shablon = erkinShablon(s, matn, sabab);
  if (!d.erkinLlm) return shablon;
  const variantlar = s.variantlar.map((v) => v.nom);
  const tj = tayyorJavob(matn);
  const tayyor = tj ? (ruschami(matn) ? tj.ru : tj.uz) : null;
  const taklif = await d.erkinLlm({ savol: s.matn, variantlar, xabar: matn, sabab, tayyor, bilim: ERKIN_BILIM }).catch(() => null);
  if (!taklif) return shablon;
  // Raqam faqat savol, variantlar, sabab, faktlar va obunachining oʻz matnidan; kafolat — taqiq.
  const t = tekshir(taklif, { matnlar: [s.matn, matn, sabab ?? '', ...variantlar, ERKIN_BILIM, tayyor ?? ''], sonlar: [] });
  return t.ok ? taklif : shablon;
}

/** Erkin xabarni chatga yozadi: holat va qadam oʻzgarmaydi. */
async function erkinXabar(
  d: SuhbatBogliqliklari, token: string, holat: YolHolati, k0: JoriySavol, yozgan: string, sabab: string | null,
): Promise<SuhbatJavobi> {
  const matn = yozgan.length > ERKIN_MAX ? `${yozgan.slice(0, ERKIN_MAX)}…` : yozgan;
  const javob = await erkinJavob(d, k0.savol, matn, sabab);
  const yangi: SuhbatXabari[] = [
    { rol: 'obunachi', matn },
    { rol: 'menejer', matn: javob, savolId: k0.savol.id },
  ];
  const qadam = joriyQadam(holat);
  const y = await d.rpc<{ xato?: string; yozildi?: number }>('so_suhbat_yoz', {
    p_token: token, p_xabarlar: yangi, p_holat: holat, p_qadam: qadam, p_profil: null,
  });
  const yozildi = y !== null && !y.xato;
  return { xabarlar: yangi, keyingi: k0, qadam, yozildi, ...(yozildi ? {} : { xato: y?.xato ?? 'jurnalga yozilmadi' }) };
}

function javobMatni(variantlar: ReadonlyArray<{ qiymat: string | number; nom: string }>, q: unknown): string {
  if (q === null || q === undefined) return 'Oʻtkazib yuborildi';
  // Oʻzi yozgan son ("7 mln" → 7000000) chatda guruhlangan: "7 000 000".
  const nom = (x: unknown) => variantlar.find((v) => String(v.qiymat) === String(x))?.nom
    ?? (typeof x === 'number' ? minglik(x) : String(x));
  return Array.isArray(q) ? q.map(nom).join(', ') : nom(q);
}
