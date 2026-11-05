/**
 * AI TAHLILCHI chatda (2026-11-05): mijoz Uzum bozori haqida savol bersa — avval tahlilchi.
 *
 * NEGA BU TESTLAR BOR. 05.11 jonli: nazoratchi tovar tanlash qadamida «nechta sotuvchi kiyim va poyabzal
 * sotgan, nechtasi yaxshi, nimaga» deb soʻradi — AI «Uzumga kira olmayman» dedi. Endi: TUSHUN «savol bor»
 * desa va javob rad etilmagan boʻlsa — tahlilchi (asboblar bilan, `tahlilchi.ts`) javob beradi; xabarda
 * havolalar va «Uzumda ochish» manzili; keyin joriy savol qayta. Tahlilchi ishlamasa — eski yoʻl (YOZ).
 * Sinov rejimida (`tahlilRuxsat`) begona mijozga chaqirilmaydi. Yoʻl holati oʻzgarmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  keyingi, suhbatTurn,
  type AiTushuncha, type AiYozuv, type SuhbatBogliqliklari, type TahlilNatijasi, type TahlilSavoli, type YolHolati,
} from '@selleros/shared';

function soxtaBaza(boshlangich: YolHolati) {
  const k = keyingi(boshlangich);
  const jurnal: Array<{ rol: string; matn: string; savolId?: string; javob?: unknown }> =
    k.tur === 'savol' ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id }] : [];
  let holat: YolHolati = boshlangich;
  const rpc = async <T,>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (nom === 'so_suhbat_oqi') return { holat, qadam: null, xabarlar: jurnal } as T;
    if (nom === 'so_suhbat_yoz') {
      jurnal.push(...(a.p_xabarlar as typeof jurnal));
      holat = a.p_holat as YolHolati;
      return { yozildi: (a.p_xabarlar as unknown[]).length } as T;
    }
    return null;
  };
  return { rpc, jurnal, holat: () => holat };
}

const KURS = { olchov_yoq: false, usd: { somPerYuan: 12_650, valyuta: 'USD', sana: '12.10.2026', manba: 'CBU' } };
const KOD = new Proxy({}, {
  get: (_, nom) => (nom === 'kurs' ? async () => KURS : nom === 'erkinMalumot' ? undefined
    : async () => { throw new Error(`bu testda kod chaqirilmasligi kerak: ${String(nom)}`); }),
});

/** Byudjet savoli turgan holat (sinov raqami). */
const HOLAT: YolHolati = {
  javoblar: { ism: 'Davrbek Sinov', telefon: '+998900000501', qiziqish: ['kiyim'] }, natijalar: { kurs: KURS },
};

const SAVOL = 'nechta sotuvchi kiyim va poyabzal sotgan, nechtasi yaxshi sota olgan, nechtasi yoʻq va nimaga?';
const TUSHUNCHA: AiTushuncha = { javoblar: [], taklif_qiziqish: [], savol_bor: true };

const NATIJA: TahlilNatijasi = {
  qisqa: 'Shu paytgacha 37 379 sotuvchi kiyim-poyabzal qoʻygan, 29 459 tasi sotgan.\nMaʼlumot: 2026-10-27 holatiga, sotuv — taxminiy.',
  batafsil: '• Eng yaxshi 20% — tushumning 86,2% i.',
  havolalar: [{ tur: 'tovar', id: 412970, nom: 'Ayollar krossovkasi', havola: 'https://uzum.uz/uz/product/412970', narx: 79000, oyiga: 2758, tushumMln: 217.9 }],
  ochish: { turkum: 10014, saralash: 'kop_buyurtma', narxMin: null, narxMax: null },
  keyingi: ['Qaysi kiyim turkumida sotish osonroq?'],
  asboblar: ['turkum_top', 'bozor_kesimi'],
  sana: '2026-10-27',
};

