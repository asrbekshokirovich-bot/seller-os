// Kengaytmaning orqa xizmati — TARMOQQA CHIQADIGAN YAGONA JOY.
//
// NEGA CONTENT SCRIPT EMAS. Manifest V3 da content script sahifaning
// (uzum.uz) manshasidan soʻrov yuboradi va CORS ga tushadi. Servis
// ishchisi esa kengaytmaning oʻz manshasidan yuboradi va
// `host_permissions` da koʻrsatilgan manzillar uchun CORS dan ozod.
//
// Birinchi yozuvda soʻrov content script ichida edi va manifestda
// `host_permissions` ham yoʻq edi — yaʼni ikki sababdan ishlamasdi.

/** Supabase Edge Function. Fastify serveri hech qayerda ishlamaydi. */
const BACKEND_URL = 'https://duequijnnzcngzzvjqst.supabase.co/functions/v1/selleros';

/**
 * Supabase ning OMMAVIY kaliti.
 *
 * Bu `anon`/publishable kalit — u brauzerga chiqishi uchun
 * moʻljallangan va panel ham shuni ishlatadi. `service_role` kaliti
 * bu yerga HECH QACHON tushmasligi kerak (QOIDALAR.md, 3-qoida):
 * u faqat yigʻuvchida va GitHub sirlarida yashaydi.
 */
const ANON_KEY = 'sb_publishable_KzLAuxJYrA66iD4lMp7V-g_1GYLuNzL';

/** Sessiya tokeni shu kalit ostida saqlanadi. */
const SESSIYA_KALITI = 'sessiya';

/**
 * Uchning javobi.
 *
 * Nom ataylab `Natija` emas: `content.ts` da import/export yoʻq, yaʼni
 * u modul emas va undagi `Natija` interfeysi GLOBAL boʻlib qoladi.
 * Ikkalasi bir nom bilan toʻqnashardi.
 */
interface QidiruvJavobi {
  natijalar?: unknown[];
  izoh?: string;
  xato?: string;
  limit?: unknown;
}

function sarlavhalar(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  if (token) h['x-sessiya'] = token;
  return h;
}

/**
 * Sessiya tokenini oladi — saqlangani boʻlsa oʻshani, boʻlmasa yangisini.
 *
 * Token `chrome.storage.local` da qoladi: har qidiruvda yangi sessiya
 * ochish bazada keraksiz qator yaratardi va kunlik limit hisobi
 * maʼnosini yoʻqotardi.
 */
async function sessiyaOl(yangidan = false): Promise<string | null> {
  if (!yangidan) {
    const saqlangan = await chrome.storage.local.get(SESSIYA_KALITI);
    const token = saqlangan[SESSIYA_KALITI];
    if (typeof token === 'string' && token) return token;
  }

  const javob = await fetch(`${BACKEND_URL}/sessiya`, {
    method: 'POST',
    headers: sarlavhalar(),
    body: '{}',
  });
  if (!javob.ok) return null;

  const data = (await javob.json()) as { token?: string };
  if (!data.token) return null;

  await chrome.storage.local.set({ [SESSIYA_KALITI]: data.token });
  return data.token;
}

/**
 * Qidiruvni bajaradi.
 *
 * 401 kelsa token bir marta yangilanadi: sessiya bazada eskirgan
 * boʻlishi mumkin, va bunda foydalanuvchiga "sessiya xatosi" deb
 * koʻrsatish notoʻgʻri boʻlardi — u hech narsa qila olmaydi.
 */
async function xitoyQidir(productId: number): Promise<QidiruvJavobi> {
  let token = await sessiyaOl();
  if (!token) return { xato: 'sessiya ochilmadi' };

  const sorov = (t: string) =>
    fetch(`${BACKEND_URL}/xitoy-qidiruv`, {
      method: 'POST',
      headers: sarlavhalar(t),
      body: JSON.stringify({ productId }),
    });

  let javob = await sorov(token);
  if (javob.status === 401) {
    token = await sessiyaOl(true);
    if (!token) return { xato: 'sessiya ochilmadi' };
    javob = await sorov(token);
  }

  const data = (await javob.json().catch(() => null)) as QidiruvJavobi | null;
  if (!data) return { xato: `javob oʻqilmadi (HTTP ${javob.status})` };
  return data;
}

chrome.runtime.onMessage.addListener((xabar, _yuboruvchi, javobBer) => {
  if (xabar?.tur !== 'xitoy-qidiruv') return false;

  xitoyQidir(Number(xabar.productId))
    .then(javobBer)
    .catch((e) => javobBer({ xato: String(e?.message ?? e) }));

  // `true` — javob asinxron keladi. Busiz kanal darhol yopiladi va
  // content script hech qachon javob olmaydi.
  return true;
});
