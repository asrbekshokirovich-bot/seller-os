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
import {
  tovarniTekshir,
  turkumBayroqlariniTarqat,
  turkumniTekshir,
  xulosa,
  type TarqalganBayroq,
  type TurkumXaritasi,
} from './tahlil.ts';
import { suhbatKodHarakatlari } from './suhbat-kod.ts';
import {
  FORMULA_VERSION,
  KESH_ESKI_SOAT,
  REJA_QADAMI,
  odamlashtir,
  suhbatBoshdan,
  suhbatOqi,
  suhbatTurn,
  kerakliRejalar,
  kpiXulosa,
  kpilar,
  demping,
  tannarxHisobi,
  rasmManzili,
  xitoyLimitHolati,
  xitoyQidiruvniBoshla,
  xitoyQidiruvniTekshir,
  XITOY_LIMIT,
  xatoniYubor,
  profilOqi,
  qadamOchiq,
  reja,
  sohalar,
  tovarlar,
  yonalishlar,
  type KpiXom,
  type TannarxKirishi,
  type XitoyLimitJavobi,
  type XitoyTovar,
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

/**
 * Turkum bayroqlarini bazadan olib tovarlarga tarqatadi.
 *
 * NEGA SHU YERDA HAM. Bu mantiq `apps/backend/src/app.ts` da ham bor,
 * lekin JADVAL AYNAN SHU UCHNI chaqiradi: `.github/workflows/skreyper.yml`
 * `functions/v1/selleros/bayroqlarni-hisobla` ga `curl` yuboradi.
 * Fastify serveri esa hech qayerda ishlamaydi.
 *
 * 2026-09-02 da aynan shu farq qimmatga tushdi: monopoliya bayrogʻi
 * `app.ts` ga ulandi, bu yerga ulanmadi, va supurish yashil tugadi —
 * `tekshirildi` noldan katta edi, demak qorovul qadam ham oʻtdi.
 * Jadvalda esa `monopoly` turi hamon BITTA ham yoʻq edi. Kod bor,
 * test yashil, jadval boʻsh (QOIDALAR.md, 8-boʻlim).
 *
 * Baza javob bermasa BOʻSH roʻyxat qaytadi, xato emas: monopoliya
 * bayrogʻi yozilmagani qolgan bayroqlarni yozishga toʻsqinlik
 * qilmasligi kerak. Lekin bu jimgina emas — javobdagi `monopoliya`
 * soni nol boʻlsa koʻrinadi.
 */
async function turkumBayroqlari(): Promise<TarqalganBayroq[]> {
  const [turkumlar, xarita] = await Promise.all([
    rpc<TurkumHolati[]>('so_turkum_holati', { p_platform: 'uzum' }),
    rpc<TurkumXaritasi[]>('so_turkum_tovarlari', { p_platform: 'uzum' }),
  ]);
  if (turkumlar === null || xarita === null) return [];
  return turkumBayroqlariniTarqat(turkumlar, xarita);
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

    // 6-tuzoq (monopoliya) TURKUM darajasida hisoblanadi, `product_flags`
    // esa TOVAR boʻyicha yoziladi. Turkum bayrogʻi oʻsha turkumdagi har
    // tovarga tarqatiladi: tovar ayblanmaydi, "kirish qiyin" deyiladi.
    //
    // Oʻlchandi (2026-09-02): 322 turkumdan 9 tasi chegaradan oʻtadi va
    // ularda jami 67 ta kuzatuv tovari bor.
    const monopoliyaBayroqlari = await turkumBayroqlari();

    // Bayroqsiz tovar ham YOZILADI (boʻsh yozuv sifatida emas —
    // eski bayroqlari oʻchiriladi). Aks holda tuzatilgan tovarning
    // eski bayrogʻi jadvalda abadiy qolib ketardi.
    const tegilgan = tovarlar_.map((t) => ({ productId: t.productId }));

    const natija = await rpc<{ tegilgan: number; ochirildi: number; yozildi: number }>(
      'so_bayroq_yoz',
      { p_bayroqlar: [...bayroqlar, ...monopoliyaBayroqlari, ...tegilgan] });
    if (natija === null) {
      return javob({ olchov_yoq: true, sabab: 'bayroqlar yozilmadi' }, 503);
    }

    return javob({
      tekshirildi: tovarlar_.length,
      monopoliya: monopoliyaBayroqlari.length,
      ...natija,
    });
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

  // Suhbat — ssenariy holat mashinasi (nazoratchi, 2026-09-25).
  // `apps/backend` dagi `/suhbat` bilan bir xil: ikkalasi `suhbatTurn`.
  if (yol === '/suhbat') {
    const token = req.headers.get('x-sessiya') ?? '';
    if (!token) return javob({ xato: 'sessiya tokeni yoʻq' }, 401);
    const kalit = Deno.env.get('GEMINI_API_KEY');
    const d = {
      rpc,
      kod: suhbatKodHarakatlari(rpc, (t) => tovarniTekshir(t, { oy: hozirgiOy() }), hozirgiOy,
        // 5-qadam: provayder kaliti env dan, sessiya — limit uchun.
        { kalit: Deno.env.get('XITOY_API_KEY') ?? null, fetch, token }),
      ...(kalit ? { llm: (m: string) => odamlashtir({ kalit, model: Deno.env.get('LLM_MODEL') }, m) } : {}),
    };
    if (req.method === 'GET') {
      const r = await suhbatOqi(d, token);
      if ('xato' in r && !('keyingi' in r)) return javob(r, r.xato === 'baza javob bermadi' ? 503 : 401);
      return javob(r);
    }
    if (req.method === 'POST') {
      let tana: Record<string, unknown> = {};
      try { tana = (await req.json()) as Record<string, unknown>; } catch { /* boʻsh */ }
      if (tana.boshdan === true) return javob(await suhbatBoshdan(d, token));
      const r = await suhbatTurn(d, token, {
        ...(typeof tana.savolId === 'string' ? { savolId: tana.savolId, javob: tana.javob } : {}),
        ...(typeof tana.matn === 'string' ? { matn: tana.matn } : {}),
      });
      if (r.xato && r.xabarlar.length === 0 && /sessiya topilmadi|baza javob bermadi/.test(r.xato)) {
        return javob(r, r.xato.includes('baza') ? 503 : 401);
      }
      return javob(r);
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
  // ───────────────────────────────────────────────────────────────
  // B4: XITOYDAN TOPISH
  // ───────────────────────────────────────────────────────────────
  //
  // NEGA BU YERDA. Bu uch `apps/backend/src/app.ts` da ham bor, lekin
  // Fastify serveri hech qayerda ishlamaydi — chaqiriladigan yagona
  // joy shu Edge Function.
  //
  // Aynan shu farq 2026-09-02 da monopoliya bayrogʻini bir kunga
  // yoʻqotgan edi, va 2026-09-05 da yana takrorlangani aniqlandi:
  // Chrome kengaytmasi 2-sentabrdan beri "Published - public" turgan,
  // lekin uning "Xitoydan top" tugmasi hech qachon ishlamagan —
  // chaqirayotgan uchi mavjud emas edi.
  //
  // PROVAYDER — Apify aktori (nazoratchi qarori, 2026-09-25;
  // `shared/xitoy.ts`). Qidiruv RASM boʻyicha: kengaytma Uzum
  // sahifasidagi tovar rasmini (`images.uzum.uz/<key>/…`) yuboradi.
  //
  // ASINXRON: qidiruv 30–90 s. `{rasmUrl}` — yurishni boshlaydi va 202
  // `{runId}` qaytaradi; `{runId, rasmUrl}` — tekshiradi: 202 kutilmoqda /
  // 200 natija / 502 xato. Kengaytma har 5 s da tekshirib turadi.
  //
  // Oqim (boshlash): sessiya → tarif darvozasi → kunlik limit (oʻlchov,
  // nol emas) → kesh → BAND QILISH (atomik, 0055) → yurish boshlash
  // (yiqilsa band qaytariladi). Oqim (tekshirish): holat → tugagan boʻlsa
  // natija → kesh yozish; RISK_CONTROL / oʻqilmagan — 502 + band qaytadi.
  if (yol === '/xitoy-qidiruv' && req.method === 'POST') {
    const token = req.headers.get('x-sessiya');
    if (!token) return javob({ xato: 'sessiya tokeni yoʻq' }, 401);

    const ruxsat = await qadamRuxsati(token, 4);
    if (!ruxsat.ochiq) return javob(ruxsat.javob, 402);

    let tana: Record<string, unknown> = {};
    try { tana = (await req.json()) as Record<string, unknown>; } catch { /* boʻsh */ }
    const productId = Number(tana.productId);
    const rasmUrl = rasmManzili(tana.rasmUrl);
    if (typeof tana.rasmUrl === 'string' && rasmUrl === null) {
      // Manzil provayderga BIZNING kalit bilan ketadi va kesh kaliti
      // boʻladi — faqat http(s), 2048 belgigacha.
      return javob({ xato: 'rasmUrl http(s):// bilan boshlanishi va 2048 belgidan oshmasligi kerak' }, 400);
    }
    const runId = typeof tana.runId === 'string' && /^[A-Za-z0-9]{8,64}$/.test(tana.runId) ? tana.runId : null;
    if (typeof tana.runId === 'string' && runId === null) return javob({ xato: 'runId notoʻgʻri' }, 400);
    if (runId === null && !Number.isInteger(productId) && !rasmUrl) {
      return javob({ xato: 'productId yoki rasmUrl kerak' }, 400);
    }

    const n = await rejaniOl(token);
    // Sanoq — OʻLCHOV. Kelmasa (baza yoʻq, sessiya notoʻgʻri) bu "nol
    // ishlatilgan" EMAS — toʻxtaymiz. Ilgari `?? 0` edi: notoʻgʻri token
    // bilan ham pullik provayder chaqirilardi (tekshiruv, 2026-09-25).
    const limitH = xitoyLimitHolati(await rpc<XitoyLimitJavobi>('so_xitoy_limit', { p_token: token }), n.reja);
    if (!limitH.ok) return javob({ xato: limitH.xato }, limitH.kod);
    const provayderKaliti = Deno.env.get('XITOY_API_KEY');

    // ---- TEKSHIRISH: boshlangan yurish tugadimi.
    if (runId !== null) {
      if (!provayderKaliti) return javob({ xato: 'provayder kaliti yoʻq' }, 503);
      const t = await xitoyQidiruvniTekshir({ kalit: provayderKaliti, fetch }, runId);
      if (t.holat === 'kutilmoqda') {
        return javob({ kutilmoqda: true, runId, runHolati: t.runHolati, limit: limitH.natija }, 202);
      }
      if (t.holat === 'xato') {
        // Yurish YAKUNIY yiqilgan boʻlsa band qaytariladi (Apify ham
        // pul olmaydi). Tarmoq/API xatosi — qayta tekshirish mumkin,
        // band qoladi.
        const yakuniy = t.runHolati !== null;
        if (yakuniy) await rpc('so_xitoy_limit', { p_token: token, p_qaytar: true });
        return javob({
          natijalar: [], manba: null, keshdan: false, limit: limitH.natija,
          xato: `provayder: ${t.xato}`, qaytaUrinish: !yakuniy,
        }, 502);
      }
      const rasm = t.rasmlar.find((r) => rasmUrl !== null && r.rasmUrl === rasmUrl) ?? t.rasmlar[0];
      if (rasm === undefined || rasm.xato !== null) {
        // RISK_CONTROL, oʻqilmagan kartalar yoki natijasiz yurish —
        // qidiruv BOʻLMADI: band qaytadi, kesh yozilmaydi.
        await rpc('so_xitoy_limit', { p_token: token, p_qaytar: true });
        return javob({
          natijalar: [], manba: null, keshdan: false, limit: limitH.natija,
          xato: `provayder: ${rasm?.xato ?? 'yurish natijasiz tugadi'}`, qaytaUrinish: false,
        }, 502);
      }
      // Qidiruv BOʻLDI: kesh. Boʻsh natija ham keshlanadi — u javob.
      await rpc('so_xitoy_kesh_yoz', {
        p_rasm_hash: rasmUrl ?? rasm.rasmUrl, p_natijalar: rasm.natijalar, p_manba: '1688',
      });
      return javob({
        natijalar: rasm.natijalar,
        manba: '1688',
        keshdan: false,
        jami: rasm.jami,
        tashlandi: rasm.tashlandi,
        limit: limitH.natija,
        ...(rasm.natijalar.length === 0 ? { izoh: '1688 bu rasmga oʻxshash tovar bermadi.' } : {}),
        ...(rasm.tashlandi > 0 ? { izoh_tashlandi: `${rasm.tashlandi} ta karta oʻqilmadi va koʻrsatilmadi.` } : {}),
      });
    }

    // ---- BOSHLASH
    const limitNatija = limitH.natija;
    if (!limitNatija.ruxsat) {
      return javob({
        xato: limitNatija.sabab === 'umumiy' ? 'umumiy kunlik limit tugadi' : 'kunlik limit tugadi',
        ...limitNatija,
        reja: n.reja,
      }, 429);
    }

    // Keshdan izlash. Rasm berilmasa tovar id si kalit boʻladi.
    const rasmHash = rasmUrl ?? `uzum:${productId}`;
    const kesh = await rpc<{ topildi: boolean; natijalar?: XitoyTovar[]; manba?: string }>(
      'so_xitoy_kesh_ol', { p_rasm_hash: rasmHash },
    );
    if (kesh?.topildi && kesh.natijalar) {
      return javob({
        natijalar: kesh.natijalar,
        manba: kesh.manba,
        keshdan: true,
        limit: limitNatija,
        // Keshdagi boʻsh roʻyxat ham JAVOB — sababi bilan.
        ...(kesh.natijalar.length === 0 ? { izoh: '1688 bu rasmga oʻxshash tovar bermadi (72 soatlik keshdan).' } : {}),
      });
    }

    // `izoh` ATAYLAB qaytariladi: boʻsh roʻyxatni "Xitoyda oʻxshashi
    // yoʻq" deb oʻqish mumkin edi, holbuki hech kim qidirmagan.
    if (!provayderKaliti) {
      return javob({
        natijalar: [], manba: null, keshdan: false, limit: limitNatija,
        izoh: 'Qidiruv provayderi hali ulanmagan — kalit kutilmoqda.',
      });
    }
    if (!rasmUrl) {
      return javob({
        natijalar: [], manba: null, keshdan: false, limit: limitNatija,
        izoh: 'Tovar rasmi kelmadi — qidiruv rasm boʻyicha ishlaydi. Sahifani yangilab qayta urinib koʻring.',
      });
    }

    // BAND QILISH — yurishdan OLDIN, bazada atomik (0055). Poyga: bir
    // vaqtda kelgan soʻrovlardan faqat limit ichidagisi oʻtadi.
    const band = xitoyLimitHolati(await rpc<XitoyLimitJavobi>('so_xitoy_limit', {
      p_token: token, p_oshir: true, p_limit: limitNatija.limit, p_umumiy_limit: XITOY_LIMIT.jamiKunlik,
    }), n.reja);
    if (!band.ok) return javob({ xato: band.xato }, band.kod);
    if (!band.ruxsat) {
      return javob({
        xato: band.natija.umumiy !== null && band.natija.umumiy.ishlatilgan >= band.natija.umumiy.limit
          ? 'umumiy kunlik limit tugadi' : 'kunlik limit tugadi',
        ...band.natija,
        reja: n.reja,
      }, 429);
    }

    const b = await xitoyQidiruvniBoshla({ kalit: provayderKaliti, fetch }, { rasmlar: [rasmUrl] });
    if (b.runId === null) {
      await rpc('so_xitoy_limit', { p_token: token, p_qaytar: true });
      return javob({
        natijalar: [], manba: null, keshdan: false, limit: limitNatija,
        xato: `provayder: ${b.xato}`, qaytaUrinish: false,
      }, 502);
    }
    return javob({
      kutilmoqda: true, runId: b.runId, rasmUrl, limit: band.natija,
      izoh: '1688 da qidirilmoqda — odatda 1–2 daqiqa. Natija tayyor boʻlgach shu yerda koʻrinadi.',
    }, 202);
  }

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
