/**
 * AI tahlilchi (`tahlilchi.ts`): tsikl, darvoza va yordamchilar — soxta Claude va soxta baza bilan.
 *
 * Asosiy holat — nazoratchining 05.11 dagi savoli: «nechta sotuvchi kiyim-poyabzal sotgan, nechtasi
 * yaxshi, nechtasi yoʻq va nimaga». AI avval turkumni topadi, keyin bozor va sotuvchilar asboblarini
 * BIR VAQTDA chaqiradi, javobdagi har raqam asbob natijasidan boʻlishi shart. Uzum manzillari — brauzerda
 * oʻlchangan shakl (2026-11-05).
 */

import { describe, expect, it, vi } from 'vitest';
import {
  asbobSorovi, filtrniTekshir, hisobla, tahlilJavobiniOqi, tahlilQil, tahlilQismi, uzumOchishManzili, uzumTovarIdsi,
  type TahlilChaqiruvi, type TahlilJavobi, type TahlilSavoli,
} from '../src/tahlilchi';

const SAVOL: TahlilSavoli = {
  savol: 'nechta sotuvchi kiyim va poyabzal sotgan, nechtasi yaxshi sota olgan, nechtasi yoʻq va nimaga',
  til: 'uz', bugun: '2026-11-05', ism: 'Davrbek',
};

const HOLAT = { sana: '2026-10-27', census_pass: 7, census_sana: '2026-10-26', daraxt: true };

/** Soxta baza: RPC nomi → javob. */
function baza(javoblar: Record<string, unknown>) {
  const chaqirildi: Array<{ nom: string; arg: unknown }> = [];
  const rpc = async <T,>(nom: string, arg: unknown): Promise<T | null> => {
    chaqirildi.push({ nom, arg });
    return (nom in javoblar ? javoblar[nom] : null) as T | null;
  };
  return { rpc, chaqirildi };
}

/** Soxta Claude: navbatdagi javoblar; har chaqiruv yozib qoʻyiladi. */
function claude(javoblar: Array<TahlilJavobi | null>) {
  const soʻrovlar: TahlilChaqiruvi[] = [];
  const provayder = async (c: TahlilChaqiruvi) => {
    soʻrovlar.push({ ...c, xabarlar: [...c.xabarlar] });
    const j = javoblar.shift();
    if (j && j.matn && c.qism) c.qism(j.matn.slice(0, 30));
    return j ?? null;
  };
  return { provayder, soʻrovlar };
}

const asbob = (...ch: Array<[string, unknown]>): TahlilJavobi => ({
  bloklar: ch.map(([nom, kirish], i) => ({ type: 'tool_use', id: `t${i}-${nom}`, name: nom, input: kirish })),
  toxtash: 'tool_use', matn: null,
  chaqiruvlar: ch.map(([nom, kirish], i) => ({ id: `t${i}-${nom}`, nom, kirish })),
});

const yakun = (j: Record<string, unknown>): TahlilJavobi => {
  // `qisqa` — birinchi kalit (sxemadagidek): oqimda birinchi keladi.
  const matn = JSON.stringify({ qisqa: j.qisqa, batafsil: '', tovarlar: [], dokonlar: [], ochish: null, keyingi: [], ...j });
  return { bloklar: [{ type: 'text', text: matn }], toxtash: 'end_turn', matn, chaqiruvlar: [] };
};

const TURKUM = { holat: HOLAT, topildi: [{ id: 10014, nom: 'Kiyim', yol: 'Kiyim' }, { id: 10013, nom: 'Poyabzallar', yol: 'Poyabzallar' }] };
const BOZOR = {
  holat: HOLAT,
  sotuvchilar_30kun: { jami: 17902, sotgan: 9629, sotmagan: 8273, top20_ulush_foiz: 79.1, tushum_mln: 272704.5 },
  shu_paytgacha: { sotuvchilar: 37379, sotgan_sotuvchilar: 29459 },
  eng_kop_sotgan_tovarlar: [{ id: 412970, nom: 'Ayollar krossovkasi', narx: 79000, oyiga: 2758, tushum_mln: 217.9, havola: 'https://uzum.uz/uz/product/412970' }],
  eng_katta_dokonlar: [{ id: 7619, nom: 'Katta doʻkon', tushum_mln: 912.4, eng_yaxshi_tovar: 412970 }],
};
const SOTUVCHILAR = {
  holat: HOLAT,
  pogonalar_30kun: {
    eng_yaxshi_20: { soni: 3581, tushum_ulush_foiz: 86.2, tovar_soni_mediana: 14, tugagan_tovar_foiz: 16.1 },
    sotmagan: { soni: 8273, tushum_ulush_foiz: 0, tovar_soni_mediana: 1, tugagan_tovar_foiz: 63.4 },
  },
};

