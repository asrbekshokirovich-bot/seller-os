/**
 * Chat sahifasining sof yordamchilari.
 *
 * NEGA BU TESTLAR BOR. Audit (2026-10-05) chatda texnik xatolar
 * ochiq koʻrinishini topdi: "Soʻrov yuborilmadi: TypeError: Failed to
 * fetch", "SyntaxError: Unexpected token", rus tilida — oʻzbekcha. Va
 * 5/9-qadam kutishida har 8 s dagi tekshiruv suhbatni pastga sakratardi,
 * chunki "yangi" `keyingi` obyekti yangi savol deb olinardi. Bu
 * funksiyalar shu ikkisini hal qiladi.
 */

import { describe, expect, it } from 'vitest';
import { aloqaJavobi, batafsilmi, boshlangichTanlov, dollarMatni, formaTelefoni, havolaQismlari, jsonOl, keyingiKaliti, kichikRasm, langarQarori, navbatBuzildimi, pastgaHolati, raqamSavolimi, salomBolagi, sorovLangari, tanlanganNomlar, telefonGuruhla, uzilmasSon, xatoGapi, XATO, yonmaJoriy, type Langar } from '../src/app/usta/suhbatYordam';
import { tarjima } from '../src/lib/til';

const uz = tarjima('uz');
const ru = tarjima('ru');

describe('boshlangichTanlov (2026-10-15: tajribada yozgan soha oldindan belgilanadi)', () => {
  const savol = {
    id: 'qiziqish', qadam: 1, matn: 'Qaysi sohada?', turi: 'kopTanlov' as const, erkin: true, otkazishMumkin: true,
    variantlar: [{ qiymat: 'kiyim', nom: 'Kiyim' }, { qiymat: 'uy', nom: 'Uy-roʻzgʻor va maishiy texnika' }],
  };

  it('server belgilaganlari — faqat shu savol variantlaridan; boʻlmasa boʻsh', () => {
    expect(boshlangichTanlov({ tur: 'savol', savol: { ...savol, tanlangan: ['uy'] } })).toEqual(['uy']);
    expect(boshlangichTanlov({ tur: 'savol', savol: { ...savol, tanlangan: ['uy', 'notanish'] } })).toEqual(['uy']);
    expect(boshlangichTanlov({ tur: 'savol', savol })).toEqual([]);
    expect(boshlangichTanlov({ tur: 'savol', savol: { ...savol, turi: 'tanlov', tanlangan: ['uy'] } })).toEqual([]);
    expect(boshlangichTanlov({ tur: 'kod', harakat: 'kurs', qadam: 1 })).toEqual([]);
    expect(boshlangichTanlov(null)).toEqual([]);
  });
});

describe('keyingiKaliti', () => {
  it('savol — id boʻyicha; kutish matni oʻzgarsa ham kalit oʻsha', () => {
    const savol = { id: 'byudjet', qadam: 1, matn: 'Qancha?', turi: 'son' as const, variantlar: [], erkin: true, otkazishMumkin: false };
    expect(keyingiKaliti({ tur: 'savol', savol })).toBe('savol:byudjet');
    expect(keyingiKaliti({ tur: 'savol', savol: { ...savol, matn: 'boshqa matn' } })).toBe('savol:byudjet');
    const a = keyingiKaliti({ tur: 'kutish', qadam: 5, matn: '1688 da qidirilmoqda (1)', boshlandi: null });
    const b = keyingiKaliti({ tur: 'kutish', qadam: 5, matn: '1688 da qidirilmoqda (2)', boshlandi: '2026-10-05' });
    expect(a).toBe(b);
    expect(keyingiKaliti({ tur: 'kod', harakat: 'sotuv', qadam: 11 })).toBe('kod:sotuv');
    expect(keyingiKaliti(null)).toBe('');
  });
});

