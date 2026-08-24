# Sotuv sahifasi dizayni — holat

**Qabul qilingan:** 2026-08-24
**Holat: CHIQARISHGA TAYYOR** (2026-08-24). Quyidagi uch band
tuzatildi va tuzatishlar `dizayn/qurish.mjs` ichida turadi — qoʻlda
emas, yaʼni keyingi qurishda ular yoʻqolmaydi.

Sayt: `sayt/`. Yasash: `node dizayn/qurish.mjs`.

## Nima keldi

| Fayl | Nima |
|---|---|
| `ZumSavdo-standalone.html` | Asl qadoqlangan fayl, oʻzgartirilmagan (847 KB) |
| `sahifa-ochilgan.html` | Ichidagi HTML, oʻqish uchun ochilgan (183 KB) |

Ish sifatli: tuzilma aniq, 372 qator matn, Vue shablonlari bilan
ishlaydigan demo oqimi (reja → 1688 → kengaytma). Tartib, tipografika
va oqim mantigʻi — hammasi joyida va ular saqlanadi.

Muammo dizaynda emas, MATNDA.

## 1. Toʻqib chiqarilgan guvohliklar

Sahifada toʻrtta odam bor: Abdulaziz B. (Toshkent), Dilnoza K.
(Samarqand), Rustam U. (Fargʻona), Sardor M. (Buxoro). Har birida
aniq raqam: `$1 000 → $1 240 (2 oyda)`, `$2 500 → oylik $1 800
oborot`, `~$3 400 yillik foyda`, `$700 → $890`.

Bu odamlar yoʻq. Bu raqamlar oʻlchanmagan.

Ustidagi sarlavha esa shunday yozilgan:

> **"Haqiqiy natija, toʻqib chiqarilgan raqam yoʻq"**

Yaʼni sahifa oʻz ustida yozilgan gapni oʻzi buzyapti.

Bu loyihaning asosiy qoidasiga ham teskari (`QOIDALAR.md`,
4-qoida — maʼlumot toʻqilmaydi). Farqi shundaki, odatda biz bu
qoidani oʻzimizga qarshi ishlatamiz: baza boʻsh boʻlsa, chiziqcha
qoʻyamiz. Bu yerda u mijozga qarshi ishlaydi — va mijoz oʻz pulini
tikadigan odam.

Amaliy tomoni ham bor: soxta sharh koʻp mamlakatda isteʼmolchi
huquqini buzish hisoblanadi.

**Nima qilinadi.** Bitta ham haqiqiy mijoz boʻlmaguncha bu boʻlim
butunlay olib tashlanadi. Boʻsh joy qolsa — u yerga oʻlchangan
narsani qoʻyish mumkin (masalan: "1 509 827 ta tovar kuzatilmoqda"),
chunki bu raqam bazadan chiqadi va tekshirilishi mumkin.

## 2. Sotilayotgan, lekin mavjud boʻlmagan imkoniyatlar

Narx jadvalida sotilayotgan va bugungi holat:

| Sahifada | Amalda |
|---|---|
| Uzum analitikasi | ✅ **bor** — 1 509 827 tovar, kunlik oʻlchov |
| Bozor tahlili, raqobat | ✅ **bor** — tuzoq filtrlari, monopoliya |
| AI chat + reja tuzish | ❌ ulanmagan |
| Xitoydan xarid maslahati | ❌ yoʻq |
| Kargo tracking | ❌ yoʻq |
| Yandex integratsiya | ❌ yoʻq |
| Auto-yuklash (Uzum ↔ Yandex) | ❌ yoʻq |
| Buxgalteriya hisoboti | ❌ yoʻq |
| Foto topish AI | ❌ yoʻq |
| Restock takliflari | ❌ yoʻq |
| Brauzer kengaytmasi | ❌ `apps/extension` — 0 fayl |
| Toʻlov | ❌ `PAYMENTS_LIVE=0` |

Bugungi holatda ishlaydigan uch: `/health`, `/tuzoqlar`.

Narxlar esa jonli: 99 000 / 249 000 / 599 000 soʻm/oy.

**Nima qilinadi.** Ikki yoʻl bor va bu SIZNING qaroringiz:
   1. Faqat mavjudini sotish — sahifa qisqaradi, lekin har soʻzi rost.
   2. Rejadagilarni ochiq belgilash — "tayyor" va "rejada" deb
      ajratish. Bu halol va koʻp startap shunday qiladi.

Ikkalasi ham maʼqul. Belgisiz qoldirish — yoʻq.

## 3. Foyda kafolati

> "≤ $3 000 budjetli obunachilarga foyda kafolati. Rejaga rioya
> qilinsa va foyda boʻlmasa — obuna puli qaytariladi."

