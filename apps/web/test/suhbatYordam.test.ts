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
import { jsonOl, keyingiKaliti, navbatBuzildimi, qisqaSavol, xatoGapi, XATO } from '../src/app/usta/suhbatYordam';
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

describe('qisqaSavol — savol kartasi sarlavhasi', () => {
  it('uzun kirish qismi tashlanadi, soʻz oʻrtasidan kesilmaydi (nazoratchi, 2026-10-06: «…miqdor va cheg…»)', () => {
    const t = qisqaSavol('Xitoydan qidirishdan oldin bitta savol: shu paytgacha — yoʻnalish, tovar, miqdor va chegara narx — Usta mantiqli tuyuldimi? Javobingiz Ustani yaxshilashga yordam beradi; xohlamasangiz — oʻtkazib yuboring.');
    expect(t).toBe('Usta mantiqli tuyuldimi?');
  });

  it('qaysi tovar haqida ekani koʻrinadi: «nom» soʻroq gapda boʻlmasa — oldiga', () => {
    const t = qisqaSavol('«Ayollar sumkasi, katta, A4 formatda, oʻqish, maktab, universitet, ish uchun, kundalik»: oyiga ~78 dona sotiladi · 30 kunlik zaxira = 4 dona. Birinchi partiya uchun nechta olasiz?');
    expect(t).toBe('«Ayollar sumkasi, katta, A4 formatda…» — Birinchi partiya uchun nechta olasiz?');
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