describe('jsonOl', () => {
  it('JSON boʻlmagan javob — null, yiqilmaydi', async () => {
    expect(await jsonOl({ json: async () => { throw new SyntaxError('Unexpected token <'); } })).toBeNull();
    expect(await jsonOl({ json: async () => null })).toBeNull();
    expect(await jsonOl({ json: async () => 'matn' })).toBeNull();
    expect(await jsonOl({ json: async () => ({ xabarlar: [], qadam: 1 }) })).toEqual({ xabarlar: [], qadam: 1 });
  });
});

describe('xatoGapi', () => {
  it('oʻz belgilarimiz — ikki tilda, texnik soʻzsiz', () => {
    for (const x of Object.values(XATO)) {
      const u = xatoGapi(x, uz);
      const r = xatoGapi(x, ru);
      expect(u).not.toMatch(/§|Error|fetch/);
      expect(r).toMatch(/[а-я]/);
      expect(r).not.toBe(u);
    }
  });

  it('server va proksi xatolari — odam tilida, xom matn koʻrinmaydi', () => {
    expect(xatoGapi('API ga ulanib boʻlmadi: TypeError: fetch failed', uz)).toBe('Server bilan aloqa boʻlmadi. Qayta urinib koʻring.');
    expect(xatoGapi('API ga ulanib boʻlmadi: TypeError: fetch failed', ru)).toBe('Нет связи с сервером. Попробуйте ещё раз.');
    expect(xatoGapi('sessiya ochilmadi', uz)).toMatch(/aloqa/);
    expect(xatoGapi('baza javob bermadi', ru)).toMatch(/База/);
    expect(xatoGapi('sessiya topilmadi', uz)).toMatch(/Sessiya topilmadi/);
    expect(xatoGapi('jurnalga yozilmadi', uz)).toMatch(/saqlanmadi/);
    expect(xatoGapi('ssenariy aylanib qoldi: "sotuv" harakati takrorlanaverdi', uz)).not.toMatch(/harakati|sotuv/);
  });

  it('ssenariyning qisqa rad matni — bosh harf, nuqta, rus tilida ham', () => {
    expect(xatoGapi('variantlardan birini tanlang', uz)).toBe('Variantlardan birini tanlang.');
    expect(xatoGapi('variantlardan birini tanlang', ru)).toBe('Выберите один из вариантов.');
    // Tanish boʻlmagan ssenariy gapi — oʻzicha (u allaqachon odam uchun yozilgan).
    expect(xatoGapi('Marja 0 dan 99 % gacha boʻlsin.', uz)).toBe('Marja 0 dan 99 % gacha boʻlsin.');
  });
});

describe('navbatBuzildimi', () => {
  it('boshqa oynada oldinga ketgan suhbat', () => {
    expect(navbatBuzildimi('navbat buzildi: hozir "byudjet" savoli kutilmoqda')).toBe(true);
    expect(navbatBuzildimi('hozir savol kutilmayapti')).toBe(true);
    expect(navbatBuzildimi('variantlardan birini tanlang')).toBe(false);
    expect(navbatBuzildimi(undefined)).toBe(false);
  });
});

describe('uzilmasSon — son ichida qator uzilmaydi (telefonda «108 / 920», 2026-10-07)', () => {
  const NB = ' ';
  it('mingliklar va «≈» — uzilmas boʻshliq; boshqa boʻshliqlar oʻzicha', () => {
    expect(uzilmasSon('¥62 ≈ 108 920')).toBe(`¥62 ≈${NB}108${NB}920`);
    expect(uzilmasSon('98 010 soʻm × (1 − 30%) − komissiya 24 503 = 37 104 soʻm'))
      .toBe(`98${NB}010 soʻm × (1 − 30%) − komissiya 24${NB}503 = 37${NB}104 soʻm`);
    expect(uzilmasSon('1 850 863')).toBe(`1${NB}850${NB}863`);
    expect(uzilmasSon('4 dona')).toBe('4 dona');
    expect(uzilmasSon('30 kunlik zaxira — 4 dona')).toBe('30 kunlik zaxira — 4 dona');
  });
});

