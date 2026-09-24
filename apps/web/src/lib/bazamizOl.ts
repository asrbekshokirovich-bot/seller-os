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

const API = () => process.env.SELLEROS_API_URL ?? '';
const KEY = () => process.env.SELLEROS_API_KEY ?? '';

/** `null` — hech qachon oʻlchov olinmagan. Boʻsh natija EMAS. */
export async function bazamizniOl(hozir: number): Promise<Olchov | null> {
  if (oxirgi !== null && hozir - oxirgi.vaqt < YANGI_MS) return oxirgi;
  if (!API() || !KEY()) return oxirgi;
  try {
    const r = await fetch(`${API()}/bazamiz`, {
      headers: { Authorization: `Bearer ${KEY()}` },
      cache: 'no-store',
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
  }
}
