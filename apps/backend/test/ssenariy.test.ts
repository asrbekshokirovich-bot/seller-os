/**
 * Suhbat ssenariysi — holat mashinasi testlari.
 *
 * Eng muhim ikki narsa:
 *   1. NAVBAT. Bir vaqtda bitta savol; boshqa savolga javob rad
 *      etiladi. Bu nazoratchi topshirig'ining o'zi.
 *   2. ZANJIR UZILMAYDI. Har holatdan `keyingi()` nimadir qaytaradi —
 *      qurilmagan qadamga yetganda ham jim qolmaydi, "tez orada" deydi.
 *
 * Bo'sh javob nol emas (QOIDALAR.md, 4-bo'lim) — alohida tekshiriladi.
 */

import { describe, expect, it } from 'vitest';
import {
  boshlangichHolat, javobniQabulQil, joriyQadam, keyingi, natijaniYoz,
  SUHBAT_QADAMLARI, tushuntir, type YolHolati,
} from '@selleros/shared';

const YONALISHLAR = {
  olchov_yoq: false,
  royxat: [
    { categoryId: 11, name: 'Quloqchinlar', yetadi: true, ball: { value: 72 } },
    { categoryId: 22, name: 'Soatlar', yetadi: false, ball: { value: 61 } },
  ],
};
const TOVARLAR = {
  olchov_yoq: false,
  royxat: [
    { nomzod: { productId: 100, title: 'Quloqchin A' }, miqdor: { dona: 30, hisob: 'oyiga ~600 · 5% · 30 kun = 30' } },
    { nomzod: { productId: 200, title: 'Quloqchin B' }, miqdor: null, miqdorSababi: 'Sotuv hali oʻlchanmagan.' },
  ],
  chiqarildi: [{ title: 'Brend X', sabab: 'yopiq brend' }],
};

/** Javob beradi va qabul qilinganini tekshiradi. */
function javob(h: YolHolati, id: string, q: unknown): YolHolati {
  const n = javobniQabulQil(h, id, q);
  expect(n.xato, `${id}: ${n.xato}`).toBeNull();
  return n.holat;
}

function savolId(h: YolHolati): string {
  const k = keyingi(h);
  if (k.tur !== 'savol') throw new Error(`savol kutilgan edi, keldi: ${k.tur}`);
  return k.savol.id;
}

describe('ssenariy — 12 qadam', () => {
  it('12 qadam, dastlabki 4 tasi qurilgan', () => {
    expect(SUHBAT_QADAMLARI.length).toBe(12);
    expect(SUHBAT_QADAMLARI.filter((q) => q.qurilgan).map((q) => q.n)).toEqual([1, 2, 3, 4]);
  });
});

describe('1-qadam — Tanishuv', () => {
  it('birinchi savol byudjet, 1-qadam', () => {
    const k = keyingi(boshlangichHolat());
    expect(k.tur).toBe('savol');
    if (k.tur === 'savol') {
      expect(k.savol.id).toBe('byudjet');
      expect(k.savol.qadam).toBe(1);
      expect(k.savol.variantlar.length).toBeGreaterThan(0);
    }
  });

  it('NAVBAT: boshqa savolga javob rad etiladi', () => {
    const n = javobniQabulQil(boshlangichHolat(), 'uzum_dokoni', 'yoq');
    expect(n.xato).toMatch(/navbat/);
    expect(n.holat.javoblar).toEqual({});
  });

  it('byudjet tugmalari ANIQ son yozadi, oraliq emas', () => {
    const k = keyingi(boshlangichHolat());
    if (k.tur !== 'savol') throw new Error();
    for (const v of k.savol.variantlar) expect(typeof v.qiymat).toBe('number');
  });

  it("BO'SH byudjet null, NOL esa javob", () => {
    const bosh = javobniQabulQil(boshlangichHolat(), 'byudjet', '');
    expect(bosh.xato).toBeNull();
    expect(bosh.holat.javoblar['byudjet']).toBeNull();
    expect(bosh.profil).toEqual({ budgetUzs: null });

    const nol = javobniQabulQil(boshlangichHolat(), 'byudjet', 0);
    expect(nol.holat.javoblar['byudjet']).toBe(0);
    expect(nol.profil).toEqual({ budgetUzs: 0 });
  });

  it('byudjet: matn va manfiy son rad etiladi', () => {
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', 'abc').xato).not.toBeNull();
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', -5).xato).not.toBeNull();
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', true).xato).not.toBeNull();
  });

  it("'sotyapman' desa do'kon nomi so'raladi; 'yoq' desa so'ralmaydi", () => {
    let h = javob(boshlangichHolat(), 'byudjet', 10_000_000);
    const sot = javobniQabulQil(h, 'uzum_dokoni', 'sotyapman');
    expect(sot.profil).toEqual({ hasUzumShop: true });
    expect(savolId(sot.holat)).toBe('dokon_nomi');

    const yoq = javobniQabulQil(h, 'uzum_dokoni', 'yoq');
    expect(yoq.profil).toEqual({ hasUzumShop: false });
    expect(keyingi(yoq.holat)).toEqual({ tur: 'kod', harakat: 'yonalishlar', qadam: 2 });
    h = yoq.holat;
    expect(joriyQadam(h)).toBe(2);
  });

  it('uzum_dokoni: variantdan tashqari qiymat rad etiladi', () => {
    const h = javob(boshlangichHolat(), 'byudjet', 10_000_000);
    expect(javobniQabulQil(h, 'uzum_dokoni', 'balki').xato).not.toBeNull();
  });
});

