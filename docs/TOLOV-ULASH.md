# Toʻlovni ulash — Payme va Click (obuna 149 000 soʻm/oy)

Nazoratchi qarori (2026-10-14): bitta reja — **149 000 soʻm/oy**; toʻlov — **faqat
Payme va Click**; 1–5-qadamlar bepul, 6-qadamdan obuna; 1688 sotuvchi havolasi
toʻlovdan keyin. Kod tayyor: obuna darvozasi (`ssenariy.ts`, `keyingi`), toʻlov
uchlari (`tolov-payme.ts`, `tolov-click.ts`, `tolov.ts`), baza (0067).

## Qanday ishlaydi

1. Mijoz chatda «Payme orqali toʻlash» yoki «Click orqali toʻlash» ni bosadi →
   `/api/tolov/boshla` → bazada buyurtma (`payments`, 149 000 soʻm, 30 kun) →
   Payme yoki Click sahifasi.
2. Payme/Click pulni yechib, bizni chaqiradi: `/api/tolov/payme`, `/api/tolov/click`
   (sayt → Edge Function; Edge JWT bilan yopiq, shuning uchun sayt orqali). Payme
   kassa kaliti va Click imzosi Edge da tekshiriladi; summa — bazadagi buyurtma bilan.
3. Toʻlov bajarilgan zahoti (bitta tranzaksiyada) obuna 30 kunga uzayadi: faol
   boʻlsa — tugash sanasidan, boʻlmasa — hozirdan.
4. Mijoz saytga qaytadi (`TOLOV_QAYTISH_URL`) yoki «Toʻladim — tekshirish» ni bosadi —
   yoʻl shu joydan davom etadi.

Payme kabinetidan pul qaytarilsa (CancelTransaction, holat −2) — obunadan 30 kun
olinadi. Click da qaytarish (`payment/reversal`) hali ulanmagan.

## Nazoratchi qiladigan ishlar

**Payme** (business.payme.uz, YATT bilan):
1. Roʻyxatdan oʻtish, shartnoma (Didox), biznes hisob raqami va bankdan ePOS.
2. Kabinet (merchant.payme.uz) → «Кассы» → billingli kassa:
   - **Endpoint URL:** `https://zumsavdo.vercel.app/api/tolov/payme`
   - **Реквизит (account):** `order_id` (raqam).
3. Kassa ID va kalitlarni Supabase'ga kiritish (pastda) — chatga yozilmaydi.

**Click** (business.click.uz):
1. Roʻyxatdan oʻtish, shartnoma, hisob raqam.
2. Kabinet (mc.click.uz) → «Xizmatlar» → Prepare va Complete manzili (ikkalasi bir xil):
   `https://zumsavdo.vercel.app/api/tolov/click`
3. `service_id`, `merchant_id`, `secret_key` — Supabase'ga.

**Sayt uchun** (provayderlar tekshiradi): ommaviy oferta, kontakt va rekvizitlar,
qaytarish shartlari — tayyorlanadi, matnini buxgalter/yurist koʻradi. IKPU (MXIK)
kodi va QQS — buxgalterdan.

## Supabase sirlari (Edge Functions → selleros → Secrets)

| Nomi | Nima |
|---|---|
| `PAYME_MERCHANT_ID` | Payme kassa ID si |
| `PAYME_TEST_KEY` | Payme sinov kaliti (test.paycom.uz uchun) |
| `PAYME_KEY` | Payme jonli kaliti |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` | Click kabinetidan |
| `PAYME_IKPU`, `PAYME_PAKET_KODI`, `PAYME_QQS_FOIZ` | fiskal chek (ixtiyoriy, buxgalterdan) |
| `PAYMENTS_LIVE` | `1` — jonli. Boʻlmasa — sinov |
| `TARIF_CHEKLOVI` | `1` — darvoza yoqiladi (oxirgi qadam) |

Holatini tekshirish: `/health` → `live.tolov` (`payme`, `click`, `jonli` — kalitlarning
oʻzi emas, faqat bor-yoʻqligi).

## Ishga tushirish tartibi

1. Payme sinov: `PAYME_MERCHANT_ID` + `PAYME_TEST_KEY` → test.paycom.uz da kassa ID va
   TEST_KEY bilan ikkala stsenariyni oʻtkazish. `PAYMENTS_LIVE` boʻsh.
2. Click sinov: Click «Playground» / Postman toʻplami (docs.click.uz/testing) — Prepare
   va Complete shu manzilga. Click sahifasi faqat jonli rejimda ochiladi.
3. Jonli: `PAYME_KEY`, Click sirlari, `PAYMENTS_LIVE=1`. Oʻzimiz bitta haqiqiy toʻlov.
4. Oxirida `TARIF_CHEKLOVI=1` — darvoza yoqiladi.

## Cheklovlar (hozircha)

- Obuna sayt sessiyasiga (brauzerga) bogʻliq; telefon orqali kirish keyinroq. Cookie
  oʻchsa — qoʻlda tiklanadi.
- Avtomatik oylik yechish yoʻq: mijoz har oy oʻzi toʻlaydi (Payme Subscribe / Click
  karta tokeni — alohida ruxsat bilan, keyin).
- Click da pul qaytarish va oʻtgan toʻlovlar roʻyxati (Merchant API) ulanmagan.
