/**
 * 1-qadam savollari — matn va javob variantlari.
 *
 * Manba: `docs/1-QADAM-SAVOLLAR.md`, 2026-08-24 da TASDIQLANGAN.
 *
 * NEGA BU YERDA, FORMADA EMAS. Savol matni va variantlar roʻyxati
 * uch joyda kerak boʻladi: web forma, Telegram bot, kengaytma. Uch
 * joyda takrorlansa ular albatta ajralib ketadi — birida variant
 * qoʻshiladi, boshqasida yoʻq, va bazada qaysi javob qaysi savolga
 * tegishli ekani chalkashadi. Matn bitta joyda turadi.
 *
 * `profilOqi()` bilan juftlashadi: har savolning `maydon` i
 * `ProfilJavoblari` dagi maydonga toʻgʻri keladi. Sinxronlik testi
 * ikkalasini solishtiradi — savolsiz maydon ham, maydonsiz savol
 * ham xato.
 *
 * FAQAT OʻZBEKCHA — ongli tanlov (hujjat, "Faqat oʻzbekcha" boʻlimi):
 * savollar hali oʻzgaradi va ikki tilni barobar olib borish har
 * oʻzgarishni ikki barobar qiladi.
 */

import {
  KAPITAL_MUDDATI,
  ONLAYN_TAJRIBA,
  RISK_TANLOVI,
  type ProfilJavoblari,
} from './profil.ts';

export type SavolTuri = 'kop' | 'bitta' | 'haYoq' | 'son' | 'matn';

export interface Savol {
  /** Hujjatdagi tartib raqami. */
  raqam: number;
  /** `ProfilJavoblari` dagi maydon nomi. */
  maydon: keyof ProfilJavoblari;
  /** Foydalanuvchi koʻradigan matn. Savol emas, suhbat ohangida. */
  matn: string;
  turi: SavolTuri;
  /** `kop` va `bitta` uchun variantlar: qiymat → koʻrinadigan nom. */
  variantlar?: ReadonlyArray<{ qiymat: string; nom: string }>;
  /** Nima uchun soʻralayotgani — "nega bu savol?" tugmasi ostida. */
  nega: string;
}

/**
 * Soha variantlari.
 *
 * `qismlar.ts` dagi `SOHA_TURKUM` kalitlari bilan BIR XIL boʻlishi
 * shart: forma "avto" yozadi, ball hisobi esa "avto" ni qidiradi.
 * Sinxronlik testi buni tekshiradi — aks holda foydalanuvchi javob
 * beradi, ball esa hech qachon oʻzgarmaydi va buni hech narsa
 * koʻrsatmaydi.
 */
export const SOHALAR = [
  { qiymat: 'avto', nom: 'Avto va mototexnika' },
  { qiymat: 'kiyim', nom: 'Kiyim va poyabzal' },
  { qiymat: 'bolalar', nom: 'Bolalar tovarlari' },
  { qiymat: 'elektronika', nom: 'Elektronika' },
  { qiymat: 'maishiy', nom: 'Maishiy texnika va oshxona' },
  { qiymat: 'qurilish', nom: 'Qurilish va asboblar' },
  { qiymat: 'kosmetika', nom: 'Kosmetika va parfyumeriya' },
  { qiymat: 'sport', nom: 'Sport va turizm' },
  { qiymat: 'dala', nom: 'Bogʻ va dala' },
] as const;

/** Shaharlar — kargo va ombor uchun. */
export const SHAHARLAR = [
  'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan',
  'Fargʻona', 'Qarshi', 'Nukus', 'Urganch', 'Navoiy',
  'Jizzax', 'Guliston', 'Termiz', 'Boshqa',
] as const;

const nomlar: Record<string, string> = {
  '3_oy': '3 oygacha',
  '6_oy': '6 oygacha',
  '1_yil': '1 yilgacha',
  muddatsiz: 'Muddati muhim emas',
  yoq: 'Yoʻq, birinchi marta',
  biroz: 'Biroz tajribam bor',
  tajribali: 'Ha, tajribaliman',
  ehtiyotkor: 'Tovar qolib ketishidan',
  tavakkal: 'Kam foydadan',
};

