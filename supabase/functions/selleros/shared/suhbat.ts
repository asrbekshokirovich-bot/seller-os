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

import { type AloqaJavoblari, type Keyingi, type KodHarakati, type YolHolati, boshlangichHolat, havolalarsiz, JIM_HARAKATLAR,
  javobniQabulQil, joriyQadam, keyingi, kutilayotganHarakat, natijaniYoz, tushuntir, usdKursi, uzumDokoniBormi, yiqilganNatija,
  yonalishQidiruvi, yonalishYanaNatija } from './ssenariy.ts';
import type { Darvoza } from './tarif.ts';
import { natijaSonlari, tekshir } from './tekshiruv.ts';
import { minglik } from './fakt.ts';
import { tayyorJavob } from './erkin.ts';
import { yordamchiBilimi } from './bilim.ts';
import { bilimJavobi, PUL_GAPI } from './bilim-javob.ts';
import { mijozHolati, SHAXSIY_SAVOLLAR, suhbatTarixi } from './yordamchi.ts';
import type { ProfilJavoblari } from './profil.ts';
import { byudjetMatni, byudjetSummalari, mlnMatni, telefonKorinishi } from './tanishuv.ts';
import { kirillUlushi, ruschami, tushunishUchun, yozuvi, type Yozuv } from './yozuv.ts';
import { malumotNiyati, type MalumotNiyati } from './erkin-malumot.ts';
import { boyMatnmi, javobgaMunosabat, javobHamBormi } from './munosabat.ts';

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
    /**
     * 2-qadam: istalgan tovar yoki yoʻnalish nomi boʻyicha qidiruv (2026-10-13).
     * Natijada `soz` va `n` HAR DOIM boʻlsin — `keyingi()` shu bilan qidiruv
     * bajarilganini biladi (aks holda harakat takrorlanaverardi).
     */
    yonalishQidiruv: (soz: string, n: number, profil: Partial<ProfilJavoblari>, holat: YolHolati) => Promise<unknown>;
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
    /** 10-qadam: «Kartochka matnini yozib ber» — har tovar uchun nom va tavsif (uz/ru), Uzum qoidalari bilan tekshirilgan. */
    kartochkaMatni: (holat: YolHolati) => Promise<unknown>;
    /** 11-qadam: oʻz kartochkalarni kuzatuvga qoʻshish, oʻlchov va signallar. */
    sotuv: (holat: YolHolati) => Promise<unknown>;
    /** 12-qadam: oy hisoboti uchun faktlar va oʻlchovdan taxmin. */
    hisobot: (holat: YolHolati) => Promise<unknown>;
    /** 12-qadam: sotuv, komissiya, soliq va muddatlar (sotuvchi yozgan summa bilan). */
    hisobotHisob: (holat: YolHolati) => Promise<unknown>;
    /** 12-qadam: ochiq ishlar (soliq toʻlovi) va keyingi oy rejasi. */
    hisobotYakun: (holat: YolHolati) => Promise<unknown>;
    /** 4-qadamdan keyin: Usta haqidagi fikr — B2 darvozasi dalili (`so_fikr_yoz`). */
    ustaFikri: (holat: YolHolati) => Promise<unknown>;
    /** 1-qadam: dollar kursi (CBU) — byudjet tugmalari va dollarni soʻmga oʻgirish. Hech qachon otmaydi. */
    kurs: (holat: YolHolati) => Promise<unknown>;
    /**
     * Erkin savolga bazadagi raqam bilan javob (`erkin-malumot.ts`, 2026-10-14):
     * soliq, bank, eng koʻp sotiladigan, «X sotish osonmi», raqobat. Maʼlumot
     * yoʻq — `null` (bilim bazasining javobi ketadi). Berilmasa — ishlatilmaydi.
     */
    erkinMalumot?: (niyat: MalumotNiyati, holat: YolHolati) => Promise<string | null>;
  };
  /** Jumlani odamdek aytadi. `null` — ishlatilmadi. */
  llm?: (matn: string) => Promise<string | null>;
  /**
   * Obunachi savolga javob oʻrniga boshqa narsa yozdi — menejerning qisqa
   * javobi (LLM). `null` — ishlatilmadi, kod shabloni ketadi.
   */
  erkinLlm?: (k: ErkinSorov) => Promise<string | null>;
  /**
   * Obunachi savolga oʻzi YOZIB javob berdi va javob qabul qilindi — yordamchining
   * qisqa munosabati (LLM, 2026-10-15). `null` — ishlatilmadi: kod jumlasi ketadi
   * (`munosabat.ts`). Berilmasa — faqat kod jumlasi.
   */
  munosabatLlm?: (k: MunosabatSorovi) => Promise<string | null>;
  /**
   * AI BIRINCHI (env `LLM_AVVAL=1`). Yoqilsa — javobi bazada bor savol ham
   * LLM ga boradi: bazaviy javob unga `tayyor` boʻlib beriladi va u uni
   * doʻstona, batafsil, mijoz tilida aytadi (nazoratchi, 2026-10-13). Oʻchiq
   * boʻlsa — bazada javobi bor savolga LLM chaqirilmaydi (bepul limit
   * tejaladi). Nazoratchi Gemini toʻlovini yoqqach yoqiladi.
   */
  erkinAvval?: boolean;
  /**
   * Saytda tarif cheklovi yoqilganmi (Edge env). `false` — hamma qadam bepul ochiq:
   * tarif haqidagi javob va LLM faktlari shuni aytadi («Bu bepulmi?», 2026-10-13).
   */
  tarifCheklovi?: boolean;
  /**
   * Obuna darvozasi (nazoratchi, 2026-10-14): tarif cheklovi yoqilgan boʻlsa server
   * har turnda bazadan oʻqiydi (`darvozaHolati`). Berilmasa — darvoza yoʻq, yoʻl ochiq.
   */
  darvoza?: Darvoza | null;
}

/**
 * Erkin javob qayerdan: `ai` — LLM yozdi va darvozadan oʻtdi; `baza` —
 * koddagi tayyor javob yoki bilim bazasi; `shablon` — umumiy gap (sabab,
 * "hozir aniq javob bera olmayman"). Menejer xabarining `javob` ida
 * `{erkin: true, manba}` boʻlib yoziladi — 👍/👎 bahosi shu xabarlarga.
 */
export type ErkinManba = 'ai' | 'baza' | 'shablon';

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
  /** ZumSavdo va Uzum haqida faktlar, lugʻat, umumiy maslahatlar (`bilim.ts`). */
  bilim: string;
  /** Mijoz holati: qadam, pul, qiziqish, ekrandagi kartalar — shaxsiy maʼlumotsiz (`yordamchi.ts`). */
  holat?: string;
  /** Oxirgi xabarlar — shaxsiy maʼlumotsiz. */
  tarix?: string;
  /** Oldingi javob darvozadan oʻtmadi — nima uchun (bir marta qayta yoziladi). */
  tuzat?: string | null;
  /** Mijoz yozgan til/yozuv — javob shunda (`yozuv.ts`). */
  til?: Yozuv;
}

