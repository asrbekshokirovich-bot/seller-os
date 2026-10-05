/**
 * Suhbatning KOD HARAKATLARI — 2, 3, 4-qadam hisoblari.
 *
 * `suhbat.ts` (shared) bu uchta funksiyani chaqiradi; ular deterministik
 * va LLM siz ishlaydi. Mantiq `/yonalishlar`, `/tovarlar`, `/tannarx`
 * uchlari bilan BIR XIL bo'lishi shart — ular ham shu shared
 * funksiyalarni chaqiradi. Farq faqat shaklda: uch HTTP javob beradi,
 * bu esa holatga yoziladigan natija.
 *
 * Bu fayl `tahlil.ts` kabi Edge Function ga KO'CHIRILADI
 * (`supabase/functions/tayyorlash.mjs`). Shuning uchun unda Fastify ham,
 * `process.env` ham yo'q — hamma narsa argument sifatida keladi.
 *
 * TANNARX 4-QADAMDA — CHEGARA NARX. Xitoy narxi hali yo'q (u 5-qadamda
 * keladi), shuning uchun `tannarxHisobi()` emas, `chegaraNarxi()`:
 * "shu sotuv narxi va marja bilan Xitoyda maksimum qancha?". Kargo
 * stavkasi bugun bazada YO'Q — chegara kargosiz chiqadi va bu har
 * qatorda `yetishmaydi` bilan ochiq yoziladi (QOIDALAR.md, 4-bo'lim).
 *
 * XITOY 5-QADAMDA (2026-09-25). Har tanlangan tovar uchun: rasm
 * (bazadan yoki obunachi yuborgan manzil) → 72 soatlik kesh → kunlik
 * limit (reja bo'yicha, `/xitoy-qidiruv` bilan bir xil) → provayder
 * (`xitoyQidir`) → kesh yozish + sanoq. Yuan narx CBU kursi bilan
 * so'mga o'giriladi va 4-qadam chegarasiga solishtiriladi. Kurs
 * olinmasa so'm yo'q va bu aytiladi. Uch holat ATAYLAB farqlanadi:
 * topildi / topilmadi (javob) / qidirilmadi (sabab).
 */

import {
  arzonYol,
  chegaraNarxi,
  faktlarniOqi,
  httpsManzilmi,
  kargoSomBirDona,
  kargoStavkasi,
  KARGO_KALITLARI,
  KESH_ESKI_SOAT,
  kabinetBormi,
  kursniOl,
  oylikSoliq,
  RASMIY_KALITLARI,
  rasmiyFaktlari,
  qabulFaktlari,
  QABUL_KALITLARI,
  qadoqTavsiyasi,
  apifyRunniOqi,
  runHolatiSorovi,
  runNatijasiSorovi,
  studiyaManzili,
  studiyaNomzodlari,
  deklaratsiyaQadamlari,
  HISOBOT_KALITLARI,
  hisobotFaktlari,
  hisobotMuddati,
  hisobotQamrovi,
  keyingiOyRejasi,
  kuzatuvlarniOqi,
  oyHisobi,
  oyKaliti,
  oyKunSoni,
  oyNomi,
  oyYigindisi,
  ozHolati,
  toshkentSanasi,
  partiyaRaqami,
  qaytaTovarlar,
  raqobatchiHolati,
  sotuvSignallari,
  sotuvTovarlari,
  uzumMahsulotId,
  tafsilotKeshKaliti,
  tafsilotlarniOqi,
  tafsilotSorovi,
  TAFSILOT_YURISH_MAX,
  SURAT_KALITLARI,
  suratTalablari,
  chiqishTalabgaMosmi,
  qadamOchiq,
  rasmYuklovchi,
  reja,
  tashxisMatni,
  type Flag,
  sohalar,
  tovarlar,
  uzumLogistikaSom,
  xitoyLimitHolati,
  xitoyQidiruvniBoshla,
  xitoyQidiruvniTekshir,
  XITOY_LIMIT,
  yonalishlar,
  type NomzodJavobi,
  type ObunaXom,
  type ProfilJavoblari,
  type SuhbatBogliqliklari,
  type TovarNomzodi,
  type TovarToliq,
  type BuyurtmaNatijasi,
  type BuyurtmaQatori,
  type KargoYol,
  type Kurs,
  type OchiqIshNatijasi,
  type RasmiyNatijasi,
  type RasmiyYakunNatijasi,
  type QabulQadamNatijasi,
  type QabulQatori,
  type QadoqQoidasi,
  type StudiyaKutish,
  type StudiyaNatijasi,
  type StudiyaQatori,
  type StudiyaSurati,
  type StudiyaTayyor,
  type HisobotHisobNatijasi,
  type HisobotNatijasi,
  type HisobotYakunNatijasi,
  type OzHolat,
  type SotuvNatijasi,
  type SotuvTovari,
  type YuklashNatijasi,
  type QabulYakunNatijasi,
  type XitoyLimitJavobi,
  type XitoyNatijasi,
  type XitoyQatori,
  type XitoyTaklif,
  type XitoyTovar,
  type YolHolati,
} from '@selleros/shared';

/** 5-qadam uchun tashqi narsalar — hammasi chaqiruvchidan (env, sessiya). */
export interface XitoyBogliqligi {
  /** `XITOY_API_KEY` (Apify tokeni). `null` — ulanmagan; qidiruv bo'lmaydi va shu aytiladi. */
  kalit: string | null;
  fetch: typeof fetch;
  /** Sessiya tokeni — kunlik limit va reja shu odamniki. */
  token: string;
  /** `TARIF_CHEKLOVI=1` — `/xitoy-qidiruv` bilan bir xil darvoza. */
  tarifCheklovi: boolean;
  hozir?: () => Date;
  /** 9-qadam studiyasi: Cloudflare Worker (STUDIYA_URL) va imzo kaliti (STUDIYA_KALIT). `null` — ulanmagan. */
  studiya?: { url: string | null; kalit: string | null };
}

/**
 * Kargo faktlari + USD kursi — 4-qadam (chegara) va 6-qadam (varaqa) uchun
 * bir xil manba. Fakt boʻlmasa (2026-09-28: hamkor yoʻq) `izoh` bilan
 * qaytadi; hech qayerda nol yoki taxmin paydo boʻlmaydi.
 */
