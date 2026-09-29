// Kengaytma qurish: esbuild bilan TS → JS, keyin fayllarni dist ga koʻchirish.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
mkdirSync(dist, { recursive: true });

// TypeScript → JavaScript (content script)
await build({
  entryPoints: ['src/content.ts'],
  bundle: true,
  outfile: join(dist, 'content.js'),
  format: 'iife',
  target: 'chrome120',
  minify: false,
});

// Background service worker
await build({
  entryPoints: ['src/background.ts'],
  bundle: true,
  outfile: join(dist, 'background.js'),
  format: 'esm',
  target: 'chrome120',
  minify: false,
});

// Yon panel (0.2.0) — faqat chat ramkasi
await build({
  entryPoints: ['src/panel.ts'],
  bundle: true,
  outfile: join(dist, 'panel.js'),
  format: 'iife',
  target: 'chrome120',
  minify: false,
});

// Statik fayllar
copyFileSync('manifest.json', join(dist, 'manifest.json'));
copyFileSync('src/content.css', join(dist, 'content.css'));
copyFileSync('panel.html', join(dist, 'panel.html'));
copyFileSync('src/panel.css', join(dist, 'panel.css'));
cpSync('icons', join(dist, 'icons'), { recursive: true });

console.log('Kengaytma qurildi → dist/');
