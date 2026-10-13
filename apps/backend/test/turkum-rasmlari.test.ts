/**
 * 2-qadam yoʻnalish kartasidagi tovar rasmlari (nazoratchi, 2026-10-14: "mijoz
 * rasm topib yuklaguncha zerikib qoladi — rasm bilan oʻzing top").
 * Eng koʻp sotilganlari oldin, faqat http(s), takrorsiz, 3 tagacha.
 */

import { describe, expect, it } from 'vitest';
import { turkumRasmlari, type TovarNomzodi } from '@selleros/shared';

const t = (productId: number, sotuv: number | null, rasmUrl: string | null | undefined): TovarNomzodi =>
  ({ productId, title: `Tovar ${productId}`, soldUnits30d: sotuv, rasmUrl } as unknown as TovarNomzodi);

describe('turkumRasmlari', () => {
  it('eng koʻp sotilgani oldin; rasmsiz va http(s) boʻlmagan tashlanadi; takror yoʻq; 3 ta', () => {
    const r = turkumRasmlari([
      t(1, 5, 'https://images.uzum.uz/a/t_product_540_high.jpg'),
      t(2, 40, 'https://images.uzum.uz/b/t_product_540_high.jpg'),
      t(3, null, 'https://images.uzum.uz/c/t_product_540_high.jpg'),
      t(4, 90, null),
      t(5, 70, 'javascript:alert(1)'),
      t(6, 20, 'https://images.uzum.uz/b/t_product_540_high.jpg'),
      t(7, 10, 'https://images.uzum.uz/d/t_product_540_high.jpg'),
    ]);
    expect(r).toEqual([
      { url: 'https://images.uzum.uz/b/t_product_540_high.jpg', nom: 'Tovar 2' },
      { url: 'https://images.uzum.uz/d/t_product_540_high.jpg', nom: 'Tovar 7' },
      { url: 'https://images.uzum.uz/a/t_product_540_high.jpg', nom: 'Tovar 1' },
    ]);
  });

  it('rasm yoʻq — boʻsh roʻyxat (karta rasmsiz chiziladi)', () => {
    expect(turkumRasmlari([t(1, 5, null), t(2, 3, undefined)])).toEqual([]);
  });
});