/**
 * Javobga munosabat uchun LLM ga beriladigan narsa (2026-10-15). Javob allaqachon
 * qabul qilingan; LLM faqat uni eshitganini aytadi (va gapdagi savolga javob beradi).
 */
export interface MunosabatSorovi {
  /** Obunachi javob bergan savol matni. */
  savol: string;
  /** Obunachi yozgan matn (500 belgigacha). */
  xabar: string;
  /** Kod javobni qanday tushungani (`munosabat.ts`) — maʼnosi va raqamlari saqlanadi. `null` — yoʻq. */
  tushunilgan: string | null;
  /**
   * Gapda savol ham bor boʻlsa — unga bazadagi javob, boʻlmasa `null`. Bor boʻlsa uni dastur
   * oʻzi LLM munosabatidan keyin qoʻshadi (LLM takrorlamaydi).
   */
  tayyor: string | null;
  /** Gapda savol ham bor (javob bilan birga) — bazada javob boʻlmasa LLM unga oʻzi javob beradi. */
  savolBor: boolean;
  /** Gapda savol ham bor boʻlsa — faktlar (`bilim.ts`), boʻlmasa `null`. */
  bilim: string | null;
  /** Mijoz holati — shaxsiy maʼlumotsiz (`yordamchi.ts`). */
  holat: string;
  /** Oxirgi xabarlar — shaxsiy maʼlumotsiz. */
  tarix: string;
  /** Keyingi savol (uni kod beradi — LLM takrorlamasin). `null` — savol emas. */
  keyingi: string | null;
  /** Mijoz yozgan til/yozuv. */
  til: Yozuv;
  /** Oldingi javob darvozadan oʻtmadi — nima uchun. */
  tuzat: string | null;
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

/**
 * «Boshidan boshlash» — YANGI suhbat (nazoratchi, 2026-10-12): chatda faqat
 * oxirgi belgidan keyingi xabarlar. Jurnal bazada qoladi (belgi bilan), lekin
 * eski yoʻl ekranga chiqmaydi. Belgining oʻzi ham koʻrsatilmaydi.
 */
export function songgiSuhbat<T extends { rol: string; savolId?: string | null }>(xabarlar: readonly T[]): T[] {
  let i = xabarlar.length - 1;
  while (i >= 0 && !(xabarlar[i]!.rol === 'kod' && xabarlar[i]!.savolId === 'boshdan')) i--;
  return xabarlar.slice(i + 1);
}

/**
 * Javobsiz qolgan ESKI savol chatdan olinadi: ssenariy oʻzgargan (2026-10-12
 * gacha birinchi savol "qancha pul ajratasiz?" edi, endi "ismingiz?") yoki
 * oldinga yangi savol qoʻshilgan boʻlsa, tarix oxirida eski savol turib
 * qolardi va ekranda ikki savol chiqardi: eskisi va hozirgisi (nazoratchi,
 * 2026-10-12). Oxiridan faqat shu savolning menejer gaplari va unga yozilgan
 * erkin matnlar olinadi; kod natijasi va berilgan javoblar qoladi. Hozirgi
 * savol pufagi sahifada `keyingi` dan chiziladi.
 */
export function eskiSavolsiz<T extends { rol: string; savolId?: string | null }>(xabarlar: readonly T[], joriySavolId: string | null): T[] {
  const oxirgi = xabarlar[xabarlar.length - 1];
  if (!oxirgi || oxirgi.rol !== 'menejer' || !oxirgi.savolId || oxirgi.savolId === joriySavolId) return [...xabarlar];
  const eski = oxirgi.savolId;
  let i = xabarlar.length - 1;
  while (i >= 0) {
    const x = xabarlar[i]!;
    if (!((x.rol === 'menejer' && x.savolId === eski) || (x.rol === 'obunachi' && !x.savolId))) break;
    i--;
  }
  return xabarlar.slice(0, i + 1);
}

/** Tarix + hozirgi savol. Hech narsa yozmaydi. */
export async function suhbatOqi(d: Pick<SuhbatBogliqliklari, 'rpc' | 'darvoza'>, token: string): Promise<
  (SuhbatJavobi & { tarix: OqishJavobi['xabarlar'] }) | { xato: string }
> {
  const o = await d.rpc<OqishJavobi>('so_suhbat_oqi', { p_token: token });
  if (o === null) return { xato: 'baza javob bermadi' };
  if (o.xato) return { xato: o.xato };
  const holat = o.holat ?? boshlangichHolat();
  const k = keyingi(holat, d.darvoza);
  return {
    xabarlar: [],
    tarix: havolalarsiz(eskiSavolsiz(songgiSuhbat(o.xabarlar ?? []), k.tur === 'savol' ? k.savol.id : null), d.darvoza),
    keyingi: k, qadam: joriyQadam(holat), yozildi: true,
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
  // Obuna darvozasi har chaqiruvda bir xil (`keyingi`, `joriyQadam`, `javobniQabulQil`).
  const dz = d.darvoza;

  let holat = o.holat ?? boshlangichHolat();
  const yangi: SuhbatXabari[] = [];
  let profil: Partial<ProfilJavoblari & AloqaJavoblari> | null = null;
  // Oʻzi yozgan javob — kod harakatlaridan keyin unga munosabat qoʻshiladi (obunachi xabaridan keyin).
  let yozilganJavob: { savol: JoriySavol['savol']; matn: string; savolHam: boolean; orni: number } | null = null;

  // ---- 1b. kutilayotgan ishni tekshirish (`tekshir`)
  if (kirish.tekshir === true) {
    // Kutilayotgan ish: 5-qadam (1688) yoki 9-qadam (internet suratlari).
    const kutilgan = kutilayotganHarakat(holat);
    if (kutilgan === null) {
      return { xabarlar: [], keyingi: keyingi(holat, dz), qadam: joriyQadam(holat), yozildi: true };
    }
    const natija = await bajar(d, kutilgan, holat);
    const yangiHolat = natijaniYoz(holat, kutilgan, natija);
    if ((natija as { kutilmoqda?: unknown } | null)?.kutilmoqda) {
      // Hali tugamagan: holat oʻzgargan boʻlsa ham (urinish sanogʻi)
      // jurnalga xabar yozilmaydi; holat yoziladi.
      await d.rpc('so_suhbat_yoz', { p_token: token, p_xabarlar: [], p_holat: yangiHolat, p_qadam: joriyQadam(yangiHolat), p_profil: null });
      return { xabarlar: [], keyingi: keyingi(yangiHolat, dz), qadam: joriyQadam(yangiHolat), yozildi: true };
    }
    holat = yangiHolat;
    yangi.push({ rol: 'kod', matn: tushuntir(kutilgan, natija), savolId: kutilgan, javob: natija });
  }

  // ---- 2. javobni qabul qilish
  const k0 = keyingi(holat, dz);
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
    // Gapda savol bilan birga aniq javob ham boʻlsa («maishiy texnika sotganman, endi nima
    // sotsam boʻladi?», 2026-10-15) — javob qabul qilinadi, savolga munosabatda javob beriladi.
    const javobHam = yozgan !== null && savolmi(yozgan, k0.savol.id) && javobHamBormi(k0.savol.id, yozgan);
    const savolBerdi = yozgan !== null && savolmi(yozgan, k0.savol.id) && !javobHam;
    // Tanlov savolida variant nomini yozsa ("ha", "yoʻq") — oʻsha variant.
    // Son savolida ham tugma matnini yozsa ("60 kunlik") — oʻsha tugma: aks
    // holda "60 kunlik" 60 dona boʻlib ketardi (tugma — 90 dona). Faqat raqam
    // ("30") — oʻsha son, tugma emas.
    const tugmaMatni = k0.savol.turi === 'tanlov' || (k0.savol.turi === 'son' && yozgan !== null && /\p{L}/u.test(yozgan));
    // Oʻzbek kirillda yozsa ("ҳа", "йўқ") — tugma nomi lotinda: tushunish uchun lotinga oʻgiriladi.
    const tanlanganVariant = yozgan !== null && !savolBerdi && tugmaMatni
      ? variantniTop(k0.savol.variantlar, tushunishUchun(yozgan)) : undefined;
    const q = savolBerdi ? null : javobniQabulQil(holat, savolId, tanlanganVariant ?? xom, dz);
    if (yozgan !== null && savolId === k0.savol.id && (q === null || q.xato)) {
      return erkinXabar(d, token, holat, k0, yozgan, q?.xato ?? null, o.xabarlar ?? []);
    }
    if (q === null || q.xato) {
      return { xato: q?.xato ?? 'javob qabul qilinmadi', xabarlar: [], keyingi: k0, qadam: joriyQadam(holat), yozildi: false };
    }
    const oldin = holat;
    holat = q.holat;
    profil = q.profil;
    // Ayrim javoblar yoʻlni qayta ochadi («Yangilash», «Qayta qidir», «Boshlaymiz»
    // — yangi oy): `yoz()` ularni holatdan oʻchiradi. Chatda baribir obunachi
    // BOSGAN narsa koʻrinsin, "oʻtkazib yuborildi" emas.
    const yozilgan = Object.prototype.hasOwnProperty.call(holat.javoblar, savolId)
      ? holat.javoblar[savolId]
      : k0.savol.variantlar.find((v) => String(v.qiymat) === String(xom))?.qiymat ?? xom ?? null;
    // Byudjetni oʻzi yozgan boʻlsa ("100 mln bor, lekin 70 mln bilan…") —
    // chatda yozgani oʻzicha, keyin menejer qanday tushunganini aytadi
    // ("70 000 000 soʻm", "$5 000 (≈ 63,3 mln soʻm)"). Telefon — bir xil shaklda.
    const usdJavob = holat.javoblar['byudjet_usd'];
    const usd = typeof usdJavob === 'number' ? usdJavob : null;
    const byudjetSoni = savolId === 'byudjet' && typeof yozilgan === 'number';
    // Gap yozgan (tugma nomi yoki shunchaki son emas) — gapi oʻzicha + menejer tushunganini aytadi.
    const byudjetGapi = byudjetSoni && yozgan !== null && tanlanganVariant === undefined && !/^[\d\s.,]+$/u.test(yozgan);
    const tugma = k0.savol.variantlar.find((v) => String(v.qiymat) === String(yozilgan));
    // Oʻzi yozgan javob (tugma emas) — munosabat uchun (3b).
    if (yozgan !== null && tanlanganVariant === undefined) {
      yozilganJavob = {
        savol: k0.savol, matn: yozgan.length > ERKIN_MAX ? `${yozgan.slice(0, ERKIN_MAX)}…` : yozgan, savolHam: javobHam, orni: yangi.length,
      };
    }
    // Qiziqishni oʻzi yozgan boʻlsa — pufakda yozgani; qanday tushunilgani — munosabatda.
    const qiziqishGapi = savolId === 'qiziqish' && yozilganJavob !== null;
    yangi.push({
      rol: 'obunachi',
      matn: byudjetGapi && yozgan !== null
        ? (yozgan.length > ERKIN_MAX ? `${yozgan.slice(0, ERKIN_MAX)}…` : yozgan)
        // Dollar tugmasi ("$1 000") — soʻmdagisi bilan: "$1 000 (≈ 12,7 mln soʻm)".
        : byudjetSoni && (!tugma || usd !== null)
          ? byudjetMatni(yozilgan as number, usd)
          : savolId === 'telefon' && typeof yozilgan === 'string'
            ? telefonKorinishi(yozilgan)
            // Birinchi savol: shu javobda nima berilgan boʻlsa — "Aziz Karimov, +998 90 123 45 67".
            : savolId === 'ism'
              ? ismTelefonMatni(oldin, holat)
              : qiziqishGapi && yozilganJavob
                ? yozilganJavob.matn
                : javobMatni(k0.savol.variantlar, yozilgan),
      savolId,
      javob: savolId === 'ism' ? (holat.javoblar['ism'] ?? null) : (yozilgan ?? null),
    });
  }

  // ---- 3. kod harakatlari, savol chiqquncha
  let k = keyingi(holat, dz);
  let himoya = 0;
  while (k.tur === 'kod' && himoya++ < 5) {
    const natija = await bajar(d, k.harakat, holat);
    holat = natijaniYoz(holat, k.harakat, natija);
    // Yurish endigina boshlangan bo'lsa kod xabari YOZILMAYDI — natija
    // kelganda (`tekshir`) yoziladi; hozircha menejerning "kutish" gapi yetadi.
    // Jim harakat (dollar kursi) — chatga hech qachon yozilmaydi.
    if (!JIM_HARAKATLAR.has(k.harakat) && !(natija as { kutilmoqda?: unknown } | null)?.kutilmoqda) {
      yangi.push({ rol: 'kod', matn: tushuntir(k.harakat, natija), savolId: k.harakat, javob: natija });
    }
    k = keyingi(holat, dz);
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
  // ---- 3b. oʻzi yozgan javobga munosabat — obunachi xabaridan keyin (kod xabarlaridan oldin)
  if (yozilganJavob) {
    const m = await munosabatYoz(d, yozilganJavob, holat, k, songgiSuhbat(o.xabarlar ?? []));
    if (m) yangi.splice(yozilganJavob.orni + 1, 0, m);
  }
  const kodJumla = k.tur === 'savol' ? k.savol.matn : k.matn;
  // Shaxsiy savol (ism, telefon) LLM ga yuborilmaydi — telefon savolida ism bor.
  const menejerMatn = k.tur === 'savol' && SHAXSIY_SAVOLLAR.has(k.savol.id) ? kodJumla : await odamlashtirTekshirib(d, kodJumla, yangi);
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

  // Jurnalga toʻliq yozildi; brauzerga — obunasiz boʻlsa 1688 havolasiz (`havolalarsiz`).
  return { xabarlar: havolalarsiz(yangi, dz), keyingi: k, qadam, yozildi, ...(yozildi ? {} : { xato: y?.xato ?? 'jurnalga yozilmadi' }) };
}

/**
 * Boshidan — YANGI suhbat (nazoratchi, 2026-10-12). Holat tozalanadi,
 * JURNAL QOLADI: unga belgi (`kod`, `savolId: 'boshdan'`) va birinchi savol
 * yoziladi. Chatga faqat belgidan keyingisi chiqadi (`songgiSuhbat`) —
 * sahifa yangilansa ham eski yoʻl koʻrinmaydi (ilgari belgi chiziq boʻlib
 * chizilardi va eski tarix ustida turardi).
 *
 * Hammasi BITTA `so_suhbat_yoz` bilan: holat, qadam va ikki xabar bitta
 * tranzaksiyada — yarmi yozilib qolmaydi.
 */
export async function suhbatBoshdan(d: SuhbatBogliqliklari, token: string): Promise<SuhbatJavobi> {
  const h = boshlangichHolat();
  const k = keyingi(h);
  const savol: SuhbatXabari[] = k.tur === 'savol' ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id }] : [];
  // Eski suhbat «Suhbatlarim»da qoladi (2026-10-14): belgida uning holati — keyin davom ettirish uchun (0066).
  const o = await d.rpc<OqishJavobi>('so_suhbat_oqi', { p_token: token });
  if (o === null || o.xato) {
    return { xato: o?.xato ?? 'baza javob bermadi', xabarlar: [], keyingi: k, qadam: 1, yozildi: false };
  }
  const eski = o.holat ? { holat: o.holat, qadam: o.qadam ?? joriyQadam(o.holat) } : null;
  const y = await d.rpc<{ xato?: string }>('so_suhbat_yoz', {
    p_token: token,
    p_xabarlar: [{ rol: 'kod', matn: 'Yoʻl boshidan boshlandi', savolId: 'boshdan', javob: eski }, ...savol],
    p_holat: h, p_qadam: 1, p_profil: null,
  });
  if (y === null || y.xato) {
    return { xato: y?.xato ?? 'baza javob bermadi', xabarlar: [], keyingi: k, qadam: 1, yozildi: false };
  }
  return { xabarlar: savol, keyingi: k, qadam: 1, yozildi: true };
}

