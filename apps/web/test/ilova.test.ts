import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import manifest from '../src/app/manifest';
import { MAVZU_SKRIPTI, PANEL_RANGI } from '../src/lib/mavzu-skript';

/**
 * Android ilova (`apps/android`) — saytning oʻzi: Chrome uni manzil satrisiz,
 * toʻliq ekranda ochadi. Buning uchun uch joy bir-biriga AYNAN mos boʻlishi shart:
 *
 *   1. `apps/android/twa-manifest.json` — paket nomi va kalit izi (manba);
 *   2. `public/.well-known/assetlinks.json` — sayt «bu ilova meniki» deydi;
 *   3. Android loyihasi (`build.gradle`, `strings.xml`) — ilova «bu sayt meniki» deydi.
 *
 * Bittasi farq qilsa, ilova yiqilmaydi — jimgina oddiy brauzer oynasiga aylanadi
 * (tepada manzil satri chiqadi) va buni hech kim sezmaydi (QOIDALAR.md §8).
 */

const WEB = join(__dirname, '..');
const ANDROID = join(__dirname, '..', '..', 'android');
const oqi = (yol: string) => readFileSync(yol, 'utf8');

interface TwaManifest {
  packageId: string;
  host: string;
  startUrl: string;
  display: string;
  launcherName: string;
  themeColor: string;
  themeColorDark: string;
  navigationColor: string;
  navigationColorDark: string;
  navigationDividerColor: string;
  navigationDividerColorDark: string;
  backgroundColor: string;
  iconUrl: string;
  maskableIconUrl: string;
  appVersionName: string;
  appVersionCode: number;
  fingerprints: { name: string; value: string }[];
}
const twa = JSON.parse(oqi(join(ANDROID, 'twa-manifest.json'))) as TwaManifest;
const bogLanish = JSON.parse(oqi(join(WEB, 'public', '.well-known', 'assetlinks.json'))) as {
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
}[];

/** SHA-256 sertifikat izi: 32 bayt, katta harf, ikki nuqta bilan. */
const IZ = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

describe('Android ilova — sayt bilan bogʻlanish', () => {
  it('assetlinks.json: paket nomi va kalit izlari twa-manifest.json bilan aynan bir xil', () => {
    expect(bogLanish).toHaveLength(1);
    const b = bogLanish[0];
    if (!b) throw new Error('assetlinks.json boʻsh');
    expect(b.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(b.target.namespace).toBe('android_app');
    expect(b.target.package_name).toBe(twa.packageId);

    const izlar = twa.fingerprints.map((f) => f.value);
    expect(izlar.length).toBeGreaterThan(0);
    for (const iz of [...izlar, ...b.target.sha256_cert_fingerprints]) expect(iz).toMatch(IZ);
    expect([...b.target.sha256_cert_fingerprints].sort()).toEqual([...izlar].sort());
  });

  it('Android loyihasi twa-manifest.json ga mos: paket, versiya, sayt manzili, API 36', () => {
    const gradle = oqi(join(ANDROID, 'app', 'build.gradle'));
    expect(gradle).toContain(`applicationId "${twa.packageId}"`);
    expect(gradle).toContain(`versionCode ${twa.appVersionCode}\n`);
    expect(gradle).toContain(`versionName "${twa.appVersionName}"`);
    expect(gradle).toContain(`hostName: '${twa.host}'`);
    // Play: 2026-08-31 dan yangi ilova va yangilanish API 36 ni nishonga olishi shart.
    expect(gradle).toMatch(/targetSdkVersion 36\n/);

    const satrlar = oqi(join(ANDROID, 'app', 'src', 'main', 'res', 'values', 'strings.xml'));
    expect(satrlar).toContain(`\\"site\\": \\"https://${twa.host}\\"`);
  });

  it('sayt manzili hamma joyda bitta: twa-manifest host = sayt metadataBase', () => {
    expect(oqi(join(WEB, 'src', 'app', 'layout.tsx'))).toContain(`new URL('https://${twa.host}')`);
  });

  it('ilova tepasi va pasti tungi rejimda ham sahifa fonida', () => {
    // Sayt tizim rejimiga ergashmaydi: standart yorugʻ, tungi — faqat tugma bilan.
    // Telefon tungi rejimda boʻlsa ham sahifa och, demak tepa panel ham och boʻlsin
    // (2026-11-14 gacha tepa toʻq siyoh chiqardi — nazoratchi: «usti ham ichidagidek»).
    expect(MAVZU_SKRIPTI).toContain('m==="tungi"?"tungi":"yorug"');
    expect(twa.themeColor).toBe(PANEL_RANGI.yorug);
    expect(twa.backgroundColor).toBe(PANEL_RANGI.yorug);
    expect(twa.themeColorDark).toBe(twa.themeColor);
    expect(twa.navigationColor).toBe(twa.themeColor);
    expect(twa.navigationColorDark).toBe(twa.themeColor);
    expect(twa.navigationDividerColorDark).toBe(twa.navigationDividerColor);

    const gradle = oqi(join(ANDROID, 'app', 'build.gradle'));
    const kalitlar = ['themeColor', 'themeColorDark', 'navigationColor', 'navigationColorDark',
      'navigationDividerColor', 'navigationDividerColorDark', 'backgroundColor'] as const;
    for (const k of kalitlar) expect(gradle).toContain(`${k}: '${twa[k]}'`);
  });
});

/** PNG dan bitta piksel (8 bit RGBA/RGB, interlace yoʻq): ikonka rangini tekshirish uchun. */
function piksel(fayl: string, x: number, y: number): number[] {
  const d = readFileSync(fayl);
  const eni = d.readUInt32BE(16);
  const tur = d[25];
  if (d[24] !== 8 || d[28] !== 0 || (tur !== 6 && tur !== 2)) throw new Error(`${fayl}: bu PNG turi oʻqilmaydi`);
  const kanal = tur === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let i = 8; i < d.length; ) {
    const uzunlik = d.readUInt32BE(i);
    if (d.toString('ascii', i + 4, i + 8) === 'IDAT') idat.push(d.subarray(i + 8, i + 8 + uzunlik));
    i += 12 + uzunlik;
  }
  const xom = inflateSync(Buffer.concat(idat));
  const qator = eni * kanal;
  let oldingi = Buffer.alloc(qator);
  for (let q = 0; q <= y; q++) {
    const filtr = xom[q * (qator + 1)] ?? -1;
    if (filtr < 0 || filtr > 4) throw new Error(`${fayl}: ${q}-qatorda notoʻgʻri filtr ${filtr}`);
    const joriy = Buffer.from(xom.subarray(q * (qator + 1) + 1, (q + 1) * (qator + 1)));
    for (let i = 0; i < qator; i++) {
      const a = i >= kanal ? (joriy[i - kanal] ?? 0) : 0;
      const b = oldingi[i] ?? 0;
      const c = i >= kanal ? (oldingi[i - kanal] ?? 0) : 0;
      const p = a + b - c;
      const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const qosh = [0, a, b, Math.floor((a + b) / 2), paeth][filtr] ?? 0;
      joriy[i] = ((joriy[i] ?? 0) + qosh) % 256;
    }
    oldingi = joriy;
  }
  return [...oldingi.subarray(x * kanal, (x + 1) * kanal)];
}