describe('havolaQismlari — chatdagi manzil bosiladi', () => {
  it('manzil ajraladi, oxiridagi tinish belgisi kirmaydi', () => {
    expect(havolaQismlari('Viloyatdan — https://logistics.uzum.uz (quti 20 kg gacha).')).toEqual([
      { matn: 'Viloyatdan — ', havola: false },
      { matn: 'https://logistics.uzum.uz', havola: true },
      { matn: ' (quti 20 kg gacha).', havola: false },
    ]);
    expect(havolaQismlari('https://my3.soliq.uz ga kiring.')[0]).toEqual({ matn: 'https://my3.soliq.uz', havola: true });
    expect(havolaQismlari('Saytga kiring: https://seller.uzum.uz/manual/uz/3.tariffs.')[1])
      .toEqual({ matn: 'https://seller.uzum.uz/manual/uz/3.tariffs', havola: true });
  });

  it('manzilsiz matn — bitta oddiy qism; sxemasiz domen havola emas', () => {
    expect(havolaQismlari('Hammasi mosmi?')).toEqual([{ matn: 'Hammasi mosmi?', havola: false }]);
    expect(havolaQismlari('Manba: seller.uzum.uz/manual')).toEqual([{ matn: 'Manba: seller.uzum.uz/manual', havola: false }]);
  });
});

describe('kichikRasm — 1688 rasmi kartada kichik nusxada', () => {
  it('alicdn — _600x600.jpg qoʻshiladi', () => {
    expect(kichikRasm('https://cbu01.alicdn.com/O1CN01uNFCKH1SJ6NNRyeAY_!!2222171032225-0-cib.jpg'))
      .toBe('https://cbu01.alicdn.com/O1CN01uNFCKH1SJ6NNRyeAY_!!2222171032225-0-cib.jpg_600x600.jpg');
    expect(kichikRasm('https://cbu01.alicdn.com/img/ibank/O1CN018rCrg21SJ6NN2vkZ5_!!2222171032225-0-cib.png'))
      .toBe('https://cbu01.alicdn.com/img/ibank/O1CN018rCrg21SJ6NN2vkZ5_!!2222171032225-0-cib.png_600x600.jpg');
  });

  it('boshqa manzil, imzoli studiya, soʻrovli yoki oʻlchamli manzil — oʻzgarmaydi', () => {
    const uzum = 'https://images.uzum.uz/d61p543q345o6s420l5g/t_product_540_high.jpg';
    expect(kichikRasm(uzum)).toBe(uzum);
    const studiya = 'https://selleros-studiya.zumsavdo.workers.dev/?r=auto&src=https%3A%2F%2Fcbu01.alicdn.com%2Fa.jpg&s=9472';
    expect(kichikRasm(studiya)).toBe(studiya);
    const sorovli = 'https://cbu01.alicdn.com/a.jpg?x=1';
    expect(kichikRasm(sorovli)).toBe(sorovli);
    const tayyor = 'https://cbu01.alicdn.com/a.jpg_300x300.jpg';
    expect(kichikRasm(tayyor)).toBe(tayyor);
    const tayyor2 = 'https://cbu01.alicdn.com/a-0-cib.310x310.jpg';
    expect(kichikRasm(tayyor2)).toBe(tayyor2);
    const soxta = 'https://alicdn.com.yomon.uz/a.jpg';
    expect(kichikRasm(soxta)).toBe(soxta);
  });
});

describe('batafsilmi (3-taklif, 2026-10-27)', () => {
  it('faqat menejerning `javob: {batafsil: true}` xabari', () => {
    expect(batafsilmi({ rol: 'menejer', matn: 'x', javob: { batafsil: true } })).toBe(true);
    expect(batafsilmi({ rol: 'menejer', matn: 'x', javob: { erkin: true } })).toBe(false);
    expect(batafsilmi({ rol: 'menejer', matn: 'x' })).toBe(false);
    expect(batafsilmi({ rol: 'kod', matn: 'x', javob: { batafsil: true } })).toBe(false);
    expect(batafsilmi({ rol: 'menejer', matn: 'x', javob: null })).toBe(false);
  });
});

