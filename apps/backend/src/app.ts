import Fastify, { type FastifyInstance } from 'fastify';
import { type Sifat, holat } from './sifat.js';
import { tovarniTekshir, turkumniTekshir, xulosa } from './tahlil.js';
import { paymeCheckoutUrl, paymeWebhookTekshir, paymeWebhookParse, paymeJavob, paymeXato } from './payme.js';
import { clickCheckoutUrl, clickImzoTekshir, clickWebhookParse, clickPrepareJavob, clickCompleteJavob, CLICK_XATO, type ClickWebhookTana } from './click.js';

/** `so_tovar_royxati()` javobi. */
interface TovarJavobi {
  turkum: { categoryId: number; name: string } | null;
  royxat: TovarNomzodi[];
}
import {
  KESH_ESKI_SOAT,
  demping,
  REJA_QADAMI,
  kerakliRejalar,
  kpiXulosa,
  kpilar,
  tannarxHisobi,
  xatoniYubor,
  profilOqi,
  qadamOchiq,
  reja,
  sohalar,
  tovarlar,
  yonalishlar,
  TARIF_NARXI,
  limitTekshir,
  moqHisobi,
  type KpiXom,
  type TannarxKirishi,
  type NomzodJavobi,
  type ObunaXom,
  type RejaNatijasi,
  type TovarHolati,
  type TovarNomzodi,
  type TovarToliq,
  type TurkumHolati,
  type XitoyTovar,
} from '@selleros/shared';

/**
 * Backend — yagona kirish nuqtasi.
 *
 * Web, bot va kengaytma bazaga TO'G'RIDAN-TO'G'RI tegmaydi (reja, 5-bo'lim).
 * Hammasi shu API orqali. Sabab: tavsiya mantiqi bitta joyda tursin —
 * uch mijoz uch xil hisoblab, uch xil javob bermasin.
 */
