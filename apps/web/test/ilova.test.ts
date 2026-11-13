import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../src/app/manifest';

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
