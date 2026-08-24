/**
 * Usta — 1-qadam formasi va 2-qadam yoʻnalishlari.
 *
 * `transpilePackages` kerak: `@selleros/shared` ishchi maydondagi
 * TypeScript paketi, u oldindan qurilmaydi. Mantiq shu yerda ham,
 * backendda ham AYNAN bir xil boʻlishi shart — savol matni va ball
 * qoidasi ikki joyda takrorlansa, ular albatta ajralib ketadi.
 *
 * NEGA WEBPACK, TURBOPACK EMAS
 *
 * `@selleros/shared` ichida importlar `.js` bilan yoziladi
 * (`./profil.js`), fayllar esa `.ts`. Bu Node ESM ning talabi —
 * TypeScript `.js` yozishni soʻraydi va oʻzi `.ts` ni topadi.
 *
 * Turbopack bu moslashtirishni qilmaydi va 14 ta "Module not found"
 * beradi. Webpack da `extensionAlias` bor.
 *
 * Uchta yoʻl bor edi:
 *   1. `shared` ni `dist/` ga qurish — lekin u yana bitta hosila
 *      artefakt, yaʼni yana bitta eskirish manbai;
 *   2. importlardan `.js` ni olib tashlash — Node ESM da ishlamaydi;
 *   3. webpack.
 *
 * Uchinchisi tanlandi: u hech narsani buzmaydi va Turbopack shu
 * imkonni olgach bitta qatorni oʻchirish kifoya.
 */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@selleros/shared'],

  /*
   * `/` — sotuv sahifasi, `/usta` — forma.
   *
   * Sotuv sahifasi Next komponenti EMAS: u dizayn vositasidan
   * chiqqan 177 KB lik tayyor HTML (`dizayn/qurish.mjs` yasaydi).
   * Uni JSX ga koʻchirish mumkin edi, lekin keyin dizaynning har
   * yangi versiyasi qoʻlda koʻchirishni talab qilardi — va oʻsha
   * yerda matn jimgina eskirardi.
   *
   * Shuning uchun u `public/sotuv.html` da statik fayl boʻlib
   * qoladi. Next `public/index.html` ni `/` da xizmat qilmaydi,
   * shu sababdan yoʻnaltirish kerak.
   *
   * `beforeFiles` — fayl tizimidan OLDIN tekshiriladi, yaʼni
   * kelajakda kimdir `app/page.tsx` yaratib qoʻysa ham sotuv
   * sahifasi ustun qoladi va bu jimgina almashib ketmaydi.
   */
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/sotuv.html' }],
      afterFiles: [],
      fallback: [],
    };
  },

  webpack(webpackConfig) {
    webpackConfig.resolve.extensionAlias = {
      ...webpackConfig.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return webpackConfig;
  },
};

export default config;
