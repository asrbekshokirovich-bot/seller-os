/**
 * Edge Function ga sessiyasiz soʻrov.
 *
 * `lib/sessiya.ts` dagi `apiga()` foydalanuvchi sessiyasi bilan
 * ishlaydi. Oʻlchov paneli esa hech kimning nomidan emas, oʻzi
 * uchun soʻraydi — `/kpi` va `/tarif` ga sessiya kerak emas.
 *
 * Kalit SERVERDA qoladi. Sahifa server komponenti, yaʼni bu kod
 * brauzerga umuman tushmaydi.
 */

/** `null` — sozlanmagan yoki javob bermadi. Boʻsh natija EMAS. */
export async function olib<T>(yol: string): Promise<T | null> {
  const api = process.env.SELLEROS_API_URL ?? '';
  const kalit = process.env.SELLEROS_API_KEY ?? '';
  if (!api || !kalit) return null;

  try {
    const r = await fetch(`${api}${yol}`, {
      headers: { Authorization: `Bearer ${kalit}` },
      cache: 'no-store',
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
