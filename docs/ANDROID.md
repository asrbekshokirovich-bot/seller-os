# Android ilova

## Nima bu

ZumSavdo Android ilovasi — **saytning oʻzi**. Texnik nomi: Trusted Web Activity (TWA).
Ilova ochilganda Chrome `zumsavdo.vercel.app` ni manzil satrisiz, toʻliq ekranda koʻrsatadi.

- Saytdagi har oʻzgarish ilovada **darhol** koʻrinadi. Yangi APK/AAB faqat ilova
  qobigʻi oʻzgarganda kerak: nom, ikonka, ranglar, versiya.
- Paket nomi: `uz.zumsavdo.ilova` — Play'dagi mavjud ZumSavdo ilovasiniki (oʻzgartirib
  boʻlmaydi). Bu ilova ilgari Expo bilan yigʻilgan (`apps/mobile`, `claude/gracious-ramanujan-itkgq0`
  tarmogʻi, 2026-09-29) va boshqa upload kalit bilan yuklangan; 2026-11-13 dan uning oʻrnini
  shu TWA egallaydi (nazoratchi qarori).
- Play talabi boʻyicha har yangi versiyada `appVersionCode` avvalgisidan katta: Expo versiyasi
  `1` edi, TWA `2` dan boshlanadi.
- Play talabi: 2026-08-31 dan yangi ilova va yangilanish **API 36** ni nishonga oladi
  (`targetSdkVersion 36` — test va CI tekshiradi).

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `apps/android/` | Android loyiha (Bubblewrap 1.27 andozasi, androidbrowserhelper 2.7.4) |
| `apps/android/twa-manifest.json` | Asosiy sozlama: paket, sayt, ranglar, versiya, kalit izlari |
| `apps/web/public/.well-known/assetlinks.json` | Sayt tomoni: «bu ilova meniki». Busiz ilovada manzil satri chiqadi |
| `apps/web/src/app/manifest.ts` | Veb-ilova manifesti (`/manifest.webmanifest`) |
| `apps/web/public/ilova/` | Ikonkalar — `icon.svg` dan chizilgan PNG |
| `apps/web/test/ilova.test.ts` | Uch joy (twa-manifest, assetlinks, Android loyiha) bir xilligini tekshiradi |
| `.github/workflows/android.yml` | GitHub: imzosiz AAB → «android-imzosiz» oldindan-reliz |
| `.github/workflows/android-jonli.yml` | Har kuni: jonli saytdagi `assetlinks.json` va Google tekshiruvi |
| `scripts/android-imzola.sh` | Nazoratchi kompyuterida imzolash: AAB va APK |

## Kalit

- Upload kalit **faqat nazoratchi kompyuterida**: `Documents\ZumSavdo-Android-kalit\` —
  `zumsavdo-upload.p12` va `KALIT-MALUMOTI.txt` (parol shu faylda).
- Omborga, chatga, logga, GitHub sirlariga qoʻyilmagan (QOIDALAR.md §1, §3).
  `apps/android/.gitignore` `*.p12`, `*.jks`, `*.keystore` ni toʻsadi.
- Yaratilgan: 2026-11-13, nazoratchi kompyuterida (keytool, RSA 4096, PKCS12, 2054 yilgacha).
- Ochiq izi (sir emas, `assetlinks.json` da turadi):
  `5E:18:C9:18:6F:29:AF:D6:DE:D9:38:BC:85:19:0F:8E:A7:3B:E0:0C:95:5D:60:6C:FA:F5:4C:2B:34:E0:B5:3E`

## Yangi versiya chiqarish

1. `apps/android/twa-manifest.json` da `appVersionCode` ni +1 qiling (Play har safar
   kattaroq kod talab qiladi), kerak boʻlsa `appVersionName` ni ham. `app/build.gradle`
   dagi `versionCode` / `versionName` ham xuddi shunday — test ikkalasini solishtiradi.
2. main'ga merge → GitHub «Android ilova» imzosiz AAB yasaydi, manifestni tekshiradi va
   «android-imzosiz» oldindan-relizga qoʻyadi.
3. Nazoratchi kompyuterida: `bash scripts/android-imzola.sh` →
   `Documents\ZumSavdo-Android\ZumSavdo-<versiya>-<kod>.apk` va `.aab`.
   Kompyuterga ulangan Claude sessiyasi buni kalit papkasiga ruxsat bilan oʻzi qiladi.
4. APK — telefonda sinash uchun; AAB — Play Console'ga yuklash uchun.

## Play Console

- **Upload kalit almashtirildi.** Play mavjud ilova uchun eski upload kalitni kutardi
  (SHA-1 `85:2B:32:31:AB:23:3B:37:23:D2:91:55:2D:0B:1C:FF:41:83:42:FC`). Uning fayli va
  paroli topilmadi (2026-11-13: ikki kompyuter, Gmail, Drive tekshirildi; Expo bulutidagi
  EAS kalit ehtimoli — `xojamurod23` hisobi — tekshirilmagan). Yechim (nazoratchi qarori):
  Play Console → Protected with Play → Play Store protection → Play app signing →
  «Request upload key reset» orqali yangi kalit sertifikatini (`upload_certificate.pem`,
  kalit papkasida) yuborish. Google tasdiqlagach, AAB faqat yangi kalit bilan qabul qilinadi.
- **Play App Signing.** AAB yuklangach, Google ilovani oʻz kaliti bilan qayta imzolaydi.
  Play Console → App integrity → App signing → «App signing key certificate» SHA-256 ni
  `twa-manifest.json` → `fingerprints` ga va `assetlinks.json` ga qoʻshing. Aks holda
  Play'dan oʻrnatilgan ilovada manzil satri koʻrinadi. Bu iz sir emas.
- Maxfiylik siyosati: `https://zumsavdo.vercel.app/maxfiylik`.
- **Toʻlov.** Saytda Payme orqali obuna bor. Play qoidasiga koʻra ilova ichida raqamli
  xizmat sotilsa, Google Play Billing talab qilinishi mumkin. Play'ga chiqarishdan oldin
  bu — nazoratchi qarori (pul masalasi).

## Bubblewrap bilan qayta yasash

`cd apps/android && npx @bubblewrap/cli update` — loyihani `twa-manifest.json` dan
qayta yasaydi (ikonka manzillari saytdagi fayllarga ishora qiladi). Diqqat: andoza
`build.gradle` ga yana `jcenter()` ni qoʻyadi — uni `mavenCentral()` ga qaytaring.
