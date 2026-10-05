/**
 * Bosh sahifa — `ZUMSavdo K Journey Tinted.dc.html` dizayni
 * (nazoratchi, 2026-09-24).
 *
 * NEGA ENDI REACT SAHIFA. Ilgari `/` statik `public/sotuv.html` edi:
 * dizayn qadogʻidan `qurish.mjs` bilan yasalar, `route.ts` esa ichiga
 * jonli raqamlarni matn almashtirish orqali qoʻyardi. Yangi dizayn
 * qadoq emas, oddiy komponent — uni HTML satr sifatida tahrirlash
 * endi hech narsa bermaydi, faqat ikkinchi uslub tizimini saqlaydi.
 * Bosh sahifa va Usta endi bitta tokenlar va bitta shrift bilan.
 *
 * RAQAM SERVERDA QOʻYILADI, brauzerda emas: aks holda sahifa avval
 * chiziqcha bilan chiqib keyin sakrardi, JS oʻchiq boʻlsa esa hech
 * qachon toʻlmasdi. Kesh sotuv va Usta uchun bitta (`bazamizOl.ts`).
 */

import type { Metadata } from 'next';
import { after } from 'next/server';
import { holatMatni } from '@/lib/bazamiz';
import { bazamizniKutibOl } from '@/lib/bazamizOl';
import { tarjima } from '@/lib/til';
import { serverTili } from '@/lib/til-server';
import BoshSahifa from './BoshSahifa';

/*
 * Har soʻrovda qayta yigʻiladi. Statik boʻlsa raqam qurish paytida
 * muzlab qolardi — bu sahifada ikki marta boʻlgan xato.
 */
export const dynamic = 'force-dynamic';

/** Sarlavha va tavsif — sahifa tilida (`so_til` cookie; sahifa baribir dinamik). */
export async function generateMetadata(): Promise<Metadata> {
  const tr = tarjima(await serverTili());
  return {
    title: tr(
      'ZumSavdo — Uzumda nima sotishni raqamlar bilan tanlang',
      'ZumSavdo — Выберите по цифрам, что продавать на Uzum',
    ),
    description: tr(
      'Nisha tanlash va tannarx — Uzum bazasidan, 8 ta tuzoq-filtr bilan; Xitoydan (1688) topish — rasm boʻyicha. '
        + 'Buyurtma va yetkazish — tez orada.',
      'Выбор ниши и себестоимость — по базе Uzum, с 8 фильтрами-ловушками; поиск в Китае (1688) — по фото. '
        + 'Заказ и доставка — скоро.',
    ),
  };
}

export default async function Page() {
  const hozir = Date.now();
  // Baza sekin boʻlsa sahifa 4 s dan ortiq kutmaydi (`bazamizniKutibOl`).
  const o = await bazamizniKutibOl(hozir, 4000, (sorov) => after(() => sorov));
  return (
    <BoshSahifa
      tovar={o && typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null}
      holat={holatMatni(o, hozir)}
      holatRu={holatMatni(o, hozir, 'ru')}
      til={await serverTili()}
    />
  );
}
