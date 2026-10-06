# Chrome kengaytmasi — «ZumSavdo — Xitoydan top»

Uzum.uz tovar sahifasiga tugma qoʻshadi: bosilganda 1688 dan
oʻxshash tovarlarni qidiradi.

Doʻkonda: **Published — public** (0.1.1), 2026-09-02 dan beri. **0.2.0
tekshiruvga yuborildi — 2026-09-29** (nazoratchi yukladi: yon panelda FAQAT
CHAT + Uzum sahifasidagi tugma, 0.1.3 tuzatishlari bilan; sayt manzili
`zumsavdo.vercel.app`, `sidePanel` ruxsati asoslandi, remote code — yoʻq,
data usage — faqat "Website content"). Developer Dashboard kengaytmalar
bilan boshqarilmaydi — yuklashni har doim nazoratchi qiladi.

## 2026-10-06 — 0.2.2 RAD ETILDI: ortiqcha `activeTab` (0.2.3 da olib tashlandi)

Doʻkon 0.2.2 ni rad etdi (2026-10-05): **Purple Potassium** — "Requesting but not
using the following permission(s): activeTab". Toʻgʻri: kodda `chrome.tabs` ham,
`chrome.scripting` ham yoʻq — yon panel `sidePanel.setPanelBehavior` bilan ochiladi,
Uzum sahifasidagi tugma manifestdagi `content_scripts` bilan turadi. Ruxsat 0.1.1
davridan qolib ketgan edi.

0.2.3 da ruxsatlar: `storage` (sessiya tokeni), `sidePanel` (chat paneli) va
`host_permissions` — faqat Edge Function. `apps/extension/test/manifest.test.ts`
har ruxsat kodda ishlatilishini talab qiladi: ishlatilmaydigan ruxsat qoʻshilsa —
test yiqiladi (doʻkonga yetmasdan).

Doʻkon taqdimotidagi **Privacy** boʻlimida `activeTab` asoslash maydoni boʻlsa —
u ruxsat endi yoʻq; qolganlarini (storage, sidePanel, host) asoslash kifoya.

## 2026-10-05 — 0.2.3: ruscha Uzum, eski natija, chat havolasi (yuklash nazoratchida)

- Ruscha Uzum sahifasida (`/ru/product/…`) savat tugmasi «Добавить в корзину»:
  tugma faqat "savatga" deb qidirilgani uchun topilmasdi va «Xitoydan top»
  sahifaning eng pastiga (`.product-page` oxiriga) tushardi. Endi ikkala til
  (`src/matn.ts`, `savatTugmasimi`).
- Qidiruv 1–2 daqiqa davom etadi: shu orada boshqa tovarga oʻtilsa (Uzum —
  SPA) natija yangi tovar sahifasiga chizilmaydi — u oldingisiniki edi;
  oʻsha tovarga qaytib bosilsa keshdan darhol chiqadi.
- Natijalar panelidagi «Toʻliq hisob — ZumSavdo chatida» endi havola
  (`SELLEROS_SAYT` = `https://zumsavdo.vercel.app`, `/usta` yangi oynada).
- Xato matni oʻzbekcha: «kengaytma yangilandi — sahifani yangilang (F5)»,
  «internetga ulanib boʻlmadi — qayta urinib koʻring»; xom xato faqat konsolda.
- Sinov: soxta Uzum sahifasida (ruscha va oʻzbekcha) haqiqiy `dist/content.js`
  bilan — 0.2.2 da toʻrtala nuqson takrorlandi, 0.2.3 da yoʻq.
- `PRIVACY.md` — versiya (0.2.3) va havola jumlasi; maʼlumot bilan ishlash oʻzgarmadi.

## 2026-10-01 — 0.2.2: terrakota dizayn (yuklash nazoratchida)

0.2.1 (2026-09-30) dizaynni oʻzgartirgan, doʻkonga hali yuklanmagan edi —
0.2.2 uning oʻrnini egallaydi:

- Nom «ZumSavdo — Xitoydan top», belgilar 16/32/48/128 — terrakota «Z»
  (`gen-icons.mjs`, sayt favicon bilan bir xil koʻpburchak).
- Uzum sahifasidagi «Xitoydan top» tugmasi Uzum tugmalari shaklida: 56 px,
  12 px burchak, soyasiz, oraliq 12 px (Uzum sahifasidan oʻlchangan).
- Yon panel (`/usta`) saytning oʻzi — 320–400 px kenglikdagi tuzatishlar
  saytda (javob tugmalari ustunlari, ixcham pastki panel, ingichka chiziqlar).
- Doʻkon rasmlari yangi: `promo-440x280.png`, `marquee-1400x560.png`,
  `screenshot-1280x800.png` — toʻqilgan narx/baho yoʻq, yon panelda saytning
  haqiqiy Usta oynasi.
