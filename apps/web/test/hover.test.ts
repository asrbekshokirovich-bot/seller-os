import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Tugmalardagi :hover — faqat sichqonchali qurilmada (ikkinchi koʻrik, 8-taklif): telefonda bosilgan joydagi
 * :hover keyingi savolning xuddi shu joydagi tugmasida qolib, u «tanlangandek» koʻrinardi.
 */
describe('telefonda «tanlangandek» koʻrinish yoʻq', () => {
  it('usta.module.css: :hover qoidalari @media (hover: hover) ichida', () => {
    const css = readFileSync(new URL('../src/app/usta/usta.module.css', import.meta.url), 'utf8');
    const tashqarida: string[] = [];
    let chuqurlik = 0;
    let hoverMedia = -1;
    for (const qator of css.split(/\r?\n/u)) {
      if (/@media \(hover: hover\)/u.test(qator)) hoverMedia = chuqurlik;
      // Havola rangi va aylantirish chizigʻi — tanlov koʻrinishi emas.
      // Faqat selektor qatorlari (izoh qatorlari emas): «… :hover … {» yoki «… :hover,».
      if (/^\s*[^*/\s][^{]*:hover[^{]*(\{|,\s*$)/u.test(qator) && hoverMedia < 0 && !/\.ilova a\.belgi:hover|\.oqim:hover/u.test(qator)) tashqarida.push(qator.trim());
      chuqurlik += (qator.match(/\{/gu) ?? []).length - (qator.match(/\}/gu) ?? []).length;
      if (hoverMedia >= 0 && chuqurlik <= hoverMedia) hoverMedia = -1;
    }
    expect(tashqarida).toEqual([]);
  });
});
