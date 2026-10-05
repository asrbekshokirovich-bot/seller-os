# Dizayn — holat

**Qabul qilingan:** 2026-09-30 (nazoratchi) — `ZumSavdo-Veb.html`,
terrakota. **Oldingisi:** `ZUMSavdo-*.dc.html` (2026-09-24) — olib
tashlandi, uning oʻrnini shu dizayn egalladi. Nazoratchi talabi:
"piksellarigacha bir xil".

## Manba fayli

`ZumSavdo-Veb.html` — dizayn vositasining toʻplami (brauzerda ochiladi):
9 ekran × yorugʻ/tungi, har biri 1440 px.

| Ekran | Sahifa | Kod |
|---|---|---|
| w1 Bosh sahifa | `/` | `src/app/BoshSahifa.tsx`, `bosh.module.css` |
| w2–w3 Kirish (telefon, SMS kod) | `/kirish` | `src/app/kirish/` |
| w4–w7 Usta (1, 3, 6, 8-qadam) | `/usta` | `src/app/usta/Suhbat.tsx`, `usta.module.css` |
| w8 Profilim | `/usta` (oyna) | `Suhbat.tsx` → `Profilim` |
| w9 Obunani oʻzgartirish | `/usta` (koʻrinish) | `usta/Obuna.tsx`, `obuna.module.css` |

Tokenlar `src/app/globals.css` dagi `.zs-mavzu` da (standart — tungi,
`data-mavzu="yorug"` — yorugʻ): `--bg #F4EFE6/#13100C`,
`--acc #D2552D/#E86E42`, `--matn #1F1A14/#F4EFE6`, `--xira #6E6558/#AFA595`,
`--kart #FFF/#1D1914`, `--chiziq #E3DACB/#3A3229`, `--ok`, `--ogoh` va h.k.
Shriftlar — dizayndagi Unbounded (sarlavha, raqam) va Onest (matn),
aynan oʻsha woff2 fayllar `public/fonts/` da (`shriftlar.css`).
Ikonkalar — `src/app/Ikon.tsx` (Lucide chiziqlari, dizayndagidek).

Solishtirish (2026-09-30, 1440×900, Playwright): ekranlar orasidagi
farq 0,3–2 % piksel; qolgani — jonli maʼlumot (son, sana) va apostrof.

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

7. *(2026-09-25, nazoratchi TASDIQLADI)* **Suhbat — ssenariy holat mashinasi.** Nazoratchi
   topshirigʻi: 12 qadamli ssenariy sunʼiy intellektga joylashsin, bir
   vaqtda BITTA savol. Tanishuv endi **2 savol** (byudjet, Uzum doʻkoni);
   qiziqish va tajriba savollari webda soʻralmaydi (1-banddagi "3 savol"
   oʻrniga). 3–4-savollar ("qaysi yoʻnalish", "qaysi tovar") ssenariyda
   2 va 3-qadamning oʻzi — ular deterministik hisobdan keladi. Savol
   tartibini kod hal qiladi (`packages/shared/src/ssenariy.ts`), LLM
   faqat jumlani odamdek aytadi. Yon panelda **12 qadam** koʻrinadi,
   5–12 "tez orada". Byudjet tugmalari aniq son (soʻm), oraliq emas —
   2026-08-24 qarori saqlanadi.

