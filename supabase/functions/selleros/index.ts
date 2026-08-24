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
  profilOqi,
  sohalar,
  yonalishlar,
  type TovarHolati,
  type TurkumHolati,
  type TurkumNomzodi,
} from './shared/index.ts';

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

Deno.serve(async (req: Request) => {
  const yol = new URL(req.url).pathname.replace(/^\/selleros/, '') || '/';

  if (yol === '/' || yol === '/health') {
    return javob({
      ok: true,
      service: 'selleros-api',
      // Jonli rejim flag bilan yoqiladi — reja, 5-boʻlim.
      live: { payments: Deno.env.get('PAYMENTS_LIVE') === '1' },
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
      tovar: xulosa(tovarlar.map(tovarniTekshir)),
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

    const nomzodlar = await rpc<TurkumNomzodi[]>('so_yonalish_nomzodlari', {});
    if (nomzodlar === null) {
      // Boʻsh roʻyxat "mos yoʻnalish yoʻq" degan daʼvo boʻlardi.
      return javob({ olchov_yoq: true, sabab: 'baza javob bermadi' }, 503);
    }

    const natija = yonalishlar(
      nomzodlar,
      profil.budgetUzs,
      sohalar(profil),
      hozirgiOy(),
    );
    return javob({ olchov_yoq: false, nomzod_soni: nomzodlar.length, ...natija });
  }

  return javob({ xato: 'topilmadi', yol }, 404);
});

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
