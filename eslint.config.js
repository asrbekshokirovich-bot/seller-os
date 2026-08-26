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
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js',
      // Next.js qurish paytida yozadigan turlar. Ular mashina
      // yozgan va `any` bilan toʻla — ularni tekshirishning maʼnosi
      // yoʻq, chunki tuzatib boʻlmaydi.
      'apps/web/.next/**',
    ],
  },
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
  {
    /*
     * `.mjs` — operatsion skriptlar: Edge nusxasini yasovchi, seed
     * yuklovchi, oʻlik kod va maʼlumot yoshi qorovullari, dizayn
     * qurishi. 1 387 satr, va ular linting dan TASHQARIDA edi.
     *
     * Bu eng yomon joyda boʻshliq: aynan shu fayllar buzilsa CI
     * yashil qolaveradi va nosozlik ishlab chiqarishga chiqadi.
     * Bugun ularning bittasi (`tayyorlash.mjs`) Edge Function
     * nusxasini yasaydi.
     *
     * TypeScript qoidalari qoʻllanmaydi — bu oddiy JS. Node
     * globallari eʼlon qilinadi, aks holda `process` va `console`
     * "aniqlanmagan" deb koʻrsatiladi.
     */
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly', console: 'readonly', Buffer: 'readonly',
        URL: 'readonly', fetch: 'readonly', setTimeout: 'readonly',
        TextEncoder: 'readonly', TextDecoder: 'readonly',
        __dirname: 'readonly', structuredClone: 'readonly',
        AbortSignal: 'readonly', AbortController: 'readonly',
      },
    },
    rules: {
      /*
       * `no-console` bu yerda OʻCHIRILADI va bu yon berish emas.
       *
       * Bu fayllar — buyruq satri vositalari. Ularning butun
       * vazifasi natijani ekranga chiqarish: qorovul nima
       * topganini, seed nechta qator yuklaganini, Edge nusxasi
       * necha fayl yasaganini. `console.error` ga koʻchirish
       * oddiy chiqishni xato oqimiga tiqib qoʻyardi va CI
       * jurnalini oʻqib boʻlmasdi.
       *
       * Qolgan qoidalar KUCHDA qoladi — aynan ular kerak edi:
       * `no-undef` shu zahoti `malumot-yoshi.mjs` da eʼlon
       * qilinmagan `AbortSignal` ni topdi.
       */
      'no-console': 'off',
    },
  },
);