const YOZUV: AiYozuv = { oldin: 'Eski yoʻl javobi.', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' };

function bogliq(b: ReturnType<typeof soxtaBaza>, tahlil: SuhbatBogliqliklari['tahlil'], ruxsat?: SuhbatBogliqliklari['tahlilRuxsat']) {
  const yozlar: unknown[] = [];
  const d: SuhbatBogliqliklari = {
    rpc: b.rpc, kod: KOD as SuhbatBogliqliklari['kod'],
    ai: { tushun: async () => TUSHUNCHA, yoz: async (k) => { yozlar.push(k); return YOZUV; } },
    ...(tahlil ? { tahlil } : {}), ...(ruxsat ? { tahlilRuxsat: ruxsat } : {}),
  };
  return { d, yozlar };
}

describe('chatda AI tahlilchi', () => {
  it('bozor savoli → tahlilchi javobi (havolalar, Uzumda ochish), «Batafsil», keyin joriy savol; holat oʻzgarmaydi', async () => {
    const b = soxtaBaza(HOLAT);
    const soʻrovlar: TahlilSavoli[] = [];
    const { d, yozlar } = bogliq(b, async (s) => { soʻrovlar.push(s); return NATIJA; });
    const r = await suhbatTurn(d, 't', { savolId: 'byudjet', matn: SAVOL });

    expect(r.xato).toBeUndefined();
    expect(yozlar).toHaveLength(0); // eski YOZ chaqirilmadi
    expect(soʻrovlar[0]).toMatchObject({ savol: SAVOL, til: 'uz', ism: 'Davrbek' });
    // Maxfiylik: familiya va telefon tahlilchiga ketmaydi.
    expect(JSON.stringify(soʻrovlar)).not.toMatch(/Sinov|900000501/);
    const [mijoz, javob, batafsil, savol] = r.xabarlar;
    expect(mijoz).toEqual({ rol: 'obunachi', matn: SAVOL });
    expect(javob).toMatchObject({
      rol: 'menejer', matn: NATIJA.qisqa, savolId: 'byudjet',
      javob: {
        erkin: true, manba: 'tahlil', havolalar: NATIJA.havolalar, sana: '2026-10-27', keyingi: NATIJA.keyingi,
        ochishManzili: 'https://uzum.uz/uz/category/10014?sorting=orders&ordering=descending',
      },
    });
    expect(batafsil).toEqual({ rol: 'menejer', matn: NATIJA.batafsil, javob: { batafsil: true } });
    expect(savol).toMatchObject({ rol: 'menejer', savolId: 'byudjet' });
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('byudjet');
    expect(b.holat()).toEqual(HOLAT);
  });

  it('tahlilchi ishlamasa (null) — eski yoʻl (YOZ) javob beradi', async () => {
    const b = soxtaBaza(HOLAT);
    const { d, yozlar } = bogliq(b, async () => null);
    const r = await suhbatTurn(d, 't', { savolId: 'byudjet', matn: SAVOL });
    expect(yozlar).toHaveLength(1);
    expect(r.xabarlar.some((x) => x.matn === YOZUV.oldin)).toBe(true);
    expect(r.xabarlar.some((x) => (x.javob as { manba?: string } | undefined)?.manba === 'tahlil')).toBe(false);
  });

  it('sinov rejimi: ruxsat yoʻq mijozga tahlilchi chaqirilmaydi', async () => {
    const b = soxtaBaza(HOLAT);
    let chaqirildi = false;
    const { d, yozlar } = bogliq(b, async () => { chaqirildi = true; return NATIJA; }, () => false);
    await suhbatTurn(d, 't', { savolId: 'byudjet', matn: SAVOL });
    expect(chaqirildi).toBe(false);
    expect(yozlar).toHaveLength(1);
  });

  it('savol emas (TUSHUN savol_bor=false) — tahlilchi chaqirilmaydi', async () => {
    const b = soxtaBaza(HOLAT);
    let chaqirildi = false;
    const { d } = bogliq(b, async () => { chaqirildi = true; return NATIJA; });
    d.ai = { tushun: async () => ({ ...TUSHUNCHA, savol_bor: false }), yoz: async () => YOZUV };
    await suhbatTurn(d, 't', { savolId: 'byudjet', matn: 'rahmat' });
    expect(chaqirildi).toBe(false);
  });
});
