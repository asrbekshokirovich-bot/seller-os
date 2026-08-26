/**
 * SellerOS API — Supabase Edge Function.
 *
 * NEGA BU YERDA. B0 darvozasi "har merge → staging ga avtomatik deploy"
 * ni talab qiladi. U ochiq qolib turgan edi, chunki Fastify uchun
 * alohida hosting hisobi kerak deb hisoblagandim.
 *
 * Aslida kerak emas: `tahlil.ts` va `sifat.ts` da bironta Fastify
 * chaqiruvi yoʻq — mantiq sof TypeScript. Shuning uchun u Supabase
 * Edge Function ichida ham ishlaydi, va Supabase allaqachon bor.
 *
 * MANBA BITTA. Bu papkadagi `shared/` va `tahlil.ts` fayllari
 * `packages/shared` va `apps/backend` dan `tayyorlash.mjs` bilan
 * koʻchiriladi. Qoʻlda tahrirlanmaydi — CI ularning bir xilligini
 * tekshiradi.
 */
import { tovarniTekshir, turkumniTekshir, xulosa } from './tahlil.ts';
import {
  FORMULA_VERSION,
  KESH_ESKI_SOAT,
  REJA_QADAMI,
  kerakliRejalar,
  kpiXulosa,
  kpilar,
  demping,
  tannarxHisobi,
  xatoniYubor,
  profilOqi,
  qadamOchiq,
  reja,
  sohalar,
  tovarlar,
  yonalishlar,
  type KpiXom,
  type TannarxKirishi,
  type NomzodJavobi,
  type ObunaXom,
  type RejaNatijasi,
  type TovarHolati,
  type TovarNomzodi,
  type TovarToliq,
  type TurkumHolati,
} from './shared/index.ts';

/** `so_tovar_royxati()` javobi. */
interface TovarJavobi {
  turkum: { categoryId: number; name: string } | null;
  royxat: TovarNomzodi[];
}

const URL_ = Deno.env.get('SUPABASE_URL') ?? '';
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function rpc<T>(nom: string, arg: unknown): Promise<T | null> {
  if (!URL_ || !KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arg),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

const javob = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

/*
 * XATO JIM OʻTMAYDI.
 *
 * Ilgari uch ichida xato otsa, Deno uni 500 qilib qaytarardi va
 * IZ HECH QAYERDA qolmasdi. Foydalanuvchi "ishlamadi" deb
 * ketardi, biz esa nima singanini bilmasdik.
 *
 * Endi xato Sentry ga yuboriladi (`SENTRY_DSN` boʻlsa) va
 * javobda hodisa raqami qaytadi — foydalanuvchi shu raqamni
 * aytsa, aynan oʻsha xatoni topamiz.
 *
 * Yuborish soʻrovni TOʻSMAYDI: `xatoniYubor` hech qachon otmaydi
 * va DSN yoʻq boʻlsa hech narsa qilmaydi.
 */
Deno.serve(async (req: Request) => {
  const yol = new URL(req.url).pathname.replace(/^\/selleros/, '') || '/';
  try {
    return await ishla(req, yol);
  } catch (xato) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await xatoniYubor(xato, {
      qism: 'edge',
      muhit: Deno.env.get('NODE_ENV') ?? 'production',
      yol,
    }, Deno.env.get('SENTRY_DSN'), fetch, new Date(), id);
    console.error(`[${id}] ${yol}:`, xato);
    return javob({
      xato: 'ichki xato',
      hodisa: id,
      izoh: 'Shu raqamni aytsangiz, aynan bu xatoni topamiz.',
    }, 500);
  }
});

