# Dizayn — holat

**Qabul qilingan:** 2026-09-24 (nazoratchi).
**Oldingisi:** `ZumSavdo-standalone.html` (koʻk + yashil, 2026-08-24) —
olib tashlandi, uning oʻrnini shu dizayn egalladi.

## Manba fayllari

| Fayl | Sahifa | Kod |
|---|---|---|
| `ZUMSavdo-K-Journey-Tinted.dc.html` | `/` | `src/app/page.tsx`, `BoshSahifa.tsx`, `bosh.module.css` |
| `ZUMSavdo-Chat.dc.html` | `/usta` | `src/app/usta/page.tsx`, `usta.module.css` |
| `ZUMSavdo-Chat-print.dc.html` | — | butun yoʻl bir sahifada, solishtirish uchun |

Fayllar dizayn vositasining formatida (`<x-dc>`, `support.js` kerak) —
ular kod emas, **manba**. Sahifalar qoʻlda React ga oʻtkazilgan;
qurish skripti yoʻq.

Tokenlar (`--bg`, `--acc`, `--a06` …) dizayndagi nomlar bilan
`src/app/globals.css` dagi `.zs-mavzu` da turadi — ikkala sahifa
uchun bitta.

## Nazoratchi qarorlari (2026-09-24)

1. Tanishuv — **3 savol** (byudjet, qiziqish, tajriba), qolgan 9 tasi
   «Profilim» da. Tafsilot: `docs/1-QADAM-SAVOLLAR.md`.
2. Tizimda hali yoʻq funksiyalar — **"tez orada"** deb koʻrsatiladi.
3. Standart mavzu — **tungi**.
4. Nom — **ZumSavdo** (dizayndagi "ZUMSavdo" emas).
5. *(2026-09-25)* «Profilim» da **savol yoʻq** — faqat hisob, obuna
   va sozlamalar. 1-bandning "qolgan 9 tasi «Profilim» da" qismi
   bekor qilindi.
6. *(2026-09-25)* Mavzu (yorugʻ/tungi) **faqat «Profilim» da** — yon
   paneldagi va bosh sahifadagi tugmalar olib tashlandi. Til ham shu
   yerda: **Oʻzbekcha / Русский**. Kirill uchun shrift — Onest
   (Instrument Sans da kirill yoʻq), `shriftlar.ts` dagi izohga qarang.

7. *(2026-09-25)* **Suhbat — ssenariy holat mashinasi.** Nazoratchi
   topshirigʻi: 12 qadamli ssenariy sunʼiy intellektga joylashsin, bir
   vaqtda BITTA savol. Tanishuv endi **2 savol** (byudjet, Uzum doʻkoni);
   qiziqish va tajriba savollari webda soʻralmaydi (1-banddagi "3 savol"
   oʻrniga). 3–4-savollar ("qaysi yoʻnalish", "qaysi tovar") ssenariyda
   2 va 3-qadamning oʻzi — ular deterministik hisobdan keladi. Savol
   tartibini kod hal qiladi (`packages/shared/src/ssenariy.ts`), LLM
   faqat jumlani odamdek aytadi. Yon panelda **12 qadam** koʻrinadi,
   5–12 "tez orada". Byudjet tugmalari aniq son (soʻm), oraliq emas —
   2026-08-24 qarori saqlanadi.

## Dizayndan ataylab chetga chiqilgan joylar

Dizayn fayllari ishlayotgan mahsulotni koʻrsatadi. Bugungi tizim
undan kichik, va QOIDALAR.md 4-boʻlim (halollik) dizayndan ustun.

| Dizaynda | Kodda | Nega |
|---|---|---|
| "Tizim har bekatni oʻzi bosib oʻtadi, siz faqat tasdiqlaysiz" | "Nisha va tannarx bugun ishlaydi, qolgani tez orada" | 5 bekatdan 1 tasi qurilgan |
| Bekat kartalarida raqamlar ("Yiwu Hongyu 4.8", "$893", "18 kun") | Bekat nima qiladi + "ishlaydi / tez orada" | Raqamlar toʻqilgan |
| Pul oqimi — "jonli hisob" | "misol" belgisi va izoh | Hisob misol, jonli emas |
| Pul oqimida foyda = sotuv − komissiya − sarmoya | + Uzum logistikasi va saqlash | Aks holda foyda oshib koʻrinardi |
| Chatda "148 lot topildi", toʻlov, yuk kuzatuvi, ogohlantirishlar | "Tez orada" kartasi, tugmasiz | Xitoy qidiruvi va toʻlov ulanmagan |
| Kategoriya kartasi: oylik savdo, oʻrtacha chek, 3 oy oʻsish, grafik | Haftalik xaridor, sotuvchilar, top-3 ulushi, optimal kirish + ball qismlari | API da shu maydonlar bor |
| "2.4 mln mahsulot · 4 daqiqa oldin" | Bazadan jonli son, yoshi bilan; olinmasa — chiziqcha | Raqam toʻqilgan edi |
| Tuzoq ogohlantirishi yoʻq | Tovar kartasida, nomi va sababi bilan | "Tuzoq yashirilmaydi — tushuntiriladi" |
| "Tizimga kirish" | "Ustaga oʻtish" | Hisob (login) yoʻq |
| Yorugʻ mavzuda sariq matn (1,5:1) | `--accMatn` #6B6100 (5,5:1) | Oʻqib boʻlmasdi |
| Telefonda yon panel birinchi ekranni egallaydi | ☰ ortida | Suhbat koʻrinmasdi |
| Har kartada `backdrop-filter` | Faqat tepa panelda | Arzon telefonda sekinlashadi |

Pul oqimi kartasining raqamlari — misol va shunday yozilgan. Agar
nazoratchi ularni umuman olib tashlashni afzal koʻrsa (QOIDALAR.md:
"namuna generatori yoʻq"), karta `BoshSahifa.tsx` dagi `MISOL` dan
kelgani uchun bitta joyda oʻzgaradi.
