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
import { jsonOl, manbaKorinishi, xatoGapi, XATO } from '../src/app/_suhbat/suhbatYordam';
import { tarjima } from '../src/lib/til';

const uz = tarjima('uz');
const ru = tarjima('ru');

describe('manbaKorinishi (ikkinchi koʻrik, 1-taklif: ichki fayl nomi va xom manba mijozga chiqmasin)', () => {
  it('saytlar — bosiladigan havola, sayt boʻyicha bittadan; sana DD.MM.YYYY', () => {
    expect(manbaKorinishi('PQ-247 12.08.2025 (lex.uz/docs/-7681520); OʻRQ-1108 25.12.2025 (buxgalter.uz text212712)', '2026-09-28')).toEqual({
      havolalar: [{ nom: 'lex.uz', url: 'https://lex.uz/docs/-7681520' }, { nom: 'buxgalter.uz', url: 'https://buxgalter.uz' }],
      matn: null, sana: '28.09.2026',
    });
    expect(manbaKorinishi('seller.uzum.uz/manual/uz/4.start-working (4.2); Uzum roʻyxat Google-hujjati', null).havolalar)
      .toEqual([{ nom: 'seller.uzum.uz', url: 'https://seller.uzum.uz/manual/uz/4.start-working' }]);
  });

  it('ichki hujjat (docs/…md) tashlanadi; sayt yoʻq — matn, «ikkilamchi» belgisisiz; hech narsa — faqat sana', () => {
    expect(manbaKorinishi('docs/RASMIYLASHTIRISH-FAKTLAR.md, 4-boʻlim — 6 bank, bank saytlari', '2026-10-14'))
      .toEqual({ havolalar: [], matn: null, sana: '14.10.2026' });
    expect(manbaKorinishi('soliq.uz — interaktiv xizmatlar; docs/RASMIYLASHTIRISH-FAKTLAR.md 5-boʻlim', '2026-09-30').havolalar)
      .toEqual([{ nom: 'soliq.uz', url: 'https://soliq.uz' }]);
    expect(manbaKorinishi('Oferta 14.08.2026, 4.17-band', '2026-09-28')).toEqual({ havolalar: [], matn: 'Oferta 14.08.2026, 4.17-band', sana: '28.09.2026' });
    expect(manbaKorinishi('Soliq qoʻmitasi 50017 (ikkilamchi)', null).matn).toBe('Soliq qoʻmitasi 50017');
    expect(manbaKorinishi(null, null)).toEqual({ havolalar: [], matn: null, sana: null });
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