8. *(2026-09-25)* **5-qadam — Xitoydan topish — qurildi.** Provayder
   **Apify** (`crawleast/1688-image-search-scraper`; avval TMAPI edi,
   nazoratchi Apify'ni tanladi — kichik hajmda bepul). Qidiruv 30–90 s,
   shuning uchun ASINXRON: chat "qidirilmoqda" holatida har 8 s da
   tekshiradi. Qidiruv RASM boʻyicha: rasm bazadan (`0054`, `rasmUrl`)
   yoki obunachi yuborgan manzildan (faqat http(s), qabul paytida
   tekshiriladi); kesh 72 soat va kunlik limit `/xitoy-qidiruv` bilan bir
   xil (atomik band, umumiy shift, tarif darvozasi); bir turnda 5 tagacha
   rasm. Qidirilmagan tovar boʻlsa "qayta qidiramizmi?" savoli. Yuan narx CBU kursi bilan soʻmga oʻgiriladi va 4-qadam
   chegarasiga solishtiriladi ("chegarada" belgisi); kurs olinmasa soʻm
   koʻrsatilmaydi. Har tovar uchun bitta tanlov savoli (provayder id),
   oʻtkazish mumkin. Uch holat ekranda farqlanadi: topildi / 1688 da
   oʻxshash yoʻq / qidirilmadi (sabab).

9. *(2026-09-28, nazoratchi: "hozircha kargo hamkor yoʻq")* **6-qadam —
   Buyurtma va kargo — qurildi, hamkorsiz.** Tizim buyurtma BERMAYDI
   (1688 toʻlovi Xitoy toʻlov tizimini talab qiladi): 5-qadam
   tanlovlaridan **buyurtma varaqasi** (tovar, 1688 havolasi, miqdor,
   ¥ va soʻm, jami) yasaladi, obunachi nusxalab agentga yuboradi, keyin
   buyurtma/kuzatuv raqamini kiritadi (oʻtkazish mumkin). Shahar
   soʻraladi (profil `city`). Kargo stavkalari `selleros.fakt` dan
   (`kargo.*` kalitlari) — nazoratchi hamkor topgach toʻldiradi; ungacha
   avia/quruqlik savoli SOʻRALMAYDI va varaqa "kargo hisobga kirmadi"
   deb turadi. 4-qadam chegarasi ham fakt boʻlsa kargoni oladi.
   "Boshlaymiz" → `ochiq_ish` (kutyapman, muddat = fakt kun boʻlsa).
   Eslatma mexanizmi — BACKLOG.

10. *(2026-09-28, nazoratchi: "oʻzing plan qilib, hammasini chuqur tekshirib
    boshlayver")* **7-qadam — Rasmiylashtirish — qurildi, hamma raqam
    faktdan.** Agent 2026-09-28 da rasmiy manbalarni oʻlchadi
    (docs/RASMIYLASHTIRISH-FAKTLAR.md): BHM 440 000 (PF-115), YATT boji
    1 / 0,9 BHM (soliq qoʻmitasi, `[TASDIQ]`), 2026–2030 aylanma soligʻi
    1 % (PQ-247, OʻRQ-1108), ijtimoiy soliq 1 BHM/oy, 4 bank tarifi
    (Kapitalbank/Uzum Business, TBC, Anorbank, Hamkorbank), Uzum
    kabineti qadamlari va komissioner rekvizitlari (seller.uzum.uz
    qoʻllanmasi, oferta 14.08.2026). Bular `selleros.fakt` ga 0057 bilan
    kiradi; kod oʻqiydi, koʻrsatadi, hisoblaydi (partiya × 1 %), oʻylab
    topmaydi. Oqim: kod `rasmiy` (faktlar kartasi) → huquqiy shakl →
    (yoʻq boʻlsa) YATT ochish → bank hisobi → Uzum kabineti → kod
    `rasmiy_yakun` (ochiq ishlar: "keyin" — kutyapman, Uzum "kutyapman" —
    2 kun muddat, "sayt boshqacha / bu tugma yoʻq" — nazoratchi tekshiradi:
    davlat saytlari oʻzgaradi, BACKLOG 2026-09-25 qarori). 1-qadamda
    kabinet bor deganga savol berilmaydi. Tizim roʻyxatdan oʻtkazmaydi,
    hisob ochmaydi — faqat yoʻl koʻrsatadi va raqam beradi; "soliq/yuridik
    maslahat emas" deb aytadi.

11. *(2026-09-29, nazoratchi: "8-qadamni boshla")* **8-qadam — Qabul —
    qurildi, hamma raqam faktdan.** Manba — Uzum rasmiy qoʻllanmasi 6-bob
    (qadoq, yorliq, yetkazma akti, taymslot, ombor manzili, tafovut
    2 500 soʻm/birlik) va 14-bob (viloyatdan Uzum logistikasi: BTP,
    quti ≤ 20 kg, taymslotdan 2 kun oldin), oferta 4.6/4.17 (qabul 7
    kungacha, taqiqlangan tovar 5 mln). Faktlar `selleros.fakt`
    `uzum.qabul.*` (0058). Oqim: kod `qabul` (ombor, tekshiruv roʻyxati
    varaqadan, qadoq tavsiyasi tovar nomi boʻyicha — taxminiy, mos kelmasa
    umumiy qoida) → "yuk keldimi" (kelmagan boʻlsa «Keldi» tugmasida
    kutadi) → sanash (kam/nuqsonli → izoh, tekshirish ishi) → qadoq va
    yorliq → yetkazish usuli (oʻzim / Uzum logistikasi) → yetkazma akti
    va taymslot → topshirish → kod `qabul_yakun` (Uzum qabulini kutish,
    muddat faktdan). "Qoʻllanma boshqacha" — tekshirish. 9-qadam "tez
    orada".

12. *(2026-09-29, nazoratchi: "studiyaning vazifasi — tovar suratlari orqa
    foni oq rangda, Uzumga moslab"; "Cloudflare hozircha, hamma rasm
    kesilishi shart emas"; "1688 + internetdan, iloji boricha studiyaga
    ishi tushmasin"; tartib — "Tuzat")* **9-qadam — Studiya va 10-qadam —
    Yuklash — qurildi; 8-qadam tartibi tuzatildi.** Uzumda yetkazma faqat
    kartochkadan keyin, kartochkaga surat kerak (qoʻllanma 5/6-bob) — shuning
    uchun 8 = yukni qabul qilish (keldi, sanash, kam/nuqson), 9 = suratlar,
    10 = kartochka → qadoq va yorliq → yetkazish → taymslot → topshirish.
    Studiya: tanlangan 1688 taklifining oʻz galereyasi (Apify `offerIds`,
    asinxron, `kutish` + `tekshir`), yetmasa oʻxshash takliflar; 72 soat
    kesh. *(2026-09-30: internet — Google Lens — jonli sinovda boshqa tovar
    va brendlarni berdi, rad etildi, BACKLOG "Rad etilgan".)*
    Har surat Cloudflare Worker da 1200×1600 JPEG, oq fon — foni oq surat
    kesilmaydi (`auto`). Kartada 3:4 surat toʻri, belgilash va bitta
    faylga yuklab olish (koʻp boʻlsa ZIP). Faktlar 0059 (`uzum.surat.*`,
    `uzum.kartochka.*`, qoʻllanma 5.7). Worker ulanmagan boʻlsa suratlar
    asl holida va shu aytiladi. Joylash — docs/STUDIYA.md.

13. *(2026-09-30, nazoratchi: "keyingi reportingda butun zumsavdoning barcha
    12 ta qadami tayyor bo'lsin")***11-qadam — Sotuv boshlandi va 12-qadam —
    Hisobot — qurildi; 12 qadamning hammasi ishlaydi.** 11: har tovar uchun
    oʻz Uzum kartochkasi havolasi (raqobatchi tovari rad etiladi) →
    `so_sotuv_kuzat` uni skreyper kuzatuviga qoʻshadi (0061, sessiyaga 20
    tagacha) → kuniga 3 marta narx, zaxira, sharhlar; sotuv — zaxira
    kamayishidan taxmin. Signallar (`sotuv.ts`): zaxira boshlangʻichning
    20 % dan tushsa — "Yana buyurtma" (6-qadamdan yangi partiya: miqdor
    oʻz kartochka tezligidan qayta soʻraladi, 0 — bu safar olmayman; 5-qadam
    tanlovi, rasmiylashtirish, suratlar va kartochka saqlanadi; yangi
    partiya omborga tushmaguncha zaxira signali qayta chiqmaydi), raqobatchi
    narxi ≥ 3 % tushsa, yangi sharh. «Yangilash» — yangi oʻlchov, «Oy
    hisoboti» — 12. 12: qaysi oy (tugagan yoki joriy — hozirgacha) →
    oʻlchovdan taxmin → sotuvchi kabinetdagi komissioner
    hisobotidan sotuv va komissiyani yozadi (oʻtkazsa — taxmin) → sotuv,
    komissiya, sof, aylanma soligʻi (1 %), ijtimoiy soliq, muddat (faktdan,
    0057/0060) → deklaratsiya qadam kartalari (Bajardim / Keyinroq / Sayt
    boshqacha) → ochiq ishlar (toʻlov muddati bilan) va keyingi oy rejasi →
    «Boshlaymiz» — yangi oy, 11 ga qaytish (oy arxivi `natijalar.oylar`).
    Soliq agenti qoidasi `[TASDIQ]` — tizim "komissioner hisobotida
    tekshiring" deydi, "toʻlaysiz" demaydi.

14. *(2026-09-30)* **Yangi dizayn — terrakota** (`ZumSavdo-Veb.html`).
   Mavzu tugmasi (quyosh/oy) yana yon panel va bosh sahifada —
   6-bandning "faqat «Profilim» da" qismi bekor. Yon paneldagi baza
   vidjeti olib tashlandi (dizaynda yoʻq). Obuna — alohida sahifa emas,
   `/usta` ichidagi koʻrinish (kengaytmada sessiya hash'i yoʻqolmasin).

## Yangi dizayndan (2026-09-30) ataylab chetga chiqilgan joylar

| Dizaynda | Kodda | Nega |
|---|---|---|
| Apostrof `'` (Qo'shimcha, bo'yicha) | `ʻ` (Qoʻshimcha, boʻyicha) | Oʻzbek imlosi; piksel farqining asosiy qismi shu. Nazoratchi xohlasa — bitta almashtirish |
| SMS kod / Telegram orqali kirish | Tugmalar turadi, bosilsa "hali ulanmagan" deydi; kod ekrani (w3) tayyor, `SMS_ULANGAN` | SMS provayder va Telegram bot ulanmagan |
| Payme / Click bilan toʻlash | Tugma oʻchiq, sababi yozilgan | Toʻlov ulanmagan |
| Qadam soni va baza raqamlari | Jonli (bazadan) | Raqam toʻqilmaydi |
| 6-qadamda savol pufagi yoʻq | Savol pufagi bor | Suhbat oqimi — savol matni koʻrinishi kerak |
| Obuna narxi «99 / 000» ikki qatorda (w9) | Raqam bitta qatorda, tor kartada «soʻm / oy» ostida | Narx boʻlinmasin (nazoratchi roʻyxati 2026-10-01, 12-band) |
| Profilim sarlavhasi oyna bilan birga aylanadi | Sarlavha joyida, faqat ichi aylanadi | Past ekranda yopish tugmasi koʻrinib tursin; 1440 da piksel farqi 0 |
| «Boshidan boshlash» bosilganda darhol boshlanadi | Kichik tasdiq oynasi (Profilim foni va burchaklari), nima oʻchishi yoziladi, fokus «Bekor qilish» da | Bitta bosish butun yoʻlni oʻchirardi (chat auditi, 2026-10-05) |
| Boshidan boshlanganda suhbat tozalanadi | Tarix qoladi, «Yoʻl boshidan boshlandi» chizigʻi bilan ajratiladi | Profilimdagi «Tarix saqlanadi» rost boʻlsin; sahifa yangilanganda ham shunday koʻrinadi |
| Sarlavhada doim «N-qadam · 12 dan» | Holat kelguncha «Yuklanmoqda…», kelmasa «Ulanib boʻlmadi» va pastda «Qayta urinish» | Yuklanmasdan «1-qadam» deyish yolgʻon edi; yagona tugma «Boshidan boshlash» yoʻlni oʻchirardi |
| 1–9 raqam tugmalari hamma variantli savolda | Faqat raqamli savolda (kichik belgilar koʻringan joyda) | Belgisiz savolda "150" yozaman deb bosilgan "1" variantni yuborib yuborardi |

## Til va sahifa turi (2026-10-04)

Dizayn faqat 1440 px va oʻzbekcha. Telefon va rus tili uchun qarorlar:

- **/usta statik, ikki nusxa.** `usta/page.tsx` — oʻzbekcha, `usta/ru/page.tsx` —
  ruscha; `so_til=ru` cookie bilan kelgan soʻrovni `next.config.mjs` dagi
  `beforeFiles` rewrite CDN da ruschasiga buradi. Cookie ni sahifada oʻqish
  uni dinamik qilardi: Vercel funksiyasi iad1 da, Oʻzbekistondan har ochilish
  ~1 s+ (statik ~0,5 s; 2026-10-01 oʻlchov).
- **404 ikki tilli va statik** (`Ikki`, CSS `<html lang>` boʻyicha). Ildiz 404
  cookie oʻqisa hamma sahifa dinamik boʻlib qolardi.
- **Bosh sahifa va Kirish** tilni cookie dan oladi (ular boshqa sababdan
  allaqachon dinamik).
- **Head skripti** (`lib/mavzu-skript.ts`) chizishdan oldin `data-mavzu` va
  `lang` ni qoʻyadi, ruscha uchun kirill shriftlarini oldindan yuklaydi; server
  chizgan til (`data-til`) bilan farq qilsa, sahifa gidratsiyagacha yashirin —
  notoʻgʻri tildagi matn koʻrinmaydi.
- **Server matnlari** (savollar, AI xabarlari) hozircha faqat oʻzbekcha —
  tarjima backend ishi (BACKLOG); interfeys va qadam nomlari ruscha.

## Oldingi dizayndan (2026-09-24) chetga chiqilgan joylar

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
