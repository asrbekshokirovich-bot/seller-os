/**
 * `/suhbat` va `/yordamchi` OQIM bilan — Fastify orqali, baza va Claude soxta (2026-10-20,
 * nazoratchi: «matn yozilgan sari chiqib borsin»).
 *
 * NEGA BU TESTLAR BOR. Butun yoʻl bir joyda tekshiriladi: sayt `{oqim: true}` yuboradi →
 * Claude javobi boʻlaklab keladi → AI yozayotgan xabar `qism` hodisasi boʻlib darhol chiqadi →
 * oxirida `tayyor` — oqimsiz javobning AYNAN oʻzi. Sessiya xatosi oqim boʻlmaydi: oddiy JSON
 * va 401 (sayt vositachisi shunda yangi sessiya ochadi).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keyingi, sseOqi, type YolHolati } from '@selleros/shared';
import { build } from '../src/app.js';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_TUSHUN_MODEL', 'AI_SUHBAT'] as const;
const OLDINGI = new Map<string, string | undefined>();
const HAQIQIY_FETCH = globalThis.fetch;

beforeEach(() => {
  for (const nom of KALITLAR) {
    OLDINGI.set(nom, process.env[nom]);
    delete process.env[nom];
  }
});

afterEach(() => {
  for (const nom of KALITLAR) {
    const eski = OLDINGI.get(nom);
    if (eski === undefined) delete process.env[nom];
    else process.env[nom] = eski;
  }
  globalThis.fetch = HAQIQIY_FETCH;
  vi.restoreAllMocks();
});

/** Tajriba savoli turgan holat: tugma bosilsa keyingisi — qiziqish (kod harakatisiz). */
const QIZIQISH: YolHolati = { javoblar: { ism: 'Aziz', telefon: '+998901234567' }, natijalar: {} };