export function build(): FastifyInstance {
  const app = Fastify({ logger: false });

  /*
   * XATO JIM OʻTMAYDI (reja, B0: Sentry).
   *
   * Fastify standart holatda 500 qaytaradi va iz faqat jurnalda
   * qoladi — jurnal esa hech kim oʻqimaydigan joy. Endi xato
   * Sentry ga ketadi va javobda hodisa raqami boʻladi.
   *
   * `SENTRY_DSN` boʻlmasa hech narsa yuborilmaydi va bu xato
   * emas: mahalliy ishlashda u yoʻq.
   */
  app.setErrorHandler(async (xato, soov, javob) => {
    const id = xatoId();
    await xatoniYubor(xato, {
      qism: 'backend',
      muhit: process.env.NODE_ENV ?? 'development',
      yol: soov.url,
    }, process.env.SENTRY_DSN, fetch, new Date(), id);
    javob.code(500).send({
      xato: 'ichki xato',
      hodisa: id,
      izoh: 'Shu raqamni aytsangiz, aynan bu xatoni topamiz.',
    });
  });

  /** Staging tirikmi — deploy darvozasi shuni so'raydi. */
  app.get('/health', async () => ({
    ok: true,
    service: 'selleros-backend',
    stage: process.env.NODE_ENV ?? 'development',
    /**
     * Jonli rejim flaglari. Reja: tashqi jarayon kutilsa ham kod
     * to'xtamaydi — sandbox/ariza rejimida ishlayveradi va jonli rejim
     * kalit kelgach FLAG bilan yoqiladi.
     */
    live: {
      payments: process.env.PAYMENTS_LIVE === '1',
      /**
       * Tarif cheklovi. Pilot davomida OʻCHIQ: toʻlov oqimi hali
       * yoʻq, yaʼni yoqilsa hech kim 3-qadamga oʻta olmasdi.
       * Qoida kodda tayyor turadi va toʻlov kelganda shu flag
       * bilan yoqiladi (reja, B3).
       */
      tarifCheklovi: tarifCheklovi(),
    },
  }));

  /**
   * Sifat paneli. Baza bilan ulanmagan boʻlsa ham javob beradi —
   * "oʻlchov yoʻq" ham javob, va uni koʻrsatish shart.
   */
  app.get('/sifat', async () => {
    const sifat = await sifatniOl();
    return { ...sifat, holat: holat(sifat) };
  });

  /**
   * Tuzoq tekshiruvi — bazadagi tovar va turkumlarni filtrlardan
   * oʻtkazadi.
   *
   * Bu uch qismning oxirgi halqasi: yigʻuvchi bazaga yozadi, baza
   * `so_tovar_holati` bilan filtr kutgan shaklga keltiradi, shu yer
   * filtrni ishlatadi. Ilgari oxirgi halqa YOʻQ edi.
   */
  app.get('/tuzoqlar', async () => {
    const tovarlar = await rpc<TovarHolati[]>('so_tovar_holati', {
      p_platform: 'uzum',
      p_limit: 200,
    });
    const turkumlar = await rpc<TurkumHolati[]>('so_turkum_holati', {
      p_platform: 'uzum',
    });

    if (tovarlar === null || turkumlar === null) {
      // Baza javob bermasa nol koʻrsatmaymiz: nol "tuzoq yoʻq" degan
      // daʼvo boʻlardi (QOIDALAR.md, 4-qoida).
      return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    }

    return {
      olchov_yoq: false,
      // `map(tovarniTekshir)` YOZMANG: `map` ikkinchi argument
      // sifatida indeksni uzatadi. Aynan shu xato bu yerda turgan
      // va mavsum filtri tovarning roʻyxatdagi oʻrniga qarab
      // baholanardi.
      tovar: xulosa(tovarlar.map((t) => tovarniTekshir(t, { oy: hozirgiOy() }))),
      turkum: xulosa(turkumlar.map(turkumniTekshir)),
    };
  });

  /**
   * 2-qadam — yoʻnalish tanlash (reja B2).
   *
   * Xom raqamlarni baza beradi (`so_yonalish_nomzodlari`), ballni
   * `@selleros/shared` hisoblaydi. Ikkiga boʻlinishi ataylab: bir xil
   * mantiq web, bot va kengaytmaga bitta joydan xizmat qiladi.
   *
   * Profil SOʻROV TANASIDA keladi, bazadan olinmaydi. Sabab: hozir
   * autentifikatsiya yoʻq va foydalanuvchini aniqlaydigan narsa yoʻq.
   * Uni "bor" deb koʻrsatish oʻrniga ochiq shunday qoldirilgan; auth
   * ulangach shu yerga `user_profiles` oʻqishi qoʻshiladi.
   */
  app.post('/yonalishlar', async (request) => {
    const tana = (request.body ?? {}) as Record<string, unknown>;
    const profil = profilOqi(
      (tana.profil as Record<string, unknown>) ?? {},
    );

    const javob = await rpc<NomzodJavobi>('so_yonalish_nomzodlari', {});
    if (javob === null) {
      // Boʻsh roʻyxat "mos yoʻnalish yoʻq" degan DAʼVO boʻlardi.
      // Baza javob bermagani boshqa narsa va shunday aytiladi.
      return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    }
    if (!javob.royxat.length) {
      // Kesh hali toʻldirilmagan. Bu ham "yoʻq" emas, "hali yoʻq".
      return { olchov_yoq: true, sabab: 'nomzodlar hali hisoblanmadi' };
    }

    const natija = yonalishlar(
      javob.royxat,
      profil.budgetUzs,
      sohalar(profil),
      hozirgiOy(),
    );

    return {
      olchov_yoq: false,
      nomzod_soni: javob.royxat.length,
      hisoblandi: javob.hisoblandi,
      yoshi_soat: javob.yoshi_soat,
      kesh_eskirgan: javob.yoshi_soat !== null && javob.yoshi_soat > KESH_ESKI_SOAT,
      ...natija,
    };
  });

  /**
   * 3-qadam — turkum ichidagi tovarlar va miqdor (reja B2).
   *
   * Tuzoq filtrlari roʻyxatdan OLDIN ishlaydi: `block` darajali
   * bayroqli tovar roʻyxatga umuman chiqmaydi, lekin `chiqarildi`
   * da sababi bilan qaytariladi — jimgina yoʻqolmaydi.
   */
  app.get('/tovarlar', async (request, javob) => {
    // Tarif darvozasi roʻyxatdan OLDIN: bepul rejada 3-qadam
    // yopiq boʻlsa, bazadan tovar tortishning maʼnosi yoʻq.
    const ruxsat = await qadamRuxsati(request.headers['x-sessiya'], 3);
    if (!ruxsat.ochiq) return javob.code(402).send(ruxsat.javob);

    const q = request.query as Record<string, string | undefined>;
    const turkumId = Number(q.turkum);
    if (!Number.isInteger(turkumId) || turkumId <= 0) {
      return { xato: 'turkum — butun son boʻlishi kerak', berilgan: q.turkum ?? null };
    }

    const xom = await rpc<TovarJavobi>('so_tovar_royxati', {
      p_category_external_id: turkumId,
      p_limit: 50,
    });
    if (xom === null) {
      return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    }
    if (!xom.royxat.length) {
      // Boʻsh roʻyxat "tovar yoʻq" degan daʼvo boʻlardi. Turkum
      // topilmagani boshqa narsa.
      return {
        olchov_yoq: true,
        sabab: xom.turkum === null ? 'bunday turkum yoʻq' : 'turkumda oʻlchangan tovar yoʻq',
      };
    }

    const natija = tovarlar(xom.royxat, (t) => {
      const n = tovarniTekshir(t, { oy: hozirgiOy() });
      return { bayroqlar: n.bayroqlar, baholanmadi: n.baholanmadi };
    });

    return { olchov_yoq: false, turkum: xom.turkum, ...natija };
  });

  /**
   * Bayroqlarni hisoblab bazaga yozadi (`product_flags`).
   *
   * Filtrlar har soʻrovda xotirada ishlaydi va natijasi saqlanmaydi.
   * Yaʼni "shu tovar qachondan beri bayroqli", "bugun nechta yangi
   * tuzoq topildi" degan savollarga javob yoʻq edi — jadval rejada
   * bor, lekin 0 qator.
   *
   * Jadval boʻyicha chaqiriladi, foydalanuvchi soʻrovida emas.
   */
  app.post('/bayroqlarni-hisobla', async () => {
    const royxat = await rpc<TovarToliq[]>('so_tovar_holati', {
      p_platform: 'uzum',
      p_limit: 10000,
    });
    if (royxat === null) {
      return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    }

    const oy = hozirgiOy();
    const bayroqlar = royxat.flatMap((t) =>
      tovarniTekshir(t, { oy }).bayroqlar.map((b) => ({ ...b, productId: t.productId })));
    // Bayroqsiz tovar ham roʻyxatga kiradi: uning eski bayroqlari
    // oʻchirilishi kerak, aks holda tuzatilgan tovarning bayrogʻi
    // jadvalda abadiy qolib ketardi.
    const tegilgan = royxat.map((t) => ({ productId: t.productId }));

    const natija = await rpc<{ tegilgan: number; ochirildi: number; yozildi: number }>(
      'so_bayroq_yoz', { p_bayroqlar: [...bayroqlar, ...tegilgan] });
    if (natija === null) {
      return { olchov_yoq: true, sabab: 'bayroqlar yozilmadi' };
    }
    return { tekshirildi: royxat.length, ...natija };
  });

  /**
   * Sessiya va profil (reja B3, onboarding).
   *
   * Token sarlavhada (`x-sessiya`) yuriladi, manzilda emas: manzil
   * server jurnaliga, brauzer tarixiga va `Referer` ga tushadi.
   */
  app.post('/sessiya', async (_soov, javob) => {
    const s = await rpc<{ token: string; userId: string }>('so_sessiya_boshla', {});
    if (s === null) return javob.code(503).send({ xato: 'sessiya ochilmadi' });
    return s;
  });

  app.get('/profil', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }
    const p = await rpc<{ xato?: string }>('so_profil_oqi', { p_token: token });
    if (p === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (p.xato) return javob.code(401).send(p);
    return p;
  });

  app.post('/profil', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }
    const tana = (request.body ?? {}) as Record<string, unknown>;
    // Xom javob EMAS, `profilOqi` dan oʻtkazilgani yoziladi.
    const profil = profilOqi((tana.profil as Record<string, unknown>) ?? {});
    const n = await rpc<{ xato?: string }>('so_profil_yoz', {
      p_token: token, p_javoblar: profil,
    });
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (n.xato) return javob.code(401).send(n);
    return n;
  });

  /**
   * Usta haqidagi fikr — B2 darvozasining dalili (reja B2).
   *
   * "Begona 3 sotuvchi «mantiqli» deydi" degan shartni tekshirish
   * uchun fikrni yozib olish kerak. Shu paytgacha u yoʻq edi.
   */
  app.post('/fikr', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }
    const tana = (request.body ?? {}) as Record<string, unknown>;
    // `undefined` va `false` farqlanadi: javob bermaslik fikr EMAS.
    const mantiqli = typeof tana.mantiqli === 'boolean' ? tana.mantiqli : null;
    const n = await rpc<{ xato?: string }>('so_fikr_yoz', {
      p_token: token,
      p_mantiqli: mantiqli,
      p_matn: typeof tana.matn === 'string' ? tana.matn : null,
      p_qadam: typeof tana.qadam === 'number' ? tana.qadam : 3,
      p_turkum: typeof tana.turkum === 'number' ? tana.turkum : null,
    });
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (n.xato) return javob.code(401).send(n);
    return n;
  });


  /**
   * Sotuv sahifasidagi "Bazamizda bugun" raqamlari.
   *
   * Ilgari ular `qurish.mjs` ichida qoʻlda yozilgan edi va bir
   * kunda 320 000 ga eskirgandi. Sahifa sarlavhasi esa "Har bir
   * raqam oʻlchangan" deb turadi — qoʻlda yozilgan raqam bilan bu
   * daʼvo yolgʻon boʻlardi.
   */
  app.get('/bazamiz', async () => {
    const b = await rpc<unknown>('so_bazamiz', {});
    // Baza javob bermasa NOL koʻrsatilmaydi: sahifa oʻzining
    // qurish paytidagi raqamlarini saqlab qoladi va sanasi
    // bilan koʻrsatadi.
    if (b === null) return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    return { olchov_yoq: false, bazamiz: b };
  });

  /** B2 darvozasi holati — nechta odam "mantiqli" dedi. */
  app.get('/darvoza', async () => {
    const d = await rpc<unknown>('so_darvoza_b2', {});
    if (d === null) return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    return { b2: d };
  });

  /**
   * Amaldagi tarif — UI qulfni bosishdan OLDIN koʻrsatishi uchun.
   *
   * "Bosdim — 402 keldi" yomon oqim: odam nima yopiqligini
   * urinib koʻrgandan keyin biladi. Shu uchi har qadam ochiqmi
   * degan savolga oldindan javob beradi.
   */
  app.get('/tarif', async (request) => {
    const n = await rejaniOl(request.headers['x-sessiya']);
    return {
      ...n,
      cheklov_yoqilgan: tarifCheklovi(),
      qadamlar: [1, 2, 3, 4, 5, 6].map((qadam) => ({
        qadam,
        // Cheklov oʻchiq boʻlsa hamma qadam ochiq — panel
        // haqiqatni koʻrsatsin, qoidani emas.
        ochiq: !tarifCheklovi() || qadamOchiq(n.reja, qadam),
        rejada_ochiq: qadamOchiq(n.reja, qadam),
      })),
    };
  });

  /**
   * KPI paneli — reja, 8-boʻlim.
   *
   * Oʻlchanmagan KPI **nol emas**: har qatorda `qiymat: null` va
   * SABAB turadi. Nol bilan boʻshni aralashtirish shu panelda eng
   * qimmat xato boʻlardi — darvozalar aynan shu raqamlarga
   * bogʻlangan (QOIDALAR.md, 4-qoida).
   */
  app.get('/kpi', async () => {
    const xom = await rpc<KpiXom>('so_kpi_xom', {});
    const sifat = await sifatniOl();
    const qatorlar = kpilar(xom, sifat.has_data ? sifat : null);
    return {
      olchandi: new Date().toISOString(),
      xulosa: kpiXulosa(qatorlar),
      kpi: qatorlar,
    };
  });

  /**
   * 4-qadam — bir dona tovarning haqiqiy tannarxi (reja B4).
   *
   * FORMULA.md, 2-boʻlim: sotuv narxi − Xitoy narxi − kargo −
   * bojxona/QQS − komissiya.
   *
   * KIRISHLAR SOʻROV TANASIDA KELADI, bazadan olinmaydi. Sabab:
   * 1688 narxi rasm-qidiruv provayderidan keladi va u hali
   * ulanmagan (kalit kutilmoqda), stavkalar esa huquqiy hujjatdan
   * olinishi kerak. Ikkalasi ham hali yoʻq.
   *
   * Ular kelgunicha uch shu koʻrinishda ishlaydi: narxni odam
   * kiritadi, hisob esa bir joyda va testlangan boʻladi. Provayder
   * ulanganda faqat kirish manbai almashadi, formula emas.
   *
   * Yetishmagan kirish NOLGA aylanmaydi — nomi bilan qaytadi.
   */
  app.post('/tannarx', async (request) => {
    const tana = (request.body ?? {}) as Partial<TannarxKirishi>;
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
     *
     * `natija.tannarx` aynan filtr kutadigan shakl.
     */
    const dempingNatijasi = demping(natija.tannarx);
    return {
      olchov_yoq: natija.sofFoydaSom === null,
      ...natija,
      // Baholanmagani ham koʻrsatiladi: jim qolish "demping yoʻq"
      // degan daʼvo boʻlardi (QOIDALAR.md, 4-qoida).
      demping: dempingNatijasi === null
        ? { bayroq: null, baholanmadi: null }
        : dempingNatijasi.kind === 'baholanmadi'
          ? { bayroq: null, baholanmadi: dempingNatijasi.missing }
          : { bayroq: dempingNatijasi, baholanmadi: null },
    };
  });

  // ───────────────────────────────────────────────────────────────
  // B3: TOʻLOV VA OBUNA
  // ───────────────────────────────────────────────────────────────

  /**
   * Toʻlovni boshlash (reja B3).
   *
   * Mijoz reja tanlaydi, tizim `payments` jadvaliga yozib provayder
   * URL ini qaytaradi. Hozir SANDBOX: haqiqiy pul yechilmaydi.
   *
   * `PAYMENTS_LIVE` flagi yoʻq boʻlsa sandbox majburiy — jonli
   * toʻlov tasodifan ishga tushmaydi.
   */
  app.post('/tolov/boshla', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }
    const tana = (request.body ?? {}) as Record<string, unknown>;
    const provayder = tana.provayder as string;
    const rejaNomi = tana.reja as string;
    if (!provayder || !['payme', 'click', 'nasiya'].includes(provayder)) {
      return javob.code(400).send({ xato: 'notanish provayder', berilgan: provayder ?? null });
    }
    if (!rejaNomi || !(rejaNomi in TARIF_NARXI)) {
      return javob.code(400).send({ xato: 'notanish reja', berilgan: rejaNomi ?? null });
    }
    const summa = TARIF_NARXI[rejaNomi]!;
    const sandbox = process.env.PAYMENTS_LIVE !== '1';

    const n = await rpc<{ xato?: string; paymentId?: string; userId?: string }>(
      'so_tolov_boshla', {
        p_token: token,
        p_provayder: provayder,
        p_reja: rejaNomi,
        p_summa: summa,
        p_sandbox: sandbox,
      },
    );
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (n.xato) return javob.code(400).send(n);

    // Provayder checkout URL yasash.
    let checkoutUrl: string | null = null;

    if (provayder === 'payme') {
      const merchantId = process.env.PAYME_MERCHANT_ID;
      if (merchantId) {
        checkoutUrl = paymeCheckoutUrl({
          merchantId,
          paymentId: Number(n.paymentId),
          summaTiyin: summa * 100,
          sandbox,
          returnUrl: process.env.RETURN_URL,
        });
      }
    } else if (provayder === 'click') {
      const serviceId = process.env.CLICK_SERVICE_ID;
      const merchantId = process.env.CLICK_MERCHANT_ID;
      if (serviceId && merchantId) {
        checkoutUrl = clickCheckoutUrl({
          serviceId,
          merchantId,
          paymentId: Number(n.paymentId),
          summaSom: summa,
          returnUrl: process.env.RETURN_URL,
        });
      }
    }

    return {
      ...n,
      summa,
      sandbox,
      checkoutUrl,
      izoh: sandbox
        ? 'Sandbox rejimi — haqiqiy pul yechilmaydi.'
        : !checkoutUrl
          ? 'Provayder kaliti sozlanmagan — checkout URL yoʻq.'
          : undefined,
    };
  });

  /**
   * Payme webhook — JSON-RPC formatida keladi (B3).
   *
   * Payme toʻlov holatini shu uchga yuboradi. Autentifikatsiya:
   * Basic Auth (Paycom:{merchantKey}).
   */
  app.post('/tolov/webhook/payme', async (request, javob) => {
    const merchantKey = process.env.PAYME_MERCHANT_KEY;
    if (!merchantKey) {
      return javob.code(503).send({ xato: 'PAYME_MERCHANT_KEY sozlanmagan' });
    }

    const authHeader = request.headers.authorization;
    if (!paymeWebhookTekshir(authHeader, merchantKey)) {
      return javob.code(401).send(paymeXato(null, -32504, 'Autentifikatsiya xatosi'));
    }

    const tana = (request.body ?? {}) as Record<string, unknown>;
    const parsed = paymeWebhookParse(tana);
    if (!parsed) {
      return javob.send(paymeXato(tana.id, -32600, 'Soʻrov formati notoʻgʻri'));
    }

    // CreateTransaction va CheckPerformTransaction — faqat tasdiqlash.
    if (parsed.method === 'CheckPerformTransaction') {
      return javob.send(paymeJavob(parsed.rpcId, { allow: true }));
    }

    if (parsed.method === 'CheckTransaction' || parsed.method === 'GetStatement') {
      return javob.send(paymeJavob(parsed.rpcId, { exists: true }));
    }

    // CreateTransaction, PerformTransaction, CancelTransaction → bazaga yozish.
    const n = await rpc<{ xato?: string; ok?: boolean }>(
      'so_tolov_webhook', {
        p_payment_id: parsed.paymentId,
        p_holat: parsed.holat,
        p_external_id: parsed.externalId,
      },
    );
    if (n === null) return javob.code(503).send(paymeXato(parsed.rpcId, -32400, 'Baza javob bermadi'));
    if (n.xato) return javob.send(paymeXato(parsed.rpcId, -31001, n.xato));

    return javob.send(paymeJavob(parsed.rpcId, {
      transaction: String(parsed.paymentId),
      state: parsed.holat === 'tolangan' ? 2 : parsed.holat === 'qaytarildi' ? -1 : 1,
    }));
  });

  /**
   * Click webhook — Prepare va Complete bosqichlari (B3).
   *
   * Click ikkita alohida soʻrov yuboradi:
   *   action=0 → Prepare (toʻlovni tekshirish)
   *   action=1 → Complete (toʻlov yakunlandi)
   *
   * Imzo: MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
   */
  app.post('/tolov/webhook/click', async (request, javob) => {
    const secretKey = process.env.CLICK_SECRET_KEY;
    if (!secretKey) {
      return javob.code(503).send({ xato: 'CLICK_SECRET_KEY sozlanmagan' });
    }

    const tana = (request.body ?? {}) as ClickWebhookTana;

    if (!clickImzoTekshir(tana, secretKey)) {
      return javob.send(clickPrepareJavob({
        clickTransId: tana.click_trans_id,
        merchantTransId: tana.merchant_trans_id,
        merchantPrepareId: 0,
        error: CLICK_XATO.IMZO_XATO,
        errorNote: 'Imzo notoʻgʻri',
      }));
    }

    const parsed = clickWebhookParse(tana);
    if (!parsed) {
      return javob.code(400).send({ error: CLICK_XATO.ACTION_XATO, error_note: 'Soʻrov formati notoʻgʻri' });
    }

    // Bazaga yozish.
    const n = await rpc<{ xato?: string; ok?: boolean }>(
      'so_tolov_webhook', {
        p_payment_id: parsed.paymentId,
        p_holat: parsed.holat,
        p_external_id: parsed.externalId,
      },
    );

    if (n === null) {
      return javob.code(503).send({ error: CLICK_XATO.TOLOV_XATO, error_note: 'Baza javob bermadi' });
    }

    if (parsed.action === 'prepare') {
      return javob.send(clickPrepareJavob({
        clickTransId: tana.click_trans_id,
        merchantTransId: tana.merchant_trans_id,
        merchantPrepareId: parsed.paymentId,
        error: n.xato ? CLICK_XATO.FOYDALANUVCHI_TOPILMADI : CLICK_XATO.MUVAFFAQIYAT,
        errorNote: n.xato ?? 'Muvaffaqiyat',
      }));
    }

    return javob.send(clickCompleteJavob({
      clickTransId: tana.click_trans_id,
      merchantTransId: tana.merchant_trans_id,
      merchantConfirmId: parsed.paymentId,
      error: n.xato ? CLICK_XATO.TOLOV_XATO : CLICK_XATO.MUVAFFAQIYAT,
      errorNote: n.xato ?? 'Muvaffaqiyat',
    }));
  });

  /**
   * Umumiy toʻlov webhook — eski format (sandbox va test uchun).
   */
  app.post('/tolov/webhook', async (request, javob) => {
    const tana = (request.body ?? {}) as Record<string, unknown>;
    const paymentId = Number(tana.paymentId ?? tana.payment_id);
    const tolovHolati = tana.holat as string ?? tana.status as string;
    const externalId = (tana.externalId ?? tana.external_id ?? null) as string | null;

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return javob.code(400).send({ xato: 'paymentId notoʻgʻri' });
    }
    if (!tolovHolati || !['tolangan', 'rad', 'qaytarildi'].includes(tolovHolati)) {
      return javob.code(400).send({ xato: 'holat notoʻgʻri', berilgan: tolovHolati ?? null });
    }

    const n = await rpc<{ xato?: string; ok?: boolean }>(
      'so_tolov_webhook', {
        p_payment_id: paymentId,
        p_holat: tolovHolati,
        p_external_id: externalId,
      },
    );
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (n.xato) return javob.code(400).send(n);
    return n;
  });

  /**
   * Obuna holati — toʻliq (B3).
   *
   * `/tarif` dan farqi: u faqat rejani beradi, bu obuna va toʻlov
   * tarixini ham qaytaradi — "nima toʻladim, qachon tugaydi" uchun.
   */
  app.get('/obuna', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }
    const n = await rpc<{ xato?: string }>('so_obuna_toliq', { p_token: token });
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (n.xato) return javob.code(401).send(n);
    return n;
  });

  /**
   * Dunning tekshiruvi — jadval boʻyicha chaqiriladi (B3).
   *
   * Muddati tugagan obunalarni grace ga, grace ni paused ga
   * oʻtkazadi. Hech narsa oʻchirilmaydi — yumshoq pasaytirish.
   */
  app.post('/dunning', async (_soov, javob) => {
    const n = await rpc<{ xato?: string }>('so_dunning_tekshir', {});
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    return n;
  });

  /**
   * Telegram ulash — mavjud sessiyaga telegram_id yozish (B3).
   *
   * Reja: "Telegram orqali boshlash → Usta 1-qadami DARHOL".
   * Odam avval anonim sessiyada javob beradi, keyin Telegram
   * botiga ulaydi — javoblar yoʻqolmaydi.
   */
  app.post('/telegram-ulash', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }
    const tana = (request.body ?? {}) as Record<string, unknown>;
    const telegramId = Number(tana.telegramId ?? tana.telegram_id);
    if (!Number.isInteger(telegramId) || telegramId <= 0) {
      return javob.code(400).send({ xato: 'telegramId butun son boʻlishi kerak' });
    }
    const n = await rpc<{ xato?: string; ok?: boolean }>(
      'so_telegram_ulab', { p_token: token, p_telegram_id: telegramId },
    );
    if (n === null) return javob.code(503).send({ xato: 'baza javob bermadi' });
    if (n.xato) return javob.code(400).send(n);
    return n;
  });

  // ───────────────────────────────────────────────────────────────
  // B4: XITOYDAN TOPISH
  // ───────────────────────────────────────────────────────────────

  /**
   * 4-qadam: rasm-qidiruv — Uzum tovarining 1688 muqobillarini topadi (B4).
   *
   * PROVAYDER HALI ULANMAGAN: TMAPI va OneBound sinov kaliti
   * kutilmoqda. Hozircha endpointning oʻzi tayyor — provayder
   * ulanganda faqat `xitoyQidiruvProvayderiga` funksiyasi almashadi.
   *
   * Oqim: limit tekshir → keshdan izla → (provayder chaqir) →
   * keshga yoz → natija qaytar.
   */
  app.post('/xitoy-qidiruv', async (request, javob) => {
    const token = request.headers['x-sessiya'];
    if (typeof token !== 'string' || !token) {
      return javob.code(401).send({ xato: 'sessiya tokeni yoʻq' });
    }

    // Tarif darvozasi: 4-qadam
    const ruxsat = await qadamRuxsati(token, 4);
    if (!ruxsat.ochiq) return javob.code(402).send(ruxsat.javob);

    const tana = (request.body ?? {}) as Record<string, unknown>;
    const productId = Number(tana.productId);
    const rasmUrl = typeof tana.rasmUrl === 'string' ? tana.rasmUrl : null;

    if (!Number.isInteger(productId) && !rasmUrl) {
      return javob.code(400).send({ xato: 'productId yoki rasmUrl kerak' });
    }

    // Kunlik limit tekshirish
    const n = await rejaniOl(token);
    const limitJ = await rpc<{ xato?: string; soni?: number }>(
      'so_xitoy_limit', { p_token: token },
    );
    const ishlatilgan = limitJ?.soni ?? 0;
    const limitNatija = limitTekshir(ishlatilgan, n.reja);
    if (!limitNatija.ruxsat) {
      return javob.code(429).send({
        xato: 'kunlik limit tugadi',
        ...limitNatija,
        reja: n.reja,
      });
    }

    // Keshdan izlash
    const rasmHash = rasmUrl ?? `uzum:${productId}`;
    const kesh = await rpc<{ topildi: boolean; natijalar?: XitoyTovar[]; manba?: string }>(
      'so_xitoy_kesh_ol', { p_rasm_hash: rasmHash },
    );
    if (kesh?.topildi && kesh.natijalar) {
      return {
        natijalar: kesh.natijalar,
        manba: kesh.manba,
        keshdan: true,
        limit: limitNatija,
      };
    }

    // Provayder chaqiruvi — HALI ULANMAGAN
    const provayderKaliti = process.env.XITOY_API_KEY;
    if (!provayderKaliti) {
      return {
        natijalar: [],
        manba: null,
        keshdan: false,
        limit: limitNatija,
        izoh: 'Qidiruv provayderi hali ulanmagan — kalit kutilmoqda.',
      };
    }

    // Provayder ulangach shu yerda API chaqiruvi boʻladi.
    // Hozircha boʻsh javob.
    return {
      natijalar: [],
      manba: null,
      keshdan: false,
      limit: limitNatija,
    };
  });

  /**
   * MOQ hisobi — miqdor byudjetga sigʻadimi (B4).
   *
   * 1688 tovarining MOQ si va narxi bilan foydalanuvchining byudjeti
   * solishtirilib, sigʻmasa boʻlish rejasi taklif qilinadi.
   */
  app.post('/moq-hisobi', async (request) => {
    const tana = (request.body ?? {}) as Record<string, unknown>;
    const moq = raqam(tana.moq);
    const narxYuan = raqam(tana.narxYuan);
    const kurs = raqam(tana.kursSomPerYuan);
    const byudjet = raqam(tana.byudjetSom);

    if (moq === null || narxYuan === null || kurs === null || byudjet === null) {
      return {
        xato: 'yetishmaydi',
        yetishmaydi: [
          moq === null ? 'moq' : null,
          narxYuan === null ? 'narxYuan' : null,
          kurs === null ? 'kursSomPerYuan' : null,
          byudjet === null ? 'byudjetSom' : null,
        ].filter(Boolean),
      };
    }

    return moqHisobi(moq, narxYuan, kurs, byudjet);
  });

  return app;
}

