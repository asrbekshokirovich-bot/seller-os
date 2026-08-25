import Fastify, { type FastifyInstance } from 'fastify';
import { type Sifat, holat } from './sifat.js';
import { tovarniTekshir, turkumniTekshir, xulosa } from './tahlil.js';

/** `so_tovar_royxati()` javobi. */
interface TovarJavobi {
  turkum: { categoryId: number; name: string } | null;
  royxat: TovarNomzodi[];
}
import {
  KESH_ESKI_SOAT,
  profilOqi,
  sohalar,
  tovarlar,
  yonalishlar,
  type NomzodJavobi,
  type TovarHolati,
  type TovarNomzodi,
  type TurkumHolati,
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
      tovar: xulosa(tovarlar.map(tovarniTekshir)),
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
  app.get('/tovarlar', async (request) => {
    const q = request.query as Record<string, string | undefined>;
    const turkumId = Number(q.turkum);
    if (!Number.isInteger(turkumId) || turkumId <= 0) {
      return { xato: 'turkum — butun son boʻlishi kerak', berilgan: q.turkum ?? null };
    }

    const javob = await rpc<TovarJavobi>('so_tovar_royxati', {
      p_category_external_id: turkumId,
      p_limit: 50,
    });
    if (javob === null) {
      return { olchov_yoq: true, sabab: 'baza javob bermadi' };
    }
    if (!javob.royxat.length) {
      // Boʻsh roʻyxat "tovar yoʻq" degan daʼvo boʻlardi. Turkum
      // topilmagani boshqa narsa.
      return {
        olchov_yoq: true,
        sabab: javob.turkum === null ? 'bunday turkum yoʻq' : 'turkumda oʻlchangan tovar yoʻq',
      };
    }

    const natija = tovarlar(javob.royxat, (t) => {
      const n = tovarniTekshir(t, hozirgiOy());
      return { bayroqlar: n.bayroqlar, baholanmadi: n.baholanmadi };
    });

    return { olchov_yoq: false, turkum: javob.turkum, ...natija };
  });

  return app;
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
