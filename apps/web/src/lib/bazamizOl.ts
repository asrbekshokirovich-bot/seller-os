/**
 * "Bazamiz" oʻlchovini Edge Function dan olish — keshi bilan.
 *
 * NEGA ALOHIDA FAYL. Ilgari bu kod faqat `app/route.ts` (sotuv
 * sahifasi) ichida turardi. Endi Usta yon panelida ham "Baza"
 * kartasi bor va u AYNAN shu raqamni koʻrsatishi kerak. Ikki joyda
 * ikki xil kesh boʻlsa, bir sahifada "1 850 863", ikkinchisida eski
 * son chiqardi — bir xil saytda ikki xil haqiqat.
 *
 * Kesh modul darajasida, yaʼni ikkala marshrut uni BOʻLISHADI.
 *
 * Toza yordamchilar (`son`, `yosh`, `holatMatni`) `bazamiz.ts` da
 * qoladi: ular testlanadi va brauzerda ham ishlaydi. Bu faylda esa
 * tarmoq bor, u faqat serverda chaqiriladi.
 */

import { type Bazamiz, type Olchov, YANGI_MS } from './bazamiz';

/**
 * Oxirgi MUVAFFAQIYATLI oʻlchov va u qachon olingani.
 *
 * `count(*)` 1,85 mln qatorda ~540 ms, beshtasi ~1,5 s. Har
 * tashrifda soʻrasak sahifa sekinlashardi va bazaga keraksiz yuk
 * tushardi. Supurish kuniga uch marta, yaʼni bir soatlik yangilash
 * maʼlumotni eskirtirmaydi.
 *
 * Baza javob bermasa eski qiymat SAQLANADI — lekin u "yangi" deb
 * koʻrsatilmaydi: `vaqt` oʻzgarmaydi va sahifa yoshini aytadi.
 */
let oxirgi: Olchov | null = null;

/** Hozir ketayotgan soʻrov — bir vaqtdagi tashriflar uni boʻlishadi. */
let jarayonda: Promise<Olchov | null> | null = null;

/**
 * Fondagi soʻrov ham cheksiz osilib turmasin (funksiya vaqti va puli):
 * 30 s dan keyin uziladi va eski qiymat qoladi.
 */
const SOROV_MS = 30_000;

const API = () => process.env.SELLEROS_API_URL ?? '';
const KEY = () => process.env.SELLEROS_API_KEY ?? '';

/** `null` — hech qachon oʻlchov olinmagan. Boʻsh natija EMAS. */
export async function bazamizniOl(hozir: number): Promise<Olchov | null> {
  if (oxirgi !== null && hozir - oxirgi.vaqt < YANGI_MS) return oxirgi;
  if (!API() || !KEY()) return oxirgi;
  if (jarayonda) return jarayonda;
  jarayonda = (async () => {
    try {
      const r = await fetch(`${API()}/bazamiz`, {
        headers: { Authorization: `Bearer ${KEY()}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(SOROV_MS),
      });
      if (!r.ok) return oxirgi;
      const d = (await r.json()) as { olchov_yoq?: boolean; bazamiz?: Bazamiz };
      if (d.olchov_yoq || !d.bazamiz) return oxirgi;
      oxirgi = { qiymat: d.bazamiz, vaqt: hozir };
      return oxirgi;
    } catch {
      // Uch javob bermasa sahifa baribir chiqadi. Kuzatuv nosozligi
      // sahifani yiqitmasligi kerak — lekin u yolgʻon ham aytmasligi
      // kerak, shuning uchun eski qiymat YOSHI bilan qaytadi.
      return oxirgi;
    } finally {
      jarayonda = null;
    }
  })();
  return jarayonda;
}

/**
 * Sahifa uchun: oʻlchov `kutishMs` ichida kelmasa sahifa KUTMAYDI —
 * oxirgi maʼlum qiymat (yoshi bilan) yoki `null` (sahifa chiziqcha
 * koʻrsatadi) qaytadi, soʻrov esa `kechroq` ga beriladi (sahifada —
 * `after`): javobdan keyin tugab keshni toʻldiradi, keyingi tashrif
 * raqamni oladi.
 *
 * Nega: sovuq Edge Function 1,85 mln qatorni sanab 20–30 s javob bergan
 * (2026-10-04 oʻlchov) — shuncha vaqt bosh sahifa oq turardi.
 */
export async function bazamizniKutibOl(
  hozir: number,
  kutishMs: number,
  kechroq: (sorov: Promise<unknown>) => void,
): Promise<Olchov | null> {
  const olish = bazamizniOl(hozir);
  let taymer: ReturnType<typeof setTimeout> | undefined;
  const muddat = new Promise<'muddat'>((r) => { taymer = setTimeout(() => r('muddat'), kutishMs); });
  const natija = await Promise.race([olish, muddat]);
  clearTimeout(taymer);
  if (natija !== 'muddat') return natija;
  kechroq(olish);
  return oxirgi;
}
