# Mobil ilova — `apps/mobile`

ZumSavdo ning Android ilovasi (iOS ham shu koddan chiqadi). Expo SDK 57,
React Native, Expo Router. Dizayn va undan chetga chiqilgan joylar:
`apps/mobile/dizayn/HOLAT.md`.

## Qanday ishlaydi

Ilova Chrome kengaytmasi bilan **bir xil yoʻldan** boradi: Edge
Function ga toʻgʻridan-toʻgʻri, ommaviy (publishable) kalit bilan.
Sessiya tokeni `x-sessiya` sarlavhasida yuboriladi.

| Narsa | Qayerda |
|---|---|
| API manzili, ommaviy kalit, sayt | `app.json` → `expo.extra` |
| Sessiya tokeni | qurilmada, `expo-secure-store` (Android Keystore) |
| Savol tartibi, raqamlar | server (`/suhbat`, `packages/shared/src/ssenariy.ts`) |

Ilova hech narsani hisoblamaydi: savolni chizadi, javobni yuboradi.
Web, kengaytma va ilova bitta ssenariydan foydalanadi.

`service_role` kaliti ilovaga **hech qachon** tushmaydi (QOIDALAR.md,
3-qoida). `apiKey` — `sb_publishable_…`, kengaytmada ham ochiq turadi.

## Nega ildiz workspace'da emas

Expo React versiyasini oʻzi belgilaydi (SDK 57 → React 19.2.3), web
esa Next bilan boshqa diapazonda. Bitta `node_modules` da ular
toʻqnashadi. Shuning uchun `apps/mobile` oʻz `package-lock.json` i
bilan alohida oʻrnatiladi.

Oqibati:
- `packages/shared` toʻgʻridan-toʻgʻri import qilinmaydi (Metro `.js`
  kengaytmali importlarni `.ts` ga yechmaydi). Kerakli yagona roʻyxat
  (12 qadam) `src/lib/qadamlar.ts` ga koʻchirilgan va
  `apps/mobile/test/sinxron.test.ts` manbaga mosligini tekshiradi.
- Sof mantiq (`src/lib/holat.ts`, `format.ts`) React Native ga
  tegmaydi va ildiz `vitest` ida sinaladi.

## Ishga tushirish

```bash
cd apps/mobile
npm ci
npx expo start            # telefonda Expo Go yoki dev build
npx tsc --noEmit          # typecheck
npx expo export --platform android   # bundle yigʻiladimi
```

CI (`mobil` ishi) typecheck va Android bundle ni tekshiradi.
`scripts/ci.sh` ham shu qadamni bajaradi.

## APK / Play Market

Qurish va imzolash — **nazoratchi ishi** (QOIDALAR.md 1-boʻlim: agent
imzolamaydi va nashr qilmaydi). Expo hisobi bilan:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile sinov        # sinov uchun .apk
npx eas-cli@latest build -p android --profile production   # Play Market uchun .aab
```

Profillar `eas.json` da. Paket nomi `uz.zumsavdo.ilova` (`app.json`) —
Play Market ga birinchi yuklashdan oldin tasdiqlansin, keyin
oʻzgartirib boʻlmaydi.

## Webda koʻrish (faqat sinov)

`npx expo export --platform web` ishlaydi, lekin brauzerda Edge Function
CORS bilan javob bermaydi. Telefonda CORS yoʻq. Web koʻrinish faqat
ekranlarni tekshirish uchun.

## Hali yoʻq (tez orada)

Kirish (SMS/Telegram), pul holati, yuk kuzatuvi, bir nechta savdo,
arxiv, Uzum kabineti va Telegram ulanishi, ogohlantirishlar, pullik
reja. Roʻyxat va sabablar: `dizayn/HOLAT.md`, BACKLOG.md.
