/**
 * Sotuv sahifasi — statik HTML, JONLI raqamlar bilan.
 *
 * NEGA BU FAYL BOR. Sahifa dizayn vositasidan chiqqan 178 KB lik
 * tayyor HTML va u `public/sotuv.html` da yotadi. Ilgari `/` unga
 * oddiy yoʻnaltirish edi.
 *
 * Muammo "Bazamizda bugun" blokida chiqdi: toʻrtta raqam qurish
 * skriptida QOʻLDA yozilgan edi. Bir kunda tovarlar soni
 * 1 528 764 dan 1 850 863 ga oʻsdi — sahifa 320 000 ga
 * yanglishardi. Ustidagi sarlavha esa "Har bir raqam oʻlchangan"
 * deb turadi; qoʻlda yozilgan raqam bilan bu daʼvo yolgʻon.
 *
 * Endi uch shu HTML ni oʻqiydi va `data-bazamiz` belgilangan
 * joylarni jonli qiymatga almashtiradi.
 *
 * NEGA MIJOZ TOMONIDA EMAS. Brauzerda `fetch` qilsak, sahifa avval
 * eski raqam bilan chiqib keyin sakrardi, JS oʻchiq boʻlsa esa
 * hech qachon yangilanmasdi. Server tomonida bunday emas.
 *
 * BAZA JAVOB BERMASA — QURISH PAYTIDAGI RAQAM QOLADI. Nol yoki
 * chiziqcha koʻrsatilmaydi: sotuv sahifasida "0 tovar" degan
 * yozuv nosozlikni mahsulot haqidagi yolgʻonga aylantirardi.
 * Zaxira raqam oʻz SANASI bilan koʻrsatiladi.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Bazamiz, bazamizniQoy } from '@/lib/bazamiz';

/*
 * Sahifa har soʻrovda qayta yigʻiladi.
 *
 * Statik boʻlsa raqamlar qurish paytida muzlab qolardi — yaʼni
 * aynan tuzatayotgan muammoga qaytardik.
 */
export const dynamic = 'force-dynamic';


/** Bir soatlik kesh. */
const KESH_MS = 60 * 60 * 1000;

/*
 * Kesh MODUL darajasida.
 *
 * `count(*)` 1,85 mln qatorda ~540 ms, beshtasi ~1,5 s. Har
 * tashrifda soʻrasak sahifa sekinlashardi va bazaga keraksiz yuk
 * tushardi. Supurish kuniga uch marta boʻlgani uchun bir soatlik
 * kesh maʼlumotni eskirtirmaydi.
 */
let kesh: { vaqt: number; qiymat: Bazamiz } | null = null;

/** Sahifa matni — bir marta oʻqiladi, u oʻzgarmaydi. */
let sahifa: string | null = null;

const API = () => process.env.SELLEROS_API_URL ?? '';
const KEY = () => process.env.SELLEROS_API_KEY ?? '';

async function bazamizniOl(hozir: number): Promise<Bazamiz | null> {
  if (kesh !== null && hozir - kesh.vaqt < KESH_MS) return kesh.qiymat;
  if (!API() || !KEY()) return null;
  try {
    const r = await fetch(`${API()}/bazamiz`, {
      headers: { Authorization: `Bearer ${KEY()}` },
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { olchov_yoq?: boolean; bazamiz?: Bazamiz };
    if (d.olchov_yoq || !d.bazamiz) return null;
    kesh = { vaqt: hozir, qiymat: d.bazamiz };
    return d.bazamiz;
  } catch {
    // Uch javob bermasa sahifa baribir chiqadi — zaxira raqamlar
    // bilan. Sotuv sahifasini kuzatuv nosozligi yiqitmasligi kerak.
    return null;
  }
}



export async function GET(): Promise<Response> {
  if (sahifa === null) {
    sahifa = await readFile(join(process.cwd(), 'public', 'sotuv.html'), 'utf8');
  }

  const matn = bazamizniQoy(sahifa, await bazamizniOl(Date.now()));

  return new Response(matn, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Chetdagi kesh raqamlarni yana muzlatib qoʻymasin.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
