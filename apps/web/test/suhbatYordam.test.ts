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
import { havolaQismlari, jsonOl, keyingiKaliti, kichikRasm, navbatBuzildimi, qisqaSavol, uzilmasSon, xatoGapi, XATO } from '../src/app/usta/suhbatYordam';
import { tarjima } from '../src/lib/til';

const uz = tarjima('uz');
const ru = tarjima('ru');

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

describe('qisqaSavol — savol kartasi sarlavhasi', () => {
  it('uzun kirish qismi tashlanadi, soʻz oʻrtasidan kesilmaydi (nazoratchi, 2026-10-06: «…miqdor va cheg…»)', () => {
    const t = qisqaSavol('Xitoydan qidirishdan oldin bitta savol: shu paytgacha — yoʻnalish, tovar, miqdor va chegara narx — Usta mantiqli tuyuldimi? Javobingiz Ustani yaxshilashga yordam beradi; xohlamasangiz — oʻtkazib yuboring.');
    expect(t).toBe('Usta mantiqli tuyuldimi?');
  });

  it('qaysi tovar haqida ekani koʻrinadi: «nom» soʻroq gapda boʻlmasa — oldiga', () => {
    const t = qisqaSavol('«Ayollar sumkasi, katta, A4 formatda, oʻqish, maktab, universitet, ish uchun, kundalik»: oyiga ~78 dona sotiladi · 30 kunlik zaxira = 4 dona. Birinchi partiya uchun nechta olasiz?');
    expect(t).toBe('«Ayollar sumkasi, katta, A4 formatda…» — Birinchi partiya uchun nechta olasiz?');
  });

  it('tugma yoki menyu nomi («Keldi», «Yetkazmalar → Yaratish») sarlavhaga chiqmaydi (2026-10-07)', () => {
    expect(qisqaSavol('Kelguncha doʻkonni tayyorlaymiz. Yuk kelganini oʻzingiz aytasiz («Keldi» tugmasi) — eslatma hali yoʻq. Boshlaymizmi?')).toBe('Boshlaymizmi?');
    expect(qisqaSavol('Kabinetda «Yetkazmalar → Yaratish»: tovarlar (100 SKU gacha), tannarx, dona, taymslot. Yaratdingizmi?')).toBe('Yaratdingizmi?');
    expect(qisqaSavol('Ombor: Toshkent (Fulfillment markazi, «Uzum» peshtaxtasi), har kuni 06:00–00:00. Qanday yetkazasiz?')).toBe('Qanday yetkazasiz?');
  });

  it('soʻroq gap yoʻq — boʻsh satr (sarlavhani chaqiruvchi tanlaydi)', () => {
    expect(qisqaSavol('Zaxira: 6 dona. Shu tezlikda 42 kunga yetadi. Oy yakunida — «Oy hisoboti».')).toBe('');
    expect(qisqaSavol('Qadamlar kartada — har birini bajaring va «Bajardim» ni bosing. Sayt boshqacha boʻlsa — «Sayt boshqacha», nazoratchi tekshiradi.')).toBe('');
  });

  it('qisqa savol — oʻzicha; juda uzun — soʻz chegarasida «…»', () => {
    expect(qisqaSavol('Uzumda doʻkoningiz bormi?')).toBe('Uzumda doʻkoningiz bormi?');
    const uzun = qisqaSavol(`${'soʻz '.repeat(40)}tugadimi?`);
    expect(uzun.length).toBeLessThanOrEqual(121);
    expect(uzun.endsWith('…')).toBe(true);
    // Soʻz chegarasida: oxirgi soʻz butun ("soʻz…"), yarmi emas ("so…").
    expect(uzun).toMatch(/soʻz…$/u);
  });
});