/*
 * Aylantirish (nazoratchi, 2026-11-03: «variant yoki tovar tanlaganda scroll pastga tushib
 * ketyapti»). Telefonda oʻlchandi: pul tanlagach ekran 2 600 px, ism yozgach 10 900 px pastga —
 * javobning oxiriga sakrardi; 1688 da har tanlovdan keyin pastga ketardi.
 */
describe('sorovLangari — soʻrovdan keyin javob qayerdan koʻrinadi', () => {
  it('mijoz gapi (tugma, yozilgan matn) — `men`: uning pufagi ekran tepasiga', () => {
    expect(sorovLangari({ savolId: 'byudjet', javob: 30_000_000 }, '30 mln soʻm')).toBe('men');
    expect(sorovLangari({ savolId: 'ism', matn: 'Aziz, +998 90 123 45 67' }, 'Aziz, +998 90 123 45 67')).toBe('men');
    expect(sorovLangari({ tahrir: 'byudjet' }, 'Pulni oʻzgartiraman')).toBe('men');
  });

  it('1688 tanlovi (oʻtkazib yuborish ham) — `xitoy`: keyingi tovarga, pastga emas', () => {
    expect(sorovLangari({ savolId: 'xitoy_tanlov:123', javob: 'abc' }, '¥12 · zavod')).toBe('xitoy');
    expect(sorovLangari({ savolId: 'xitoy_tanlov:123', javob: null }, null)).toBe('xitoy');
    expect(sorovLangari({ savolId: 'xitoy_qayta', javob: 'davom' }, 'Shusiz davom etamiz')).toBe('men');
  });

  it('boshidan — `tepa`; kod qadami va tekshiruv (koʻrinadigan gapsiz) — langar oʻzgarmaydi', () => {
    expect(sorovLangari({ boshdan: true }, null)).toBe('tepa');
    expect(sorovLangari({}, null)).toBeNull();
    expect(sorovLangari({ tekshir: true }, null)).toBeNull();
  });
});

describe('langarQarori — faqat pastga, faqat langargacha, mijoz aylantirsa — joyida', () => {
  const l = (o: Partial<Langar> = {}): Langar => ({ tur: 'men', qolda: false, sakra: false, ...o });

  it('javob uzaygan sari langar tepaga chiqquncha pastga yuradi, keyin toʻxtaydi', () => {
    // Yuborilgan zahoti: pufak pastda, tagida faqat «Yozmoqda…» — nuqta = oxiri.
    expect(langarQarori(l(), true, 900, 1000)).toEqual({ top: 1000, darhol: false });
    // Javob ekrandan uzun: langar tepaga chiqdi — undan pastga quvilmaydi (ilgari +10 900 px).
    expect(langarQarori(l(), false, 1000, 1000)).toBeNull();
    expect(langarQarori(l(), false, 1000, 1000.5)).toBeNull();
  });

  it('hech qachon oʻzi tepaga tortmaydi (sakrashdan tashqari)', () => {
    expect(langarQarori(l(), false, 3000, 1000)).toBeNull();
  });

  it('mijoz oʻzi aylantirgan — joyida; 1688 tanlovi yoʻlda — joyida, javob kelgach keyingi tovarga', () => {
    expect(langarQarori(l({ qolda: true }), false, 0, 5000)).toBeNull();
    expect(langarQarori(l({ tur: 'xitoy' }), true, 100, 2000)).toBeNull();
    expect(langarQarori(l({ tur: 'xitoy' }), false, 100, 2000)).toEqual({ top: 2000, darhol: false });
  });

  it('sakrash (ochilganda, boshidan, «Suhbatlarim») — istalgan tomonga, darhol; nuqta yoʻq — eng tepa', () => {
    expect(langarQarori(l({ sakra: true }), false, 3000, 1000)).toEqual({ top: 1000, darhol: true });
    expect(langarQarori(l({ sakra: true, qolda: true }), false, 3000, 1000)).toEqual({ top: 1000, darhol: true });
    expect(langarQarori(l({ sakra: true, tur: 'tepa' }), true, 3000, null)).toEqual({ top: 0, darhol: true });
  });

  it('langar topilmadi (yangi suhbat) — joyida', () => {
    expect(langarQarori(l(), false, 0, null)).toBeNull();
    expect(langarQarori(l(), false, 0, null, true)).toBeNull();
  });

  it('javob tugadi — langar joyiga qaytadi, TEPAGA ham (savol tugmalari yigʻilib, mijoz gapi 352 px chiqib ketardi)', () => {
    expect(langarQarori(l(), false, 844, 480, true)).toEqual({ top: 480, darhol: true });
    expect(langarQarori(l(), false, 300, 480, true)).toEqual({ top: 480, darhol: true });
    expect(langarQarori(l(), false, 480, 480.5, true)).toBeNull();
    // Mijoz oʻzi aylantirgan — tegilmaydi; 1688 — keyingi tovarga silliq.
    expect(langarQarori(l({ qolda: true }), false, 844, 480, true)).toBeNull();
    expect(langarQarori(l({ tur: 'xitoy' }), false, 844, 1500, true)).toEqual({ top: 1500, darhol: false });
  });
});

