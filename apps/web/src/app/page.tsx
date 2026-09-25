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

import type { Metadata, Viewport } from 'next';
import { holatMatni } from '@/lib/bazamiz';
import { bazamizniOl } from '@/lib/bazamizOl';
import { kirill, mono, sans } from './shriftlar';
import BoshSahifa from './BoshSahifa';

/*
 * Har soʻrovda qayta yigʻiladi. Statik boʻlsa raqam qurish paytida
 * muzlab qolardi — bu sahifada ikki marta boʻlgan xato.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ZumSavdo — Uzumda nima sotishni raqamlar bilan tanlang',
  description:
    'Nisha tanlash va tannarx — Uzum bazasidan, 8 ta tuzoq-filtr bilan. '
    + 'Xitoydan topish, buyurtma va yetkazish — tez orada.',
};

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
};

export default async function Page() {
  const hozir = Date.now();
  const o = await bazamizniOl(hozir);
  return (
    <div className={`${sans.variable} ${kirill.variable} ${mono.variable}`}>
      <BoshSahifa
        tovar={o && typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null}
        holat={holatMatni(o, hozir)}
        holatRu={holatMatni(o, hozir, 'ru')}
      />
    </div>
  );
}
