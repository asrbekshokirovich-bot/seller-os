/**
 * Sun'iy intellekt — Gemini suhbati (2026-11-24, ega tasdiqladi).
 *
 * POST {tarix: [{rol: "men" | "ai", matn}]} → {matn}
 *
 * - Gemini faqat SHU YERDA (serverda) chaqiriladi. Kalit `GEMINI_API_KEY`
 *   muhit o'zgaruvchisidan olinadi va brauzerga hech qachon chiqmaydi.
 * - Modellar `GEMINI_MODEL` bilan almashtiriladi (vergul bilan bir nechta). Biri band (503/429)
 *   yoki yo'q (404) bo'lsa — keyingisi sinaladi. gemini-2.5-flash yangi kalitlarga yopilgan.
 * - Savol soni cheklanmaydi, tanga yechilmaydi (ega qarori).
 * - Faqat kirgan foydalanuvchi: ilova kirishsiz chat oynasini ko'rsatmaydi va
 *   so'rovga `X-ZS-Kirgan` sarlavhasini qo'shadi. Haqiqiy SMS-kirish ulanganda
 *   bu yerda sessiya tokeni tekshiriladi.
 */

export const maxDuration = 60;

const MODELLAR = (process.env.GEMINI_MODEL || 'gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-3.8-flash')
  .split(',').map((m) => m.trim()).filter(Boolean);

const TIZIM = `Sen — ZumSavdo platformasining sun'iy intellekt yordamchisisan.
ZumSavdo O'zbekistondagi marketpleyslar (Uzum, Yandex Market, Wildberries va boshqalar) bo'yicha analitika beradi.
Platforma bo'limlari: Uzum analitikasi (top tovarlar, kategoriyalar, do'konlar), Taqqoslash (Uzum narxi va Xitoy narxi),
Studiya (Xitoy mahsulotidan marketpleys kartochkasi tayyorlash), FAQ / Yo'naltirish (qadamma-qadam yo'riqnomalar: YaTT ochish,
do'kon ochish, 1688 dan buyurtma).

Qoidalar:
- Har qanday savolga javob ber va foydalanuvchiga aniq yo'nalish ber: keyingi qadam nima, qayerga kirish kerak.
  Mos bo'lsa ZumSavdo bo'limini tavsiya qil.
- Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber. Odatiy til — o'zbek tili (lotin yozuvi).
- Raqam aytsang, faqat aniq bilgan raqamingni ayt. ZumSavdo ma'lumoti senga berilmagan: sotuv soni, narx, daromad
  kabi raqamlarni o'ylab topma. Bunday raqam kerak bo'lsa, "Uzum analitikasi bo'limida aniq raqamni ko'ring" deb yo'naltir.
- Hech qachon daromad, sotuv yoki natijani va'da qilma va kafolat berma. Bashoratni fakt sifatida aytma.
- Qisqa va tushunarli yoz: oddiy so'zlar, kerak bo'lsa ro'yxat. Ortiqcha uzun kirish so'z yozma.`;

interface Xabar { rol: 'men' | 'ai'; matn: string }

export async function POST(request: Request): Promise<Response> {
  const kalit = process.env.GEMINI_API_KEY;
  if (!kalit) return javob({ xato: 'kalit_yoq' }, 503);
  if (request.headers.get('x-zs-kirgan') !== '1') return javob({ xato: 'kirish_kerak' }, 401);

  let tarix: Xabar[] = [];
  try {
    const t = (await request.json()) as { tarix?: unknown };
    if (Array.isArray(t.tarix)) {
      tarix = t.tarix
        .filter((x): x is Xabar => !!x && typeof x === 'object' && typeof (x as Xabar).matn === 'string' && ((x as Xabar).rol === 'men' || (x as Xabar).rol === 'ai'))
        .map((x) => ({ rol: x.rol, matn: x.matn.slice(0, 6000) }))
        .slice(-30);
    }
  } catch { /* bo'sh */ }
  // Gemini suhbati foydalanuvchi xabari bilan boshlanib, u bilan tugashi kerak.
  while (tarix.length && tarix[0]?.rol !== 'men') tarix.shift();
  if (tarix.at(-1)?.rol !== 'men') return javob({ xato: 'savol_yoq' }, 400);

  const body = {
    systemInstruction: { parts: [{ text: TIZIM }] },
    contents: tarix.map((x) => ({ role: x.rol === 'men' ? 'user' : 'model', parts: [{ text: x.matn }] })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
  };

  const boshlandi = Date.now();
  let oxirgi = 'gemini';
  for (const model of MODELLAR) {
    const qoldi = 55_000 - (Date.now() - boshlandi);
    if (qoldi < 5_000) break;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': kalit },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(25_000, qoldi)),
      });
      const d = (await r.json().catch(() => ({}))) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
        error?: { message?: string; status?: string };
      };
      if (!r.ok) {
        console.error('/api/ai-suhbat Gemini:', model, r.status, d.error?.status, d.error?.message);
        oxirgi = r.status === 429 || r.status === 503 ? 'band' : 'gemini';
        if (r.status === 429 || r.status === 404 || r.status >= 500) continue;
        return javob({ xato: oxirgi }, 502);
      }
      const matn = (d.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
      if (matn) return javob({ matn }, 200);
      oxirgi = 'bosh_javob';
    } catch (xato) {
      console.error('/api/ai-suhbat:', model, xato);
      oxirgi = 'ulanish';
    }
  }
  return javob({ xato: oxirgi }, oxirgi === 'band' ? 429 : 502);
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
