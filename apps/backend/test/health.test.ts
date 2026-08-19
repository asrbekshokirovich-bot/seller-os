import { describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

describe('backend', () => {
  it('/health javob beradi — staging darvozasi shuni so\'raydi', async () => {
    const app = build();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, service: 'selleros-backend' });
    await app.close();
  });

  it('to\'lov standart holatda SANDBOX — jonli rejim faqat flag bilan', async () => {
    const app = build();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.json().live.payments).toBe(false);
    await app.close();
  });
});
