# Chrome kengaytmasi — «Seller OS — Xitoydan top»

Uzum.uz tovar sahifasiga tugma qoʻshadi: bosilganda 1688 dan
oʻxshash tovarlarni qidiradi.

Doʻkonda: **Published — public**, 2026-09-02 dan beri.

## 2026-09-05 — nashr qilingan, lekin hech qachon ishlamagan

Kengaytma uch kun ommaviy turdi va uning tugmasi **bir marta ham
natija bera olmasdi**. Toʻrtta uzilish bor edi, har biri
mustaqil ravishda yetarli:

| # | Uzilish | Dalil |
|---|---|---|
| 1 | `BACKEND_URL = 'https://api.selleros.uz'` — domen mavjud emas | DNS: `api.selleros.uz` ham, `selleros.uz` ham topilmadi |
| 2 | `/xitoy-qidiruv` uchi faqat Fastify'da (`app.ts:854`), u hech qayerda ishlamaydi | Edge Function: `{"xato":"topilmadi","yol":"/xitoy-qidiruv"}` |
| 3 | Manifestda `host_permissions` yoʻq | faqat `"permissions": ["activeTab"]` |
| 4 | Migratsiya `0046_selleros_xitoy.sql` bazaga **qoʻllanmagan** | `so_xitoy_limit` va `so_xitoy_kesh_ol` `pg_proc` da yoʻq, `selleros.xitoy_*` jadvallari yoʻq |

Yaʼni foydalanuvchi tugmani bosganda kod `catch` ga tushib
**«Tarmoq xatosi»** deb yozardi — har safar.

Zarar boʻlmadi: `Users —`, `Rating —`. Hech kim oʻrnatmagan.

**2-uzilish — takroriy naqsh.** Aynan shu xato 2026-09-02 da
monopoliya bayrogʻini bir kunga yoʻqotgan edi: kod Fastify'ga
yozilgan, chaqiruvchi esa Edge Function. Fastify serveri bu
loyihada **hech qayerda ishlamaydi** — u faqat `apps/backend` da
manba sifatida turadi.

## Qanday ishlaydi (0.1.1 dan keyin)

```
content.js  ──xabar──▶  background.js  ──HTTPS──▶  Edge Function
 (uzum.uz)              (kengaytma)                /xitoy-qidiruv
```

**Tarmoqqa faqat `background.js` chiqadi.** Manifest V3 da content
script sahifaning (uzum.uz) manshasidan soʻrov yuboradi va CORS ga
tushadi; servis ishchisi esa kengaytmaning oʻz manshasidan yuboradi
va `host_permissions` dagi manzillar uchun CORS dan ozod.

Sessiya tokeni `chrome.storage.local` da saqlanadi: har qidiruvda
yangi sessiya ochish bazada keraksiz qator yaratardi va kunlik limit
hisobi maʼnosini yoʻqotardi. 401 kelsa token bir marta yangilanadi.

Kalit — Supabase ning **ommaviy** (`publishable`) kaliti. Panel ham
shuni ishlatadi. `service_role` kengaytmaga hech qachon tushmaydi
(QOIDALAR.md, 3-qoida).

## Hozir nima chiqadi

Zanjir uланган, lekin **1688 provayderi ulanmagan** — TMAPI/OneBound
sinov kaliti kutilmoqda. `XITOY_API_KEY` boʻsh boʻlgani uchun uch
shunday javob beradi:

```json
{ "natijalar": [], "izoh": "Qidiruv provayderi hali ulanmagan — kalit kutilmoqda." }
```

Tugma oʻsha matnni koʻrsatadi. Bu ataylab: boʻsh roʻyxatni
«Xitoyda oʻxshashi yoʻq» deb oʻqish mumkin edi, holbuki hech kim
qidirmagan (QOIDALAR.md, 4-qoida).

## Provayder ulanganda

Bittagina joy oʻzgaradi: `supabase/functions/selleros/index.ts`
dagi `/xitoy-qidiruv` ichida `XITOY_API_KEY` tekshiruvidan keyingi
blok. Kesh (`so_xitoy_kesh_yoz`) va kunlik limit allaqachon tayyor.

## Doʻkonga yuklash

1. `cd apps/extension && npm run build`
2. `cd dist && zip -r ../selleros-extension-v<versiya>.zip .`
3. Chrome Web Store Developer Dashboard → Package → Upload new package.

`manifest.json` va `package.json` dagi versiya bir xil boʻlishi
kerak — doʻkon eskisini rad etadi.
