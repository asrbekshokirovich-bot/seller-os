/**
 * Manifest ruxsatlari — har biri kodda HAQIQATAN ishlatiladi.
 *
 * NEGA BU TEST BOR. Chrome Web Store 0.2.2 ni rad etdi (2026-10-05,
 * "Purple Potassium"): manifestda `activeTab` soʻralgan, lekin kodda
 * ishlatilmagan. Doʻkon har ruxsatni tekshiradi; ishlatilmagani — rad.
 * Bu test yangi ruxsat qoʻshilsa, uning ishlatilishini ham talab qiladi:
 * roʻyxatda yoʻq ruxsat — test yiqiladi (avval shu yerga qoʻshing).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ILDIZ = join(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(ILDIZ, 'manifest.json'), 'utf8')) as {
  version: string;
  permissions?: string[];
  host_permissions?: string[];
};
const paket = JSON.parse(readFileSync(join(ILDIZ, 'package.json'), 'utf8')) as { version: string };
const kod = readdirSync(join(ILDIZ, 'src'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => readFileSync(join(ILDIZ, 'src', f), 'utf8'))
  .join('\n');

/** Ruxsat → uni ishlatadigan API (kodda shu boʻlmasa — ruxsat ortiqcha). */
const ISHLATILISHI: Readonly<Record<string, RegExp>> = {
  storage: /chrome\.storage\./,
  sidePanel: /chrome\.sidePanel\??\./,
};

describe('manifest', () => {
  it('har ruxsat kodda ishlatiladi (ortiqcha ruxsat — doʻkon rad etadi)', () => {
    for (const r of manifest.permissions ?? []) {
      const re = ISHLATILISHI[r];
      expect(re, `"${r}" ruxsati uchun ishlatilish qoidasi yoʻq — kerakmi?`).toBeDefined();
      expect(re!.test(kod), `"${r}" ruxsati soʻralgan, lekin kodda ishlatilmagan`).toBe(true);
    }
  });

  it('activeTab soʻralmaydi (0.2.2 shu sabab rad etilgan)', () => {
    expect(manifest.permissions ?? []).not.toContain('activeTab');
  });

  it('host ruxsati faqat Edge Function ga va u kodda chaqiriladi', () => {
    for (const h of manifest.host_permissions ?? []) {
      const manzil = h.replace(/\/\*$/, '');
      expect(kod.includes(manzil), `${h} kodda chaqirilmaydi`).toBe(true);
    }
  });

  it('manifest va package.json versiyasi bir xil', () => {
    expect(manifest.version).toBe(paket.version);
  });
});
