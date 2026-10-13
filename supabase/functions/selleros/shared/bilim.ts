/**
 * YORDAMCHI BILIMI — LLM erkin savollarga shu faktlar bilan javob beradi.
 *
 * Nazoratchi (2026-10-13): "birinchi marta kirgan mijoz tushunmagan
 * joyida soʻrasa — har bir savoliga aniq javob va sodda yoʻnalish
 * koʻrsatishi kerak". Ilgari LLM ga ZumSavdo haqida 6 ta gap berilgan
 * edi va unga "tavsiya berma" deyilgan — koʻp savolga "aniq javob bera
 * olmayman" chiqardi.
 *
 * Qoida: bu yerdagi har gap — koddagi haqiqiy ishlash tartibi (qadamlar,
 * ball, oʻlchov) yoki manbasi koʻrsatilgan Uzum fakti. Raqamlari tekshiruv
 * darvozasida RUXSAT etiladi (`suhbat.ts`), shuning uchun bu yerga
 * manbasiz raqam yozilmaydi (QOIDALAR.md, 4-boʻlim).
 */

import { ERKIN_BILIM } from './erkin.ts';
import { UZUM_BILIMI } from './uzum-bilim.ts';

const QADAMLAR = [
  '1. Tanishuv — ism, telefon, savdo tajribasi, qaysi soha yoqishi va qancha pul bilan boshlash.',
  '2. Yoʻnalish — Uzumdagi kuzatilayotgan yoʻnalishlar (turkumlar) 100 ballik «imkoniyat bahosi» bilan; roʻyxat '
    + 'mijozning qiziqishi va boshqa sohalardan aralash; «Yana koʻrsatish» va pastga tovar nomini yozib qidirish mumkin.',
  '3. Tovar va miqdor — tanlangan yoʻnalishdagi Uzum tovarlari kartalari: narx, oxirgi 30 kunda nechta sotilgani '
    + '(oʻlchangan boʻlsa), xaridorlar bahosi; xavfli tovarlar roʻyxatdan chiqariladi; birinchi partiya miqdori '
    + 'faqat oʻlchangan sotuvdan hisoblanadi.',
  '4. Tannarx — sotuv narxi, Uzum komissiyasi va xarajatlari, kargo va istalgan marja boʻyicha Xitoyda tovar uchun '
    + 'toʻlash mumkin boʻlgan chegara narx hisoblanadi.',
  '5. Xitoydan topish — tovar rasmi boʻyicha 1688 dan oʻxshash takliflar; narx Markaziy bank kursi bilan soʻmga '
    + 'oʻgiriladi va chegara narx bilan solishtiriladi.',
  '6. Buyurtma va kargo — agentga yuboriladigan buyurtma varaqasi va kargo yoʻli.',
  '7. Rasmiylashtirish — YATT yoki MChJ, soliq, bank, Uzum bilan shartnoma boʻyicha faktlar.',
  '8. Qabul — yuk kelganda sanash va koʻzdan kechirish; kam yoki nuqsonli boʻlsa — daʼvo uchun yozib qoʻyish.',
  '9. Studiya — kartochka uchun oq fonli suratlar.',
  '10. Yuklash — Uzum kartochkasi qoidalari va omborga topshirish.',
  '11. Sotuv boshlandi — oʻz kartochkalaringiz sotuvini kuzatish va ogohlantirishlar (zaxira tugayapti va h.k.).',
  '12. Hisobot — oy hisoboti: sotuv, komissiya, soliq.',
];

