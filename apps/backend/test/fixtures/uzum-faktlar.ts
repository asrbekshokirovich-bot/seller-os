/**
 * Test faktlari — `so_fakt_oqi` javobi shaklida. Qiymatlar 0058 (qabul,
 * Uzum qoʻllanmasi 6/14-bob) va 0059 (surat va kartochka, 5-bob) seed
 * qatorlaridan koʻchirilgan; testlar ularni "bazadan kelgan" deb oladi.
 */

const Q = (qiymat: unknown, manba = 'seller.uzum.uz/manual/uz/6.product-preparation', olchandi = '2026-09-28') =>
  ({ qiymat, birlik: null, manba, olchandi, izoh: null });

export const QABUL_FAKT = {
  'uzum.qabul.ombor.manzil': Q('Toshkent, Sergeli, Xonabod 2/2'), 'uzum.qabul.ombor.soat': Q('06:00–00:00'),
  'uzum.qabul.qaytarish.manzil': Q('Nilufar 77/7'), 'uzum.qabul.qaytarish.soat': Q('09:00–21:00'),
  'uzum.qabul.muddat_kun_max': Q(7), 'uzum.qabul.tafovut_som': Q(2500), 'uzum.qabul.taqiq_jarima_som': Q(5_000_000),
  'uzum.qabul.taymslot.ozgartirish_max': Q(3), 'uzum.qabul.taymslot.bekor_soat': Q(48),
  'uzum.qabul.yetkazma.sku_max': Q(100), 'uzum.qabul.yetkazma.akt_nusxa': Q(2), 'uzum.qabul.quti_toliqlik': Q('kamida 2/3'),
  'uzum.qabul.yorliq': Q({ kod: 'EAN-13 yoki Uzum QR', tavsiya: '58×40 mm' }),
  'uzum.qabul.qadoq': Q([{ kalit_sozlar: ['sumka'], tur: 'Sumka / aksessuar', usul: 'Individual paket', belgilar: '—' }]),
  'uzum.qabul.qadoq_umumiy': Q('Zavod qutisi + strech'),
  'uzum.qabul.logistika.url': Q('https://logistics.uzum.uz'), 'uzum.qabul.logistika.quti_kg_max': Q(20), 'uzum.qabul.logistika.oldin_kun': Q(2),
  'uzum.qabul.qollanma.url': Q('https://seller.uzum.uz/manual/uz/6.product-preparation/'),
};

const S = (qiymat: unknown) => Q(qiymat, 'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29');

export const SURAT_FAKT = {
  'uzum.surat.format': S('JPEG, JPG, WebP, PNG'),
  'uzum.surat.min_eni': S(750),
  'uzum.surat.min_boyi': S(1000),
  'uzum.surat.nisbat': S('vertikal 3:4'),
  'uzum.surat.max_mb': S(5),
  'uzum.surat.tovar_ulush_min': S(50),
  'uzum.surat.qoidalar': S([
    'Har SKU uchun kamida bitta surat — tovarning old tomoni; SKU ning birinchi surati old tomon boʻlsin',
    'Suratdagi matn faqat oʻzbek yoki rus tilida — xitoycha yozuvli surat mos emas',
  ]),
  'uzum.surat.fotostudiya': S('FBO: omborga kelganda har SKU dan 1 dona Uzum Fotostudiyasiga olinadi'),
  'uzum.surat.qollanma.url': S('https://seller.uzum.uz/manual/uz/5.product-creation/'),
  'uzum.kartochka.qoidalar': S([
    'Nom, qisqa tavsif va xususiyatlar ikki tilda: oʻzbek (lotin) va rus (kirill)',
    'VGT: omborga boradigan qadoqdagi 1 dona — uzunlik, eni, balandlik (mm) va vazn (g); qadoqdagi yozuvdan koʻchirmang, oʻlchang',
  ]),
  'uzum.kartochka.qollanma.url': S('https://seller.uzum.uz/manual/uz/5.product-creation/'),
};
