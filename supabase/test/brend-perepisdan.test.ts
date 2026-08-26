/**
 * `brandSellersCount` perepisdan sanaladimi, namunadanmi.
 *
 * XATO NIMA EDI. 1-tuzoq (yopiq brend) `block` beradi — tovar
 * tavsiyadan BUTUNLAY chiqariladi. U "brendning butun
 * assortimentini nechta doʻkon sotadi?" degan savolga tayanadi.
 *
 * Javob `selleros.product` dan olinardi: 6 025 tovar, 4 297
 * doʻkon. Perepis esa 1 850 863 tovar va 85 866 doʻkon.
 *
 * Oʻlchandi (2026-08-26):
 *
 *   brend      namunadan   perepisdan
 *   avon               8         401
 *   pandora            3         275
 *   just               1         158
 *
 * Chegara 2 ta doʻkon. Yaʼni Avon va Pandora "yopiq brend" deb
 * bloklanardi. Tuzatilgandan keyin bayroq 37 → 6 ga tushdi.
 *
 * NEGA TEST MATNGA QARAYDI. CI da baza yoʻq. Lekin xato aynan
 * bitta manba nomida va uni matndan koʻrish mumkin.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const M = join(
  import.meta.dirname, '../migrations/0039_selleros_brend_perepisdan.sql',
);
const sql = readFileSync(M, 'utf8');

const IS = join(import.meta.dirname, '../../.github/workflows/skreyper.yml');
const ish = readFileSync(IS, 'utf8');

describe('brend qamrovi — manba perepis', () => {
  it('hisob `zumsavdo.product` dan oʻqiydi', () => {
    expect(sql).toMatch(/from\s+zumsavdo\.product/);
  });

  it('isteʼmolchilar keshdan oʻqiydi, namunani qayta sanamaydi', () => {
    /*
     * Eski shakl (`count(distinct p2.shop_id)`) migratsiyada BOR
     * — u almashtiriladigan matn sifatida `eski :=` ichida
     * turadi. Shuning uchun uning yoʻqligini tekshirib boʻlmaydi.
     *
     * Tekshiriladigan narsa boshqa: ikkala funksiyaga ham keshdan
     * oʻqiydigan yangi shakl qoʻyilishi.
     */
    const yangi = sql.match(/join\s+selleros\.brend_qamrovi\s+k/g) ?? [];
    expect(yangi.length, 'ikkala isteʼmolchi ham keshdan oʻqishi kerak').toBe(2);
  });

  it('almashtirish topilmasa migratsiya TOʻXTAYDI', () => {
    /*
     * `pg_get_functiondef` + `replace` texnikasining yagona
     * xavfi: manba matn oʻzgargan boʻlsa `replace` hech narsa
     * qilmaydi va migratsiya MUVAFFAQIYATLI koʻrinadi. Ikkala
     * joyda ham `raise exception` boʻlishi shart.
     */
    // Izoh qatorlari sanalmaydi — faqat bajariladigan kod.
    const kod = sql.split('\n').filter((q) => !q.trim().startsWith('--')).join('\n');
    const qorovul = kod.match(/raise exception/g) ?? [];
    expect(qorovul.length).toBe(2);
  });

  it('kesh CTE si `distinct` — aks holda qatorlar koʻpayadi', () => {
    /*
     * Bu xatoni oʻzim qildim va u jimgina emas edi, lekin sababi
     * koʻrinmasdi: `so_tovar_holati('uzum', 50)` 68 qator
     * qaytardi va bayroqlarni yozish 409 (takror kalit) berdi.
     *
     * Ikkala isteʼmolchida ham `distinct` boʻlishi shart.
     */
    const joinlar = sql.match(/select distinct \w+\.brand, k\.dokonlar/g) ?? [];
    expect(joinlar.length, '`distinct` ikkala CTE da ham kerak').toBe(2);
  });

  it('supurishdan keyin yangilanadi va bayroqlardan OLDIN', () => {
    /*
     * Kesh eskirsa 1-tuzoq jimgina notoʻgʻri javob beradi:
     * bayroq bor, lekin u kechagi doʻkon soniga tayanadi.
     */
    const brend = ish.indexOf('so_brend_yangila');
    const bayroq = ish.indexOf('bayroqlarni-hisobla');
    expect(brend, 'brend yangilash ishda yoʻq').toBeGreaterThan(-1);
    expect(bayroq, 'bayroq hisoblash ishda yoʻq').toBeGreaterThan(-1);
    expect(brend).toBeLessThan(bayroq);
  });

  it('DO blokidagi matn ichida ikkilangan tirnoq YOʻQ', () => {
    /*
     * `do $migratsiya$ ... $migratsiya$` ichida oddiy `'matn'`
     * yoziladi. `''matn''` — sintaksis xatosi, lekin uni faqat
     * migratsiya BAJARILGANDA koʻrasiz.
     *
     * Bu qator bugun kerak boʻldi: faylda `''` turgan, bazaga
     * qoʻyilgan variantda esa `'` — yaʼni fayl bilan baza
     * ajralib ketgan edi.
     */
    expect(sql).not.toMatch(/raise exception ''/);
  });

  it('nol brend xato deb sanaladi — jim oʻtmaydi', () => {
    // Nol "brend yoʻq" degani emas, "hisoblanmadi" degani.
    expect(ish).toMatch(/Brend qamrovi yangilanmadi/);
  });
});