/** Hodisa raqami — foydalanuvchi aytadigan qisqa belgi. */
function xatoId(): string {
  return crypto.randomUUID().replace(/-/g, '');
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
 * Tarif cheklovi yoqilganmi.
 *
 * Standart holat — OʻCHIQ. Reja (B3) buni ataylab shunday qoʻygan:
 * "pilot sinovi uchun flag bilan almashtiriladigan". Yoqilishi
 * uchun aniq `TARIF_CHEKLOVI=1` kerak — yaʼni tasodifan yoqilib
 * qolmaydi.
 */
function tarifCheklovi(): boolean {
  return process.env.TARIF_CHEKLOVI === '1';
}

/** Sessiya tokenidan amaldagi rejani chiqaradi. */
async function rejaniOl(token: unknown): Promise<RejaNatijasi> {
  if (typeof token !== 'string' || !token) {
    return reja(null, new Date());
  }
  const j = await rpc<{ xato?: string; obuna: ObunaXom | null }>('so_obuna', { p_token: token });
  // Baza javob bermasa yoki sessiya topilmasa — `bepul`. Bu
  // "ochiq qoldirish" dan xavfsizroq emas, ODILROQ: hech kim
  // toʻlamagan holatda ham 3-qadam pilotda ochiq turadi, chunki
  // cheklov flagi oʻchiq.
  if (j === null || j.xato) return reja(null, new Date());
  return reja(j.obuna, new Date());
}

/** Qadam shu sessiyaga ochiqmi. Cheklov oʻchiq boʻlsa — doim ochiq. */
async function qadamRuxsati(token: unknown, qadam: number): Promise<
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
      // Nimagacha ochiqligini AYTIB qoʻyish kerak: odam nimani
      // yoʻqotayotganini bilsin.
      hozir_ochiq_qadam: REJA_QADAMI[n.reja],
      izoh: 'Bu rejada bu qadam yopiq. Yoʻnalishlar (2-qadam) ochiq turadi.',
    },
  };
}

