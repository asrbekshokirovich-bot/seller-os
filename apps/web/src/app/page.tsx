/**
 * Bosh sahifa — `dizayn/ZumSavdo-Landing.html` (siyohrang, nazoratchi
 * 2026-10-21; oldingisi — terrakota `ZumSavdo-Veb.html` w1).
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
import { cookies } from 'next/headers';
import { after } from 'next/server';
import { holatMatni } from '@/lib/bazamiz';
import { bazamizniKutibOl } from '@/lib/bazamizOl';
import { boshNamuna, boshTarif } from '@/lib/boshOl';
import { COOKIE } from '@/lib/sessiya';
import { tarjima } from '@/lib/til';
import { serverTili } from '@/lib/til-server';
import BoshSahifa from './BoshSahifa';

/*
 * Har soʻrovda qayta yigʻiladi. Statik boʻlsa raqam qurish paytida
 * muzlab qolardi — bu sahifada ikki marta boʻlgan xato.
 */
export const dynamic = 'force-dynamic';

/* Bosh sahifa faqat yorugʻ (dizaynda tungi nusxa yoʻq) — brauzer paneli ham oq. */
export const viewport: Viewport = { themeColor: '#ffffff' };

/** Sarlavha va tavsif — sahifa tilida (`so_til` cookie; sahifa baribir dinamik). */
export async function generateMetadata(): Promise<Metadata> {
  const tr = tarjima(await serverTili());
  return {
    title: tr(
      'ZumSavdo — Uzumda nima sotishni raqamlar bilan tanlang',
      'ZumSavdo — Выберите по цифрам, что продавать на Uzum',
    ),
    description: tr(
      'Uzumda nima sotishni bugungi bazadagi raqamlar bilan tanlang: yoʻnalish, tovar, tannarx va Xitoydagi '
        + 'zavod narxi — bitta suhbatda, buyurtmadan Uzumda sotuvgacha. Ikki savoldan boshlanadi.',
      'Выберите, что продавать на Uzum, по цифрам из сегодняшней базы: направление, товар, себестоимость и цена '
        + 'фабрики в Китае — в одном чате, от заказа до продаж на Uzum. Начинается с двух вопросов.',
    ),
  };
}

export default async function Page() {
  const hozir = Date.now();
  // Baza sekin boʻlsa sahifa 4 s dan ortiq kutmaydi (`bazamizniKutibOl`, `boshOl.ts`): kech
  // kelgan javob keshni toʻldiradi, keyingi tashrif uni oladi.
  const kechroq = (sorov: Promise<unknown>) => after(() => sorov);
  const [o, namuna, tarif] = await Promise.all([
    bazamizniKutibOl(hozir, 4000, kechroq),
    boshNamuna.kutibOl(hozir, 4000, kechroq),
    boshTarif.kutibOl(hozir, 3000, kechroq),
  ]);
  return (
    <BoshSahifa
      tovar={o && typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null}
      holat={holatMatni(o, hozir)}
      holatRu={holatMatni(o, hozir, 'ru')}
      namuna={namuna}
      cheklov={tarif?.cheklov ?? null}
      // Chat oldin ochilgan (sessiya cookie si bor) — «Boshlash» oʻrniga «Davom etish».
      qaytgan={Boolean((await cookies()).get(COOKIE)?.value)}
      til={await serverTili()}
    />
  );
}