describe('pastgaHolati — «↓ Savolga» qachon chiqadi', () => {
  it('savol ekran pastidan tashqarida — `savol`; koʻrinib tursa — yoʻq', () => {
    expect(pastgaHolati(900, 650, 2000)).toBe('savol');
    expect(pastgaHolati(600, 650, 2000)).toBe('savol'); // 60 px dan kam koʻrinadi
    expect(pastgaHolati(589, 650, 2000)).toBeNull();
    expect(pastgaHolati(-300, 650, 0)).toBeNull(); // savol tepada, mijoz undan pastda
  });

  it('savol yoʻq yoki javob kutilmoqda — pastda koʻp qolsa `past`', () => {
    expect(pastgaHolati(null, 650, 161)).toBe('past');
    expect(pastgaHolati(null, 650, 160)).toBeNull();
    expect(pastgaHolati(null, 650, 0)).toBeNull();
  });
});

describe('yonmaJoriy — telefonda yonma-yon kartalarda nechanchisi', () => {
  it('surilgan masofa / karta qadami, yaxlitlab, chegarada', () => {
    expect(yonmaJoriy(0, 300, 10)).toBe(0);
    expect(yonmaJoriy(149, 300, 10)).toBe(0);
    expect(yonmaJoriy(151, 300, 10)).toBe(1);
    expect(yonmaJoriy(2700, 300, 10)).toBe(9);
    expect(yonmaJoriy(99_999, 300, 10)).toBe(9);
    expect(yonmaJoriy(-20, 300, 10)).toBe(0);
  });

  it('oʻlchab boʻlmasa (karta kengligi 0, roʻyxat boʻsh) — 0', () => {
    expect(yonmaJoriy(500, 0, 10)).toBe(0);
    expect(yonmaJoriy(500, Number.NaN, 10)).toBe(0);
    expect(yonmaJoriy(500, 300, 0)).toBe(0);
  });
});