async function ishla(req: Request, yol: string): Promise<Response> {

  if (yol === '/' || yol === '/health') {
    return javob({
      ok: true,
      service: 'selleros-api',
      // Jonli rejim flag bilan yoqiladi — reja, 5-boʻlim.
      live: {
        payments: Deno.env.get('PAYMENTS_LIVE') === '1',
        // Tarif cheklovi pilot davomida OʻCHIQ: toʻlov oqimi hali
        // yoʻq, yoqilsa hech kim 3-qadamga oʻta olmasdi.
        tarifCheklovi: tarifCheklovi(),
      },
    });
  }

  if (yol === '/tuzoqlar') {
    const tovarlar = await rpc<TovarHolati[]>('so_tovar_holati', {
      p_platform: 'uzum',
      p_limit: 500,
    });
    const turkumlar = await rpc<TurkumHolati[]>('so_turkum_holati', {
      p_platform: 'uzum',
    });
    if (tovarlar === null || turkumlar === null) {
      // Nol koʻrsatilmaydi: nol "tuzoq yoʻq" degan daʼvo boʻlardi.
      return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    }
    return javob({
      olchov_yoq: false,
      // `map(tovarniTekshir)` YOZMANG: `map` ikkinchi argument
      // sifatida indeksni uzatadi. Aynan shu xato bu yerda turgan
      // va mavsum filtri tovarning roʻyxatdagi oʻrniga qarab
      // baholanardi.
      tovar: xulosa(tovarlar.map((t) => tovarniTekshir(t, { oy: hozirgiOy() }))),
      turkum: xulosa(turkumlar.map(turkumniTekshir)),
    });
  }

  // 2-qadam — yoʻnalish tanlash (reja B2).
  //
  // Bu uch `apps/backend` dagi `/yonalishlar` bilan bir xil javob
  // berishi SHART: mantiq `shared/qadamlar.ts` da, ikkalasi ham
  // shuni chaqiradi. Nusxa qoʻlda tahrirlanmaydi, CI tekshiradi.
  if (yol === '/yonalishlar' && req.method === 'POST') {
    let tana: Record<string, unknown> = {};
    try {
      tana = (await req.json()) as Record<string, unknown>;
    } catch {
      // Tanasiz soʻrov — boʻsh profil bilan davom etadi.
    }
    const profil = profilOqi((tana.profil as Record<string, unknown>) ?? {});

    const kesh = await rpc<NomzodJavobi>('so_yonalish_nomzodlari', {});
    if (kesh === null) {
      // Boʻsh roʻyxat "mos yoʻnalish yoʻq" degan daʼvo boʻlardi.
      return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    }
    if (!kesh.royxat.length) {
      // Kesh hali toʻldirilmagan. Bu ham "yoʻq" emas, "hali yoʻq".
      return javob({ olchov_yoq: true, sabab: 'nomzodlar hali hisoblanmadi' }, 503);
    }

    const natija = yonalishlar(
      kesh.royxat,
      profil.budgetUzs,
      sohalar(profil),
      hozirgiOy(),
    );

    // Tavsiya JURNALGA yoziladi (reja: `recommendations`).
    //
    // Nega majburiy: "shu odamga nega aynan shu yoʻnalish
    // koʻrsatilgan?" degan savolga bir oydan keyin ham javob
    // boʻlishi kerak. Ball formulasi oʻzgaradi, chegaralar
    // oʻzgaradi — oʻsha kungi qaror esa oʻzgarmasligi kerak.
    //
    // Yozish yiqilsa TAVSIYA BARIBIR BERILADI: odam javob berdi,
    // uni jurnal nosozligi tufayli kutdirish notoʻgʻri. Lekin
    // xato jim oʻtmaydi — javobda `jurnal` maydoni koʻrsatiladi.
    const jurnal = await tavsiyaniYoz(req, 2, natija.royxat.map((y) => ({
      categoryId: y.categoryId,
      score: y.ball.value,
      breakdown: y.ball.breakdown,
      formulaVersion: y.ball.version,
    })));

    return javob({
      jurnal,
      olchov_yoq: false,
      nomzod_soni: kesh.royxat.length,
      hisoblandi: kesh.hisoblandi,
      yoshi_soat: kesh.yoshi_soat,
      kesh_eskirgan: kesh.yoshi_soat !== null && kesh.yoshi_soat > KESH_ESKI_SOAT,
      ...natija,
    });
  }

  // 3-qadam — turkum ichidagi tovarlar va miqdor (reja B2).
  //
  // Tuzoq filtrlari roʻyxatdan OLDIN ishlaydi: `block` bayrogʻli
  // tovar chiqmaydi, lekin `chiqarildi` da sababi bilan qaytadi.
  if (yol === '/tovarlar') {
    // Tarif darvozasi roʻyxatdan OLDIN: qadam yopiq boʻlsa
    // bazadan tovar tortishning maʼnosi yoʻq.
    const ruxsat = await qadamRuxsati(req.headers.get('x-sessiya'), 3);
    if (!ruxsat.ochiq) return javob(ruxsat.javob, 402);

    const turkumId = Number(new URL(req.url).searchParams.get('turkum'));
    if (!Number.isInteger(turkumId) || turkumId <= 0) {
      return javob({ xato: 'turkum — butun son boʻlishi kerak' }, 400);
    }

    const kesh = await rpc<TovarJavobi>('so_tovar_royxati', {
      p_category_external_id: turkumId,
      p_limit: 50,
    });
    if (kesh === null) {
      return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    }
    if (!kesh.royxat.length) {
      return javob({
        olchov_yoq: true,
        sabab: kesh.turkum === null ? 'bunday turkum yoʻq' : 'turkumda oʻlchangan tovar yoʻq',
      }, 404);
    }

    const natija = tovarlar(kesh.royxat, (t) => {
      const n = tovarniTekshir(t, { oy: hozirgiOy() });
      return { bayroqlar: n.bayroqlar, baholanmadi: n.baholanmadi };
    });

    const jurnal = await tavsiyaniYoz(req, 3, natija.royxat.map((t) => ({
      productId: t.nomzod.productId,
      categoryId: kesh.turkum?.categoryId ?? null,
      score: null,
      flags: t.bayroqlar,
      formulaVersion: FORMULA_VERSION,
    })));

    return javob({ olchov_yoq: false, jurnal, turkum: kesh.turkum, ...natija });
  }

  // Bayroqlarni hisoblab BAZAGA yozadi (reja: `product_flags`).
  //
  // NEGA KERAK. Filtrlar har soʻrovda xotirada ishlaydi va natijasi
  // hech qayerga saqlanmaydi. Yaʼni "shu tovar qachondan beri
  // bayroqli", "bugun nechta yangi tuzoq topildi" degan savollarga
  // javob yoʻq — jadval rejada bor, lekin 0 qator.
  //
  // Jadval boʻyicha chaqiriladi (skreyper ishi), foydalanuvchi
  // soʻrovida emas: hisob 6 000 tovarni aylanadi.
  if (yol === '/bayroqlarni-hisobla' && req.method === 'POST') {
    const tovarlar_ = await rpc<TovarToliq[]>('so_tovar_holati', {
      p_platform: 'uzum',
      p_limit: 10000,
    });
    if (tovarlar_ === null) {
      return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    }

    const oy = hozirgiOy();
    const bayroqlar = tovarlar_.flatMap((t) =>
      tovarniTekshir(t, { oy }).bayroqlar.map((b) => ({ ...b, productId: t.productId })));

    // Bayroqsiz tovar ham YOZILADI (boʻsh yozuv sifatida emas —
    // eski bayroqlari oʻchiriladi). Aks holda tuzatilgan tovarning
    // eski bayrogʻi jadvalda abadiy qolib ketardi.
    const tegilgan = tovarlar_.map((t) => ({ productId: t.productId }));

    const natija = await rpc<{ tegilgan: number; ochirildi: number; yozildi: number }>(
      'so_bayroq_yoz', { p_bayroqlar: [...bayroqlar, ...tegilgan] });
    if (natija === null) {
      return javob({ olchov_yoq: true, sabab: 'bayroqlar yozilmadi' }, 503);
    }

    return javob({ tekshirildi: tovarlar_.length, ...natija });
  }

  // ---- Sessiya va profil (reja B3, onboarding) ------------------
  //
  // Token soʻrov TANASIDA yoki SARLAVHASIDA yuriladi, manzilda
  // EMAS: manzil server jurnaliga, brauzer tarixiga va Referer
  // sarlavhasiga tushadi.
  if (yol === '/sessiya' && req.method === 'POST') {
    const s = await rpc<{ token: string; userId: string }>('so_sessiya_boshla', {});
    if (s === null) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return javob(s);
  }

  if (yol === '/profil') {
    const token = req.headers.get('x-sessiya') ?? '';
    if (!token) return javob({ xato: 'sessiya tokeni yoʻq' }, 401);

    if (req.method === 'GET') {
      const p = await rpc<{ userId?: string; javoblar?: unknown; xato?: string }>(
        'so_profil_oqi', { p_token: token });
      if (p === null) return javob({ xato: 'baza javob bermadi' }, 503);
      if (p.xato) return javob(p, 401);
      return javob(p);
    }

    if (req.method === 'POST') {
      let tana: Record<string, unknown> = {};
      try { tana = (await req.json()) as Record<string, unknown>; } catch { /* boʻsh */ }
      // Xom javob EMAS, `profilOqi` dan oʻtkazilgani yoziladi:
      // boʻsh maydon nolga yoki `false` ga aylanmasin.
      const profil = profilOqi((tana.profil as Record<string, unknown>) ?? {});
      const n = await rpc<{ saqlandi?: boolean; xato?: string }>(
        'so_profil_yoz', { p_token: token, p_javoblar: profil });
      if (n === null) return javob({ xato: 'baza javob bermadi' }, 503);
      if (n.xato) return javob(n, 401);
      return javob(n);
    }
  }

  /*
   * Usta haqidagi fikr — B2 darvozasining dalili.
   *
   * Reja: "begona 3 sotuvchi ... «mantiqli» deydi". Shu paytgacha
   * buni yozib oladigan joy yoʻq edi va gap yoʻqolardi.
   */
  if (yol === '/fikr' && req.method === 'POST') {
    const token = req.headers.get('x-sessiya') ?? '';
    if (!token) return javob({ xato: 'sessiya tokeni yoʻq' }, 401);

    let tana: Record<string, unknown> = {};
    try { tana = (await req.json()) as Record<string, unknown>; } catch { /* boʻsh */ }

    // `undefined` va `false` farqlanadi: javob bermaslik fikr EMAS.
    const mantiqli = typeof tana.mantiqli === 'boolean' ? tana.mantiqli : null;
    const n = await rpc<{ xato?: string }>('so_fikr_yoz', {
      p_token: token,
      p_mantiqli: mantiqli,
      p_matn: typeof tana.matn === 'string' ? tana.matn : null,
      p_qadam: typeof tana.qadam === 'number' ? tana.qadam : 3,
      p_turkum: typeof tana.turkum === 'number' ? tana.turkum : null,
    });
    if (n === null) return javob({ xato: 'baza javob bermadi' }, 503);
    if (n.xato) return javob(n, 401);
    return javob(n);
  }

  // B2 darvozasi holati — nechta odam "mantiqli" dedi.
  if (yol === '/darvoza') {
    const d = await rpc<unknown>('so_darvoza_b2', {});
    if (d === null) return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    return javob({ b2: d });
  }

  /*
   * Sotuv sahifasidagi "Bazamizda bugun" raqamlari.
   *
   * Ilgari ular `qurish.mjs` ichida qoʻlda yozilgan edi va bir
   * kunda 320 000 ga eskirgandi.
   */
  if (yol === '/bazamiz') {
    const b = await rpc<unknown>('so_bazamiz', {});
    if (b === null) return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    return javob({ olchov_yoq: false, bazamiz: b });
  }

  // Amaldagi tarif — UI qulfni BOSISHDAN OLDIN koʻrsatishi uchun.
  if (yol === '/tarif') {
    const n = await rejaniOl(req.headers.get('x-sessiya'));
    return javob({
      ...n,
      cheklov_yoqilgan: tarifCheklovi(),
      qadamlar: [1, 2, 3, 4, 5, 6].map((qadam) => ({
        qadam,
        // Cheklov oʻchiq boʻlsa hamma qadam ochiq — panel
        // haqiqatni koʻrsatsin, qoidani emas.
        ochiq: !tarifCheklovi() || qadamOchiq(n.reja, qadam),
        rejada_ochiq: qadamOchiq(n.reja, qadam),
      })),
    });
  }

  // KPI paneli — reja, 8-boʻlim. Oʻlchanmagan KPI NOL EMAS:
  // har qatorda `qiymat: null` va sabab turadi.
  if (yol === '/kpi') {
    const xom = await rpc<KpiXom>('so_kpi_xom', {});
    const sifat = await rpc<{
      coverage_percent: number | null; error_percent: number | null; has_data: boolean;
    }>('so_quality', { p_platform: 'uzum' });
    const qatorlar = kpilar(xom, sifat && sifat.has_data ? sifat : null);
    return javob({
      olchandi: new Date().toISOString(),
      xulosa: kpiXulosa(qatorlar),
      kpi: qatorlar,
    });
  }

  // 4-qadam — bir dona tovarning haqiqiy tannarxi (reja B4).
  //
  // Kirishlar soʻrov tanasida keladi: 1688 narxi rasm-qidiruv
  // provayderidan kelishi kerak (kalit kutilmoqda), stavkalar esa
  // huquqiy hujjatdan. Ikkalasi ham hali yoʻq, shuning uchun
  // hozircha odam kiritadi — formula esa bir joyda va testlangan.
  if (yol === '/tannarx' && req.method === 'POST') {
    let tana: Partial<TannarxKirishi> = {};
    try { tana = (await req.json()) as Partial<TannarxKirishi>; } catch { /* boʻsh */ }
    const natija = tannarxHisobi({
      sotuvNarxiSom: raqam(tana.sotuvNarxiSom),
      xitoyNarxiYuan: raqam(tana.xitoyNarxiYuan),
      kursSomPerYuan: raqam(tana.kursSomPerYuan),
      weightG: raqam(tana.weightG),
      volumeMl: raqam(tana.volumeMl),
      kargo: {
        somPerKg: raqam(tana.kargo?.somPerKg),
        somPerM3: raqam(tana.kargo?.somPerM3),
      },
      boj: {
        bojFoizi: raqam(tana.boj?.bojFoizi),
        qqsFoizi: raqam(tana.boj?.qqsFoizi),
      },
      komissiyaFoizi: raqam(tana.komissiyaFoizi),
      /*
       * Aylanma soʻrov tanasida keladi, `weightG`/`volumeMl` bilan
       * bir xil yoʻldan: uni chaqiruvchi `aylanmaKun()` yordamchisi
       * bilan oʻlchangan qoldiq va sotuvdan hisoblaydi. Formula
       * bitta joyda (`@selleros/shared`) — web, bot va kengaytma
       * uch xil aylanma chiqarmasligi kerak.
       */
      aylanmaKun: raqam(tana.aylanmaKun),
      imtiyozliSaqlash: tana.imtiyozliSaqlash === true,
    });
    /*
     * 3-tuzoq (demping) SHU YERDA baholanadi.
     *
     * Filtr yozilgan va sinalgan edi, lekin ishlab chiqarish kodi
     * uni HECH QACHON chaqirmasdi — B1 tekshiruvi ochgan naqshning
     * aynan oʻzi. Sababi tushunarli: dempingni bilish uchun toʻliq
     * tannarx kerak, u esa faqat shu uchda hisoblanadi.
     */
    const d = demping(natija.tannarx);
    return javob({
      olchov_yoq: natija.sofFoydaSom === null,
      ...natija,
      // Baholanmagani ham koʻrsatiladi: jim qolish "demping yoʻq"
      // degan daʼvo boʻlardi (QOIDALAR.md, 4-qoida).
      demping: d === null
        ? { bayroq: null, baholanmadi: null }
        : d.kind === 'baholanmadi'
          ? { bayroq: null, baholanmadi: d.missing }
          : { bayroq: d, baholanmadi: null },
    });
  }

  return javob({ xato: 'topilmadi', yol }, 404);
}

