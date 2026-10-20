/**
 * OQIM — server javobni boʻlaklab yuboradi, sahifa uni darhol chizadi (nazoratchi,
 * 2026-10-20: «matn yozilgan sari chiqib borsin»). Edge (Deno), Fastify (Node) va
 * sayt (brauzer) — uchalasida bir xil: faqat Web API (`ReadableStream`, `TextEncoder`).
 *
 * Shakl — oddiy Server-Sent Events: `event: <nom>\ndata: <JSON>\n\n`. Suhbat hodisalari:
 *   holat  — `{holat: 'tushunmoqda' | 'yozmoqda'}`
 *   qism   — `{oldin, izoh, savol}`: AI yozayotgan xabar, shu paytgacha (qoralama)
 *   qayta  — `{}`: qoralama darvozadan oʻtmadi — olib tashlansin
 *   tayyor — oqimsiz javobning AYNAN oʻzi (`SuhbatJavobi`) — oxirgi hodisa
 *   xato   — `{xato, hodisa}`: server ichida yiqildi — oxirgi hodisa
 *
 * HODISA CHIQMASA — OQIM YOʻQ. Sessiya xatosi, kod bilan bajarilgan turn — oddiy JSON va
 * oʻz HTTP holati bilan (401 boʻlsa sayt vositachisi yangi sessiya ochadi, `apigaSessiya`).
 * Oqim faqat birinchi hodisada boshlanadi (`oqimYokiNatija`).
 */

/** Hodisa yuborish: nomi va JSON qiymati. */
export type OqimYuborish = (hodisa: string, data: unknown) => void;

/** Oqim javobining sarlavhalari: bufersiz, keshsiz, siqmasdan (proksi va CDN ushlab turmasin). */
export const OQIM_SARLAVHALARI: Readonly<Record<string, string>> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};

/** Javob oqimmi (sarlavhasidan). */
export function oqimmi(r: { headers: { get(nom: string): string | null } }): boolean {
  return (r.headers.get('content-type') ?? '').startsWith('text/event-stream');
}