function tanishuvTugadi(): YolHolati {
  let h = javob(boshlangichHolat(), 'byudjet', 10_000_000);
  h = javob(h, 'uzum_dokoni', 'yoq');
  return h;
}

describe("2-qadam — Yo'nalish", () => {
  it('kod natijasi kelgach variantlar undan yasaladi', () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', YONALISHLAR);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error();
    expect(k.savol.id).toBe('yonalish');
    expect(k.savol.variantlar.map((v) => v.nom)).toEqual(['Quloqchinlar', 'Soatlar']);
    expect(k.savol.otkazishMumkin).toBe(false);
  });

  it("ro'yxatda yo'q yo'nalish rad etiladi", () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', YONALISHLAR);
    expect(javobniQabulQil(h, 'yonalish', 999).xato).not.toBeNull();
  });

  it("o'lchov yo'q bo'lsa savol turadi, o'tkazish mumkin, 'yo'q' DEMAYDI", () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', { olchov_yoq: true, sabab: 'baza javob bermadi' });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error();
    expect(k.savol.otkazishMumkin).toBe(true);
    expect(k.savol.matn).toMatch(/baza javob bermadi/);
    expect(tushuntir('yonalishlar', { olchov_yoq: true, sabab: 'x' })).toMatch(/hisob hali yoʻq/);
  });

  it('tushuntirishdagi raqamlar natijaning o‘zidan', () => {
    const m = tushuntir('yonalishlar', YONALISHLAR);
    expect(m).toMatch(/2 ta yoʻnalish/);
    expect(m).toMatch(/Quloqchinlar/);
    expect(m).toMatch(/72 ball/);
    expect(m).toMatch(/1 tasiga byudjetingiz yetadi/);
  });
});

function yonalishTanlandi(): YolHolati {
  const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', YONALISHLAR);
  return javob(h, 'yonalish', 11);
}

describe('3-qadam — Tovar va miqdor', () => {
  it("yo'nalishdan keyin tovarlar kodi, keyin ko'p tanlov", () => {
    let h = yonalishTanlandi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'tovarlar', qadam: 3 });
    h = natijaniYoz(h, 'tovarlar', TOVARLAR);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error();
    expect(k.savol.id).toBe('tovarlar');
    expect(k.savol.turi).toBe('kopTanlov');
  });

  it("har tanlangan tovar uchun miqdor NAVBAT bilan so'raladi", () => {
    let h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
    h = javob(h, 'tovarlar', [100, 200]);
    expect(savolId(h)).toBe('miqdor:100');
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error();
    expect(k1.savol.variantlar.map((v) => v.qiymat)).toEqual([30, 60]);
    expect(k1.savol.matn).toMatch(/30 kun = 30/);

    expect(javobniQabulQil(h, 'miqdor:200', 5).xato).toMatch(/navbat/);

    h = javob(h, 'miqdor:100', 30);
    expect(savolId(h)).toBe('miqdor:200');
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error();
    // Miqdor hisoblanmagan — variant yo'q, sabab aytilgan, o'zi yozadi.
    expect(k2.savol.variantlar).toEqual([]);
    expect(k2.savol.matn).toMatch(/oʻlchanmagan/);
    h = javob(h, 'miqdor:200', 12);
    expect(savolId(h)).toBe('marja');
    expect(joriyQadam(h)).toBe(4);
  });

  it("bo'sh ko'p tanlov rad etiladi (ro'yxat bo'lmasa emas)", () => {
    const h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
    expect(javobniQabulQil(h, 'tovarlar', []).xato).not.toBeNull();
    expect(javobniQabulQil(h, 'tovarlar', [999]).xato).not.toBeNull();
  });

  it('tushuntirish chiqarilganlarni yashirmaydi', () => {
    expect(tushuntir('tovarlar', TOVARLAR)).toMatch(/1 tasi tuzoq sababli/);
  });
});