/** 1-qadam qiziqishi (sohalar) — `null`: soʻralmagan yoki oʻtkazib yuborilgan. */
function qiziqishlari(h: YolHolati): string[] | null {
  const q = h.javoblar['qiziqish'];
  return Array.isArray(q) ? q.map(String) : null;
}

async function bajar(d: SuhbatBogliqliklari, harakat: KodHarakati, h: YolHolati): Promise<unknown> {
  try {
    if (harakat === 'yonalishlar') {
      const b = h.javoblar['byudjet'];
      return await d.kod.yonalishlar({
        budgetUzs: typeof b === 'number' ? b : null,
        hasUzumShop: uzumDokoniBormi(h.javoblar['uzum_dokoni']),
        interest: qiziqishlari(h),
      }, h);
    }
    // «Yana koʻrsatish» — bazasiz: navbat birinchi hisobda tayyor.
    if (harakat === 'yonalish_yana') return yonalishYanaNatija(h);
    if (harakat === 'yonalish_qidiruv') {
      const q = yonalishQidiruvi(h);
      if (q === null) return { olchov_yoq: true, sabab: 'qidiruv soʻzi yoʻq', soz: '', n: 0 };
      const b = h.javoblar['byudjet'];
      return await d.kod.yonalishQidiruv(q.soz, q.n, { budgetUzs: typeof b === 'number' ? b : null, interest: qiziqishlari(h) }, h);
    }
    if (harakat === 'kurs') return await d.kod.kurs(h);
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
    if (harakat === 'kartochka_matni') return await d.kod.kartochkaMatni(h);
    if (harakat === 'sotuv') return await d.kod.sotuv(h);
    if (harakat === 'hisobot') return await d.kod.hisobot(h);
    if (harakat === 'hisobot_hisob') return await d.kod.hisobotHisob(h);
    if (harakat === 'hisobot_yakun') return await d.kod.hisobotYakun(h);
    if (harakat === 'usta_fikri') return await d.kod.ustaFikri(h);
    return await d.kod.tannarx(h);
  } catch (e) {
    // Yiqilish jim oʻtmaydi: xom xato LOGGA yoziladi (obunachiga inglizcha
    // JS matni chiqmaydi), natija — `yiqilganNatija()`: ssenariy uni koʻrib
    // «Qayta urinish» savolini beradi. Ilgari `{olchov_yoq, sabab}` yozilardi
    // va matn quruvchilar unda TypeError otardi (tekshiruv, 2026-10-05).
    console.error(`suhbat: "${harakat}" harakati yiqildi:`, e);
    return yiqilganNatija();
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

// ------------------------------------------------------------ javobga munosabat

/**
 * Munosabati LLM siz (faqat kod jumlasi) savollar: ism va telefon — maxfiylik; qiziqish —
 * kod qaysi sohalar olinganini aniq aytadi (pufakda mijoz yozgani turadi, LLM uni oʻz soʻzi
 * bilan aytib, sohalarni tushirib qoldirishi mumkin); yoʻnalish — yozgani qidiruv; havola
 * va rasm manzili. Son savollari ham (`turi: 'son'`) — raqam aniq aytilishi kerak.
 */
const MUNOSABAT_LLMSIZ = /^(?:ism|telefon|qiziqish|yonalish|uzum_havola:.*|rasm:.*)$/u;

/** Munosabat uzunligi chegarasi: oddiy — qisqa; gapdagi savolga javob bilan — uzunroq. */
const MUNOSABAT_MAX = 600;
const MUNOSABAT_SAVOL_MAX = 1_400;

/**
 * Oʻzi yozgan javobga munosabat (nazoratchi, 2026-10-15: "mijozning javobiga eʼtibor
 * bermay keyingi savolga oʻtib ketyapti").
 *
 * Kod jumlasi (`javobgaMunosabat`) — javob qanday tushunilgani. Gap uzun boʻlsa yoki
 * ichida savol boʻlsa — LLM uni odamdek aytadi va savolga javob beradi; darvoza
 * (`tekshir`) oʻtkazmasa — sababi bilan bir marta qayta. LLM yoʻq, yiqildi yoki
 * oʻtmadi — kod jumlasi (+ gapdagi savolga bazadagi javob). Aytadigan gap
 * boʻlmasa — `null`. Qaysi savollarda LLM chaqirilmasligi — `MUNOSABAT_LLMSIZ`.
 */
async function munosabatYoz(
  d: SuhbatBogliqliklari, j: { savol: JoriySavol['savol']; matn: string; savolHam: boolean },
  h: YolHolati, k: Keyingi, xabarlar: ReadonlyArray<{ rol: string; matn: string; savolId?: string | null }>,
): Promise<SuhbatXabari | null> {
  const { savol: s, matn, savolHam } = j;
  const ruscha = ruschami(matn);
  const asos = javobgaMunosabat(s.id, matn, h);
  // Gapdagi savolga bazadagi javob — LLM siz ham (erkin xabardagi tartibda).
  let tayyor: string | null = null;
  if (savolHam) {
    const t = tushunishUchun(matn);
    tayyor = bazaJavobi(t, ruscha, s.id, null, h, d.tarifCheklovi, await bazadanMalumot(d, t, h))?.matn ?? null;
  }
  const llmBop = d.munosabatLlm && !MUNOSABAT_LLMSIZ.test(s.id) && s.turi !== 'son' && (savolHam || boyMatnmi(matn));
  if (llmBop) {
    const til = yozuvi(matn);
    const holat = mijozHolati(h, s.qadam);
    const tarix = suhbatTarixi(xabarlar, h);
    const bilim = savolHam ? yordamchiBilimi(tushunishUchun(matn), d.tarifCheklovi) : null;
    const max = savolHam ? MUNOSABAT_SAVOL_MAX : MUNOSABAT_MAX;
    const manba = { matnlar: [s.matn, matn, asos ?? '', tayyor ?? '', bilim ?? '', holat, tarix], sonlar: [] };
    let tuzat: string | null = null;
    for (let urinish = 0; urinish < 2; urinish++) {
      const taklif: string | null = (await d.munosabatLlm!({
        savol: s.matn, xabar: matn, tushunilgan: asos, tayyor, bilim, holat, tarix,
        keyingi: k.tur === 'savol' ? qisqaSavol(k.savol.matn, k.savol.id) : null, til, tuzat, savolBor: savolHam,
      }).catch(() => null))?.trim() || null;
      if (!taklif) break;
      const tk = tekshir(taklif, manba);
      const tilMos: boolean = til === 'uz' || kirillUlushi(taklif) >= 0.5;
      // Savol bilan tugasa — keyingi savolni oʻzi bergan (u alohida chiqadi): ikki savol boʻlib qolardi.
      const savolsiz: boolean = !/[?？]["»”)]*$/u.test(taklif);
      if (tk.ok && tilMos && savolsiz && taklif.length <= max) {
        // Gapdagi savolga bazada javob boʻlsa — AI munosabatidan keyin u ham (jonli sinov, 2026-10-15:
        // AI «…endi nima sotsam boʻladi?» savolini javobsiz qoldirgan edi).
        return {
          rol: 'menejer', matn: tayyor ? `${taklif}\n\n${tayyor}` : taklif, savolId: s.id,
          javob: { erkin: true, manba: 'ai', munosabat: true },
        };
      }
      tuzat = [
        tk.dalilsiz.length ? `bu raqamlar faktlarda yoʻq: ${tk.dalilsiz.join(', ')}.` : null,
        tk.taqiq.length ? `taqiqlangan gap: ${tk.taqiq.join(', ')}.` : null,
        tilMos ? null : til === 'ru' ? 'javob rus tilida emas — rus tilida yoz.' : 'javob kirill yozuvida emas — oʻzbek kirillda yoz.',
        savolsiz ? null : 'savol berma — keyingi savolni dastur oʻzi beradi.',
        taklif.length <= max ? null : 'juda uzun — qisqaroq yoz.',
      ].filter(Boolean).join(' ');
    }
  }
  // Kod jumlasi. Gapdagi savolga bazada javob boʻlmasa — rostini aytadi.
  const savolQismi = savolHam
    ? tayyor ?? (ruscha
      ? 'На ваш вопрос сейчас точно не отвечу — разберём его по ходу пути.'
      : 'Savolingizga hozir aniq javob bera olmayman — yoʻl davomida birga koʻramiz.')
    : null;
  const kodMatni = [asos, savolQismi].filter(Boolean).join(savolQismi?.includes('\n') ? '\n\n' : ' ');
  if (!kodMatni) return null;
  // Savolga javob boʻlsa — 👍/👎 bilan (erkin javob kabi); oddiy tasdiq — bahosiz.
  return savolHam
    ? { rol: 'menejer', matn: kodMatni, savolId: s.id, javob: { erkin: true, manba: tayyor ? 'baza' : 'shablon', munosabat: true } }
    : { rol: 'menejer', matn: kodMatni };
}

// ------------------------------------------------------------ erkin xabar

// Shaxsiy maʼlumot soʻraladigan savollar (ism, telefon) — `yordamchi.ts` dagi
// `SHAXSIY_SAVOLLAR`: ular va ularga yozilgan matn LLM ga YUBORILMAYDI.

type JoriySavol = Extract<Keyingi, { tur: 'savol' }>;

/** Erkin matn uzunligi chegarasi (chat va LLM uchun). */
const ERKIN_MAX = 500;

/**
 * Savolmi — javob emas, savol yoki maslahat soʻrovi.
 *
 * Ilgari faqat "?" bilan tugagan yoki soʻroq soʻzidan boshlangan gap savol
 * edi. Nazoratchi sinovida (2026-10-13) "100 mln pulim bor birinchi 80 mln
 * boshlasammikan yoki 100 mln bilan nima maslahat berasan" savol deb
 * tanilmadi: chat gapdagi oxirgi summani olib "100 mln bilan boshlaymiz"
 * dedi, maslahat soʻrovi javobsiz qoldi. Endi yana:
 *   - "?" gapning istalgan joyida;
 *   - maslahat va tushunmaslik iboralari (maslahat, qaysi biri, tushunmadim…);
 *   - soʻroq qoʻshimchasi: -mikan/-mikin; undoshdan keyingi -mi ("kerakmi",
 *     "bormi", "boshlasammi") va "-dimi" ("boʻladimi"). Egalik "-i" bilan
 *     adashmasin: "ismi", "hajmi", "rasmi", "jami", "nomi" — savol emas.
 *
 * Ism va telefon savolida faqat eski qat'iy qoida: ism "…mi" bilan tugashi mumkin.
 *
 * Oʻzbek kirill matni ("Бу нима?", "пул қачон тушади") avval lotinga
 * oʻgiriladi — soʻroq soʻzlari va qoʻshimchalari lotinda tekshiriladi.
 */
function savolmi(t: string, savolId: string | null = null): boolean {
  const s = tushunishUchun(t).toLowerCase().replace(/[ʻʼ‘’`]/gu, "'");
  if (/[?？]\s*$/u.test(s)) return true;
  if (/^(nima|nimaga|nega|qanday|qancha|qachon|qayer\p{L}*|qaysi|kim|nechta|necha|что|как|почему|зачем|сколько|когда|где|какой|какая|какие)(\s|$)/iu.test(s)) return true;
  if (savolId !== null && SHAXSIY_SAVOLLAR.has(savolId)) return false;
  if (/[?？]/u.test(s)) return true;
  if (/maslahat|nima deysiz|nima qilay|nima qilsam|nima qilish kerak|qaysi biri|qaysi birini|qanday qilib|tushunmadim|tushunmayapman|tushuntir|nima degani|nimani anglatadi|aytib bering|посовет|подскаж|что лучше|не понял|не понимаю|объясни/u.test(s)) return true;
  if (SOROQ_ICHIDA.test(s.replace(SOROQ_EMAS, ' '))) return true;
  return /\p{L}{2,}(mik[ai]n|[bdgkqlmnrtyxzh']mi|dimi)(?!\p{L})|(to'g'ri|yaxshi|foydali|xavfli)mi(?!\p{L})|(^|\s)mi(?!\p{L})/u.test(s);
}

/**
 * Soʻroq soʻzi gapning ICHIDA ham — «?» siz yozilgan savol (nazoratchi sinovi,
 * 2026-10-19): qiziqish savoliga «gozallik va parvarish qanday tovarlar» deb
 * yozdi — chat uni javob deb oldi («Goʻzallik va parvarish» belgilandi) va
 * savolga javob bermay byudjet savoliga oʻtib ketdi. Ilgari soʻroq soʻzi faqat
 * gap BOSHIDA tanilardi. Butun soʻz sifatida: «nimadir», «kimdir», «qachondir» —
 * soʻroq emas.
 */
const SOROQ_ICHIDA = /(^|[^\p{L}'])(nima|nimaga|nimani|nimalar|nega|qanday|qanaqa|qancha|qachon|qayer(?:da|ga|dan)?|qaysi|kim|kimga|nechta|necha|что|как|почему|зачем|сколько|когда|где|какой|какая|какие|каких)(?![\p{L}'-])/u;
/** Soʻroq soʻzli, lekin savol boʻlmagan iboralar: «bir necha marta», «potomu chto», «chto-to». */
const SOROQ_EMAS = /bir necha|nima bo'lsa ham|qancha bo'lsa ham|потому что|так как|что-то|как-то|когда-то|где-то|кто-то/gu;

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

/**
 * Uzun savol matnidan — oxirgi soʻroq jumla (eslatma uchun). Savolda «nom»
 * boʻlsa-yu, soʻroq jumlada boʻlmasa — nom oldiga qoʻshiladi: aks holda
 * bir nechta tovar boʻlganda «Birinchi partiya uchun nechta olasiz?» qaysi
 * tovar haqida ekani bilinmasdi (tekshiruv, 2026-10-05).
 */
function qisqaSavol(matn: string, savolId = ''): string {
  const jumlalar = matn.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const soroq = [...jumlalar].reverse().find((j) => j.trim().endsWith('?'));
  let t = (soroq ?? matn).trim();
  const nom = /«[^»]+»/u.exec(matn)?.[0];
  // Faqat tovarga oid savolda (`miqdor:123`, `uzum_havola:…`): qiziqish savolidagi «…» — oldindan
  // belgilangan soha, tovar emas; «««Goʻzallik va parvarish» — Qaysi sohadagi…?»» chiqardi (2026-10-19).
  if (soroq && nom && savolId.includes(':') && !t.includes(nom)) t = `${nom} — ${t}`;
  return t.length > 180 ? `${t.slice(0, 180)}…` : t;
}

/**
 * Rad etish sababi rus tilida — oʻzbekcha sabab rus gapiga aralashmasin
 * ("Не получилось принять ответ: Variantlardan birini tanlang."). Sabablar
 * ssenariyda (`javobniQabulQil`) yoziladi; notanishi — umumiy gap.
 */
function sababRu(sabab: string): string {
  const s = sabab.toLowerCase();
  // 1-qadam (tanishuv.ts): ism, telefon, byudjet.
  if (s.includes('familiya')) return 'Напишите имя и фамилию — например: Азиз Каримов.';
  if (s.includes('telefon')) return 'Напишите номер телефона полностью — например: +998 90 123 45 67.';
  if (s.startsWith('bir nechta summa')) return 'Вы написали несколько сумм — с какой начинаем? Напишите одну.';
  if (s.includes('soʻmmi yoki') || s.includes('dollarmi')) return 'Укажите валюту: например, 70 млн или 70 $.';
  if (s.includes('dollar kursini')) return 'Не удалось получить курс доллара — напишите сумму в сумах.';
  if (s.startsWith('yevroni')) return 'Евро не считаю — напишите в сумах или долларах.';
  if (s.startsWith('summani yozing') || s.startsWith('qaysi summa')) return 'Напишите одну сумму — например: 30 млн или 3000 $.';
  if (s.includes('manfiy')) return 'Сумма не может быть отрицательной.';
  if (s.includes('nima sotganingizni')) return 'Выберите вариант или коротко напишите, что продавали.';
  if (s.startsWith('bitta son')) return 'Напишите одно число.';
  if (s.startsWith('summani soʻmda')) return 'Напишите сумму в сумах.';
  if (s.startsWith('marja')) return 'Маржа — от 0 до 99 %.';
  if (s.startsWith('variantlardan')) return 'Выберите один из вариантов.';
  if (s.includes('havola')) return 'Пришлите ссылку на свою карточку Uzum (uzum.uz/…/product/…).';
  if (s.includes('manzil')) return 'Пришлите ссылку на фото — она начинается с http(s)://.';
  return 'Ответ не подошёл.';
}

/** Erkin javob va uning manbasi (`ErkinManba`). */
interface ErkinNatija { matn: string; manba: ErkinManba }

/**
 * Bazadagi javob (LLM siz): koddagi tayyor javob (`erkin.ts`), bazadagi
 * raqam (`erkin-malumot.ts`, `malumot`) yoki bilim bazasi (`bilim-javob.ts`).
 * `t` — tushunish uchun matn (oʻzbek kirill — lotinda). Rad etilgan javobda
 * (sabab bor) bilim izlanmaydi: avval sabab. Raqam va bilim — oʻzbekcha:
 * rus savolida `tarjimaKerak` — LLM uni rus tilida aytadi (2026-10-14:
 * ilgari rus savoliga bilim umuman izlanmasdi, "точно не отвечу" chiqardi).
 */
function bazaJavobi(
  t: string, ruscha: boolean, savolId: string, sabab: string | null, h: YolHolati | null, tarifCheklovi?: boolean,
  malumot: string | null = null,
): { matn: string; tarjimaKerak: boolean } | null {
  const tj = tayyorJavob(t, tarifCheklovi);
  if (tj) return { matn: ruscha ? tj.ru : tj.uz, tarjimaKerak: false };
  if (sabab) return null;
  const uz = malumot ?? bilimJavobi(t, savolId, h);
  return uz ? { matn: uz, tarjimaKerak: ruscha } : null;
}

/**
 * LLM boʻlmasa yoki tekshiruvdan oʻtmasa — kod shabloni: salomga alik,
 * keyin koʻp soʻraladigan savolga TAYYOR javob (`erkin.ts`), boʻlmasa
 * nega javob qabul qilinmagani, oxirida joriy savol. Variantlar va
 * «Oʻtkazib yuborish» qaytarilmaydi — ular pastda tugma boʻlib turibdi.
 *
 * Oʻzbek kirillda yozsa — lotinda tushuniladi va javob oʻzbekcha (lotin)
 * chiqadi; ilgari kirill matnning hammasiga ruscha javob ketardi.
 *
 * `malumot` — bazadagi raqam bilan javob (`erkin-malumot.ts`), boʻlsa bilimdan oldin.
 */
function erkinShablon(
  s: JoriySavol['savol'], matn: string, sabab: string | null, h: YolHolati | null = null, tarifCheklovi?: boolean,
  malumot: string | null = null,
): ErkinNatija {
  const ruscha = ruschami(matn);
  const t = tushunishUchun(matn);
  // Salom — butun soʻz: "hisob…" "hi" bilan boshlanadi, lekin salomlashish emas.
  const salom = /^(salom|assalomu?\s*alaykum|assalom|hello|hi|привет|здравствуй\p{L}*|добрый)(?!\p{L})/iu.test(t);
  const tayyor = tayyorJavob(t, tarifCheklovi);
  const savol = qisqaSavol(s.matn, s.id);
  // Bilimdan javob (`bilim-javob.ts`): LLM ishlamasa ham "ball nima?", "pul
  // qachon tushadi?" kabi savolga aniq javob — jonli sinovda (2026-10-13)
  // Gemini limiti tugab, 33 savoldan 22 tasiga "javob bera olmayman" chiqqan edi.
  const bilim = !tayyor && !sabab ? (malumot ?? bilimJavobi(t, s.id, h)) : null;
  // Xatboshili javob (roʻyxat, `erkin-malumot.ts`) — eslatma alohida xatboshida.
  const ajrat = bilim?.includes('\n') ? '\n\n' : ' ';
  if (bilim && !ruscha) {
    return { matn: `${[salom ? 'Vaalaykum assalom!' : null, bilim].filter(Boolean).join(' ')}${ajrat}Hozirgi savol: «${savol}»`, manba: 'baza' };
  }
  // Byudjet savolida maslahat soʻradi ("80 mlnmi, 100 mlnmi?") — LLM boʻlmasa
  // ham umumiy maslahat (`bilim.ts`, raqamsiz); summalari tugma boʻlib chiqadi.
  // Faqat PUL haqidagi gapda: "kanstovar bilan kiyimdan qaysi biri osonroq?" ga pul maslahati
  // chiqib ketardi (jonli sinov, 2026-10-13).
  if (s.id === 'byudjet' && !sabab && !tayyor && PUL_GAPI.test(t.toLowerCase().replace(/[ʻʼ‘’`]/gu, "'"))) {
    return {
      manba: 'baza',
      matn: ruscha
        ? [salom ? 'Здравствуйте!' : null,
          'Мой совет: не вкладывайте все деньги в первую партию — оставьте часть в запасе: пока товар приедет, продастся и '
          + 'деньги вернутся, пройдёт время, а будут реклама, возвраты и непредвиденные расходы. Сколько нужно на старт, '
          + 'покажу на следующем шаге для каждого направления.', `Сейчас вопрос: «${savol}»`].filter(Boolean).join(' ')
        : [salom ? 'Vaalaykum assalom!' : null,
          'Maslahatim: hamma pulni birinchi partiyaga tikmang — bir qismini zaxirada qoldiring: tovar kelib, sotilib, pul '
          + 'qaytguncha vaqt oʻtadi, reklama, qaytgan tovar va kutilmagan xarajatlar ham chiqadi. Boshlash uchun qancha '
          + 'kerakligini keyingi qadamda har yoʻnalish uchun koʻrsataman.', `Hozirgi savol: «${savol}»`].filter(Boolean).join(' '),
    };
  }
  // Rus savoli, javob faqat oʻzbekcha bor (LLM rus tilida aytolmadi) — "javob yoʻq" emas,
  // izoh bilan oʻzbekchasi: rasmiy raqam va manba baribir foydali (2026-10-14).
  if (bilim && ruscha) {
    return {
      manba: 'baza',
      matn: `${[salom ? 'Здравствуйте!' : null, `Подробный ответ пока есть только на узбекском:${ajrat}${bilim}`].filter(Boolean).join(' ')}`
        + `${ajrat}Сейчас вопрос: «${savol}»`,
    };
  }
  const manba: ErkinManba = tayyor ? 'baza' : 'shablon';
  // Javob oʻtmagan boʻlsa — avval nega oʻtmagani, keyin (boʻlsa) tayyor javob:
  // obunachi javobi nega qabul qilinmaganini bilishi kerak.
  if (ruscha) {
    return {
      manba,
      matn: [
        salom ? 'Здравствуйте!' : null,
        sabab ? `Не получилось принять ответ: ${sababRu(sabab)}` : null,
        tayyor ? tayyor.ru : sabab ? null : 'На этот вопрос сейчас точно не отвечу — я веду вас по шагам.',
        `Сейчас вопрос: «${savol}»`,
      ].filter(Boolean).join(' '),
    };
  }
  return {
    manba,
    matn: [
      salom ? 'Vaalaykum assalom!' : null,
      sabab ? gap(sabab) : null,
      tayyor ? tayyor.uz : sabab ? null : 'Bu savolingizga hozir aniq javob bera olmayman — men sizni yoʻl boʻyicha olib boryapman.',
      `Hozirgi savol: «${savol}»`,
    ].filter(Boolean).join(' '),
  };
}

/**
 * Menejer javobi: LLM (tekshiruv bilan) yoki shablon.
 *
 * LLM endi mijozni "koʻradi" (nazoratchi, 2026-10-13): bilim (`bilim.ts`),
 * mijoz holati va oxirgi xabarlar (`yordamchi.ts`, shaxsiy maʼlumotsiz).
 * Raqam faqat shulardan: darvoza oʻtkazmasa — sababi bilan BIR MARTA qayta
 * soʻraladi (ilgari darrov "aniq javob bera olmayman" shabloni chiqardi).
 *
 * Javobi bazada bor savol: `erkinAvval` oʻchiq boʻlsa LLM chaqirilmaydi
 * (bepul limit); yoqilgan boʻlsa bazaviy javob LLM ga `tayyor` boʻlib
 * beriladi — u uni mijoz tilida, doʻstona va batafsil aytadi. LLM yiqilsa
 * yoki darvozadan oʻtmasa — bazaviy javob oʻzi ketadi.
 *
 * Bazadagi raqam bilan javob (`erkin-malumot.ts`, 2026-10-14) — tayyor javob
 * boʻlmasa, savol turi mos kelsa (soliq, bank, eng koʻp sotiladigan, «X sotish
 * osonmi», raqobat) — kod bazadan oʻqiydi; LLM ga ham `tayyor` boʻlib beriladi.
 */
async function erkinJavob(
  d: SuhbatBogliqliklari, s: JoriySavol['savol'], matn: string, sabab: string | null,
  h: YolHolati, xabarlar: ReadonlyArray<{ rol: string; matn: string; savolId?: string | null }>,
): Promise<ErkinNatija> {
  const t = tushunishUchun(matn);
  const malumot = sabab ? null : await bazadanMalumot(d, t, h);
  const shablon = erkinShablon(s, matn, sabab, h, d.tarifCheklovi, malumot);
  // Ism va telefon savolida yozilgan matn (ism, raqam) LLM ga yuborilmaydi — kod shabloni.
  if (!d.erkinLlm || SHAXSIY_SAVOLLAR.has(s.id)) return shablon;
  const baza = bazaJavobi(t, ruschami(matn), s.id, sabab, h, d.tarifCheklovi, malumot);
  // Javobi bazada bor savol — AI birinchi rejimi oʻchiq boʻlsa LLM CHAQIRILMAYDI
  // (nazoratchi, 2026-10-13, "ha qil"): bepul Gemini limiti kunlik va kichik,
  // u bazada javobi yoʻq savollarga qolsin. Bazaviy javob aniq va manbasi bilan.
  // Rus savoliga javob faqat oʻzbekcha boʻlsa — LLM uni rus tilida aytadi (mijoz tilida).
  if (baza && !d.erkinAvval && !baza.tarjimaKerak) return shablon;
  const variantlar = s.variantlar.map((v) => v.nom);
  const holat = mijozHolati(h, s.qadam);
  const tarix = suhbatTarixi(xabarlar, h);
  // Bilim — asos va FAQAT savolga tegishli Uzum faktlari (`yordamchiBilimi`), hammasi emas.
  const bilim = yordamchiBilimi(t, d.tarifCheklovi);
  // LLM ga asl matn ketadi — mijoz yozuvida (lotin, kirill, rus) javob bersin; til aniq aytiladi.
  const til = yozuvi(matn);
  const sorov = { savol: s.matn, variantlar, xabar: matn, sabab, tayyor: baza?.matn ?? null, bilim, holat, tarix, til };
  // Raqam faqat savol, tugmalar, sabab, bilim, bazaviy javob, mijoz holati, suhbat va obunachining
  // oʻz matnidan; kafolat — taqiq.
  const manba = { matnlar: [s.matn, matn, sabab ?? '', ...variantlar, bilim, baza?.matn ?? '', holat, tarix], sonlar: [] };
  let tuzat: string | null = null;
  for (let urinish = 0; urinish < 2; urinish++) {
    const taklif: string | null = await d.erkinLlm({ ...sorov, tuzat }).catch(() => null);
    if (!taklif) return shablon;
    const tk = tekshir(taklif, manba);
    // Rus yoki kirill savolga lotincha javob — mijoz tilida emas (jonli oʻlchov, 2026-10-14).
    const tilMos: boolean = til === 'uz' || kirillUlushi(taklif) >= 0.5;
    if (tk.ok && tilMos) return { matn: taklif, manba: 'ai' };
    tuzat = [
      tk.dalilsiz.length ? `bu raqamlar faktlarda yoʻq: ${tk.dalilsiz.join(', ')}.` : null,
      tk.taqiq.length ? `taqiqlangan gap: ${tk.taqiq.join(', ')}.` : null,
      tilMos ? null : til === 'ru' ? 'javob rus tilida emas — butun javobni rus tilida yoz.' : 'javob kirill yozuvida emas — butun javobni oʻzbek kirill yozuvida yoz.',
    ].filter(Boolean).join(' ');
  }
  return shablon;
}

/**
 * Bazadagi raqam bilan javob (`erkin-malumot.ts`): tayyor javob boʻlmasa va savol turi mos
 * kelsa — kod bazadan oʻqiydi. Yiqilsa yoki matn qaytarmasa — `null` (javob yiqilmaydi).
 */
async function bazadanMalumot(d: SuhbatBogliqliklari, t: string, h: YolHolati): Promise<string | null> {
  const niyat = d.kod.erkinMalumot && !tayyorJavob(t, d.tarifCheklovi) ? malumotNiyati(t) : null;
  if (!niyat) return null;
  const m: unknown = await d.kod.erkinMalumot!(niyat, h).catch(() => null);
  return typeof m === 'string' ? m : null;
}

/** Erkin xabarni chatga yozadi: holat va qadam oʻzgarmaydi. */
async function erkinXabar(
  d: SuhbatBogliqliklari, token: string, holat: YolHolati, k0: JoriySavol, yozgan: string, sabab: string | null,
  xabarlar: ReadonlyArray<{ rol: string; matn: string; savolId?: string | null }> = [],
): Promise<SuhbatJavobi> {
  const matn = yozgan.length > ERKIN_MAX ? `${yozgan.slice(0, ERKIN_MAX)}…` : yozgan;
  const javob = await erkinJavob(d, k0.savol, matn, sabab, holat, songgiSuhbat(xabarlar));
  // Byudjet savolida summalar aytilgan boʻlsa ("80 mlnmi, 100 mlnmi?") — javobdan
  // keyin ular TUGMA boʻlib chiqadi: bittasini bossa, oʻsha summa bilan boshlanadi.
  let k1: JoriySavol = k0;
  if (k0.savol.id === 'byudjet') {
    const bor = new Set(k0.savol.variantlar.map((v) => String(v.qiymat)));
    const qoshimcha = byudjetSummalari(yozgan, usdKursi(holat))
      .filter((x) => !bor.has(String(x.som)))
      .map((x) => ({ qiymat: x.som, nom: x.usd !== null ? byudjetMatni(x.som, x.usd) : mlnMatni(x.som) }));
    if (qoshimcha.length) k1 = { ...k0, savol: { ...k0.savol, variantlar: [...qoshimcha, ...k0.savol.variantlar] } };
  }
  // Joriy savol jurnalda hali yoʻq boʻlsa — avval savolning oʻzi yoziladi. Birinchi
  // tashrifda savol `keyingi` dan chiziladi, jurnalga esa POST da tushadi: birinchi
  // savolda tayyor savol bosilsa, salomlashish matni chatdan yoʻqolardi (tayyor
  // savollar sinovi, 2026-10-13). Endi chatda: savol → mijoz savoli → javob.
  const savolBor = songgiSuhbat(xabarlar).some((x) => x.rol === 'menejer' && x.savolId === k0.savol.id);
  const yangi: SuhbatXabari[] = [
    ...(savolBor ? [] : [{ rol: 'menejer' as const, matn: k0.savol.matn, savolId: k0.savol.id }]),
    { rol: 'obunachi', matn },
    // `javob` — bu erkin javob ekani va manbasi: sahifa unga 👍/👎 qoʻyadi.
    { rol: 'menejer', matn: javob.matn, savolId: k0.savol.id, javob: { erkin: true, manba: javob.manba } },
  ];
  const qadam = joriyQadam(holat);
  const y = await d.rpc<{ xato?: string; yozildi?: number }>('so_suhbat_yoz', {
    p_token: token, p_xabarlar: yangi, p_holat: holat, p_qadam: qadam, p_profil: null,
  });
  const yozildi = y !== null && !y.xato;
  return { xabarlar: yangi, keyingi: k1, qadam, yozildi, ...(yozildi ? {} : { xato: y?.xato ?? 'jurnalga yozilmadi' }) };
}

/** Birinchi savol javobi chatda: shu turnda yozilgan ism va/yoki telefon. */
function ismTelefonMatni(oldin: YolHolati, h: YolHolati): string {
  const ism = h.javoblar['ism'];
  const telefon = h.javoblar['telefon'];
  return [
    typeof ism === 'string' && ism !== oldin.javoblar['ism'] ? ism : null,
    typeof telefon === 'string' && telefon !== oldin.javoblar['telefon'] ? telefonKorinishi(telefon) : null,
  ].filter(Boolean).join(', ');
}

function javobMatni(variantlar: ReadonlyArray<{ qiymat: string | number; nom: string }>, q: unknown): string {
  if (q === null || q === undefined) return 'Oʻtkazib yuborildi';
  // Oʻzi yozgan son ("7 mln" → 7000000) chatda guruhlangan: "7 000 000".
  const nom = (x: unknown) => variantlar.find((v) => String(v.qiymat) === String(x))?.nom
    ?? (typeof x === 'number' ? minglik(x) : String(x));
  return Array.isArray(q) ? q.map(nom).join(', ') : nom(q);
}