const LUGAT = [
  'Imkoniyat bahosi (ball) — 100 ballik baho: xaridor qanchalik koʻp (boshqa yoʻnalishlarga nisbatan), bozorda yangi '
    + 'sotuvchiga joy bormi (eng katta 3 doʻkon ulushi va sotuvchilar soni), maxsus ruxsat kerakmi (sertifikat, '
    + 'markirovka) va hozir mavsummi. Baho qancha yuqori — boshlash shuncha osonroq. 70 dan yuqori — «yaxshi», 50 dan — «oʻrtacha», undan past — «past».',
  '«Bozor ochiq» — eng katta 3 doʻkon savdoning 30 % idan kamini oladi; «Yirik doʻkonlar bor» — 30–60 %; '
    + '«Bozor bir necha doʻkon qoʻlida» — 60 % dan koʻpini, yangi sotuvchiga qiyin.',
  '«Pulingiz yetadi» — aytilgan pul shu yoʻnalish uchun tavsiya etilgan boshlash summasiga yetadi.',
  'Oxirgi 30 kunlik sotuv — Uzum sotuv sonini koʻrsatmaydi; tovar qoldigʻi kuniga 3 marta tekshiriladi va qoldiq '
    + 'kamaygani sotuv deb hisoblanadi. Shuning uchun taxminiy. Kuzatuv 2026-yil avgustda boshlangan — mavsum va yil '
    + 'boʻyicha sotuv hali yoʻq.',
  '«Uzumda hozir tugagan» — oxirgi tekshiruvda tovar qoldigʻi 0 edi; bunday tovarning sotuvini oʻlchab boʻlmaydi.',
  'Tannarx — tovar sizga necha soʻmga tushgani: Xitoydagi narx, kargo va boshqa xarajatlar.',
  'Marja — sotuv narxidan xarajatlar (tannarx, Uzum komissiyasi va boshqalar) chiqqandan keyin qoladigan foiz.',
  'Chegara narx — Xitoyda bitta tovar uchun toʻlash mumkin boʻlgan eng yuqori narx: undan qimmat olinsa, tanlangan '
    + 'marja qolmaydi.',
  'Komissiya — Uzum har sotuvdan oladigan foiz; turkumga qarab har xil (4-qadamda tanlangan turkum boʻyicha olinadi).',
  'Kargo — Xitoydan Oʻzbekistonga yuk tashish xizmati; narxi kargo kompaniyasiga bogʻliq.',
  '1688 — Xitoyning ulgurji savdo sayti (zavod va ulgurji sotuvchilar narxlari).',
  'Partiya — bir martada olinadigan tovar miqdori.',
  'YATT — yakka tartibdagi tadbirkor; MChJ — masʼuliyati cheklangan jamiyat.',
  'Markirovka va sertifikat — ayrim tovar guruhlari uchun majburiy; kerak boʻlsa, yoʻnalish kartasida '
    + '«Ruxsat kerak boʻlishi mumkin» deb yoziladi.',
  'Xavfli tovar (tuzoq) belgilari: yopiq brend (brendni faqat egasi sotadi — Uzum ruxsat hujjatini soʻraydi), '
    + 'sotuvga nisbatan sharh juda kam yoki juda koʻp (raqam shubhali), mavsumiy tovar, ogʻir yoki katta hajmli tovar '
    + '(kargo qimmat), qisqa trend, monopol bozor.',
];

const MASLAHAT = [
  'Hamma pulni birinchi partiyaga tikmang — bir qismini zaxirada qoldiring: tovar kelib, sotilib, pul qaytguncha '
    + 'vaqt oʻtadi; reklama, qaytgan yoki nuqsonli tovar, ikkinchi partiya va kutilmagan xarajatlar chiqadi.',
  'Birinchi partiyani kichikroq oling: qanday sotilishini koʻrib, keyin koʻpaytiring.',
  'Oʻzingiz tushunadigan sohadan boshlang: sifatni tekshirish, rasm va tavsif tayyorlash, xaridorga javob berish oson.',
  'Sertifikat yoki markirovka talab qilinadigan tovarda birinchi marta vaqt va xarajat koʻproq ketadi.',
  'Ogʻir va katta hajmli tovarda kargo va logistika qimmat — tannarxni oldin hisoblang.',
  'Mavsumiy tovarni mavsum boshlanishidan oldin olib keling.',
  'Sotuv raqamlari taxminiy — bitta raqamga emas, bir nechta tovarni solishtirib qaror qiling.',
  'Yopiq brend tovarini sotmang: Uzum huquq egasidan ruxsat hujjatini soʻraydi.',
  'Qaror — mijozniki; ZumSavdo raqamlarni, manbasini va xavflarni koʻrsatadi.',
];

/** LLM ga beriladigan doimiy bilim (har erkin savolda). */
export const YORDAMCHI_BILIMI = [
  ERKIN_BILIM,
  'ZumSavdo qadamlari (har birida nima boʻladi):',
  ...QADAMLAR.map((q) => `- ${q}`),
  'Soʻzlar lugʻati (chatda va kartalarda shunday tushuniladi):',
  ...LUGAT.map((q) => `- ${q}`),
  'Umumiy maslahatlar (yangi sotuvchi uchun, raqamsiz):',
  ...MASLAHAT.map((q) => `- ${q}`),
  ...(UZUM_BILIMI.length ? ['Uzum haqida faktlar (Uzum rasmiy manbalaridan):', ...UZUM_BILIMI.map((q) => `- ${q}`)] : []),
].join('\n');