- `PRIVACY.md` — nom va versiya (0.2.2); maʼlumot bilan ishlash oʻzgarmadi.

## 2026-09-29 — 0.2.0: yon panel, faqat chat

Nazoratchi qarori: kengaytma belgisi bosilganda Chrome yon paneli ochilsin
va unda **faqat Seller OS chati** boʻlsin, boshqa hech narsa.

- `manifest.json`: `sidePanel` ruxsati, `action` (belgi), `side_panel.default_path =
  panel.html`. `background.ts` `setPanelBehavior({ openPanelOnActionClick: true })`.
- `panel.html` + `src/panel.ts`: saytning `/usta` sahifasi ramkada. Sessiya
  tokenini orqa xizmat beradi (`chrome.storage.local`, Uzum sahifasidagi tugma
  bilan bitta sessiya — limit va kesh bitta); token manzil hash'ida
  (`#sessiya=…&kengaytma=1`) uzatiladi, serverga ketmaydi.
- Sayt (`apps/web`): ramkada cookie ishlamaydi (uchinchi tomon), shuning uchun
  `/api/*` marshrutlari `x-sessiya` sarlavhasini cookie'dan ustun oladi
  (`lib/sessiya-sarlavha.ts` elagi: faqat `[A-Za-z0-9_.-]{16,512}`);
  `Suhbat.tsx` hash'dagi tokenni har soʻrovga sarlavha qilib qoʻshadi.
  Oddiy saytda hech narsa oʻzgarmaydi.
- `panel.ts` dagi `SAYT` — Vercel manzili, nazoratchi beradi; boʻsh boʻlsa
  panel "sozlanmagan" deydi va hech qayerga ulanmaydi.

## 2026-09-29 — 0.1.3: koʻrinish tuzatildi

Nazoratchi nashrdan oldin ekranda koʻrdi (soxta Uzum sahifasi + haqiqiy
content.js, jonli 1688 javobi). Topilgan va tuzatilganlar:

1. Natijalar paneli tugmalar qatorining ICHIDA chizilardi — flex qatorida
   170 px gacha siqilib, rasmlar koʻrinmasdi. Endi blokdan KEYIN, toʻliq
   kenglikda (`width: 100%`, rasm `flex-shrink: 0`).
2. Xitoycha nom oʻrniga "1688 taklif №N · ochish" havolasi; xitoycha nom
   kichik shrift bilan pastda (agent uchun).
3. Narx yuan + soʻm: server `/xitoy-qidiruv` 200 javobiga `kurs` (CBU)
   qoʻshdi; kurs olinmasa faqat yuan, "kurs olinmadi" deb yoziladi.
4. "Yopish" tugmasi; holat qatori: keshdan/limit (`bugun N/M`)/kurs sanasi.
5. Panel oxirida "Toʻliq hisob — Seller OS chatida" (havola `SELLEROS_SAYT`
   toʻldirilganda; boʻsh boʻlsa matn).

6. **ASOSIY XATO (haqiqiy sahifada oʻlchandi, Chrome, 2026-09-29):** Uzum tovar
   manzili `/uz/product/<slug>-<id>` (masalan
   `/uz/product/futbolkalar-erkaklar-uchun-2355174`), kod esa faqat
   `/product/<id>` ni kutgan — shuning uchun 0.1.1–0.1.2 haqiqiy sahifada
   tugmani HECH QACHON chizmagan. Endi ikkala shakl qabul qilinadi.
   Tugma "Savatga qoʻshish" (`.add-cart` bloki) ostiga, panel
   `.call-to-action` ostiga (oʻng ustun) qoʻyiladi; "Savatga" matni boʻyicha
   qidiriladi, klass oʻzgarsa ham ishlaydi; eski selektorlar zaxira.

Maxfiylik siyosati oʻzgarmadi: kurs va limit serverdan keladi, qurilmadan
yangi hech narsa chiqmaydi.

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

## 2026-09-25 — provayder ulandi (Apify)

Avval TMAPI ulangan edi; nazoratchi qarori bilan **Apify** aktori
`crawleast/1688-image-search-scraper` ga oʻtildi (kichik hajmda Apify
bepul rejasi — $5/oy — yetadi; narx $0.005/rasm + $0.01/yurish, 0 ta
natija pulsiz). Kalit — Apify API tokeni, Supabase secret `XITOY_API_KEY`
(nazoratchi `scripts/kalit-qoy.cmd` orqali qoʻyadi; chatga ham, repoga
ham tushmaydi). Aktor taʼrifi va sxemasi `packages/shared/src/xitoy.ts`
boshida yozilgan.

**Qidiruv RASM boʻyicha** va **ASINXRON** (30–90 s):

