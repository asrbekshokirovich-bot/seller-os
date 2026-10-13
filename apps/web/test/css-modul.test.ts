/**
 * CSS modullarida bitta sinf ikki marta yozilmasin (media-blokdan tashqarida).
 *
 * NEGA BU TEST BOR. 2026-10-13: 👍/👎 tugmalari uchun `.baho` sinfi qoʻshildi —
 * `usta.module.css` da bu nom allaqachon 2-qadam kartasidagi «Imkoniyat bahosi»
 * bloki edi. CSS modulda ikki qoida qoʻshilib ketadi: kartadagi blok `flex`
 * qatorga aylandi va baho chizigʻi buzildi. Hech qaysi test buni sezmadi.
 *
 * `@media` ichidagi qayta taʼrif — ataylab (ekran oʻlchamiga moslash), u sanalmaydi.
 * ISTISNO — tekshirilmagan eski takrorlar; ularni koʻrib chiqish kerak.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ILDIZ = join(__dirname, '..', 'src');

/** Hozircha qoldirilgan eski takrorlar (2026-10-14 da bor edi). */
const ISTISNO: Record<string, readonly string[]> = {
  'bosh.module.css': ['oldingi', 'keyingi'],
  'obuna.module.css': ['belgiBor', 'belgiYoq'],
};

function cssFayllar(papka: string): string[] {
  return readdirSync(papka).flatMap((n) => {
    const yol = join(papka, n);
    return statSync(yol).isDirectory() ? cssFayllar(yol) : n.endsWith('.module.css') ? [yol] : [];
  });
}

/** Media-blokdan tashqaridagi `.sinf {` qoidalari — takrorlanganlari. */
function takrorlar(css: string): string[] {
  const s = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let chuqurlik = 0;
  let tanlov = '';
  const korilgan = new Set<string>();
  const takror = new Set<string>();
  for (const c of s) {
    if (c === '{') {
      const sel = tanlov.trim();
      if (chuqurlik === 0 && !sel.startsWith('@')) {
        for (const qism of sel.split(',')) {
          const m = /^\.([A-Za-z0-9_-]+)$/.exec(qism.trim());
          if (m) (korilgan.has(m[1]!) ? takror : korilgan).add(m[1]!);
        }
      }
      chuqurlik++;
      tanlov = '';
    } else if (c === '}') {
      chuqurlik--;
      tanlov = '';
    } else {
      tanlov = c === ';' ? '' : tanlov + c;
    }
  }
  return [...takror];
}

describe('CSS modullari — sinf nomi toʻqnashuvi yoʻq', () => {
  const fayllar = cssFayllar(ILDIZ);

  it('fayllar topildi', () => {
    expect(fayllar.length).toBeGreaterThan(3);
  });

  it.each(fayllar.map((f) => [f.slice(ILDIZ.length + 1), f]))('%s', (nom, yol) => {
    const qisqa = nom.split(/[\\/]/).pop()!;
    const yangi = takrorlar(readFileSync(yol, 'utf8')).filter((x) => !(ISTISNO[qisqa] ?? []).includes(x));
    expect(yangi, `bir xil sinf ikki marta: ${yangi.join(', ')}`).toEqual([]);
  });

  it('qoʻriqchi tirik: takrorni topadi, @media dagini sanamaydi', () => {
    expect(takrorlar('.a { x: 1 } .b { y: 2 } .a { z: 3 }')).toEqual(['a']);
    expect(takrorlar('.a { x: 1 } @media (max-width: 9px) { .a { x: 2 } }')).toEqual([]);
  });
});
