// Oddiy qurish: TypeScript fayllarni dist ga koʻchiradi.
// Haqiqiy qurish uchun esbuild kerak boʻladi.
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const dist = 'dist';
mkdirSync(dist, { recursive: true });

// manifest va CSS toʻgʻridan-toʻgʻri koʻchiriladi
copyFileSync('manifest.json', join(dist, 'manifest.json'));
copyFileSync('src/content.css', join(dist, 'content.css'));

console.log('Kengaytma qurildi → dist/');
console.log('TypeScript kompilyatsiya uchun: npx tsc');
