import Fastify, { type FastifyInstance } from 'fastify';

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

  return app;
}