/**
 * Soʻrov tanasidan son. Boʻsh, matn yoki `NaN` — `null`.
 *
 * `Number("")` NOLGA teng, shuning uchun boʻshliqni oddiy
 * `Number()` bilan oʻgirish taqiqlanadi: nol "tekin" degan javob
 * boʻlardi va u foydani oshirib koʻrsatardi.
 */
function raqam(q: unknown): number | null {
  if (typeof q === 'number') return Number.isFinite(q) ? q : null;
  if (typeof q !== 'string' || q.trim() === '') return null;
  const n = Number(q);
  return Number.isFinite(n) ? n : null;
}

/**
 * Tarif cheklovi yoqilganmi. Standart holat — OʻCHIQ.
 *
 * Reja (B3) buni ataylab shunday qoʻygan: "pilot sinovi uchun flag
 * bilan almashtiriladigan". Yoqilishi uchun aniq `TARIF_CHEKLOVI=1`
 * kerak — tasodifan yoqilib qolmaydi.
 */
function tarifCheklovi(): boolean {
  return Deno.env.get('TARIF_CHEKLOVI') === '1';
}

/** Sessiya tokenidan amaldagi rejani chiqaradi. */
async function rejaniOl(token: string | null): Promise<RejaNatijasi> {
  if (!token) return reja(null, new Date());
  const j = await rpc<{ xato?: string; obuna: ObunaXom | null }>('so_obuna', { p_token: token });
  if (j === null || j.xato) return reja(null, new Date());
  return reja(j.obuna, new Date());
}