/** Anthropic oqimi (SSE): matn boʻlaklari bitta matn blokida. */
function claudeOqimi(bolaklar: string[]): Response {
  const h: Array<Record<string, unknown>> = [
    { type: 'message_start', message: {
      id: 'msg_s', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...bolaklar.map((text) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ];
  return new Response(h.map((x) => `event: ${String(x.type)}\ndata: ${JSON.stringify(x)}\n\n`).join(''), {
    status: 200, headers: { 'content-type': 'text/event-stream' },
  });
}

/**
 * Baza va Claude — soxta. `oqi` — `so_suhbat_oqi` javobi; Claude ga ketgan soʻrovlar va har
 * baza chaqiruvi yoziladi; `rpcJavob` — boshqa baza funksiyalarining javobi. Claude oqim soʻrasa —
 * boʻlaklab, soʻramasa — bitta JSON. CBU (dollar kursi) — 12 800 soʻm.
 */
function soxtalar(oqi: unknown, claudeMatni: string[], rpcJavob: Record<string, unknown> = {}) {
  process.env.SUPABASE_URL = 'https://soxta.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'soxta-kalit';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-sinov';
  const claude: Array<Record<string, unknown>> = [];
  const yozildi: unknown[] = [];
  const rpclar: Array<[string, Record<string, unknown>]> = [];
  globalThis.fetch = vi.fn(async (url: unknown, sozlama: unknown) => {
    const u = String(url instanceof Request ? url.url : url);
    const tana = JSON.parse(String((sozlama as { body?: string } | undefined)?.body ?? '{}')) as Record<string, unknown>;
    if (u.includes('cbu.uz')) {
      return new Response(JSON.stringify([{ Ccy: 'USD', Rate: '12800', Nominal: '1', Date: '22.10.2026' }]), { status: 200 });
    }
    if (u.includes('anthropic.com')) {
      claude.push(tana);
      if (tana.stream === true) return claudeOqimi(claudeMatni);
      return new Response(JSON.stringify({
        id: 'msg_s', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: claudeMatni.join('') }], usage: { input_tokens: 100, output_tokens: 30 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const nom = u.split('/rpc/')[1] ?? '';
    rpclar.push([nom, tana]);
    const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (nom === 'so_suhbat_oqi') return json(oqi);
    if (nom === 'so_suhbat_yoz') { yozildi.push(tana); return json({ yozildi: (tana.p_xabarlar as unknown[]).length }); }
    if (nom === 'so_ai_sarf_yoz') return json({ yozildi: true });
    if (nom in rpcJavob) return json(rpcJavob[nom]);
    return json(null);
  }) as unknown as typeof fetch;
  return { claude, yozildi, rpclar };
}

async function sora(url: string, payload: Record<string, unknown>, sessiya = 'sessiya-1') {
  const app = build();
  const res = await app.inject({ method: 'POST', url, payload, headers: { 'x-sessiya': sessiya } });
  await app.close();
  return res;
}

async function hodisalar(tana: string): Promise<Array<[string, unknown]>> {
  const h: Array<[string, unknown]> = [];
  await sseOqi(new Response(tana).body!, (nom, q) => h.push([nom, q]));
  return h;
}

const OQI = () => {
  const k = keyingi(QIZIQISH);
  return {
    holat: QIZIQISH, qadam: 1,
    xabarlar: k.tur === 'savol' ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id, seq: 1, at: '2026-10-20T08:00:00Z' }] : [],
  };
};
const BOLAKLAR = ['{"oldin":"","izoh":"","savol":"Qaysi so', 'ha sizga ', 'yaqin?"}'];

describe('/suhbat oqim bilan', () => {
  it('oqim: yozmoqda → qoralama boʻlaklari → tayyor; tayyor — oqimsiz javobning aynan oʻzi', async () => {
    soxtalar(OQI(), BOLAKLAR);
    const oddiy = await sora('/suhbat', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(oddiy.statusCode).toBe(200);
    expect(oddiy.headers['content-type']).toMatch(/application\/json/);

    const s = soxtalar(OQI(), BOLAKLAR);
    const res = await sora('/suhbat', { savolId: 'qiziqish', javob: ['kiyim'], oqim: true });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
    expect(res.headers['cache-control']).toMatch(/no-transform/);
    expect(s.claude[0]!.stream).toBe(true);
    const h = await hodisalar(res.body);
    expect(h[0]).toEqual(['holat', { holat: 'yozmoqda' }]);
    // Qoralama siyrak (120 ms da bittadan): soxta Claude bir zumda yozadi — birinchisi darhol, oxirgisini
    // `tayyor` bosib ketishi mumkin. Har biri — yakuniy savolning boshi.
    const qismlar = h.filter(([n]) => n === 'qism').map(([, q]) => (q as { savol: string }).savol);
    expect(qismlar[0]).toBe('Qaysi so');
    for (const q of qismlar) expect('Qaysi soha sizga yaqin?'.startsWith(q)).toBe(true);
    expect(h.at(-1)).toEqual(['tayyor', oddiy.json()]);
    expect((oddiy.json() as { xabarlar: Array<{ matn: string }> }).xabarlar.at(-1)!.matn).toBe('Qaysi soha sizga yaqin?');
    // Jurnalga — bitta yozuv (oqim turnni ikki marta yozmaydi).
    expect(s.yozildi).toHaveLength(1);
  });

  it('sessiya topilmasa — oqim YOʻQ: oddiy JSON va 401', async () => {
    soxtalar({ xato: 'sessiya topilmadi' }, BOLAKLAR);
    const res = await sora('/suhbat', { savolId: 'qiziqish', javob: ['kiyim'], oqim: true });
    expect(res.statusCode).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.json()).toMatchObject({ xato: 'sessiya topilmadi' });
  });
});

describe('/yordamchi oqim bilan', () => {
  it('javob yozilgan sari (`qism` — {matn}), oxirida tayyor — {matn, manba}', async () => {
    soxtalar(null, ['ZumSavdo — Uzumda ', 'birinchi marta sotuvchilar uchun yoʻl.']);
    const res = await sora('/yordamchi', { savol: 'ZumSavdo nima?', sahifa: 'bosh', oqim: true }, '');
    expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
    const h = await hodisalar(res.body);
    expect(h[0]).toEqual(['qism', { matn: 'ZumSavdo — Uzumda' }]);
    expect(h.at(-1)).toEqual(['tayyor', { matn: 'ZumSavdo — Uzumda birinchi marta sotuvchilar uchun yoʻl.', manba: 'ai' }]);
  });

  it('oqim soʻralmasa — avvalgidek JSON', async () => {
    soxtalar(null, ['ZumSavdo — yoʻl.']);
    const res = await sora('/yordamchi', { savol: 'ZumSavdo nima?', sahifa: 'bosh' }, '');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.json()).toEqual({ matn: 'ZumSavdo — yoʻl.', manba: 'ai' });
  });
});

/*
 * AI SARFI (0072; nazoratchi, 2026-10-22: «AI xarajatini tuzat»). `ai_usage` 10-19 dan beri boʻsh
 * edi: Claude yozardi, sarfi hech qayerga tushmasdi. Bu yerda butun yoʻl: Claude javobidan keyin
 * `so_ai_sarf_yoz` — sessiya tokeni, maqsad, tokenlar va narx bilan; `/kpi` uni soʻmda beradi.
 */
describe('AI sarfi — har Claude javobi `so_ai_sarf_yoz` ga (0072)', () => {
  const sarflar = (rpclar: Array<[string, Record<string, unknown>]>) =>
    rpclar.filter(([nom]) => nom === 'so_ai_sarf_yoz').map(([, a]) => a);

  it('/suhbat — sessiya tokeni bilan; har Claude chaqiruvi — bitta yozuv (100×$2 + 30×$10 = $0,0005)', async () => {
    const s = soxtalar(OQI(), BOLAKLAR);
    expect((await sora('/suhbat', { savolId: 'qiziqish', javob: ['kiyim'] })).statusCode).toBe(200);
    expect(s.claude.length).toBeGreaterThan(0);
    expect(sarflar(s.rpclar)).toHaveLength(s.claude.length);
    expect(sarflar(s.rpclar)).toContainEqual({
      p_token: 'sessiya-1', p_model: 'claude-sonnet-5-5', p_maqsad: 'ai-yoz', p_kirish: 100, p_chiqish: 30,
      p_kesh_oqildi: 0, p_kesh_yozildi: 0, p_narx_usd: 0.0005,
    });
  });

  it('/suhbat oqim bilan ham — chiqish tokenlari oqim oxiridan', async () => {
    const s = soxtalar(OQI(), BOLAKLAR);
    const res = await sora('/suhbat', { savolId: 'qiziqish', javob: ['kiyim'], oqim: true });
    await hodisalar(res.body);
    expect(sarflar(s.rpclar)).toContainEqual(expect.objectContaining({
      p_token: 'sessiya-1', p_maqsad: 'ai-yoz', p_kirish: 100, p_chiqish: 30, p_narx_usd: 0.0005,
    }));
  });

  it('/yordamchi sessiyasiz — mijozsiz (`p_token: null`), maqsad «sahifa»', async () => {
    const s = soxtalar(null, ['ZumSavdo — yoʻl.']);
    await sora('/yordamchi', { savol: 'ZumSavdo nima?', sahifa: 'bosh' }, '');
    expect(sarflar(s.rpclar)).toEqual([expect.objectContaining({ p_token: null, p_maqsad: 'sahifa', p_narx_usd: 0.0005 })]);
  });

  it('/kpi — AI xarajati soʻmda (CBU kursi); «AI xarajat / mijoz» oʻlchangan', async () => {
    soxtalar(null, [], {
      so_kpi_xom: {
        usta: { boshladi: 30, uchinchi_qadam: 20, uchinchi_profilsiz: 0 },
        tavsiya: { jami: 40, qabul: null },
        obuna: { kohort: 0, pullik_30kun: 0, davr_tugadi: 0, davr_ketdi: 0 },
        tolov: { qatorlar: 0 },
        ai: {
          qatorlar: 400, xarajat_usd: 3.2, oxirgi: '2026-10-22T07:00:00Z',
          bugun: { chaqiruv: 40, usd: 0.32 }, kun7: { chaqiruv: 200, usd: 1.6 },
          kun30: { chaqiruv: 400, usd: 3.2, narxsiz: 0, mijoz: 25, mehmon_usd: 0.2 },
          maqsad_30kun: { 'ai-yoz': { chaqiruv: 400, usd: 3.2 } }, xabar_7kun: 180,
        },
        hodisa: { qatorlar: 0 },
      },
      so_quality: { has_data: false, coverage_percent: null, error_percent: null },
    });
    const app = build();
    const res = await app.inject({ method: 'GET', url: '/kpi' });
    await app.close();
    const j = res.json() as {
      kpi: Array<{ kalit: string; qiymat: number | null; holat: string; namuna: number | null }>;
      ai: { davrlar: unknown[]; kurs: unknown; maqsadlar: unknown[] };
    };
    expect(j.ai.davrlar.at(-1)).toEqual({ nom: '30 kun', chaqiruv: 400, usd: 3.2, som: 40960 });
    expect(j.ai.kurs).toEqual({ somPerUsd: 12800, sana: '22.10.2026' });
    expect(j.ai.maqsadlar).toEqual([{ maqsad: 'ai-yoz', nom: 'Suhbat — xabar yozish', chaqiruv: 400, usd: 3.2 }]);
    // $3,2 / 25 mijoz × 12 800 = 1 638 soʻm — 149 000 ning 1,1 %i.
    expect(j.kpi.find((k) => k.kalit === 'ai_xarajat')).toMatchObject({ qiymat: 1.1, holat: 'yaxshi', namuna: 25 });
  });
});

/*
 * 2026-10-27: cbu.uz serverlarimizga javob bermaydi — sahifa kursni brauzerda oladi va soʻrovga
 * qoʻshadi (`kurs`). Server uni tekshirib ishlatadi va CBU ga oʻzi soʻramaydi; oʻtmasa — oʻzi
 * urinadi. Zanjir — Fastify `/suhbat` orqali (Edge bilan bir xil).
 */
/*
 * 2026-10-26: mijoz gapini tushunish — Haiku 5.5 (tez, arzon), yozish — Sonnet 5.5. Zanjir: Fastify
 * `/suhbat` (Edge bilan bir xil) yozilgan gapda avval Haiku ga, keyin Sonnet ga soʻraydi.
 */
describe('/suhbat — tushunish Haiku da, yozish Sonnet da', () => {
  it('yozilgan gap: birinchi soʻrov — Haiku (zaxirasiz), ikkinchisi — Sonnet (zaxira bilan)', async () => {
    // Soxta Claude har soʻrovga bir xil javob beradi — ikkala shaklga ham mos (tushuncha va xabar).
    const s = soxtalar(OQI(), ['{"javoblar":[],"taklif_qiziqish":[],"savol_bor":true,"oldin":"Ha, boshlash bepul.","izoh":"","savol":"Qaysi soha sizga yaqin?"}']);
    await sora('/suhbat', { savolId: 'qiziqish', matn: 'bu bepulmi?' });
    expect(s.claude.map((c) => c.model)).toEqual(['claude-haiku-5-5', 'claude-sonnet-5-5']);
    expect(s.claude[0]!.fallbacks).toBeUndefined();
    expect(s.claude[1]!.fallbacks).toBe('default');
  });

  it('CLAUDE_TUSHUN_MODEL bilan boshqa model', async () => {
    const s = soxtalar(OQI(), ['{"javoblar":[],"taklif_qiziqish":[],"savol_bor":true}']);
    process.env.CLAUDE_TUSHUN_MODEL = 'claude-sonnet-5-5';
    try {
      await sora('/suhbat', { savolId: 'qiziqish', matn: 'bu bepulmi?' });
    } finally {
      delete process.env.CLAUDE_TUSHUN_MODEL;
    }
    expect(s.claude[0]!.model).toBe('claude-sonnet-5-5');
  });
});

describe('/suhbat — brauzer yuborgan CBU kursi', () => {
  /** Bugun, Toshkent boʻyicha, `kk.oo.yyyy` (CBU shakli). */
  const bugun = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10).split('-').reverse().join('.');

  function cbuSanogi() {
    const asl = globalThis.fetch;
    const cbu: string[] = [];
    globalThis.fetch = (async (url: unknown, sozlama: unknown) => {
      const u = String(url instanceof Request ? url.url : url);
      if (u.includes('cbu.uz')) cbu.push(u);
      return asl(url as string, sozlama as RequestInit);
    }) as typeof fetch;
    return cbu;
  }
  const kursi = (s: ReturnType<typeof soxtalar>) =>
    ((s.yozildi[0] as { p_holat: YolHolati }).p_holat.natijalar['kurs'] as { usd: { somPerYuan: number } | null }).usd?.somPerYuan;

  it('toʻgʻri kurs — serverda ishlatiladi, CBU ga soʻrov yoʻq', async () => {
    const s = soxtalar(OQI(), BOLAKLAR);
    const cbu = cbuSanogi();
    const res = await sora('/suhbat', {
      savolId: 'qiziqish', javob: ['kiyim'],
      kurs: { USD: { Ccy: 'USD', Rate: '11861.96', Nominal: '1', Date: bugun() } },
    });
    expect(res.statusCode).toBe(200);
    expect(kursi(s)).toBe(11861.96);
    expect(cbu).toEqual([]);
  });

  it('soxta yoki eskirgan kurs — qabul qilinmaydi: server CBU ga oʻzi soʻraydi', async () => {
    for (const USD of [{ Ccy: 'USD', Rate: '99', Nominal: '1', Date: bugun() }, { Ccy: 'USD', Rate: '11861.96', Nominal: '1', Date: '01.01.2026' }]) {
      const s = soxtalar(OQI(), BOLAKLAR);
      const cbu = cbuSanogi();
      await sora('/suhbat', { savolId: 'qiziqish', javob: ['kiyim'], kurs: { USD } });
      expect(kursi(s), USD.Rate).toBe(12800);
      expect(cbu, USD.Rate).toHaveLength(1);
    }
  });
});

/* 5-taklif (2026-10-28): «Siz haqingizda» belgisi — Fastify `/suhbat` `{tahrir}` (Edge bilan bir xil). */
describe('/suhbat — «Siz haqingizda» belgisi (tahrir)', () => {
  const KURS_N = { olchov_yoq: false, usd: { somPerYuan: 12_650, valyuta: 'USD', sana: '12.10.2026', manba: 'CBU' } };
  const BYUDJETLI: YolHolati = { javoblar: { ...QIZIQISH.javoblar, qiziqish: ['kiyim'], byudjet: 30_000_000 }, natijalar: { kurs: KURS_N } };
  const oqi = (h: YolHolati) => ({ holat: h, qadam: 2, xabarlar: [] });

  it('savol qayta ochiladi: mijoz gapi va savol, AI chaqirilmaydi; belgilar javobda', async () => {
    const s = soxtalar(oqi(BYUDJETLI), BOLAKLAR);
    const res = await sora('/suhbat', { tahrir: 'byudjet', til: 'uz' });
    expect(res.statusCode).toBe(200);
    const j = res.json() as { xabarlar: Array<{ rol: string; matn: string }>; keyingi: { tur: string; savol?: { id: string } }; sizHaqingizda: unknown[] };
    expect(j.xabarlar[0]).toEqual({ rol: 'obunachi', matn: 'Pulni oʻzgartiraman' });
    expect(j.keyingi.savol?.id).toBe('byudjet');
    expect(j.sizHaqingizda).toEqual([{ id: 'qiziqish', matn: 'Kiyim va poyabzal', tahrir: true }]);
    expect(s.claude).toHaveLength(0);
    expect(s.yozildi).toHaveLength(1);
  });

  it('mumkin boʻlmasa — 200 va sababi, hech narsa yozilmaydi', async () => {
    const s = soxtalar(oqi(QIZIQISH), BOLAKLAR);
    const res = await sora('/suhbat', { tahrir: 'byudjet' });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { xato: string }).xato).toBe('Bu javobni oʻzgartirib boʻlmaydi.');
    expect(s.yozildi).toHaveLength(0);
  });
});
