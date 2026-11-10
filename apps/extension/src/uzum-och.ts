// «Uzumda ochish» (0.5.0, 2026-11-05): yon paneldagi chat (sayt ramkasi) AI tahlilchi javobidagi tugma
// bosilganda shu xabarni yuboradi — panel Uzum sahifalarini yangi tablarda ochadi. Nazoratchi:
// «filtrlash soʻralsa xulosani oʻz nusxamizdan qilamiz, lekin xuddi Uzumdan jonli qilinayotgandek —
// 2–3 asosiy tovar yoki doʻkonni brauzerda ochib beramiz».
//
// Nega panel ochadi: ramka ichidagi sahifa bir bosishda bittadan koʻp `window.open` qila olmaydi
// (qalqib chiquvchi oyna bloki). Panel — kengaytmaning oʻz sahifasi: `chrome.tabs.create` ga ruxsat
// shart emas (manifestga yangi huquq qoʻshilmaydi).
//
// XAVFSIZLIK: faqat sayt ramkasidan (`origin` va `source` panel.ts da tekshiriladi), faqat
// https://uzum.uz dagi tovar va turkum sahifalari, bir bosishda koʻpi bilan 3 ta.

export const UZUM_OCH_XABARI = 'zumsavdo:uzum-och';
export const UZUM_OCH_MAX = 3;

/** Xabardan ochiladigan manzillar; yaroqsiz xabar yoki manzil yoʻq — `null`. */
export function uzumOchishManzillari(data: unknown): string[] | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { tur?: unknown; urllar?: unknown };
  if (d.tur !== UZUM_OCH_XABARI || !Array.isArray(d.urllar)) return null;
  const toza: string[] = [];
  for (const u of d.urllar) {
    if (typeof u !== 'string' || u.length > 600) continue;
    let m: URL;
    try {
      m = new URL(u);
    } catch {
      continue;
    }
    if (m.protocol !== 'https:' || (m.hostname !== 'uzum.uz' && m.hostname !== 'www.uzum.uz')) continue;
    if (!/^\/(?:uz|ru)\/(?:product|category)\/[^/]+\/?$/.test(m.pathname)) continue;
    if (m.username || m.password) continue;
    const s = m.toString();
    if (!toza.includes(s)) toza.push(s);
    if (toza.length >= UZUM_OCH_MAX) break;
  }
  return toza.length ? toza : null;
}