describe('logotip — hamma joyda sayt ichidagi belgi bilan bir xil', () => {
  // Manba — bosh sahifadagi nishon. 2026-11-14 gacha ilova va Play ikonkasi eski
  // terrakota (#D2552D) dizaynda qolib ketgan edi; ikonkalar `scripts/ikonka.mjs` dan.
  const css = oqi(join(WEB, 'src', 'app', 'bosh.module.css'));
  const nishon = /\.nishon\s*\{[^}]*?background:\s*(#[0-9a-f]{6})/i.exec(css)?.[1]?.toLowerCase() ?? '';
  const rgb = [1, 3, 5].map((i) => parseInt(nishon.slice(i, i + 2), 16));
  const RES = join(ANDROID, 'app', 'src', 'main', 'res');

  it('icon.svg (brauzer yorligʻi) rangi = nishon rangi', () => {
    expect(nishon).toMatch(/^#[0-9a-f]{6}$/);
    const svg = oqi(join(WEB, 'src', 'app', 'icon.svg'));
    expect(/<rect[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg)?.[1]?.toLowerCase()).toBe(nishon);
  });

  it('PNG ikonkalar (sayt, Android, Play) nishon rangida, oʻrtasida oq «Z»', () => {
    // [fayl, fon nuqtasi]: toʻliq kvadratlar — burchakda, yumaloqlar — tepa oʻrtada.
    const fayllar: [string, number, number][] = [
      [join(ANDROID, 'store_icon.png'), 0, 0], // Play: toʻliq kvadrat, burchakni Google yumaloqlaydi
      [join(WEB, 'public', 'ilova', 'ikonka-maskable-512.png'), 0, 0],
      [join(RES, 'mipmap-xxxhdpi', 'ic_maskable.png'), 0, 0],
      [join(WEB, 'src', 'app', 'apple-icon.png'), 0, 0],
      [join(WEB, 'public', 'ilova', 'ikonka-512.png'), 256, 8],
      [join(RES, 'mipmap-xxxhdpi', 'ic_launcher.png'), 96, 3],
      [join(RES, 'drawable-xxxhdpi', 'splash.png'), 600, 20],
    ];
    for (const [fayl, x, y] of fayllar) {
      expect(piksel(fayl, x, y), `${fayl}: fon`).toEqual([...rgb, 255]);
      const o = readFileSync(fayl).readUInt32BE(16);
      expect(piksel(fayl, o / 2, o / 2), `${fayl}: oʻrtasi`).toEqual([255, 255, 255, 255]);
    }
  });
});

describe('veb-ilova manifesti', () => {
  const m = manifest();

  it('Android ilova bilan bir xil: boshlanish sahifasi, koʻrinish, ranglar, nom', () => {
    expect(m.start_url).toBe(twa.startUrl);
    expect(m.display).toBe(twa.display);
    expect(m.theme_color).toBe(twa.themeColor);
    expect(m.background_color).toBe(twa.backgroundColor);
    expect(m.short_name).toBe(twa.launcherName);
  });

  it('har ikonka fayli bor va oʻlchami yozilganiday; maskable ham bor', () => {
    const ikonkalar = m.icons ?? [];
    expect(ikonkalar.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const i of ikonkalar) {
      const fayl = join(WEB, 'public', i.src);
      expect(existsSync(fayl), i.src).toBe(true);
      const png = readFileSync(fayl);
      // PNG IHDR: eni 16-baytdan, boʻyi 20-baytdan (big-endian).
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, i.src).toBe(i.sizes);
    }
  });

  it('twa-manifest.json dagi ikonka manzillari saytdagi haqiqiy fayllarga ishora qiladi', () => {
    for (const u of [twa.iconUrl, twa.maskableIconUrl]) {
      const url = new URL(u);
      expect(url.host).toBe(twa.host);
      expect(existsSync(join(WEB, 'public', url.pathname)), url.pathname).toBe(true);
    }
  });
});