async function kargoFaktlari(rpc: Rpc, f: typeof fetch | null) {
  const xom = await rpc<unknown>('so_fakt_oqi', { p_kalitlar: [...KARGO_KALITLARI] });
  const usd = f ? await kursniOl(f, 'USD') : null;
  const stavka = kargoStavkasi(faktlarniOqi(xom), usd?.somPerYuan ?? null);
  // Baza javob bermadi (masalan 0056 hali qoʻllanmagan) — bu "fakt boʻsh"
  // emas, "oʻqilmadi": izoh shuni aytadi (QOIDALAR §4, jim oʻlim yoʻq).
  if (xom === null) return { stavka: { ...stavka, izoh: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)' }, usd };
  return { stavka, usd };
}

/** Bir turnda (bitta yurishda) ko'pi bilan shuncha rasm — Edge/Vercel vaqti va xarajat uchun. */
const BIR_TURNDA_MAX = 5;

/** 9-qadam: 1688 galereya yurishini shundan uzoq kutilmaydi. */
const STUDIYA_KUTISH_MAX_MS = 5 * 60_000;

type OchiqIsh = { savolId: string; tur: 'kutyapman' | 'tekshirish' | 'tolov'; sabab: string; muddat: string | null };

/**
 * `kun` kundan keyingi sana — Toshkent vaqti (UTC+5), ISO. `kun` yoʻq —
 * `null` (muddat nomaʼlum, nol emas). UTC boʻyicha olinsa har kuni 00:00–05:00
 * da sana bir kun oldin chiqardi (tekshiruv, 2026-10-05).
 */
function muddatSana(hozir: () => Date, kun: number | null): string | null {
  if (kun === null || !Number.isFinite(kun)) return null;
  return toshkentSanasi(hozir(), kun);
}

/** Provayder sababi — "provayder: provayderga ulanib…" kabi takrorsiz. */
function provayderSababi(xato: string): string {
  return /^provayder/u.test(xato) ? xato : `provayder: ${xato}`;
}

/** Limit sababi — "limit oʻlchanmadi: … limit oʻlchanmadi" kabi takrorsiz. */
function limitSababi(xato: string): string {
  return xato.includes('limit oʻlchanmadi') ? xato : `limit oʻlchanmadi: ${xato}`;
}

/**
 * 5-qadam: 1688 yurishini shundan uzoq kutilmaydi. Odatda 30–90 s; yurish
 * navbatda (READY/RUNNING) qolib ketsa chat "odatda 1–2 daqiqa" deb abadiy
 * kutardi va javob maydoni bloklangan edi (tekshiruv, 2026-10-05).
 */
const XITOY_KUTISH_MAX_MS = 10 * 60_000;

/**
 * 8/10-qadam: varaqadagi tayyor tovarlar (varaqa boʻlmasa — tovarlar javobi),
 * qadoq tavsiyasi bilan (tovar nomi boʻyicha, taxminiy).
 */
function varaqaQatorlari(holat: YolHolati, qoidalar: QadoqQoidasi[]): { qatorlar: QabulQatori[]; jamiDona: number | null; varaqadan: boolean } {
  const bn = holat.natijalar.buyurtma as { qatorlar?: Array<{ productId: number; title: string; miqdor: number | null; holat: string }> } | undefined;
  let asos: Array<{ productId: number; title: string; miqdor: number | null }> = (bn?.qatorlar ?? [])
    .filter((q) => q.holat === 'tayyor')
    .map((q) => ({ productId: q.productId, title: q.title, miqdor: typeof q.miqdor === 'number' ? q.miqdor : null }));
  // Varaqada tayyor qator yoʻq — roʻyxat tanlangan tovarlardan; chat buni
  // "Varaqada N dona" demasligi uchun belgi qaytadi.
  const varaqadan = asos.length > 0;
  if (asos.length === 0) {
    const tanlangan = Array.isArray(holat.javoblar['tovarlar']) ? (holat.javoblar['tovarlar'] as unknown[]).map(Number).filter(Number.isInteger) : [];
    const tn = holat.natijalar.tovarlar as { royxat?: Array<{ nomzod: TovarNomzodi }> } | undefined;
    asos = tanlangan.map((id) => {
      const m = holat.javoblar[`miqdor:${id}`];
      return { productId: id, title: tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod.title ?? `#${id}`, miqdor: typeof m === 'number' && m > 0 ? m : null };
    });
  }
  const qatorlar = asos.map((q) => {
    const qoida = qadoqTavsiyasi(q.title, qoidalar);
    return { ...q, qadoq: qoida ? { tur: qoida.tur, usul: qoida.usul, belgilar: qoida.belgilar } : null };
  });
  const jamiDona = qatorlar.length && qatorlar.every((q) => q.miqdor !== null)
    ? qatorlar.reduce((sum, q) => sum + (q.miqdor ?? 0), 0) : null;
  return { qatorlar, jamiDona, varaqadan };
}

/**
 * Ochiq ishlarni yozadi (`so_ochiq_ish_yoz`); biror yozuv yiqilsa `olchov_yoq` + sabab, roʻyxat yashirilmaydi.
 * `partiya` > 1 (qayta buyurtma) — sababga partiya raqami qoʻshiladi: bir xil
 * ochiq ish ikki marta yozilmaydi, oldingi partiyaniki bilan qoʻshilib ketmasin.
 */
async function ochiqIshlarniYoz(
  rpc: Rpc, token: string, ishlarXom: OchiqIsh[], j: Record<string, unknown>, izoh: string, partiya = 1,
): Promise<QabulYakunNatijasi> {
  const ishlar = partiya > 1 ? ishlarXom.map((x) => ({ ...x, sabab: `${x.sabab} (${partiya}-partiya)` })) : ishlarXom;
  const yozildi: QabulYakunNatijasi['yozildi'] = [];
  let xato: string | null = null;
  for (const ish of ishlar) {
    const r = await rpc<{ xato?: string; id?: number; yangi?: boolean }>('so_ochiq_ish_yoz', {
      p_token: token, p_tur: ish.tur, p_sabab: ish.sabab, p_muddat: ish.muddat,
      p_props: { savolId: ish.savolId, javob: j[ish.savolId] ?? null },
    });
    if (r === null || r.xato || typeof r.id !== 'number') {
      xato = xato ?? (r?.xato ?? 'baza javob bermadi');
      yozildi.push({ tur: ish.tur, sabab: ish.sabab, muddat: ish.muddat, id: null, yangi: false });
    } else {
      yozildi.push({ tur: ish.tur, sabab: ish.sabab, muddat: ish.muddat, id: r.id, yangi: r.yangi === true });
    }
  }
  return xato === null ? { olchov_yoq: false, yozildi, izoh } : { olchov_yoq: true, sabab: xato, yozildi, izoh };
}
/** Tarmoq xatosi bilan tugagan tekshiruvlar — shundan keyin "qidirilmadi". */
const TEKSHIRUV_URINISH_MAX = 3;

/** Bitta tovar uchun 5-qadam qatori. Hamma maydon har doim to'ldiriladi. */
function xitoyQatori(
  productId: number, title: string, rasmUrl: string | null, chegaraSom: number | null, yetishmaydi: string[],
  holat: XitoyQatori['holat'], sabab: string | null, jami: number | null, takliflar: XitoyTaklif[],
  keshdan: boolean, tashlandi: number, tashxis: string | null = null,
): XitoyQatori {
  return { productId, title, rasmUrl, chegaraSom, yetishmaydi, holat, sabab, jami, takliflar, keshdan, tashlandi, tashxis };
}

/** `so_tovar_royxati()` javobi. */
interface TovarJavobi {
  turkum: { categoryId: number; name: string } | null;
  royxat: TovarNomzodi[];
}

type Rpc = <T>(nom: string, arg: unknown) => Promise<T | null>;
type Tekshir = (t: TovarToliq) => {
  bayroqlar: Flag[];
  baholanmadi: Array<{ filtr: string; missing: string[] }>;
};

export function suhbatKodHarakatlari(
  rpc: Rpc,
  tekshir: Tekshir,
  hozirgiOy: () => number,
  xitoy: XitoyBogliqligi | null = null,
): SuhbatBogliqliklari['kod'] {
  return {
    async yonalishlar(profil: Partial<ProfilJavoblari>) {
      const kesh = await rpc<NomzodJavobi>('so_yonalish_nomzodlari', {});
      if (kesh === null) return { olchov_yoq: true, sabab: 'baza javob bermadi' };
      if (!kesh.royxat.length) return { olchov_yoq: true, sabab: 'nomzodlar hali hisoblanmadi' };
      const toliq: ProfilJavoblari = {
        experience: null, familyField: null, interest: null,
        budgetUzs: profil.budgetUzs ?? null, capitalLock: null, hoursPerWeek: null,
        city: null, onlineExperience: null, hasUzumShop: profil.hasUzumShop ?? null,
        importedFromChina: null, certExperience: null, riskPreference: null,
      };
      const n = yonalishlar(kesh.royxat, toliq.budgetUzs, sohalar(toliq), hozirgiOy());
      return {
        olchov_yoq: false,
        nomzod_soni: kesh.royxat.length,
        hisoblandi: kesh.hisoblandi,
        yoshi_soat: kesh.yoshi_soat,
        kesh_eskirgan: kesh.yoshi_soat !== null && kesh.yoshi_soat > KESH_ESKI_SOAT,
        ...n,
      };
    },

    async tovarlar(categoryId: number) {
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return { olchov_yoq: true, sabab: 'yoʻnalish tanlanmagan' };
      }
      const kesh = await rpc<TovarJavobi>('so_tovar_royxati', {
        p_category_external_id: categoryId,
        p_limit: 50,
      });
      if (kesh === null) return { olchov_yoq: true, sabab: 'baza javob bermadi' };
      if (!kesh.royxat.length) {
        return {
          olchov_yoq: true,
          sabab: kesh.turkum === null ? 'bunday turkum yoʻq' : 'turkumda oʻlchangan tovar yoʻq',
        };
      }
      const n = tovarlar(kesh.royxat, tekshir);
      return { olchov_yoq: false, turkum: kesh.turkum, ...n };
    },

    async tannarx(holat: YolHolati) {
      const marja = Number(holat.javoblar['marja']);
      const tn = holat.natijalar.tovarlar as
        | { royxat?: Array<{ nomzod: TovarNomzodi & { komissiyaFoizi?: number | null; volumeMl?: number | null; weightG?: number | null } }> }
        | undefined;
      const tanlangan = Array.isArray(holat.javoblar['tovarlar'])
        ? (holat.javoblar['tovarlar'] as unknown[]).map(Number) : [];

      // Kargo — fakt stavkasi (arzon yo'l, og'irlik bo'yicha) bo'lsa chegaraga
      // kiradi; bo'lmasa `null` va `yetishmaydi` da "kargo" turadi (avvalgidek).
      const kf = await kargoFaktlari(rpc, xitoy?.fetch ?? null);
      const yol = arzonYol(kf.stavka);

      const qatorlar = tanlangan.map((id) => {
        const t = tn?.royxat?.find((x) => x.nomzod.productId === id);
        const miqdor = holat.javoblar[`miqdor:${id}`];
        const kargo = kargoSomBirDona(yol, t?.nomzod.weightG ?? null, {
          volumeMl: t?.nomzod.volumeMl ?? null, usdM3: kf.stavka.usdM3, kursUsd: kf.usd?.somPerYuan ?? null,
        });
        const n = chegaraNarxi({
          sotuvNarxiSom: t?.nomzod.narxSom ?? null,
          marjaFoizi: Number.isFinite(marja) ? marja : null,
          komissiyaFoizi: t?.nomzod.komissiyaFoizi ?? null,
          uzumLogistikaSom: uzumLogistikaSom(t?.nomzod.volumeMl ?? null),
          kargoSom: kargo?.som ?? null,
        });
        const yetishmaydi = [...n.yetishmaydi];
        // Hajm stavkasi bor, lekin tovar hajmi oʻlchanmagan — kargo faqat ogʻirlikdan, bu kamchilik.
        if (kargo !== null && !kargo.hajmHisobgaKirdi && kf.stavka.usdM3 !== null) yetishmaydi.push('kargo hajmi');
        return {
          productId: id,
          title: t?.nomzod.title ?? `#${id}`,
          sotuvNarxiSom: t?.nomzod.narxSom ?? null,
          miqdor: typeof miqdor === 'number' ? miqdor : null,
          marjaFoizi: Number.isFinite(marja) ? marja : null,
          ...n,
          yetishmaydi,
          kargoYoli: kargo === null ? null : yol?.yol ?? null,
        };
      });
      return {
        olchov_yoq: qatorlar.every((q) => q.chegaraSom === null),
        qatorlar,
        izoh: 'Chegara — Xitoyda 1 dona uchun maksimal narx, soʻmda. Yetishmagan qism roʻyxatda; u hisobga kirmagan, demak haqiqiy chegara PASTROQ.',
      };
    },

    async xitoy(holat: YolHolati): Promise<XitoyNatijasi> {
      const tanlangan = Array.isArray(holat.javoblar['tovarlar'])
        ? (holat.javoblar['tovarlar'] as unknown[]).map(Number).filter(Number.isInteger) : [];
      const tn = holat.natijalar.tovarlar as
        | { royxat?: Array<{ nomzod: TovarNomzodi & { rasmUrl?: string | null } }> } | undefined;
      const tannarx = holat.natijalar.tannarx as
        | { qatorlar?: Array<{ productId: number; chegaraSom: number | null; yetishmaydi?: string[] }> } | undefined;
      const tovar = (id: number) => tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod;
      const tannarxQatori = (id: number) => tannarx?.qatorlar?.find((x) => x.productId === id);
      const chegara = (id: number) => tannarxQatori(id)?.chegaraSom ?? null;
      const yetishmaydi = (id: number) => tannarxQatori(id)?.yetishmaydi ?? [];
      const rasm = (id: number): string | null => {
        const bazadan = tovar(id)?.rasmUrl;
        if (httpsManzilmi(bazadan)) return bazadan;
        const yuborgan = holat.javoblar[`rasm:${id}`];
        return httpsManzilmi(yuborgan) ? yuborgan.trim() : null;
      };
      const nom = (id: number) => tovar(id)?.title ?? `#${id}`;
      const IZOH = 'Takliflar 1688 dan, rasm boʻyicha (Apify). Narx yuanda provayderdan; soʻm — CBU kursi bilan. "Chegarada" — soʻmdagi narx 4-qadam chegarasidan oshmaydi; chegaraga kirmagan qism (kargo) har qatorda yozilgan. Buyurtmalar soni jami, davri yozilmagan.';
      const eski = holat.natijalar.xitoy as XitoyNatijasi | undefined;

      const qidirilmadi = (id: number, sabab: string, rasmUrl: string | null = rasm(id)) =>
        xitoyQatori(id, nom(id), rasmUrl, chegara(id), yetishmaydi(id), 'qidirilmadi', sabab, null, [], false, 0);
      const takliflarniYasa = (natijalar: XitoyTovar[], chegaraSom: number | null, kurs: XitoyNatijasi['kurs']): XitoyTaklif[] => {
        const t = natijalar.map((x) => {
          const narxSom = kurs === null ? null : Math.round(x.narxYuan * kurs.somPerYuan);
          const chegaradaMi = narxSom !== null && chegaraSom !== null ? narxSom <= chegaraSom : null;
          return { ...x, narxSom, chegaradaMi };
        });
        // Chegarada bo'lganlar oldinda, qolgani o'xshashlik tartibida. Ko'pi bilan 10 ta.
        t.sort((a, b) => Number(b.chegaradaMi === true) - Number(a.chegaradaMi === true));
        return t.slice(0, 10);
      };
      const yakun = (kurs: XitoyNatijasi['kurs'], qatorlar: XitoyQatori[], kutilmoqda: XitoyNatijasi['kutilmoqda']): XitoyNatijasi => ({
        olchov_yoq: kutilmoqda === null && (qatorlar.length === 0 || qatorlar.every((q) => q.holat === 'qidirilmadi')),
        kurs,
        qatorlar: [...qatorlar].sort((a, b) => tanlangan.indexOf(a.productId) - tanlangan.indexOf(b.productId)),
        kutilmoqda,
        izoh: IZOH,
      });

      // Tovar tanlanmagan (3-qadam oʻtkazilgan) — sabab aytiladi ("oʻlchov yoʻq" emas).
      if (tanlangan.length === 0) return { ...yakun(null, [], null), sabab: 'tovar tanlanmagan' };
      if (xitoy === null || !xitoy.kalit) {
        return yakun(null, tanlangan.map((id) => qidirilmadi(id, 'provayder kaliti yoʻq')), null);
      }
      const p = { kalit: xitoy.kalit, fetch: xitoy.fetch };
      const qaytar = () => rpc('so_xitoy_limit', { p_token: xitoy.token, p_qaytar: true });

      // ---- TEKSHIRISH: yurish boshlangan edi.
      if (eski?.kutilmoqda) {
        const k = eski.kutilmoqda;
        const t = await xitoyQidiruvniTekshir(p, k.runId, k.rasmlar.map((r) => ({ url: r.rasmUrl, sha256: r.sha256 ?? null })));
        const qatorlar = [...eski.qatorlar];
        if (t.holat === 'kutilmoqda') {
          // Cheksiz kutilmaydi: chegaradan oshsa — rostini aytamiz, bandlar qaytadi
          // (boshlanish sanasi oʻqilmasa — kutish davom etadi).
          const otdi = (xitoy.hozir ?? (() => new Date()))().getTime() - new Date(k.boshlandi).getTime();
          if (!(otdi > XITOY_KUTISH_MAX_MS)) return eski;
          for (const r of k.rasmlar) {
            await qaytar();
            qatorlar.push(qidirilmadi(r.productId, 'provayder 10 daqiqada natija bermadi', r.rasmUrl));
          }
          return yakun(eski.kurs, qatorlar, null);
        }
        if (t.holat === 'xato' && t.runHolati === null) {
          // Tarmoq/API vaqtinchalik xatosi — yurish Apify'da davom etadi;
          // bir necha marta yana kutamiz, keyin rostini aytamiz.
          const urinish = (k.urinish ?? 0) + 1;
          if (urinish <= TEKSHIRUV_URINISH_MAX) return { ...eski, kutilmoqda: { ...k, urinish } };
        }
        if (t.holat === 'xato') {
          for (const r of k.rasmlar) {
            await qaytar();
            qatorlar.push(qidirilmadi(r.productId, provayderSababi(t.xato), r.rasmUrl));
          }
          return yakun(eski.kurs, qatorlar, null);
        }
        for (const r of k.rasmlar) {
          const natija = t.rasmlar.find((x) => x.rasmUrl === r.rasmUrl);
          if (natija === undefined || natija.xato !== null) {
            // RISK_CONTROL, o'qilmagan kartalar yoki natija kelmadi — qidiruv
            // BO'LMADI: band qaytadi, kesh yozilmaydi.
            await qaytar();
            qatorlar.push(qidirilmadi(r.productId, provayderSababi(natija?.xato ?? 'bu rasm uchun natija kelmadi'), r.rasmUrl));
            continue;
          }
          // Qidiruv BO'LDI: kesh (bo'sh natija ham — u javob).
          await rpc('so_xitoy_kesh_yoz', { p_rasm_hash: r.rasmUrl, p_natijalar: natija.natijalar, p_manba: '1688' });
          const takliflar = takliflarniYasa(natija.natijalar, chegara(r.productId), eski.kurs);
          qatorlar.push(xitoyQatori(r.productId, nom(r.productId), r.rasmUrl, chegara(r.productId), yetishmaydi(r.productId),
            takliflar.length ? 'topildi' : 'topilmadi', null, natija.jami, takliflar, false, natija.tashlandi, tashxisMatni(natija.tashxis)));
        }
        return yakun(eski.kurs, qatorlar, null);
      }

      // ---- BOSHLASH
      const obuna = await rpc<{ xato?: string; obuna: ObunaXom | null }>('so_obuna', { p_token: xitoy.token });
      const r = reja(obuna?.obuna ?? null, new Date()).reja;
      if (xitoy.tarifCheklovi && !qadamOchiq(r, 4)) {
        return yakun(null, tanlangan.map((id) => qidirilmadi(id, `tarif: "${r}" rejada Xitoy qidiruvi yopiq`)), null);
      }
      // Sanoq — O'LCHOV; kelmasa qidirmaymiz (nol emas).
      const limitH = xitoyLimitHolati(await rpc<XitoyLimitJavobi>('so_xitoy_limit', { p_token: xitoy.token }), r);
      if (!limitH.ok) {
        return yakun(null, tanlangan.map((id) => qidirilmadi(id, limitSababi(limitH.xato))), null);
      }
      // Kurs — o'lchov. Olinmasa so'mga o'girilmaydi va bu aytiladi.
      const kurs = await kursniOl(xitoy.fetch);

      const qatorlar: XitoyQatori[] = [];
      const boshlanadigan: Array<{ productId: number; rasmUrl: string }> = [];
      for (const id of tanlangan) {
        const rasmUrl = rasm(id);
        if (rasmUrl === null) {
          qatorlar.push(qidirilmadi(id, 'rasm yoʻq — bazada ham, obunachidan ham kelmadi', null));
          continue;
        }
        const kesh = await rpc<{ topildi: boolean; natijalar?: XitoyTovar[] }>('so_xitoy_kesh_ol', { p_rasm_hash: rasmUrl });
        if (kesh?.topildi && Array.isArray(kesh.natijalar)) {
          const takliflar = takliflarniYasa(kesh.natijalar, chegara(id), kurs);
          qatorlar.push(xitoyQatori(id, nom(id), rasmUrl, chegara(id), yetishmaydi(id),
            takliflar.length ? 'topildi' : 'topilmadi', null, kesh.natijalar.length, takliflar, true, 0));
          continue;
        }
        if (boshlanadigan.length >= BIR_TURNDA_MAX) {
          qatorlar.push(qidirilmadi(id, `bir turnda ${BIR_TURNDA_MAX} tagacha rasm qidiriladi — qayta qidirishda davom etadi`, rasmUrl));
          continue;
        }
        // Band qilish — yurishdan OLDIN, har rasm uchun, atomik (0055).
        const band = xitoyLimitHolati(await rpc<XitoyLimitJavobi>('so_xitoy_limit', {
          p_token: xitoy.token, p_oshir: true, p_limit: limitH.natija.limit, p_umumiy_limit: XITOY_LIMIT.jamiKunlik,
        }), r);
        if (!band.ok) { qatorlar.push(qidirilmadi(id, limitSababi(band.xato), rasmUrl)); continue; }
        if (!band.ruxsat) {
          const umumiy = band.natija.umumiy !== null && band.natija.umumiy.ishlatilgan >= band.natija.umumiy.limit;
          qatorlar.push(qidirilmadi(id, `kunlik limit tugadi (${umumiy ? `umumiy ${band.natija.umumiy!.limit}` : `${band.natija.limit} ta, "${r}" rejasi`})`, rasmUrl));
          continue;
        }
        boshlanadigan.push({ productId: id, rasmUrl });
      }
      if (boshlanadigan.length === 0) return yakun(kurs, qatorlar, null);

      // Rasm avval BIZ tomonda yuklanadi (Uzum CDN WebP beradi; 1688 URL dan
      // oʻzi olganda 0 natija — jonli oʻlchov 2026-09-25) va base64 bilan ketadi.
      const b = await xitoyQidiruvniBoshla(p, { rasmlar: boshlanadigan.map((x) => x.rasmUrl), yukla: rasmYuklovchi(xitoy.fetch) });
      if (b.runId === null) {
        for (const x of boshlanadigan) {
          await qaytar();
          qatorlar.push(qidirilmadi(x.productId, provayderSababi(b.xato), x.rasmUrl));
        }
        return yakun(kurs, qatorlar, null);
      }
      return yakun(kurs, qatorlar, {
        runId: b.runId,
        boshlandi: (xitoy.hozir ?? (() => new Date()))().toISOString(),
        rasmlar: boshlanadigan.map((x) => {
          const y = b.rasmlar.find((r) => r.url === x.rasmUrl);
          return { ...x, sha256: y?.sha256 ?? null, usul: y?.usul ?? 'url' };
        }),
      });
    },

    /**
     * 6-qadam — BUYURTMA VARAQASI. Tizim buyurtma BERMAYDI (1688 to'lovi
     * Xitoy to'lov tizimini talab qiladi): varaqa yasaladi, obunachi uni
     * agent/kargo hamkoriga yuboradi. Raqamlar 5-qadam tanlovidan (yuan),
     * CBU kursi (so'm), fakt stavkasi (kargo). Nazoratchi 2026-09-28:
     * hamkor yo'q — kargo `null`, izoh bilan.
     */
    async buyurtma(holat: YolHolati): Promise<BuyurtmaNatijasi> {
      const tanlangan = Array.isArray(holat.javoblar['tovarlar'])
        ? (holat.javoblar['tovarlar'] as unknown[]).map(Number).filter(Number.isInteger) : [];
      const tn = holat.natijalar.tovarlar as
        | { royxat?: Array<{ nomzod: TovarNomzodi & { weightG?: number | null; volumeMl?: number | null } }> } | undefined;
      const xn = holat.natijalar.xitoy as XitoyNatijasi | undefined;
      const tovar = (id: number) => tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod;
      const IZOH = 'Varaqa: 5-qadamda tanlangan 1688 takliflari. Yuan narxlar provayderdan, soʻm — CBU kursi bilan. Kargo — fakt stavkasi (hamkor kiritganda); boʻlmasa hisobga kirmaydi va shunday yoziladi. Tizim buyurtma bermaydi va toʻlov qilmaydi.';

      const kf = await kargoFaktlari(rpc, xitoy?.fetch ?? null);
      const cny: Kurs | null = xn?.kurs
        ? { somPerYuan: xn.kurs.somPerYuan, valyuta: 'CNY', sana: xn.kurs.sana, manba: 'CBU' }
        : (xitoy ? await kursniOl(xitoy.fetch, 'CNY') : null);
      const yolTanlovi = holat.javoblar['kargo_yol'];
      const yol = yolTanlovi === 'avia' ? kf.stavka.avia : yolTanlovi === 'quruqlik' ? kf.stavka.quruqlik : arzonYol(kf.stavka);

      // Qayta buyurtma (partiya ≥ 2): faqat 1688 sotuvchisi maʼlum tovarlar;
      // miqdor `partiya_miqdor:` javobidan, 0 — bu safar olinmaydi (varaqaga
      // kirmaydi), oʻtkazilgan — oldingidek.
      const P = partiyaRaqami(holat);
      const qayta = P > 1 ? new Map(qaytaTovarlar(holat).map((t) => [t.productId, t])) : null;
      const miqdorOl = (id: number): number | null => {
        if (qayta !== null) {
          const j = holat.javoblar[`partiya_miqdor:${id}`];
          if (typeof j === 'number') return j > 0 ? j : 0;
          return qayta.get(id)?.oldingi ?? null;
        }
        const m = holat.javoblar[`miqdor:${id}`];
        return typeof m === 'number' && m > 0 ? m : null;
      };
      const royxat = qayta === null ? tanlangan : tanlangan.filter((id) => qayta.has(id) && miqdorOl(id) !== 0);

      const qatorlar: BuyurtmaQatori[] = royxat.map((id) => {
        const t = tovar(id);
        const title = t?.title ?? `#${id}`;
        const weightG = t?.weightG ?? null;
        const miqdor = miqdorOl(id);
        const tanlov = holat.javoblar[`xitoy_tanlov:${id}`];
        const taklif = tanlov === null || tanlov === undefined ? null
          : xn?.qatorlar?.find((q) => q.productId === id)?.takliflar.find((x) => String(x.sourceId) === String(tanlov)) ?? null;
        if (taklif === null) {
          return { productId: id, title, sourceId: null, xitoyTitle: null, manzil: null, miqdor, narxYuan: null, narxSom: null,
            jamiYuan: null, jamiSom: null, weightG, kargoSom: null, kargoIzoh: null, holat: 'tanlanmagan' };
        }
        const narxSom = cny === null ? null : Math.round(taklif.narxYuan * cny.somPerYuan);
        const kargo = kargoSomBirDona(yol, weightG, { volumeMl: t?.volumeMl ?? null, usdM3: kf.stavka.usdM3, kursUsd: kf.usd?.somPerYuan ?? null });
        return {
          productId: id, title, sourceId: taklif.sourceId, xitoyTitle: taklif.title, manzil: taklif.manzil, miqdor,
          narxYuan: taklif.narxYuan, narxSom,
          jamiYuan: miqdor === null ? null : Math.round(taklif.narxYuan * miqdor * 100) / 100,
          jamiSom: miqdor === null || narxSom === null ? null : narxSom * miqdor,
          weightG,
          kargoSom: kargo?.som ?? null,
          kargoIzoh: kargo === null
            ? (kf.stavka.izoh ?? (weightG === null ? 'ogʻirlik oʻlchanmagan' : 'kargo hisoblanmadi'))
            : `${kargo.asos === 'hajm' ? 'hajm' : 'ogʻirlik'} boʻyicha, ${yol?.yol ?? ''}${!kargo.hajmHisobgaKirdi && kf.stavka.usdM3 !== null ? ' (hajm hisobga kirmadi)' : ''}`,
          holat: 'tayyor',
        };
      });
      const tayyor = qatorlar.filter((q) => q.holat === 'tayyor');
      const yig = (f: (q: BuyurtmaQatori) => number | null): number | null => {
        if (tayyor.length === 0) return null;
        let s = 0;
        for (const q of tayyor) { const v = f(q); if (v === null) return null; s += v; }
        return Math.round(s * 100) / 100;
      };
      return {
        olchov_yoq: tayyor.length === 0,
        // Qayta buyurtmada roʻyxat boʻsh — sababi rost aytiladi: obunachi 0 yozganmi
        // yoki 1688 sotuvchisi maʼlum tovar umuman yoʻqmi ("0 dona" deb toʻqilmaydi).
        ...(tayyor.length === 0
          ? { sabab: royxat.length ? '1688 taklifi tanlanmagan'
            : qayta !== null && qayta.size === 0 ? '1688 sotuvchisi maʼlum tovar yoʻq'
              : tanlangan.length ? `${P}-partiyada hamma tovarga 0 dona` : 'tovar tanlanmagan' }
          : {}),
        qatorlar,
        jami: {
          yuan: yig((q) => q.jamiYuan), som: yig((q) => q.jamiSom),
          kargoSom: yig((q) => (q.kargoSom === null || q.miqdor === null ? null : q.kargoSom * q.miqdor)),
          dona: yig((q) => q.miqdor),
          tayyor: tayyor.length, tanlanmagan: qatorlar.length - tayyor.length,
        },
        kargo: kf.stavka,
        kurs: { cny, usd: kf.usd },
        izoh: P > 1 ? `${P}-partiya (qayta buyurtma). ${IZOH}` : IZOH,
      };
    },

    /** 6-qadam — "yuk kelishini kutyapman" ochiq ishi (0056). Muddat — fakt kun bo'lsa. */
    async ochiqIsh(holat: YolHolati): Promise<OchiqIshNatijasi> {
      const IZOH = 'Ochiq ish: yuk kelishini kutish. Eslatma mexanizmi hali yoʻq (BACKLOG) — kelganda oʻzingiz aytasiz.';
      if (xitoy === null) return { olchov_yoq: true, sabab: 'sessiya yoʻq', id: null, yangi: false, tur: 'kutyapman', muddat: null, izoh: IZOH };
      const bn = holat.natijalar.buyurtma as BuyurtmaNatijasi | undefined;
      const yolTanlovi = holat.javoblar['kargo_yol'] as KargoYol | undefined;
      // Yoʻl bitta boʻlsa (tanlov soʻralmagan) — oʻsha yoʻl, varaqadagidek
      // (`arzonYol`). Ilgari muddat yoʻqolardi va chat "hamkor kiritilmagan" derdi.
      const yol = yolTanlovi ?? (bn?.kargo ? arzonYol(bn.kargo)?.yol : undefined);
      const kun = yol === 'avia' ? bn?.kargo?.avia?.kun ?? null : yol === 'quruqlik' ? bn?.kargo?.quruqlik?.kun ?? null : null;
      const muddat = muddatSana(xitoy.hozir ?? (() => new Date()), kun);
      const P = partiyaRaqami(holat);
      const r = await rpc<{ xato?: string; id?: number; yangi?: boolean }>('so_ochiq_ish_yoz', {
        p_token: xitoy.token, p_tur: 'kutyapman', p_sabab: P > 1 ? `yuk kelishi (${P}-partiya)` : 'yuk kelishi', p_muddat: muddat,
        p_props: { shahar: holat.javoblar['shahar'] ?? null, kargo_yol: yolTanlovi ?? null, buyurtma_raqami: holat.javoblar['buyurtma_raqami'] ?? null, partiya: P },
      });
      if (r === null || r.xato || typeof r.id !== 'number') {
        return { olchov_yoq: true, sabab: r?.xato ?? 'baza javob bermadi', id: null, yangi: false, tur: 'kutyapman', muddat, izoh: IZOH };
      }
      return { olchov_yoq: false, id: r.id, yangi: r.yangi === true, tur: 'kutyapman', muddat, izoh: IZOH };
    },

    /**
     * 7-qadam — RASMIYLASHTIRISH faktlari (0057). Hech raqam kodda emas:
     * BHM, boj, soliq foizi, bank tariflari, Uzum rekvizitlari — `fakt` dan,
     * manba va sanasi bilan. Partiya sotuvi — 4-qadam qatorlaridan.
     */
    async rasmiy(holat: YolHolati): Promise<RasmiyNatijasi> {
      const IZOH = 'Rasmiylashtirish: raqamlar fakt jadvalidan, har biri manba va sana bilan (docs/RASMIYLASHTIRISH-FAKTLAR.md). Soliq bazasi — xaridor toʻlagan toʻliq narx, Uzum komissiyasi chegirilmaydi. Bu soliq yoki yuridik maslahat emas.';
      const xom = await rpc<unknown>('so_fakt_oqi', { p_kalitlar: [...RASMIY_KALITLARI] });
      const faktlar = rasmiyFaktlari(faktlarniOqi(xom));
      const kabinetBor = kabinetBormi(holat);
      const tn = holat.natijalar.tannarx as { qatorlar?: Array<{ sotuvNarxiSom?: number | null; miqdor?: number | null }> } | undefined;
      let partiya: number | null = tn?.qatorlar?.length ? 0 : null;
      for (const q of tn?.qatorlar ?? []) {
        if (partiya === null) break;
        if (typeof q.sotuvNarxiSom !== 'number' || typeof q.miqdor !== 'number') { partiya = null; break; }
        partiya += q.sotuvNarxiSom * q.miqdor;
      }
      const soliq = oylikSoliq(faktlar.soliq, partiya);
      const asos = { faktlar, kabinetBor, partiyaSotuvSom: partiya, soliq, izoh: IZOH };
      if (xom === null) return { olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)', ...asos };
      if (faktlar.bhmSom === null && faktlar.yatt.royxatUrl === null && faktlar.uzum.kabinetUrl === null) {
        return { olchov_yoq: true, sabab: 'rasmiylashtirish faktlari kiritilmagan (0057 qoʻllanmagan)', ...asos };
      }
      return { olchov_yoq: false, ...asos };
    },

    /**
     * 7-qadam — javoblar ochiq ish boʻladi: "keyin"/oʻtkazilgan — kutyapman
     * (muddatsiz), Uzum "kutyapman" — fakt muddati bilan, "sayt boshqacha" —
     * tekshirish (fakt eskirgan boʻlishi mumkin, nazoratchi koʻradi).
     */
    async rasmiyYakun(holat: YolHolati): Promise<RasmiyYakunNatijasi> {
      const IZOH = 'Ochiq ishlar: "keyin" — kutyapman (muddatsiz); Uzum "kutyapman" — fakt muddati bilan; "sayt boshqacha" — nazoratchi tekshiradi. Eslatma mexanizmi hali yoʻq (BACKLOG).';
      if (xitoy === null) return { olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [], izoh: IZOH };
      const rn = holat.natijalar.rasmiy as { faktlar?: { uzum?: { faollashtirishKun?: number | null } } } | undefined;
      const kun = rn?.faktlar?.uzum?.faollashtirishKun ?? null;
      type Ish = { savolId: string; tur: 'kutyapman' | 'tekshirish'; sabab: string; muddat: string | null };
      const ishlar: Ish[] = [];
      const j = holat.javoblar;
      const bor = (id: string) => Object.prototype.hasOwnProperty.call(j, id);
      const qosh = (savolId: string, boshqacha: string, keyin: string) => {
        if (!bor(savolId)) return;
        const q = j[savolId];
        if (q === 'boshqacha') ishlar.push({ savolId, tur: 'tekshirish', sabab: boshqacha, muddat: null });
        else if (q === 'keyin' || q === null) ishlar.push({ savolId, tur: 'kutyapman', sabab: keyin, muddat: null });
      };
      qosh('yatt_ochish', 'rasmiy: YATT roʻyxat sayti boshqacha', 'YATT ochilishi');
      qosh('bank_hisobi', 'rasmiy: bank shartlari boshqacha', 'bank hisobi ochilishi');
      qosh('uzum_kabinet', 'rasmiy: Uzum kabinet sayti boshqacha', 'Uzum kabineti ochilishi');
      if (bor('uzum_kabinet') && j['uzum_kabinet'] === 'kutyapman') {
        ishlar.push({ savolId: 'uzum_kabinet', tur: 'kutyapman', sabab: 'Uzum kabinet faollashuvi', muddat: muddatSana(xitoy.hozir ?? (() => new Date()), kun) });
      }
      const yozildi: RasmiyYakunNatijasi['yozildi'] = [];
      let xato: string | null = null;
      for (const ish of ishlar) {
        const r = await rpc<{ xato?: string; id?: number; yangi?: boolean }>('so_ochiq_ish_yoz', {
          p_token: xitoy.token, p_tur: ish.tur, p_sabab: ish.sabab, p_muddat: ish.muddat,
          p_props: { savolId: ish.savolId, javob: j[ish.savolId] ?? null },
        });
        if (r === null || r.xato || typeof r.id !== 'number') {
          xato = xato ?? (r?.xato ?? 'baza javob bermadi');
          yozildi.push({ tur: ish.tur, sabab: ish.sabab, muddat: ish.muddat, id: null, yangi: false });
        } else {
          yozildi.push({ tur: ish.tur, sabab: ish.sabab, muddat: ish.muddat, id: r.id, yangi: r.yangi === true });
        }
      }
      return xato === null ? { olchov_yoq: false, yozildi, izoh: IZOH } : { olchov_yoq: true, sabab: xato, yozildi, izoh: IZOH };
    },

    /**
     * 8-qadam — QABUL: faktlar (0058) + 6-qadam varaqasidan tekshiruv
     * roʻyxati; qadoq tavsiyasi tovar nomi boʻyicha (taxminiy — mos kelmasa
     * umumiy qoida, "kerak emas" emas). Varaqa boʻlmasa — tovarlar javobi.
     */
    async qabul(holat: YolHolati): Promise<QabulQadamNatijasi> {
      const IZOH = 'Qabul: Xitoydan kelgan yukni sanash va koʻzdan kechirish. Kam yoki nuqsonli boʻlsa — agentga daʼvo uchun ochiq ish. Faktlar Uzum qoʻllanmasidan (6-bob, 0058); qadoq tavsiyasi tovar nomi boʻyicha taxminiy.';
      const xom = await rpc<unknown>('so_fakt_oqi', { p_kalitlar: [...QABUL_KALITLARI] });
      const faktlar = qabulFaktlari(faktlarniOqi(xom));
      const { qatorlar, jamiDona, varaqadan } = varaqaQatorlari(holat, faktlar.qadoq);
      const natija = { faktlar, qatorlar, jamiDona, varaqadan, izoh: IZOH };
      if (xom === null) return { olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)', ...natija };
      if (faktlar.ombor.manzil === null && faktlar.qollanmaUrl === null) {
        return { olchov_yoq: true, sabab: 'qabul faktlari kiritilmagan (0058 qoʻllanmagan)', ...natija };
      }
      return { olchov_yoq: false, ...natija };
    },

    /** 8-qadam — kam/nuqsonli yuk: tekshirish ishi (agentga daʼvo, izoh bilan). */
    async qabulYakun(holat: YolHolati): Promise<QabulYakunNatijasi> {
      const IZOH = 'Ochiq ishlar: kam yoki nuqsonli yuk — tekshirish (agentga daʼvo). Eslatma mexanizmi hali yoʻq (BACKLOG).';
      if (xitoy === null) return { olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [], izoh: IZOH };
      const j = holat.javoblar;
      const ishlar: OchiqIsh[] = [];
      if (Object.prototype.hasOwnProperty.call(j, 'yuk_mos') && (j['yuk_mos'] === 'kam' || j['yuk_mos'] === 'brak')) {
        const izohXom = j['yuk_izoh'];
        const izoh = typeof izohXom === 'string' && izohXom.trim() ? ` — ${izohXom.trim()}` : '';
        ishlar.push({ savolId: 'yuk_mos', tur: 'tekshirish', sabab: `qabul: yuk ${j['yuk_mos'] === 'kam' ? 'kam keldi' : 'nuqsonli'}${izoh}`, muddat: null });
      }
      return ochiqIshlarniYoz(rpc, xitoy.token, ishlar, j, IZOH, partiyaRaqami(holat));
    },

    /**
     * 9-qadam — STUDIYA. Har tovar uchun suratlar: siz tanlagan 1688
     * taklifining oʻz galereyasi (aynan shu tovar; `offerIds` rejimi) va joy
     * qolsa oʻxshash 1688 takliflari. Internetdagi "oʻxshash" suratlar
     * OLINMAYDI — jonli sinovda (2026-09-30) boshqa tovar va brendlar chiqdi
     * (`packages/shared/src/studiya.ts`). Har surat uchun imzolangan
     * Cloudflare Worker manzili — u oq fonni oʻzi aniqlaydi.
     * ASINXRON: bitta yurish (hamma taklif) 20–60 s; `kutilmoqda` + `tekshir`.
     */
    async studiya(holat: YolHolati): Promise<StudiyaNatijasi> {
      const IZOH = 'Studiya: suratlar siz tanlagan 1688 taklifining oʻz galereyasidan (aynan shu tovar), yetmasa oʻxshash 1688 takliflaridan. Internetdagi "oʻxshash" suratlar olinmaydi — ular boshqa tovar yoki brend boʻlib chiqdi. Har biri Cloudflare da oq fonga oʻtkaziladi: foni oq boʻlsa faqat 3:4 ga moslanadi, boʻlmasa fon olib tashlanadi; tovarning oʻzi oʻzgartirilmaydi. Tizim suratni Uzumga yuklamaydi.';
      const eski = holat.natijalar.studiya as StudiyaNatijasi | undefined;
      const bn = holat.natijalar.buyurtma as BuyurtmaNatijasi | undefined;
      const xn = holat.natijalar.xitoy as XitoyNatijasi | undefined;
      const tovarlar = (bn?.qatorlar ?? []).filter((q) => q.holat === 'tayyor' && q.sourceId !== null).map((q) => {
        const takliflar = xn?.qatorlar?.find((x) => x.productId === q.productId)?.takliflar ?? [];
        const tanlov = takliflar.find((t) => String(t.sourceId) === String(q.sourceId)) ?? null;
        return { productId: q.productId, title: q.title, offerId: String(q.sourceId), tanlov, oxshash: takliflar.filter((t) => t !== tanlov) };
      });
      const xom = await rpc<unknown>('so_fakt_oqi', { p_kalitlar: [...SURAT_KALITLARI] });
      const talablar = xom === null ? null : suratTalablari(faktlarniOqi(xom));
      // Uzum talabi oshsa (masalan 1500×2000) 1200×1600 mos kelmaydi — kod aytadi.
      const chiqishMos = talablar === null ? null : chiqishTalabgaMosmi(talablar);
      const asos = xitoy?.studiya?.url ?? null;
      const imzoKaliti = xitoy?.studiya?.kalit ?? null;
      const sozlangan = asos !== null && asos !== '' && imzoKaliti !== null && imzoKaliti !== '';
      const hozir = xitoy?.hozir ?? (() => new Date());
      const tayyorlash = (productId: number, galereya: StudiyaTayyor['galereya'], sabab: string | null, rasmlar: string[] = [], video: string | null = null): StudiyaTayyor =>
        ({ productId, galereya, sabab, rasmlar, video });

      const yakunla = async (tayyor: StudiyaTayyor[]): Promise<StudiyaNatijasi> => {
        const qatorlar: StudiyaQatori[] = [];
        for (const t of tovarlar) {
          const g = tayyor.find((x) => x.productId === t.productId);
          const nomzodlar = studiyaNomzodlari({
            tanlov: t.tanlov ? { rasmUrl: t.tanlov.rasmUrl, title: t.tanlov.title } : null,
            galereya: g?.rasmlar ?? [],
            oxshash: t.oxshash.map((o) => ({ rasmUrl: o.rasmUrl, title: o.title })),
          });
          const suratlar: StudiyaSurati[] = [];
          for (const n of nomzodlar) {
            suratlar.push({ ...n, url: sozlangan ? await studiyaManzili(asos as string, imzoKaliti as string, n.asl) : null });
          }
          qatorlar.push({
            productId: t.productId, title: t.title, suratlar,
            galereya: g?.galereya ?? 'olinmadi', galereyaSabab: g ? g.sabab : 'galereya soʻralmadi', video: g?.video ?? null,
          });
        }
        const bosh = qatorlar.length === 0;
        return {
          olchov_yoq: bosh,
          ...(bosh ? { sabab: 'buyurtma varaqasida 1688 taklifi tanlangan tovar yoʻq' } : {}),
          qatorlar, talablar, sozlangan, chiqishMos, kutilmoqda: null, izoh: IZOH,
        };
      };

      // ---- tekshirish: galereya yurishi tugadimi (eski shakldagi kutish — qayta boshlanadi)
      if (eski?.kutilmoqda && Array.isArray(eski.kutilmoqda.kutilgan)) {
        const k = eski.kutilmoqda;
        const tayyor: StudiyaTayyor[] = [...k.tayyor];
        const hammasi = (galereya: StudiyaTayyor['galereya'], sabab: string) => {
          for (const x of k.kutilgan) tayyor.push(tayyorlash(x.productId, galereya, sabab));
          return yakunla(tayyor);
        };
        const kalit = xitoy?.kalit ?? null;
        if (kalit === null || xitoy === null) return hammasi('olinmadi', 'provayder kaliti yoʻq');
        const eskirdi = hozir().getTime() - new Date(k.boshlandi).getTime() > STUDIYA_KUTISH_MAX_MS;
        const f = xitoy.fetch;
        /** Provayder JSON javobi; tarmoq yoki JSON xatosi — `null`. */
        const jsonOl = async (so: ReturnType<typeof runHolatiSorovi>): Promise<unknown> => {
          try { return await (await f(so.url, so.init)).json(); } catch { return null; }
        };
        /** Vaqtinchalik xato: yurish Apify da davom etadi — 3 martagacha yana kutamiz, keyin rostini aytamiz. */
        const qayta = (sabab: string): Promise<StudiyaNatijasi> | StudiyaNatijasi => {
          const urinish = (k.urinish ?? 0) + 1;
          if (urinish <= TEKSHIRUV_URINISH_MAX && !eskirdi) return { ...eski, kutilmoqda: { ...k, urinish } };
          return hammasi('xato', sabab);
        };
        const hj = await jsonOl(runHolatiSorovi(kalit, k.runId));
        const o = hj === null ? null : apifyRunniOqi(hj);
        if (o === null || !o.ok) return qayta(o ? o.sabab : 'provayder javob bermadi');
        if (o.holat === 'READY' || o.holat === 'RUNNING') {
          return eskirdi ? hammasi('xato', 'galereya 5 daqiqada olinmadi') : eski;
        }
        if (o.holat !== 'SUCCEEDED') return hammasi('xato', `galereya yurishi yakunlanmadi (${o.holat})`);
        const ds = await jsonOl(runNatijasiSorovi(kalit, k.runId));
        if (ds === null) return qayta('provayder natijani bermadi');
        const t = tafsilotlarniOqi(ds);
        if (t.xato) return hammasi('xato', t.xato);
        for (const x of k.kutilgan) {
          const d = t.tafsilotlar.find((y) => y.offerId === x.offerId);
          if (!d) { tayyor.push(tayyorlash(x.productId, 'olinmadi', 'provayder bu taklif tafsilotini bermadi')); continue; }
          // Galereya boʻsh boʻlsa ham bu javob — keshga yoziladi (qayta pul ketmasin).
          await rpc('so_xitoy_kesh_yoz', { p_rasm_hash: tafsilotKeshKaliti(x.offerId), p_natijalar: { rasmlar: d.rasmlar, video: d.video, sifat: d.sifat }, p_manba: '1688-tafsilot' });
          tayyor.push(tayyorlash(x.productId, 'olindi', d.rasmlar.length ? null : 'taklif sahifasida qoʻshimcha surat yoʻq', d.rasmlar, d.video));
        }
        return yakunla(tayyor);
      }

      // ---- boshlash: kesh → kalit → bitta yurish (hamma taklif)
      const tayyor: StudiyaTayyor[] = [];
      const kutilgan: StudiyaKutish['kutilgan'] = [];
      for (const t of tovarlar) {
        const kesh = await rpc<{ topildi: boolean; natijalar?: unknown }>('so_xitoy_kesh_ol', { p_rasm_hash: tafsilotKeshKaliti(t.offerId) });
        const n = kesh?.topildi ? (kesh.natijalar as { rasmlar?: unknown; video?: unknown } | null) : null;
        if (n && Array.isArray(n.rasmlar)) {
          const rasmlar = n.rasmlar.filter((r): r is string => typeof r === 'string');
          tayyor.push(tayyorlash(t.productId, 'keshdan', rasmlar.length ? null : 'taklif sahifasida qoʻshimcha surat yoʻq', rasmlar, typeof n.video === 'string' ? n.video : null));
          continue;
        }
        if (xitoy === null || !xitoy.kalit) { tayyor.push(tayyorlash(t.productId, 'olinmadi', 'provayder kaliti yoʻq')); continue; }
        if (kutilgan.length >= TAFSILOT_YURISH_MAX) {
          tayyor.push(tayyorlash(t.productId, 'olinmadi', `bir yurishda ${TAFSILOT_YURISH_MAX} tagacha taklif — «Qayta qidir» bilan davom etadi`));
          continue;
        }
        kutilgan.push({ productId: t.productId, offerId: t.offerId });
      }
      if (kutilgan.length === 0 || xitoy === null || !xitoy.kalit) return yakunla(tayyor);
      try {
        const so = tafsilotSorovi(xitoy.kalit, kutilgan.map((x) => x.offerId));
        const o = apifyRunniOqi(await (await xitoy.fetch(so.url, so.init)).json());
        if (!o.ok) {
          for (const x of kutilgan) tayyor.push(tayyorlash(x.productId, 'xato', o.sabab));
          return yakunla(tayyor);
        }
        return { olchov_yoq: false, qatorlar: [], talablar, sozlangan, chiqishMos, kutilmoqda: { boshlandi: hozir().toISOString(), runId: o.runId, kutilgan, tayyor }, izoh: IZOH };
      } catch {
        for (const x of kutilgan) tayyor.push(tayyorlash(x.productId, 'xato', 'provayderga ulanib boʻlmadi'));
        return yakunla(tayyor);
      }
    },

    /**
     * 9-qadam — "yetmadi" / "keyin" → ochiq ish (kutyapman); studiya
     * chiqishi Uzum talabiga mos emas → tekshirish (nazoratchi oʻlchamni
     * oshiradi: `STUDIYA_CHIQISH` va Worker `CHIQISH`).
     */
    async studiyaYakun(holat: YolHolati): Promise<QabulYakunNatijasi> {
      const IZOH = 'Ochiq ishlar: "yetmadi" — oʻz suratlari; "keyin" — suratlar tanlovi; chiqish oʻlchami talabga mos emas — tekshirish. Eslatma mexanizmi hali yoʻq (BACKLOG).';
      if (xitoy === null) return { olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [], izoh: IZOH };
      const j = holat.javoblar;
      const ishlar: OchiqIsh[] = [];
      if ((holat.natijalar.studiya as StudiyaNatijasi | undefined)?.chiqishMos === false) {
        ishlar.push({ savolId: 'studiya_tayyor', tur: 'tekshirish', sabab: 'studiya: chiqish oʻlchami Uzum talabiga mos emas', muddat: null });
      }
      if (Object.prototype.hasOwnProperty.call(j, 'studiya_tayyor')) {
        const q = j['studiya_tayyor'];
        if (q === 'kam') ishlar.push({ savolId: 'studiya_tayyor', tur: 'kutyapman', sabab: 'studiya: oʻz suratlari (yetmadi)', muddat: null });
        else if (q === 'keyin' || q === null) ishlar.push({ savolId: 'studiya_tayyor', tur: 'kutyapman', sabab: 'studiya: suratlar tanlovi', muddat: null });
      }
      return ochiqIshlarniYoz(rpc, xitoy.token, ishlar, j, IZOH);
    },

    /** 10-qadam — YUKLASH faktlari: kartochka qoidalari (0059) + omborga topshirish (0058). */
    async yuklash(holat: YolHolati): Promise<YuklashNatijasi> {
      const IZOH = 'Yuklash: kartochka qoidalari va surat talablari Uzum qoʻllanmasi 5-bobidan, omborga topshirish — 6/14-bobdan (fakt jadvali). Kartochkani tizim yaratmaydi — kabinetda siz yaratasiz; qadoq tavsiyasi tovar nomi boʻyicha taxminiy.';
      const xom = await rpc<unknown>('so_fakt_oqi', { p_kalitlar: [...QABUL_KALITLARI, ...SURAT_KALITLARI] });
      const f = faktlarniOqi(xom);
      const faktlar = qabulFaktlari(f);
      const talablar = suratTalablari(f);
      const { qatorlar, jamiDona, varaqadan } = varaqaQatorlari(holat, faktlar.qadoq);
      const natija = { faktlar, talablar, qatorlar, jamiDona, varaqadan, izoh: IZOH };
      if (xom === null) return { olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)', ...natija };
      if (faktlar.ombor.manzil === null && talablar.kartochkaQoidalari.length === 0) {
        return { olchov_yoq: true, sabab: 'yuklash faktlari kiritilmagan (0058/0059 qoʻllanmagan)', ...natija };
      }
      return { olchov_yoq: false, ...natija };
    },

    /**
     * 10-qadam — javoblar ochiq ish boʻladi: "keyin"/oʻtkazilgan — kutyapman;
     * topshirilgan yuk — Uzum qabulini kutish (muddat faktdan); "boshqacha" —
     * nazoratchi tekshiradi (qoʻllanma yoki kabinet oʻzgargan boʻlishi mumkin).
     */
    async yuklashYakun(holat: YolHolati): Promise<QabulYakunNatijasi> {
      const IZOH = 'Ochiq ishlar: "keyin" — kutyapman; topshirilgan yuk — Uzum qabulini kutish (muddat faktdan); "boshqacha" — nazoratchi tekshiradi. Eslatma mexanizmi hali yoʻq (BACKLOG).';
      if (xitoy === null) return { olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [], izoh: IZOH };
      const yk = holat.natijalar.yuklash as { faktlar?: { muddatKunMax?: number | null } } | undefined;
      const qb = holat.natijalar.qabul as { faktlar?: { muddatKunMax?: number | null } } | undefined;
      const kun = yk?.faktlar?.muddatKunMax ?? qb?.faktlar?.muddatKunMax ?? null;
      const j = holat.javoblar;
      const bor = (id: string) => Object.prototype.hasOwnProperty.call(j, id);
      const ishlar: OchiqIsh[] = [];
      const qosh = (savolId: string, boshqacha: string | null, keyin: string) => {
        if (!bor(savolId)) return;
        const q = j[savolId];
        if (q === 'boshqacha' && boshqacha) ishlar.push({ savolId, tur: 'tekshirish', sabab: boshqacha, muddat: null });
        else if (q === 'keyin' || q === null) ishlar.push({ savolId, tur: 'kutyapman', sabab: keyin, muddat: null });
      };
      qosh('kartochka_yaratildi', 'yuklash: kabinet (kartochka) boshqacha', 'kartochka yaratish');
      qosh('qadoq_tayyor', 'yuklash: qadoq qoʻllanmasi boshqacha', 'qadoq va yorliqlar');
      qosh('yetkazish', null, 'omborga yetkazish usuli');
      qosh('taymslot', 'yuklash: yetkazma/taymslot boshqacha', 'yetkazma akti va taymslot');
      qosh('topshirildi', 'yuklash: ombor topshirish boshqacha', 'omborga topshirish');
      if (bor('topshirildi') && j['topshirildi'] === 'topshirdim') {
        ishlar.push({ savolId: 'topshirildi', tur: 'kutyapman', sabab: 'Uzum ombor qabuli', muddat: muddatSana(xitoy.hozir ?? (() => new Date()), kun) });
      }
      // Taymslot kutilmoqda — yuk hali topshirilmagan: qabul muddati bugundan
      // SANALMAYDI (toʻqilgan sana boʻlardi), topshirish kutiladi.
      if (bor('topshirildi') && j['topshirildi'] === 'kutyapman') {
        ishlar.push({ savolId: 'topshirildi', tur: 'kutyapman', sabab: 'omborga topshirish (taymslot kutilmoqda)', muddat: null });
      }
      return ochiqIshlarniYoz(rpc, xitoy.token, ishlar, j, IZOH, partiyaRaqami(holat));
    },

    /**
     * 11-qadam — SOTUV. Sotuvchining oʻz kartochkalari (havoladan) kuzatuvga
     * qoʻshiladi (`so_sotuv_kuzat`, 0061), oʻlchov oʻqiladi (`so_sotuv_holati`)
     * — raqobatchi (3-qadam tovari) narxi bilan birga. Signallar va raqamlar
     * `sotuv.ts` da; bu yerda faqat maʼlumot yigʻiladi.
     */
    async sotuv(holat: YolHolati): Promise<SotuvNatijasi> {
      const IZOH = 'Sotuv: oʻz kartochkangiz narxi, zaxirasi va sharhlari kuniga 3 marta oʻlchanadi; sotilgan dona — zaxira kamayishidan taxmin (Uzum buyurtma sonini bermaydi). Raqobatchi — 3-qadamda tanlangan Uzum tovari.';
      const hozir = xitoy?.hozir ?? (() => new Date());
      // Toshkent sanasi: "bugun" va oy UTC boʻyicha olinmaydi (1-kuni 00:00–05:00 da oy oʻtgan oy boʻlib chiqardi).
      const sana = toshkentSanasi(hozir());
      const oy = sana.slice(0, 7);
      const partiya = partiyaRaqami(holat);
      // Hamma partiyalar tovarlari: qayta buyurtmada olinmagani ham sotuvda.
      const asos = sotuvTovarlari(holat).map((t) => ({ ...t, ozId: uzumMahsulotId(holat.javoblar[`uzum_havola:${t.productId}`]) }));
      const ozIdlar = [...new Set(asos.map((a) => a.ozId).filter((x): x is number => x !== null))];
      let kuzatuv: SotuvNatijasi['kuzatuv'] = null;
      let kuzatuvXato: string | null = null;
      if (ozIdlar.length) {
        if (xitoy === null) {
          kuzatuvXato = 'sessiya yoʻq';
        } else {
          const r = await rpc<{ xato?: string; qoshildi?: number; bor?: number }>('so_sotuv_kuzat', { p_token: xitoy.token, p_external_ids: ozIdlar });
          if (r === null || r.xato) kuzatuvXato = r?.xato ?? 'baza javob bermadi';
          else kuzatuv = { qoshildi: Number(r.qoshildi ?? 0), bor: Number(r.bor ?? 0) };
        }
      }
      const idlar = [...ozIdlar, ...asos.map((a) => a.productId)];
      const xom = idlar.length ? await rpc<unknown>('so_sotuv_holati', { p_external_ids: idlar, p_kun: 45 }) : [];
      const k = kuzatuvlarniOqi(xom);
      const topish = (id: number) => k.find((x) => x.externalId === id) ?? null;
      const qatorlar: SotuvTovari[] = asos.map(({ qayta, ...a }) => ({
        ...a,
        oz: a.ozId !== null ? ozHolati(topish(a.ozId), a.ozId, oy, qayta) : null,
        raqobatchi: raqobatchiHolati(topish(a.productId), a.productId),
      }));
      const signallar = sotuvSignallari(qatorlar);
      const olchangan = qatorlar.map((q) => q.oz).filter((o): o is OzHolat => o !== null && o.holat === 'olchandi');
      const yig = (f: (o: OzHolat) => number | null): number | null => {
        const v = olchangan.map(f).filter((x): x is number => x !== null);
        return v.length ? v.reduce((sum, x) => sum + x, 0) : null;
      };
      // Biror tovar tushumi nomaʼlum (narxsiz kun) — oy tushumi ham nomaʼlum: qisman yigʻindi toʻliq summa boʻlib koʻrinmasin.
      const tushumNomalum = olchangan.some((o) => o.oyDona !== null && o.oySom === null);
      const natija: SotuvNatijasi = {
        olchov_yoq: false, sana, oy, partiya, qatorlar, signallar, kuzatuv, kuzatuvXato,
        jami: { bugunDona: yig((o) => o.bugunSotildi), oyDona: yig((o) => o.oyDona), oySom: tushumNomalum ? null : yig((o) => o.oySom) },
        izoh: IZOH,
      };
      if (xom === null) return { ...natija, olchov_yoq: true, sabab: 'oʻlchov oʻqilmadi (baza javob bermadi)' };
      if (asos.length === 0) return { ...natija, olchov_yoq: true, sabab: 'partiyada tovar yoʻq' };
      return natija;
    },

    /** 12-qadam — oy hisoboti uchun faktlar (0057, 0060) va 11-qadam oʻlchovidan taxmin. */
    async hisobot(holat: YolHolati): Promise<HisobotNatijasi> {
      const IZOH = 'Oy hisoboti: aniq summa — Uzum kabinetidagi komissioner hisobotidan (soliq hisobotining asos hujjati, qoʻllanma 3.3); oʻlchovimiz — zaxira kamayishidan taxmin. Soliq foizi va muddatlar fakt jadvalidan (0057, 0060). Bu soliq maslahati emas.';
      const xom = await rpc<unknown>('so_fakt_oqi', { p_kalitlar: [...HISOBOT_KALITLARI] });
      const faktlar = hisobotFaktlari(faktlarniOqi(xom));
      const sn = holat.natijalar.sotuv as SotuvNatijasi | undefined;
      const joriy = sn?.oy ?? oyKaliti((xitoy?.hozir ?? (() => new Date()))());
      const tanlov = holat.javoblar['hisobot_oy'];
      const oy = typeof tanlov === 'string' && /^\d{4}-\d{2}$/.test(tanlov) ? tanlov : joriy;
      // Tanlangan oy oʻlchovi qayta oʻqiladi: 62 kun — oldingi oy toʻliq kiradi.
      const ozIdlar = [...new Set((sn?.qatorlar ?? []).map((q) => q.ozId).filter((x): x is number => x !== null))];
      const tarix = ozIdlar.length ? await rpc<unknown>('so_sotuv_holati', { p_external_ids: ozIdlar, p_kun: 62 }) : [];
      const k = kuzatuvlarniOqi(tarix);
      const qatorlar = (sn?.qatorlar ?? []).map((q) => {
        const y = q.ozId !== null ? oyYigindisi(k.find((x) => x.externalId === q.ozId) ?? null, oy) : { dona: null, som: null, kun: 0 };
        return { productId: q.productId, title: q.title, oyDona: y.dona, oySom: y.som, olchovKun: y.kun };
      });
      // Qamrov: oyda necha kun oʻlchangan (joriy oy — bugungacha). Taxmin qisman boʻlsa shunday aytiladi.
      const olchovKun = qatorlar.some((q) => q.olchovKun > 0) ? Math.max(...qatorlar.map((q) => q.olchovKun)) : null;
      const bugunKun = Number((sn?.sana ?? '').slice(8, 10));
      const oyKunlari = oy === joriy && Number.isInteger(bugunKun) && bugunKun >= 1 ? bugunKun : oyKunSoni(oy);
      const yig = (f: (q: (typeof qatorlar)[number]) => number | null): number | null => {
        const v = qatorlar.map(f).filter((x): x is number => x !== null);
        return v.length ? v.reduce((s, x) => s + x, 0) : null;
      };
      // Tushumi nomaʼlum tovar bor — oy tushumi taxmini ham nomaʼlum (qisman yigʻindi emas).
      const tushumNomalum = qatorlar.some((q) => q.oyDona !== null && q.oySom === null);
      const natija = {
        oy, tugagan: oy < joriy, faktlar, olchovSotuv: tushumNomalum ? null : yig((q) => q.oySom), olchovDona: yig((q) => q.oyDona), olchovKun, oyKunlari, qatorlar, izoh: IZOH,
      };
      if (xom === null) return { olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)', ...natija };
      return { olchov_yoq: false, ...natija };
    },

    /** 12-qadam — sotuv (sotuvchi yozgan yoki taxmin), komissiya, sof, soliq, muddat, qadam kartalari. */
    async hisobotHisob(holat: YolHolati): Promise<HisobotHisobNatijasi> {
      const IZOH = 'Hisob: soliq bazasi — xaridor toʻlagan toʻliq narx (komissiya chegirilmaydi); foiz, ijtimoiy soliq va muddatlar fakt jadvalidan. Bu soliq maslahati emas — aniq qoidani soliq organi yoki buxgalter tasdiqlaydi.';
      const hn = holat.natijalar.hisobot as HisobotNatijasi | undefined;
      const faktlar = hn?.faktlar ?? hisobotFaktlari({});
      const oy = hn?.oy ?? oyKaliti((xitoy?.hozir ?? (() => new Date()))());
      const hisob = oyHisobi({ oy, kabinetSotuv: holat.javoblar['oy_sotuv'], olchovSotuv: hn?.olchovSotuv ?? null, komissiya: holat.javoblar['oy_komissiya'], f: faktlar });
      // Soliq hisobi YATT uchun — 7-qadamda boshqa shakl aytilgan boʻlsa matn shuni aytadi.
      const shakl = typeof holat.javoblar['huquqiy_shakl'] === 'string' ? holat.javoblar['huquqiy_shakl'] : null;
      return { ...hisob, tugagan: hn?.tugagan ?? true, qamrov: hn ? hisobotQamrovi(hn) : null, shakl, faktlar, qadamlar: deklaratsiyaQadamlari(hisob, faktlar), izoh: IZOH };
    },

    /**
     * 12-qadam yakuni — ochiq ishlar: deklaratsiya bajarilmagan boʻlsa ijtimoiy
     * soliq toʻlovi (muddat faktdan) va "oylik soliq hisoboti" kutyapman;
     * "sayt boshqacha" — tekshirish. Keyingi oy rejasi — hozirgi tezlikdan.
     */
    async hisobotYakun(holat: YolHolati): Promise<HisobotYakunNatijasi> {
      const IZOH = 'Ochiq ishlar: ijtimoiy soliq toʻlovi (muddat faktdan), deklaratsiya keyinga qoldirilsa — kutyapman, sayt boshqacha — tekshirish. Keyingi oy rejasi — hozirgi sotuv tezligi va zaxiradan, bashorat emas.';
      const hh = holat.natijalar.hisobot_hisob as HisobotHisobNatijasi | undefined;
      const sn = holat.natijalar.sotuv as SotuvNatijasi | undefined;
      const reja = keyingiOyRejasi(sn?.qatorlar ?? []);
      if (xitoy === null) return { olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [], reja, izoh: IZOH };
      const j = holat.javoblar;
      const bajardi = j['deklaratsiya'] === 'tayyorlaymiz' && j['deklaratsiya_qadam'] === 'bajardim';
      const ishlar: OchiqIsh[] = [];
      const oy = hh?.oy ?? '';
      // MChJ / oʻzini oʻzi band — YATT ijtimoiy soligʻi (BHM × koeffitsient)
      // toʻlov ishi boʻlib yozilmaydi: ularda soliq boshqacha.
      const yattEmas = j['huquqiy_shakl'] === 'mchj' || j['huquqiy_shakl'] === 'oz_band';
      // Hisobot muddati — faktdagi davrdan (chorak/oy); ijtimoiy soliq kuni bilan
      // almashtirilmaydi ("oylik soliq hisoboti" chorakda ham oylik edi).
      const hm = hh?.faktlar ? hisobotMuddati(oy, hh.faktlar) : { davr: oyNomi(oy), muddat: null };
      if (!bajardi) {
        if (hh && hh.soliq.ijtimoiySom !== null && !yattEmas) ishlar.push({ savolId: 'deklaratsiya', tur: 'tolov', sabab: `ijtimoiy soliq (${oyNomi(oy)})`, muddat: hh.ijtimoiyMuddat });
        ishlar.push({ savolId: 'deklaratsiya', tur: 'kutyapman', sabab: `aylanma soligʻi hisoboti (${hm.davr})`, muddat: hm.muddat });
      }
      if (j['deklaratsiya_qadam'] === 'boshqacha') ishlar.push({ savolId: 'deklaratsiya_qadam', tur: 'tekshirish', sabab: 'hisobot: soliq portali boshqacha', muddat: null });
      const y = await ochiqIshlarniYoz(rpc, xitoy.token, ishlar, j, IZOH);
      return { ...y, reja };
    },
  };
}