/** Qadam shu sessiyaga ochiqmi. Cheklov oʻchiq boʻlsa — doim ochiq. */
async function qadamRuxsati(token: string | null, qadam: number): Promise<
  { ochiq: true } | { ochiq: false; javob: Record<string, unknown> }
> {
  if (!tarifCheklovi()) return { ochiq: true };
  const n = await rejaniOl(token);
  if (qadamOchiq(n.reja, qadam)) return { ochiq: true };
  return {
    ochiq: false,
    javob: {
      cheklov: 'tarif',
      qadam,
      reja: n.reja,
      reja_sababi: n.sabab,
      ochadigan_rejalar: kerakliRejalar(qadam),
      hozir_ochiq_qadam: REJA_QADAMI[n.reja],
      izoh: 'Bu rejada bu qadam yopiq. Yoʻnalishlar (2-qadam) ochiq turadi.',
    },
  };
}

/**
 * Toshkent vaqti boʻyicha oy raqami (1–12).
 *
 * Edge Function UTC da ishlaydi. Mavsum balli oyga bogʻliq, yaʼni
 * yil oxirida server bir oy adashardi — foydalanuvchi esa
 * Oʻzbekistonda.
 */
function hozirgiOy(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      month: 'numeric',
    }).format(new Date()),
  );
}

/**
 * Tavsiyani jurnalga yozadi.
 *
 * Sessiya tokeni boʻlmasa — yozilmaydi va bu XATO EMAS: odam
 * hali sahifaga birinchi marta kirgan boʻlishi mumkin.
 * `'sessiyasiz'` deb qaytariladi, chunki "yozildi" deb koʻrsatish
 * yolgʻon boʻlardi.
 */
async function tavsiyaniYoz(
  req: Request,
  qadam: number,
  royxat: unknown[],
): Promise<string> {
  const token = req.headers.get('x-sessiya');
  if (!token) return 'sessiyasiz';
  if (!royxat.length) return 'boʻsh';

  const n = await rpc<{ yozildi?: number; xato?: string }>('so_tavsiya_yoz', {
    p_token: token,
    p_step: qadam,
    p_tavsiyalar: royxat,
  });
  if (n === null) return 'yozilmadi';
  if (n.xato) return n.xato;
  return `${n.yozildi} qator`;
}
