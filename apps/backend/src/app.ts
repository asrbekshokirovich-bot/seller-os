import Fastify, { type FastifyInstance } from 'fastify';
import { type Sifat, holat } from './sifat.js';

/**
 * Backend — yagona kirish nuqtasi.
 *
 * Web, bot va kengaytma bazaga TO'G'RIDAN-TO'G'RI tegmaydi (reja, 5-bo'lim).
 * Hammasi shu API orqali. Sabab: tavsiya mantiqi bitta joyda tursin —
 * uch mijoz uch xil hisoblab, uch xil javob bermasin.
 */
export function build(): FastifyInstance {
  const app = Fastify({ logger: false });

  /** Staging tirikmi — deploy darvozasi shuni so'raydi. */
  app.get('/health', async () => ({
    ok: true,
    service: 'selleros-backend',
    stage: process.env.NODE_ENV ?? 'development',
    /**
     * Jonli rejim flaglari. Reja: tashqi jarayon kutilsa ham kod
     * to'xtamaydi — sandbox/ariza rejimida ishlayveradi va jonli rejim
     * kalit kelgach FLAG bilan yoqiladi.
     */
    live: {
      payments: process.env.PAYMENTS_LIVE === '1',
    },
  }));

  /**
   * Sifat paneli. Baza bilan ulanmagan boʻlsa ham javob beradi —
   * "oʻlchov yoʻq" ham javob, va uni koʻrsatish shart.
   */
  app.get('/sifat', async () => {
    const sifat = await sifatniOl();
    return { ...sifat, holat: holat(sifat) };
  });

  return app;
}

/** Bazadan sifat hisobotini oladi. Ulanmagan boʻlsa boʻsh holat. */
async function sifatniOl(platform = 'uzum'): Promise<Sifat> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bosh: Sifat = {
    platform,
    last_sweep_at: null,
    coverage_percent: null,
    error_percent: null,
    requested: null,
    found: null,
    missing: null,
    errors: null,
    stopped_reason: null,
    measured_today: 0,
    has_data: false,
  };
  if (!url || !key) return bosh;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/so_quality`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_platform: platform }),
    });
    if (!response.ok) return bosh;
    return (await response.json()) as Sifat;
  } catch {
    // Baza javob bermasa panel yiqilmasligi kerak: "oʻlchov yoʻq" deb
    // koʻrsatiladi va sabab logda qoladi.
    return bosh;
  }
}