Bu moliyaviy majburiyat. "Rejaga rioya qilinsa" degan shart bahsli:
kim hal qiladi, rioya qilindimi yoki yoʻqmi?

Men huquqshunos emasman va bu yerda maslahat bera olmayman. Lekin
buni ofertaga yozmasdan va yurist koʻrmasdan sahifaga qoʻyish
notoʻgʻri.

## Yana ikkitasi, kichikroq

- **"Oʻzbekistonda birinchi"** — tekshirib boʻlmaydigan daʼvo.
  Isbot boʻlmasa, olib tashlash osonroq.
- **"Sizdan faqat pul kerak. Qolganini biz qilamiz."** — natija
  vaʼdasi. Savdo hech qachon kafolatlanmaydi.

## Keyingi qadam

Dizayn saqlandi va yoʻqolmaydi. Uni chiqarish uchun 1- va 3-bandlar
majburiy, 2-band esa sizning tanlovingiz.

Aytsangiz, halol variantini men yozaman: guvohliklar oʻrniga
oʻlchangan raqamlar, imkoniyatlar "tayyor / rejada" deb ajratilgan,
kafolat olib tashlangan. Tartib, ranglar va oqim oʻzgarmaydi.


---

# Nima qilindi (2026-08-24)

## Chiqarishga tayyorlash

| Band | Nima qilindi |
|---|---|
| Toʻqib chiqarilgan guvohliklar | Olib tashlandi. Oʻrniga bazadan olingan raqamlar: 1 528 764 tovar, 82 684 doʻkon, 5 244 turkum, kuniga 50 038 oʻlchov. Sana koʻrsatilgan. |
| Mavjud boʻlmagan imkoniyatlar | Har biriga **TAYYOR** yoki **REJADA** nishoni. Boʻlim tepasida nishon nimani anglatishi yozilgan. Bugun tayyori bitta — bozor analitikasi. |
| Foyda kafolati | Olib tashlandi. Oʻrniga: "Obuna istalgan vaqtda bekor qilinadi. Shartlar ofertada." |
| "Oʻzbekistonda birinchi" | "Uzum bozori tahlili" |
| "Sizdan faqat pul kerak…" | "Qaror sizniki — raqamlar bizdan." |

Tartib, ranglar, tipografika va demo oqimi **oʻzgarmadi**.

## Texnik tomondan ikkita nuqson topildi va tuzatildi

**1. Sahifa butunlay boʻsh chiqardi.** Qadoq React ni `unpkg.com` dan
soʻrardi. Oʻlchandi: 0px balandlik, 0 belgi matn, konsolda
`failed to load react.production.min.js`.

React qadoqning ICHIDA bor edi, lekin yuklovchi baribir internetga
chiqardi. Yuklovchining oʻzida yoʻl bor:

```js
if (w.React && w.ReactDOM) return Promise.resolve();
```

Mahalliy nusxalar yuklovchidan oldin ulandi. Endi sayt begona
xizmatga bogʻliq emas. Tekshirildi: 3 693px balandlik, 3 216 belgi.

**2. Dizayn asbobining ekran almashtirgichi.** Pastki oʻng burchakda
"EKRAN · 1 Landing · 2 Demo chat · …" paneli turardi. Olib tashlandi.
Demo yoʻqolmadi — u "Demoni boshlash" tugmasidan ochilaveradi
(`startDemo`).

## Ochiq qolgani

- **Hajm.** 1,4 MB (dizayn tizimi bundli 730 KB + shriftlar).
  Optimallashtirilmagan — dizayn asbobi chiqargan holicha.
- **Raqamlar qoʻlda yozilgan.** "Bazamizda bugun" boʻlimidagi toʻrt
  raqam 2026-08-24 holatiga. Ularni bazadan jonli olish mumkin
  (`zs_panel_bounds` shu yerda), lekin unda soʻrov yiqilsa nima
  koʻrsatish kerakligi hal qilinishi kerak. Hozircha sana yozilgan —
  eskirgan raqam jonli boʻlib koʻrinmaydi.
- **Narx jadvalidagi imkoniyatlar.** Nishonlar 9 ta karta boʻlimida
  qoʻyildi. Narx jadvalidagi roʻyxatga qoʻyilmadi — u yerda ✓/✗
  "shu tarifga kiradi" degani, "mavjud" degani emas. Aralashtirmaslik
  uchun tegilmadi.
- **Oferta va Maxfiylik havolalari** `#` ga ketadi — sahifalar yoʻq.
- **Telefon raqami** `+998 XX XXX XX XX` — toʻldirilmagan.