describe('tahlilQil — nazoratchi savoli', () => {
  it('turkum → bozor + sotuvchilar (parallel) → javob; raqamlar asbobdan, havolalar boyitiladi', async () => {
    const b = baza({ so_tahlil_turkum_top: TURKUM, so_tahlil_bozor: BOZOR, so_tahlil_sotuvchilar: SOTUVCHILAR });
    const filtr = { turkumlar: [10014, 10013] };
    const c = claude([
      asbob(['turkum_top', { soz: 'kiyim' }]),
      asbob(['bozor_kesimi', { filtr }], ['sotuvchilar_tahlili', { filtr }]),
      yakun({
        qisqa: 'Davrbek, shu paytgacha 37 379 sotuvchi kiyim-poyabzal qoʻygan, 29 459 tasi sotgan.\n'
          + 'Oxirgi 30 kunda 17 902 faol sotuvchidan 8 273 tasi umuman sotmagan.\n'
          + 'Eng yaxshi 20% (3 581 sotuvchi) tushumning 86,2% ini oladi.\n'
          + 'Sotmaganlarda tovarlarning 63,4% i tugagan, odatda 1 ta tovar; yaxshilarda 14 ta.\n'
          + 'Maʼlumot: 2026-10-27 holatiga, sotuv — taxminiy.',
        tovarlar: [412970, 999], dokonlar: [7619],
        ochish: { turkum: 10014, saralash: 'kop_buyurtma', narx_min: null, narx_max: null },
        keyingi: ['Qaysi kiyim turkumida sotish osonroq?'],
      }),
    ]);
    const holatlar: string[] = [];
    const r = await tahlilQil({ provayder: c.provayder, rpc: b.rpc, holat: (h) => holatlar.push(h) }, SAVOL, 45_000);
    expect(r).not.toBeNull();
    expect(b.chaqirildi.map((x) => x.nom)).toEqual(['so_tahlil_turkum_top', 'so_tahlil_bozor', 'so_tahlil_sotuvchilar']);
    expect(b.chaqirildi[1]!.arg).toEqual({ p_filtr: filtr });
    expect(r!.asboblar).toEqual(['turkum_top', 'bozor_kesimi', 'sotuvchilar_tahlili']);
    expect(r!.sana).toBe('2026-10-27');
    // 999 — asbob natijasida yoʻq: tashlanadi (AI oʻylab topgan havola chiqmaydi).
    expect(r!.havolalar).toEqual([
      { tur: 'tovar', id: 412970, nom: 'Ayollar krossovkasi', havola: 'https://uzum.uz/uz/product/412970', narx: 79000, oyiga: 2758, tushumMln: 217.9 },
      { tur: 'dokon', id: 7619, nom: 'Katta doʻkon', havola: 'https://uzum.uz/uz/product/412970', tushumMln: 912.4 },
    ]);
    expect(r!.ochish).toEqual({ turkum: 10014, saralash: 'kop_buyurtma', narxMin: null, narxMax: null });
    expect(holatlar.length).toBe(2);
    // Asbob natijasi AI ga bitta user xabarida, har tool_use ga tool_result bilan.
    const uchinchi = c.soʻrovlar[2]!.xabarlar;
    const natija = uchinchi[uchinchi.length - 1]!.content as Array<Record<string, unknown>>;
    expect(natija.map((x) => x.tool_use_id)).toEqual(['t0-bozor_kesimi', 't1-sotuvchilar_tahlili']);
    expect(c.soʻrovlar.every((s) => !s.asbobsiz)).toBe(true);
  });

  it('asbobda yoʻq raqam — sababi bilan qaytariladi, ikkinchi javob qabul', async () => {
    const b = baza({ so_tahlil_bozor: BOZOR });
    const c = claude([
      asbob(['bozor_kesimi', { filtr: { turkumlar: [10014] } }]),
      yakun({ qisqa: 'Kiyimda 45 000 sotuvchi bor.' }),
      yakun({ qisqa: 'Kiyim va poyabzalda oxirgi 30 kunda 17 902 sotuvchi faol.' }),
    ]);
    const qayta = vi.fn();
    const r = await tahlilQil({ provayder: c.provayder, rpc: b.rpc, qayta, qism: () => {} }, SAVOL, 45_000);
    expect(r!.qisqa).toMatch(/17 902/);
    const tuzat = c.soʻrovlar[2]!.xabarlar.at(-1)!.content as string;
    expect(tuzat).toMatch(/45 000|45000/);
    expect(qayta).toHaveBeenCalled();
  });

  it('asbob maʼlumot bergan-u, «maʼlumotim yoʻq» dedi — qaytariladi (aynan 05.11 dagi xato)', async () => {
    const b = baza({ so_tahlil_bozor: BOZOR });
    const c = claude([
      asbob(['bozor_kesimi', { filtr: {} }]),
      yakun({ qisqa: 'Afsuski, bu haqda maʼlumotim yoʻq.' }),
      yakun({ qisqa: 'Oxirgi 30 kunda 17 902 sotuvchi faol.' }),
    ]);
    const r = await tahlilQil({ provayder: c.provayder, rpc: b.rpc }, SAVOL, 45_000);
    expect(r!.qisqa).toMatch(/17 902/);
    expect(c.soʻrovlar[2]!.xabarlar.at(-1)!.content as string).toMatch(/maʼlumotim yoʻq/);
  });

  it('notoʻgʻri asbob kirishi — is_error, tsikl davom etadi; 4 dan ortiq parallel — ortigʻi xato', async () => {
    const b = baza({ so_tahlil_turkum_top: TURKUM });
    const c = claude([
      asbob(['tovar_qidir', { filtr: { narx_max: -5 }, saralash: 'tushum' }], ['turkum_top', { soz: 'a' }], ['turkum_top', { soz: 'b' }],
        ['turkum_top', { soz: 'c' }], ['turkum_top', { soz: 'd' }]),
      yakun({ qisqa: 'Turkumlar topildi.' }),
    ]);
    const r = await tahlilQil({ provayder: c.provayder, rpc: b.rpc }, SAVOL, 45_000);
    expect(r).not.toBeNull();
    const natija = c.soʻrovlar[1]!.xabarlar.at(-1)!.content as Array<Record<string, unknown>>;
    expect(natija).toHaveLength(5);
    expect(natija[0]).toMatchObject({ is_error: true });
    expect(String(natija[0]!.content)).toMatch(/narx_max/);
    expect(natija[4]).toMatchObject({ is_error: true });
    expect(b.chaqirildi.length).toBe(3); // 1-chi rad, 2–4 bajarildi, 5-chi rad
  });

  it('aylanishlar tugasa — oxirgi chaqiruv asbobsiz (javob yozilsin)', async () => {
    const b = baza({ so_tahlil_turkum_top: TURKUM });
    const c = claude([
      asbob(['turkum_top', { soz: 'a' }]), asbob(['turkum_top', { soz: 'b' }]), asbob(['turkum_top', { soz: 'c' }]),
      asbob(['turkum_top', { soz: 'd' }]), yakun({ qisqa: 'Kiyim turkumi topildi.' }),
    ]);
    const r = await tahlilQil({ provayder: c.provayder, rpc: b.rpc }, SAVOL, 45_000);
    expect(r).not.toBeNull();
    expect(c.soʻrovlar.map((s) => s.asbobsiz)).toEqual([false, false, false, false, true]);
  });

  it('Claude ishlamasa — null (chaqiruvchi eski yoʻlga qaytadi)', async () => {
    const c = claude([null]);
    expect(await tahlilQil({ provayder: c.provayder, rpc: baza({}).rpc }, SAVOL, 45_000)).toBeNull();
  });

  it('kirish matni: til, ism, savol; ruscha savolga — rus tili talabi', async () => {
    const c = claude([yakun({ qisqa: 'Здравствуйте! Чем помочь?' })]);
    await tahlilQil({ provayder: c.provayder, rpc: baza({}).rpc }, { ...SAVOL, til: 'ru', savol: 'Сколько продавцов?' }, 45_000);
    const kirish = c.soʻrovlar[0]!.xabarlar[0]!.content as string;
    expect(kirish).toMatch(/JAVOB TILI: rus tili/);
    expect(kirish).toMatch(/MIJOZ SAVOLI: Сколько продавцов\?/);
    expect(kirish).toMatch(/MIJOZ ISMI: Davrbek/);
  });
});