function tovarlarTanlandi(): YolHolati {
  let h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
  h = javob(h, 'tovarlar', [100]);
  h = javob(h, 'miqdor:100', 30);
  return h;
}

describe('4-qadam — Tannarx va zanjir oxiri', () => {
  it('marja → tannarx kodi → tasdiq → 5-qadam "tez orada"', () => {
    let h = javob(tovarlarTanlandi(), 'marja', 30);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'tannarx', qadam: 4 });
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    expect(savolId(h)).toBe('xitoy_tasdiq');
    h = javob(h, 'xitoy_tasdiq', 'ha');
    const k = keyingi(h);
    expect(k.tur).toBe('tezOrada');
    if (k.tur === 'tezOrada') {
      expect(k.qadam).toBe(5);
      expect(k.nom).toBe('Xitoydan topish');
      expect(k.matn).toMatch(/hali qurilmagan/);
    }
    expect(joriyQadam(h)).toBe(5);
  });

  it("'miqdorni o'zgartiraman' — miqdor savollari qayta ochiladi, tannarx o'chadi", () => {
    let h = javob(tovarlarTanlandi(), 'marja', 30);
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    h = javob(h, 'xitoy_tasdiq', 'miqdor');
    expect(savolId(h)).toBe('miqdor:100');
    expect(h.natijalar.tannarx).toBeUndefined();
    expect(h.javoblar['marja']).toBe(30);
  });

  it('marja erkin son qabul qiladi', () => {
    expect(javobniQabulQil(tovarlarTanlandi(), 'marja', 35).xato).toBeNull();
  });
});

describe('zanjir hech qayerda uzilmaydi', () => {
  it("har holatda keyingi() nimadir qaytaradi va savol matni bo'sh emas", () => {
    let h = boshlangichHolat();
    const korilgan: string[] = [];
    for (let i = 0; i < 40; i++) {
      const k = keyingi(h);
      korilgan.push(k.tur === 'savol' ? k.savol.id : k.tur);
      if (k.tur === 'tezOrada') { expect(k.matn.length).toBeGreaterThan(20); break; }
      if (k.tur === 'kod') {
        h = natijaniYoz(h, k.harakat,
          k.harakat === 'yonalishlar' ? YONALISHLAR
            : k.harakat === 'tovarlar' ? TOVARLAR : { ok: true });
        continue;
      }
      expect(k.savol.matn.trim().length).toBeGreaterThan(5);
      const s = k.savol;
      const q = s.turi === 'kopTanlov' ? [s.variantlar[0]!.qiymat]
        : s.variantlar.length ? s.variantlar[0]!.qiymat
          : s.turi === 'son' ? 7 : 'sinov';
      h = javob(h, s.id, q);
    }
    expect(korilgan[korilgan.length - 1]).toBe('tezOrada');
    // Hech bir savol ikki marta so'ralmagan.
    const savollar = korilgan.filter((x) => !['kod', 'tezOrada'].includes(x));
    expect(new Set(savollar).size).toBe(savollar.length);
  });
});

describe('tushuntir — tannarx rostini aytadi', () => {
  it('hech narsa hisoblanmasa "hisoblandi" DEMAYDI, sababini aytadi', () => {
    const m = tushuntir('tannarx', { olchov_yoq: true, qatorlar: [
      { chegaraSom: null, yetishmaydi: ['komissiya'] },
      { chegaraSom: null, yetishmaydi: ['komissiya', 'kargo'] },
    ] });
    expect(m).not.toMatch(/hisoblandi\./);
    expect(m).toMatch(/komissiya, kargo yetishmaydi/);
    expect(m).toMatch(/foyda yoʻq" degani EMAS/);
  });
  it('qisman hisoblansa sonini va yetishmaganini aytadi', () => {
    const m = tushuntir('tannarx', { qatorlar: [
      { chegaraSom: 50_000, yetishmaydi: ['kargo'] },
      { chegaraSom: null, yetishmaydi: ['komissiya'] },
    ] });
    expect(m).toMatch(/1 ta tovar uchun/);
    expect(m).toMatch(/1 tasida yetishmagan/);
  });
});