/**
 * Toshkent vaqti boʻyicha oy raqami (1–12).
 *
 * Serverning oʻz mintaqasi emas: mavsum balli oyga bogʻliq va server
 * UTC da tursa yil oxirida bir oy adashardi. Foydalanuvchi Oʻzbekistonda.
 */
function hozirgiOy(): number {
  const matn = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    month: 'numeric',
  }).format(new Date());
  return Number(matn);
}

/** Bazadagi funksiyani chaqiradi. `null` — ulanmagan yoki javob yoʻq. */
async function rpc<T>(nom: string, argumentlar: unknown): Promise<T | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(argumentlar),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Bazadan sifat hisobotini oladi. Ulanmagan boʻlsa boʻsh holat. */
async function sifatniOl(platform = 'uzum'): Promise<Sifat> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bosh: Sifat = {
    platform,
    last_sweep_at: null,
    coverage_percent: null,
    error_percent: null,
    requested: null,
    found: null,
    missing: null,
    errors: null,
    stopped_reason: null,
    measured_today: 0,
    has_data: false,
  };
  if (!url || !key) return bosh;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/so_quality`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_platform: platform }),
    });
    if (!response.ok) return bosh;
    return (await response.json()) as Sifat;
  } catch {
    // Baza javob bermasa panel yiqilmasligi kerak: "oʻlchov yoʻq" deb
    // koʻrsatiladi va sabab logda qoladi.
    return bosh;
  }
}