describe('yordamchilar', () => {
  it('hisobla: amallar tartibi, qavs, kasr, xato', () => {
    expect(hisobla('(27.1 - 3.2) / 3.2 * 100')).toBeCloseTo(746.875, 6);
    expect(hisobla('2+3*4')).toBe(14);
    expect(hisobla('-(2+3)×2')).toBe(-10);
    expect(hisobla('1,5 * 2')).toBe(3);
    expect(hisobla('30000000 / 85000')).toBe(352.941176);
    expect(hisobla('5/0')).toBeNull();
    expect(hisobla('2**3')).toBeNull();
    expect(hisobla('alert(1)')).toBeNull();
    expect(hisobla('(1+2')).toBeNull();
  });

  it('uzumTovarIdsi: har xil havola shakli', () => {
    expect(uzumTovarIdsi('https://uzum.uz/uz/product/ayollar-krossovkasi-412970')).toBe(412970);
    expect(uzumTovarIdsi('uzum.uz/ru/product/412970?skuId=1')).toBe(412970);
    expect(uzumTovarIdsi('https://uzum.uz/product/sinov-2838215#x')).toBe(2838215);
    expect(uzumTovarIdsi('https://uzum.uz/uz/category/14237')).toBeNull();
    expect(uzumTovarIdsi('https://example.com/product/12')).toBeNull();
  });

  it('uzumOchishManzili: brauzerda oʻlchangan parametrlar (2026-11-05)', () => {
    expect(uzumOchishManzili({ turkum: 14237, saralash: 'kop_buyurtma', narxMin: 100000, narxMax: 200000 }))
      .toBe('https://uzum.uz/uz/category/14237?sorting=orders&ordering=descending&filters=filter%3DRV-0%3A100000~200000');
    expect(uzumOchishManzili({ turkum: 14237, saralash: 'narx_arzon', narxMin: null, narxMax: null }))
      .toBe('https://uzum.uz/uz/category/14237?sorting=price&ordering=ascending');
    expect(uzumOchishManzili({ turkum: 14237, saralash: 'ommabop', narxMin: null, narxMax: 150000 }))
      .toBe('https://uzum.uz/uz/category/14237?filters=filter%3DRV-0%3A0~150000');
    expect(uzumOchishManzili({ turkum: null, saralash: 'ommabop', narxMin: null, narxMax: null })).toBeNull();
  });

  it('filtrniTekshir: nomaʼlum kalit va chegaradan tashqari qiymat — xato, jim tashlanmaydi', () => {
    expect(filtrniTekshir({ turkumlar: [1, 2], narx_max: 100000, faqat_bor: false, soz: ' shim ' }))
      .toEqual({ filtr: { turkumlar: [1, 2], narx_max: 100000, soz: 'shim' } });
    expect(filtrniTekshir({ narx_min: 1.5 })).toMatchObject({ xato: expect.stringMatching(/narx_min/) });
    expect(filtrniTekshir({ reyting_min: 7 })).toMatchObject({ xato: expect.stringMatching(/reyting/) });
    expect(filtrniTekshir({ sql: 'drop' })).toMatchObject({ xato: expect.stringMatching(/nomaʼlum/) });
    expect(filtrniTekshir(null)).toEqual({ filtr: {} });
  });

  it('asbobSorovi: RPC nomi va argumentlari, chegaralar', () => {
    expect(asbobSorovi('tovar_qidir', { filtr: {}, saralash: 'trend', limit: 99 }))
      .toEqual({ rpc: 'so_tahlil_tovarlar', arg: { p_filtr: {}, p_saralash: 'trend', p_limit: 10 } });
    expect(asbobSorovi('tovar_qidir', { filtr: {}, saralash: 'drop table' })).toEqual({ xato: 'saralash nomaʼlum' });
    expect(asbobSorovi('tovar_tahlili', { havola: 'https://uzum.uz/uz/product/x-55' })).toEqual({ rpc: 'so_tahlil_tovar', arg: { p_id: 55 } });
    expect(asbobSorovi('hisobla', { ifoda: '10/4' })).toEqual({ natija: { ifoda: '10/4', natija: 2.5 } });
    expect(asbobSorovi('turkumlar_reytingi', { saralash: 'osish', barglar: true }))
      .toEqual({ rpc: 'so_tahlil_turkumlar', arg: { p_ota: null, p_saralash: 'osish', p_limit: 10, p_barglar: true } });
    expect(asbobSorovi('sql', {})).toEqual({ xato: 'nomaʼlum asbob: sql' });
  });

  it('tahlilQismi: chala JSON dan qisqa — escape bilan', () => {
    expect(tahlilQismi('{"qisqa":"Kiyimda 17 902 sotuvchi\\nEng yax')).toBe('Kiyimda 17 902 sotuvchi\nEng yax');
    expect(tahlilQismi('{"qisqa": "Tayyor", "batafsil": "x"}')).toBe('Tayyor');
    expect(tahlilQismi('{"batafsil":')).toBe('');
  });

  it('tahlilJavobiniOqi: buzuq id va saralash tashlanadi', () => {
    const j = tahlilJavobiniOqi(JSON.stringify({
      qisqa: ' Javob ', batafsil: 'b', tovarlar: [1, -2, 3.5, 'x', 4], dokonlar: [],
      ochish: { turkum: 5, saralash: 'xavfli', narx_min: null, narx_max: null }, keyingi: ['a', '', 7],
    }));
    expect(j).toMatchObject({ qisqa: 'Javob', tovarlar: [1, 4], ochish: null, keyingi: ['a'] });
    expect(tahlilJavobiniOqi('{"qisqa": ""}')).toBeNull();
    expect(tahlilJavobiniOqi('emas json')).toBeNull();
  });
});
