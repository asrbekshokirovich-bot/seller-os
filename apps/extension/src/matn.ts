// Uzum sahifasidagi matnlar — sof funksiyalar (testlanadi, `test/matn.test.ts`).

/**
 * "Savatga qoʻshish" tugmasimi. Uzum ruscha sahifada (`/ru/product/…`) bu
 * tugma «Добавить в корзину»: faqat "savatga" qidirilganda u topilmas va
 * bizning tugma sahifaning eng pastiga (`.product-page` oxiriga) tushardi
 * (oʻlchandi 2026-10-05: savat ~554 px, tugma ~1 900 px da).
 */
export function savatTugmasimi(matn: string): boolean {
  return /savatga|в корзину/i.test(matn);
}

/**
 * Brauzer yoki kengaytma xatosi → odamga tushunarli oʻzbekcha matn.
 *
 * Ilgari tugmada xom inglizcha matn chiqardi: kengaytma yangilangandan keyin
 * ochiq turgan sahifada «Xato: Extension context invalidated.», internet
 * yoʻqda — «Xato: Failed to fetch». Xom xato konsolga yoziladi.
 */
export function xatoMatni(xato: unknown): string {
  const m = xato instanceof Error ? xato.message : String(xato ?? '');
  if (/extension context invalidated/i.test(m)) return 'kengaytma yangilandi — sahifani yangilang (F5)';
  if (/failed to fetch|networkerror|load failed|network/i.test(m)) return 'internetga ulanib boʻlmadi — qayta urinib koʻring';
  return 'kutilmagan xato — sahifani yangilab, qayta urinib koʻring';
}
