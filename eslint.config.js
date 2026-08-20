// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lint darvozasi.
 *
 * B1 tekshiruvi shuni ochdi: `npm run lint` bironta workspace da
 * skript boʻlmagani uchun HECH NARSA qilmasdi. CI da "lint" darvozasi
 * bor edi, lekin u boʻsh oʻtardi.
 *
 * Qoidalar oz va ataylab: koʻp qoida shovqin beradi va uni oʻchirish
 * odat boʻlib qoladi. Bu yerdagilar bugungi haqiqiy xatolarga qarshi.
 */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Ishlatilmaydigan oʻzgaruvchi — oʻlik kod belgisi. `sellersCount`
      // filtrdan olib tashlanganda aynan shu qoldi.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // `any` — tip tekshiruvidan qochish. Uni ataylab qoʻysa boʻladi,
      // lekin sezilmasdan kirib qolmasin.
      '@typescript-eslint/no-explicit-any': 'error',
      // `==` oʻrniga `===`. `null` va `undefined` ni aralashtirish
      // "bilmadim/yoʻq" chalkashligining bir koʻrinishi.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
);
