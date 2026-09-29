/**
 * Kichik ZIP yozuvchi (STORE — siqishsiz), 9-qadam studiyasi uchun.
 *
 * NEGA KUTUBXONA EMAS. Suratlar JPEG — allaqachon siqilgan, qayta siqish
 * foyda bermaydi. STORE formati 60 qatorga sigʻadi va testlanadi; 100 KB
 * lik kutubxona sahifaga (va kengaytma yon paneliga) qoʻshilmaydi.
 *
 * Fayl nomlari UTF-8 (bayroq 0x0800) — oʻzbekcha harflar buzilmaydi.
 */

const CRC_JADVAL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_JADVAL[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFayl {
  nom: string;
  baytlar: Uint8Array;
}

/** Fayllarni bitta ZIP (STORE) ga yigʻadi. Natija toʻgʻridan-toʻgʻri `Blob` ga beriladi. */
export function zipYasa(fayllar: ZipFayl[], sana = new Date()): Uint8Array<ArrayBuffer> {
  const vaqt = ((sana.getHours() << 11) | (sana.getMinutes() << 5) | (sana.getSeconds() >> 1)) & 0xffff;
  const kun = (((sana.getFullYear() - 1980) << 9) | ((sana.getMonth() + 1) << 5) | sana.getDate()) & 0xffff;
  const enc = new TextEncoder();
  const qismlar: Uint8Array[] = [];
  const markaz: Uint8Array[] = [];
  let ofset = 0;
  for (const f of fayllar) {
    const nom = enc.encode(f.nom);
    const crc = crc32(f.baytlar);
    const n = f.baytlar.length;
    const l = new Uint8Array(30 + nom.length);
    const v = new DataView(l.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true);
    v.setUint16(8, 0, true);
    v.setUint16(10, vaqt, true);
    v.setUint16(12, kun, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, n, true);
    v.setUint32(22, n, true);
    v.setUint16(26, nom.length, true);
    l.set(nom, 30);
    qismlar.push(l, f.baytlar);
    const m = new Uint8Array(46 + nom.length);
    const w = new DataView(m.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(12, vaqt, true);
    w.setUint16(14, kun, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, n, true);
    w.setUint32(24, n, true);
    w.setUint16(28, nom.length, true);
    w.setUint32(42, ofset, true);
    m.set(nom, 46);
    markaz.push(m);
    ofset += l.length + n;
  }
  const markazHajm = markaz.reduce((s, x) => s + x.length, 0);
  const oxir = new Uint8Array(22);
  const e = new DataView(oxir.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, fayllar.length, true);
  e.setUint16(10, fayllar.length, true);
  e.setUint32(12, markazHajm, true);
  e.setUint32(16, ofset, true);
  const hamma = [...qismlar, ...markaz, oxir];
  const natija = new Uint8Array(hamma.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of hamma) { natija.set(x, i); i += x.length; }
  return natija;
}

/** Fayl nomi uchun xavfsiz boʻlak: harf/raqam, qolgani "-", 40 belgigacha. */
export function faylBolagi(x: string): string {
  const t = x.normalize('NFKD').replace(/[ʻʼ’‘'`]/g, '').replace(/[^A-Za-z0-9А-Яа-яЁё]+/g, '-').replace(/^-+|-+$/g, '');
  return (t || 'tovar').slice(0, 40);
}