describe('javob berish qulayligi (nazoratchi, 2026-11-04: «hammasi yoqdi»)', () => {
  it('formaTelefoni: +998 bilan, 998 bilan, 8 bilan va 9 xona — bitta milliy raqam; boshqasi null', () => {
    expect(formaTelefoni('90 123 45 67')).toBe('901234567');
    expect(formaTelefoni('+998 90 123-45-67')).toBe('901234567');
    expect(formaTelefoni('998901234567')).toBe('901234567');
    expect(formaTelefoni('8 90 123 45 67')).toBe('901234567');
    expect(formaTelefoni('(93) 123 45 67')).toBe('931234567');
    expect(formaTelefoni('90 123 45 6')).toBeNull();
    expect(formaTelefoni('012345678')).toBeNull();
    expect(formaTelefoni('90 123 45 678')).toBeNull();
    expect(formaTelefoni('')).toBeNull();
    expect(telefonGuruhla('901234567')).toBe('90 123 45 67');
  });

  it('aloqaJavobi: ikki maydon → bitta javob (server oʻqiydi) va chatdagi koʻrinishi; xato — qaysi maydon', () => {
    expect(aloqaJavobi('ism_telefon', '  Aziz   Karimov ', '90 123 45 67')).toEqual({ javob: 'Aziz Karimov, +998901234567', korinish: 'Aziz Karimov, +998 90 123 45 67' });
    expect(aloqaJavobi('ism_telefon', 'Aziz', '90 123 45 67')).toEqual({ xato: 'ism' });
    expect(aloqaJavobi('ism_telefon', 'Aziz 2Karimov', '90 123 45 67')).toEqual({ xato: 'ism' });
    expect(aloqaJavobi('ism_telefon', 'Aziz Karimov', '90 123')).toEqual({ xato: 'telefon' });
    // Faqat ism (telefon oldin berilgan) — telefon maydoni yoʻq, tekshirilmaydi.
    expect(aloqaJavobi('ism', 'Aziz Karimov', '')).toEqual({ javob: 'Aziz Karimov', korinish: 'Aziz Karimov' });
    // Faqat telefon — ism tekshirilmaydi.
    expect(aloqaJavobi('telefon', '', '+998901234567')).toEqual({ javob: '+998901234567', korinish: '+998 90 123 45 67' });
    expect(aloqaJavobi('telefon', '', '12')).toEqual({ xato: 'telefon' });
  });

  it('raqamSavolimi: marja va dona — raqam klaviaturasi; pul, ism, telefon — yoʻq', () => {
    expect(raqamSavolimi('marja')).toBe(true);
    expect(raqamSavolimi('miqdor:123')).toBe(true);
    expect(raqamSavolimi('partiya_miqdor:9')).toBe(true);
    expect(raqamSavolimi('byudjet')).toBe(false);
    expect(raqamSavolimi('telefon')).toBe(false);
    expect(raqamSavolimi('marja_eski')).toBe(false);
  });

  it('dollarMatni: «Dollarda yozaman» dan keyin faqat son — oxiriga $; birlik bilan — oʻzicha', () => {
    expect(dollarMatni('5000')).toBe('5000 $');
    expect(dollarMatni(' 5 000 ')).toBe('5 000 $');
    expect(dollarMatni('5000 $')).toBe('5000 $');
    expect(dollarMatni('70 mln')).toBe('70 mln');
    expect(dollarMatni('qancha kerak?')).toBe('qancha kerak?');
  });

  it('tanlanganNomlar: variantlar tartibida, son va matn qiymatlari bir xil', () => {
    const v = [{ qiymat: 'kiyim', nom: 'Kiyim' }, { qiymat: 'sport', nom: 'Sport' }, { qiymat: 7, nom: 'Yetti' }];
    expect(tanlanganNomlar(v, ['sport', 'kiyim'])).toEqual(['Kiyim', 'Sport']);
    expect(tanlanganNomlar(v, ['7'])).toEqual(['Yetti']);
    expect(tanlanganNomlar(v, [])).toEqual([]);
    expect(tanlanganNomlar(v, ['yoq'])).toEqual([]);
  });
});

describe('salomBolagi (11-taklif: «Batafsil» salomdan keyin)', () => {
  it('birinchi xatboshi — salom, qolgani — savol; xatboshisiz — bitta boʻlak', () => {
    expect(salomBolagi('Salom!\n\nQaysi soha?')).toEqual(['Salom!', 'Qaysi soha?']);
    expect(salomBolagi('Salom!\n\nBir.\n\nIkki?')).toEqual(['Salom!', 'Bir.\n\nIkki?']);
    expect(salomBolagi('Faqat savol?')).toEqual(['Faqat savol?', null]);
    // Salom ichida oddiy qator uzilishi boʻlsa — boʻlinmaydi (faqat boʻsh qator — xatoboshi).
    expect(salomBolagi('Salom!\nMen yordamchiman.\n\nQaysi soha?')).toEqual(['Salom!\nMen yordamchiman.', 'Qaysi soha?']);
    expect(salomBolagi('Salom!\n\n')).toEqual(['Salom!', null]);
  });
});