/** Bitta SSE kadri. JSON bir qatorda — ichidagi yangi qator `\n` boʻlib qochiriladi. */
export function sseKadr(hodisa: string, data: unknown): string {
  return `event: ${hodisa}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * `ish` ni boshlaydi. Birinchi hodisadan OLDIN tugasa — `{natija}`: oddiy JSON javob
 * qaytarilsin. Hodisa chiqsa — `{oqim}`: avval yigʻilgan hodisalar, keyin qolganlari, oxirida
 * `tayyor` (natija) yoki `xato` (`xatoQiymati`). Hodisadan oldin otsa — xato shu yerdan otiladi.
 *
 * Mijoz uzilsa ham `ish` oxirigacha bajariladi (turn jurnalga yoziladi; sahifa keyin oʻqiydi).
 * Har `ping` ms da izoh qatori — oraliq proksilar jim ulanishni uzmasin.
 */
export async function oqimYokiNatija<T>(
  ish: (yubor: OqimYuborish) => Promise<T>,
  o: { pingMs?: number; xatoQiymati?: (e: unknown) => unknown } = {},
): Promise<{ natija: T } | { oqim: ReadableStream<Uint8Array> }> {
  const kodla = new TextEncoder();
  const navbat: string[] = [];
  let boshqaruv: ReadableStreamDefaultController<Uint8Array> | null = null;
  let yopiq = false;
  let boshlandi: () => void = () => {};
  const birinchi = new Promise<'oqim'>((r) => { boshlandi = () => r('oqim'); });
  const yoz = (kadr: string) => {
    if (yopiq) return;
    if (!boshqaruv) { navbat.push(kadr); return; }
    try { boshqaruv.enqueue(kodla.encode(kadr)); } catch { yopiq = true; }
  };
  const jarayon = ish((hodisa, data) => { yoz(sseKadr(hodisa, data)); boshlandi(); });
  // Oqim boshlangach otsa — u oqim ichida (`xato`) aytiladi. `race` rad etishni ham tinglaydi:
  // «ushlanmagan rad» boʻlmaydi (test bor).
  const g = await Promise.race([jarayon.then((natija) => ({ natija })), birinchi]);
  if (g !== 'oqim') return g;

  let ping: ReturnType<typeof setInterval> | undefined;
  const oqim = new ReadableStream<Uint8Array>({
    start(c) {
      boshqaruv = c;
      // Safari kabi brauzerlar boshidagi ~1 KB ni yigʻib turadi — boʻsh izoh bilan oʻtiladi.
      yoz(`:${' '.repeat(1024)}\n\n`);
      for (const k of navbat.splice(0)) yoz(k);
      ping = setInterval(() => yoz(': ping\n\n'), o.pingMs ?? 10_000);
      void jarayon
        .then(
          (natija) => yoz(sseKadr('tayyor', natija)),
          (e: unknown) => yoz(sseKadr('xato', o.xatoQiymati ? o.xatoQiymati(e) : { xato: 'ichki xato' })),
        )
        .finally(() => {
          clearInterval(ping);
          if (yopiq) return;
          yopiq = true;
          try { c.close(); } catch { /* allaqachon yopilgan */ }
        });
    },
    cancel() {
      yopiq = true;
      clearInterval(ping);
    },
  });
  return { oqim };
}

/**
 * Tez-tez keladigan qiymatni siyraklashtiradi: `ms` da bittadan koʻp emas, oxirgisi
 * yoʻqolmaydi (kutib turib chiqadi). `bekor()` — kutayotganini tashlaydi.
 */
export function siyrak<T>(ber: (x: T) => void, ms: number): ((x: T) => void) & { bekor: () => void } {
  let oxirgi = 0;
  let kutgan: { x: T } | null = null;
  let taymer: ReturnType<typeof setTimeout> | undefined;
  const chiqar = () => {
    taymer = undefined;
    if (!kutgan) return;
    const k = kutgan;
    kutgan = null;
    oxirgi = Date.now();
    ber(k.x);
  };
  const f = (x: T) => {
    kutgan = { x };
    if (taymer !== undefined) return;
    const qoldi = oxirgi + ms - Date.now();
    if (qoldi <= 0) chiqar();
    else taymer = setTimeout(chiqar, qoldi);
  };
  return Object.assign(f, {
    bekor: () => {
      kutgan = null;
      if (taymer !== undefined) clearTimeout(taymer);
      taymer = undefined;
    },
  });
}

/**
 * Oqimni oʻqiydi (brauzer): har toʻliq hodisa — `ber(nom, qiymat)`. Izoh (`:`) qatorlari va
 * JSON boʻlmagan kadr tashlanadi. Oqim uzilsa — shu yergacha kelganlar berilgan boʻladi.
 */
export async function sseOqi(tana: ReadableStream<Uint8Array>, ber: (hodisa: string, qiymat: unknown) => void): Promise<void> {
  const oqiy = tana.getReader();
  const yech = new TextDecoder();
  let bufer = '';
  const kadrlar = () => {
    // CRLF va CR → LF; oxiridagi yolgʻiz CR — kutiladi (keyingi boʻlak `\n` bilan boshlanishi mumkin).
    bufer = bufer.replace(/\r\n|\r(?!$)/g, '\n');
    for (let i = bufer.indexOf('\n\n'); i >= 0; i = bufer.indexOf('\n\n')) {
      const kadr = bufer.slice(0, i);
      bufer = bufer.slice(i + 2);
      let hodisa = 'message';
      const data: string[] = [];
      for (const q of kadr.split('\n')) {
        if (q.startsWith('event:')) hodisa = q.slice(6).trim();
        else if (q.startsWith('data:')) data.push(q.slice(5).replace(/^ /, ''));
      }
      // Faqat izoh (ping) — `data` yoʻq: JSON.parse('') otadi va kadr tashlanadi.
      let qiymat: unknown;
      try { qiymat = JSON.parse(data.join('\n')); } catch { continue; }
      ber(hodisa, qiymat);
    }
  };
  try {
    for (;;) {
      const { value, done } = await oqiy.read();
      if (done) break;
      bufer += yech.decode(value, { stream: true });
      kadrlar();
    }
    bufer += yech.decode();
    kadrlar();
  } finally {
    oqiy.releaseLock();
  }
}
