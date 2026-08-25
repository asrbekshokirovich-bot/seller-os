/**
 * Sotuv sahifasi — statik HTML, JONLI raqamlar bilan.
 *
 * NEGA BU FAYL BOR. Sahifa dizayn vositasidan chiqqan 178 KB lik
 * tayyor HTML va u `public/sotuv.html` da yotadi. Ilgari `/` unga
 * oddiy yoʻnaltirish edi.
 *
 * Muammo "Bazamizda bugun" blokida chiqdi: toʻrtta raqam qurish
 * skriptida QOʻLDA yozilgan edi. Bir kunda tovarlar soni
 * 1 528 764 dan 1 850 863 ga oʻsdi. Ustidagi sarlavha esa "Har bir
 * raqam oʻlchangan" deb turadi.
 *
 * NOTOʻGʻRI RAQAM YOʻQLIGIDAN QIMMAT. Odam bu sonlarga qarab
 * qaror qabul qiladi, shuning uchun bu yerda uch holat aniq
 * ajratilgan:
 *
 *   yangi    — jonli oʻlchov (bir soatdan yosh)
 *   eskirgan — oxirgi muvaffaqiyatli oʻlchov, YOSHI aytiladi
 *   yoʻq     — chiziqcha va "olinmadi" jumlasi
 *
 * Statik faylda raqam umuman yoʻq (`qurish.mjs` buni qoʻriqlaydi),
 * yaʼni "qurish paytidagi eski son" degan holat endi mavjud emas.
 *
 * NEGA MIJOZ TOMONIDA EMAS. Brauzerda `fetch` qilsak, sahifa avval
 * chiziqcha bilan chiqib keyin sakrardi, JS oʻchiq boʻlsa esa hech
 * qachon toʻlmasdi.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Bazamiz, type Olchov, YANGI_MS, bazamizniQoy } from '@/lib/bazamiz';

/*
 * Sahifa har soʻrovda qayta yigʻiladi.
 *
 * Statik boʻlsa raqamlar qurish paytida muzlab qolardi — yaʼni
 * aynan tuzatayotgan muammoga qaytardik.
 */
export const dynamic = 'force-dynamic';

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

/** Sahifa matni — bir marta oʻqiladi, u oʻzgarmaydi. */
let sahifa: string | null = null;

const API = () => process.env.SELLEROS_API_URL ?? '';
const KEY = () => process.env.SELLEROS_API_KEY ?? '';

async function bazamizniOl(hozir: number): Promise<Olchov | null> {
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
    // Uch javob bermasa sahifa baribir chiqadi. Sotuv sahifasini
    // kuzatuv nosozligi yiqitmasligi kerak — lekin u yolgʻon ham
    // aytmasligi kerak, shuning uchun eski qiymat YOSHI bilan
    // qaytadi.
    return oxirgi;
  }
}

export async function GET(): Promise<Response> {
  if (sahifa === null) {
    sahifa = await readFile(join(process.cwd(), 'public', 'sotuv.html'), 'utf8');
  }

  const hozir = Date.now();
  const matn = bazamizniQoy(sahifa, await bazamizniOl(hozir), hozir);

  return new Response(matn, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Chetdagi kesh raqamlarni yana muzlatib qoʻymasin.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