```
content.ts → background.ts → POST /xitoy-qidiruv {productId, rasmUrl}
                                 ← 202 {kutilmoqda, runId}
             background.ts → POST /xitoy-qidiruv {runId, rasmUrl}   (har 5 s)
                                 ← 202 kutilmoqda | 200 natija | 502 xato
```

`content.ts` sahifadagi birinchi `images.uzum.uz/<key>/…` rasmini
`rasmUrl` sifatida yuboradi (bazada rasm boʻlmasa ham ishlaydi).

**Rasm base64 bilan ketadi (2026-09-26).** Jonli oʻlchov: 1688 ning oʻz
JPEG rasmi URL bilan → 20 ta natija; Uzum rasmi URL bilan → 0 ta (ikki
tovar). Uzum CDN faqat WebP beradi (`.jpg` nomiga qaramay, JPEG
varianti yoʻq — serverdan oʻlchandi). Endi uch rasmni oʻzi yuklab
(`rasmYuklovchi`, ≤1 MB) aktorga `imagesBase64` bilan beradi; natija
`sha256Prefix16` / `img-N` bilan bogʻlanadi; aktor tashxisi (`tashxis`:
tur, bayt, yuklandimi) javobda — 0 natija sababi koʻrinadi. 202 javobida
`usul` (`base64`/`url`), `rasmTuri`, `rasmBayt`, `ogirildi` bor.

**WebP → JPEG (2026-09-26).** Jonli: oʻsha Uzum rasmi base64 WebP bilan →
0 ta; JPEG qilib → **20 ta**, aynan oʻsha tovar (run FFn17tXqPqgHZsyFz).
1688 WebP ni qabul qilmaydi. Endi yuklangan rasm WebP boʻlsa ochiq
rasm-proksi `images.weserv.nl` (`output=jpg&w=800`) orqali JPEG olinadi;
proksi yiqilsa WebP ketadi va `ogirildi: false` rostini aytadi. Kesh
kaliti — asl Uzum URL. Proksi uchinchi tomon: u yopilsa qidiruv 0 ga
qaytadi va tashxisda `webp` koʻrinadi — shunda oʻz konvertorimiz
(BACKLOG) kerak boʻladi.

Uch javoblari ATAYLAB farqlanadi:

| Holat | Javob |
|---|---|
| Yurish boshlandi / ishlayapti | 202 `kutilmoqda: true, runId` |
| Qidiruv boʻldi, topildi | 200 `natijalar: [...]`, `jami`, `limit` |
| Qidiruv boʻldi, 0 ta | 200 `natijalar: []`, `izoh: "1688 bu rasmga oʻxshash tovar bermadi."` |
| Qidiruv BOʻLMADI (balans, kalit, RISK_CONTROL, javob shakli buzuq, yurish yiqildi) | 502, `xato: "provayder: …"`; band qilingan limit qaytariladi |
| Vaqtinchalik tarmoq xatosi | 502, `qaytaUrinish: true` — kengaytma yana soʻraydi |
| Rasm kelmadi | 200 `izoh: "Tovar rasmi kelmadi …"` |
| Sessiya notoʻgʻri / baza javob bermadi | 401 / 503 — sanoq OʻLCHANMADI, nol deb olinmaydi |
| Kunlik limit (shaxsiy yoki umumiy `XITOY_LIMIT.jamiKunlik`) | 429, `sabab` bilan |

Kunlik sanoq (`so_xitoy_limit`) ILGARI hech qachon oshirilmasdi —
limit qogʻozda edi. Endi (0055) u yurish boshlanishidan OLDIN atomik
band qilinadi (poyga yoʻq), yurish yiqilsa qaytariladi, va UMUMIY
kunlik shift bor — sessiyalar anonim va cheksiz ochilgani uchun
shaxsiy limitning oʻzi xarajatni cheklamaydi (BACKLOG). Kesh
(`so_xitoy_kesh_yoz`) natija kelganda yoziladi; boʻsh natija ham
keshlanadi — u javob.

Jonli javob hali oʻlchanmagan: fikstura
`apps/backend/test/fixtures/apify-1688-rasm.json` aktor sxemasi
namunasi. Birinchi haqiqiy qidiruv `selleros.xitoy_kesh` ga tushadi —
fikstura oʻsha bilan almashtirilishi kerak.

## Doʻkonga yuklash

1. `cd apps/extension && npm run build`
2. `cd dist && zip -r ../selleros-extension-v<versiya>.zip .` (Windows da `zip` yoʻq —
   Python `zipfile` bilan, fayllar arxiv ildizida, yoʻllar `/` bilan: PowerShell 5.1
   `Compress-Archive` papka yoʻllarini `\` bilan yozadi va doʻkon ularni oʻqimasligi mumkin)
3. Chrome Web Store Developer Dashboard → Package → Upload new package.

`manifest.json` va `package.json` dagi versiya bir xil boʻlishi
kerak — doʻkon eskisini rad etadi.