const tanlov = (royxat: readonly string[]) =>
  royxat.map((q) => ({ qiymat: q, nom: nomlar[q] ?? q }));

/** Hujjatdagi 12 savol, oʻsha tartibda. */
export const SAVOLLAR: readonly Savol[] = [
  {
    raqam: 1, maydon: 'experience', turi: 'kop', variantlar: SOHALAR,
    matn: 'Qaysi sohalarda ishlagansiz?',
    nega: 'Tajribangiz bor soha tavsiyada yuqoriroq turadi. Tajriba yoʻqligi ballni PASAYTIRMAYDI.',
  },
  {
    raqam: 2, maydon: 'familyField', turi: 'kop', variantlar: SOHALAR,
    matn: 'Oila aʼzolaringiz nima bilan shugʻullanadi?',
    nega: 'Doʻkon, ustaxona yoki dala — tanish yetkazuvchi va tayyor sotuv kanali degani.',
  },
  {
    raqam: 3, maydon: 'interest', turi: 'kop', variantlar: SOHALAR,
    matn: 'Qaysi sohada sotishni xohlaysiz?',
    nega: 'Qiziqish uzoq muddatda muhim: yoqmagan tovar bilan ishlash tez charchatadi.',
  },
  {
    raqam: 4, maydon: 'budgetUzs', turi: 'son',
    matn: 'Boshlash uchun qancha pul ajrata olasiz?',
    nega: 'Yoʻnalish va nechta tovar olish shu raqamdan chiqadi. Bilmasangiz — boʻsh qoldiring, taxmin yozmang.',
  },
  {
    raqam: 5, maydon: 'capitalLock', turi: 'bitta', variantlar: tanlov(KAPITAL_MUDDATI),
    matn: 'Bu pul qancha vaqt bogʻlanib qolishi mumkin?',
    nega: 'Tovar sekin ketsa pul qotib qoladi. Muddat qisqa boʻlsa tez aylanadigan yoʻnalish kerak.',
  },
  {
    raqam: 6, maydon: 'hoursPerWeek', turi: 'son',
    matn: 'Haftasiga necha soat vaqtingiz bor?',
    nega: 'Qaysi ishni oʻzingiz qilishingiz, qaysinisini biz qilishimiz shundan hal boʻladi.',
  },
  {
    raqam: 7, maydon: 'city', turi: 'bitta',
    variantlar: SHAHARLAR.map((s) => ({ qiymat: s, nom: s })),
    matn: 'Qaysi shahardasiz?',
    nega: 'Kargo narxi, ombor va yetkazish muddati shaharga bogʻliq.',
  },
  {
    raqam: 8, maydon: 'onlineExperience', turi: 'bitta', variantlar: tanlov(ONLAYN_TAJRIBA),
    matn: 'Ilgari onlayn sotganmisiz?',
    nega: 'Tushuntirish qanchalik batafsil boʻlishini shu belgilaydi.',
  },
  {
    raqam: 9, maydon: 'hasUzumShop', turi: 'haYoq',
    matn: 'Uzumda doʻkoningiz bormi?',
    nega: 'Doʻkoningiz boʻlsa oʻz sotuvingiz raqamlarini ham koʻrsata olamiz.',
  },
  {
    raqam: 10, maydon: 'importedFromChina', turi: 'haYoq',
    matn: 'Xitoydan tovar keltirganmisiz?',
    nega: 'Keltirmagan boʻlsangiz 4-qadam batafsilroq boʻladi — bu kamchilik emas.',
  },
  {
    raqam: 11, maydon: 'certExperience', turi: 'haYoq',
    matn: 'Sertifikat yoki markirovka bilan ishlaganmisiz?',
    nega: 'Baʼzi turkumlarga kirish sertifikat talab qiladi. Tajribangiz boʻlsa ular ham ochiq.',
  },
  {
    raqam: 12, maydon: 'riskPreference', turi: 'bitta', variantlar: tanlov(RISK_TANLOVI),
    matn: 'Nimadan koʻproq qoʻrqasiz: tovar qolib ketishidanmi yoki kam foydadanmi?',
    nega: 'Ehtiyotkor javob barqaror, tavakkal javob foydaliroq lekin xavfliroq yoʻnalish beradi.',
  },
];
