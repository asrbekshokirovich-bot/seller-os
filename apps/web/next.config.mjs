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

  webpack(webpackConfig) {
    webpackConfig.resolve.extensionAlias = {
      ...webpackConfig.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return webpackConfig;
  },
};

export default config;
