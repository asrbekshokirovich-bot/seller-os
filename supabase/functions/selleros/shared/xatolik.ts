/**
 * Xatolarni Sentry ga yuborish — bogʻliqliksiz.
 *
 * Reja, B0: "Monorepo + CI + staging/prod + Sentry". Sentry
 * kodda umuman yoʻq edi: Edge Function xato bersa, buni hech kim
 * bilmasdi. Foydalanuvchi "nimadir ishlamadi" deb ketardi va
 * hech qayerda yozuv qolmasdi.
 *
 * NEGA SDK EMAS. `@sentry/nextjs` va `@sentry/deno` uchta boshqa
 * muhitga (Node, Deno, brauzer) uchta boshqa paket talab qiladi.
 * Sentry esa oddiy HTTP qabul qiladi — "envelope" uchi. Shuning
 * uchun bu yerda ~80 qator kod bor va u har uchala muhitda bir xil
 * ishlaydi (`fetch` yetarli).
 *
 * NIMA YOʻQ. Manba xaritasi (source map), breadcrumb, sessiya
 * kuzatuvi va reliz bogʻlash yoʻq — ular SDK ning ishi. Bu yerda
 * faqat "xato boʻldi, mana u" bor. Shu ham hozirgi holatdan —
 * hech narsadan — cheksiz koʻp.
 *
 * XATO YUBORISH XATOSI JIM. Agar Sentry javob bermasa yoki DSN
 * notoʻgʻri boʻlsa, foydalanuvchi soʻrovi BUZILMAYDI. Kuzatuv
 * vositasi mahsulotni yiqitmasligi kerak.
 *
 * DSN BOʻLMASA — HECH NARSA YUBORILMAYDI. Bu odatiy holat
 * (mahalliy ishlash, testlar) va u xato emas.
 */

/** DSN dan chiqadigan manzil va kalit. */
export interface Manzil {
  /** Envelope yuboriladigan toʻliq URL. */
  url: string;
  kalit: string;
  loyiha: string;
}

/**
 * Sentry DSN ini qismlarga ajratadi.
 *
 * Shakli: `https://<kalit>@<host>/<loyiha_id>`
 *
 * Notoʻgʻri boʻlsa `null` — otmaydi. Sozlash xatosi tufayli
 * ilova ishga tushmay qolishi mumkin emas.
 */
export function manzil(dsn: string | undefined | null): Manzil | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const kalit = u.username;
    const loyiha = u.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!kalit || !loyiha || !/^\d+$/.test(loyiha)) return null;
    return {
      kalit,
      loyiha,
      url: `${u.protocol}//${u.host}/api/${loyiha}/envelope/`
        + `?sentry_key=${kalit}&sentry_version=7`,
    };
  } catch {
    return null;
  }
}

export interface Belgi {
  /** Qaysi qism: `edge`, `web`, `backend`, `skreyper`. */
  qism: string;
  /** `production`, `preview`, `development`. */
  muhit: string;
  /** Qaysi uch yoki vazifa — Sentry da guruhlash uchun. */
  yol?: string;
}

/**
 * Envelope tanasi — Sentry qabul qiladigan uch qatorli shakl.
 *
 * Vaqt tashqaridan beriladi (`hozir`), sinab koʻrsa boʻlsin deb:
 * `Date.now()` ishlatilsa test natijasi har safar boshqacha
 * chiqardi va uni solishtirib boʻlmasdi.
 */
export function envelope(
  xato: unknown,
  belgi: Belgi,
  hozir: Date,
  id: string,
): string {
  const xabar = xato instanceof Error ? xato.message : String(xato);
  const tur = xato instanceof Error ? xato.name : 'Error';
  const iz = xato instanceof Error && xato.stack ? xato.stack : null;

  const sarlavha = { event_id: id, sent_at: hozir.toISOString() };
  const hodisa = {
    event_id: id,
    timestamp: hozir.toISOString(),
    platform: 'javascript',
    level: 'error',
    logger: belgi.qism,
    environment: belgi.muhit,
    transaction: belgi.yol,
    tags: { qism: belgi.qism, ...(belgi.yol ? { yol: belgi.yol } : {}) },
    exception: {
      values: [{
        type: tur,
        value: xabar,
        // Izni Sentry oʻqiydigan shaklga solmayapmiz: uni SDK
        // qiladi. Xom iz `extra` da toʻliq saqlanadi.
        stacktrace: undefined,
      }],
    },
    extra: iz ? { stack: iz } : undefined,
  };

  return [
    JSON.stringify(sarlavha),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(hodisa),
  ].join('\n');
}

/**
 * Xatoni yuboradi. Hech qachon otmaydi va hech qachon kutmaydi.
 *
 * `false` — yuborilmadi (DSN yoʻq yoki soʻrov oʻtmadi). Chaqiruvchi
 * buni tekshirishi SHART emas: bu vosita mahsulot oqimiga
 * aralashmaydi.
 */
export async function xatoniYubor(
  xato: unknown,
  belgi: Belgi,
  dsn: string | undefined | null,
  yuborgich: typeof fetch = fetch,
  hozir: Date = new Date(),
  id: string = tasodifiyId(),
): Promise<boolean> {
  const m = manzil(dsn);
  if (m === null) return false;
  try {
    const r = await yuborgich(m.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope(xato, belgi, hozir, id),
    });
    return r.ok;
  } catch {
    // Kuzatuv vositasi mahsulotni yiqitmasligi kerak.
    return false;
  }
}

/** Sentry `event_id` — 32 ta belgili hex. */
export function tasodifiyId(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
