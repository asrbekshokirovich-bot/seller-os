# TUZOQLAR.md — 8 hiyla-filtr

> Ustaning eng qimmatli qismi va raqobatchilardan asosiy farqi.
> Bular **prompt emas — KOD**. Deterministik qoidalar.

Quruq statistika yolg'on gapiradi. "Sotuvchi 1 ta, sotuv katta — raqobat
yo'q!" degan xulosa ko'pincha noto'g'ri: bu yopiq brend bo'lishi mumkin va
unga kirib bo'lmaydi.

**Har tavsiya chiqishidan OLDIN shu filtrlardan o'tadi.**

---

## Chegaralar qayerda turadi

Barcha son chegaralari `packages/shared/src/thresholds.ts` da, bitta joyda.
Ular kodga tarqalib ketmasligi kerak: nazoratchi bittasini o'zgartirsa,
butun tizim bir xil o'zgarsin.

Chegara o'zgarishi — alohida PR, sababi bilan, testlar yangilangan holda.

## Natija shakli

Har filtr bitta `Flag` qaytaradi:

```ts
type Flag = {
  kind: TrapKind;          // 8 turdan biri
  severity: 'block' | 'warn' | 'note';
  reason: string;          // foydalanuvchiga ko'rsatiladigan matn (uz)
  evidence: Record<string, number | string>;  // qaysi raqamdan chiqdi
};
```

`block` — tovar tavsiyadan **butunlay chiqariladi**.
`warn` — chiqadi, lekin ogohlantirish va past ball bilan.
`note` — faqat izoh.

`evidence` majburiy: foydalanuvchi "nega?" desa, raqam ko'rsatiladi.
Sababsiz bayroq — ishonchni yo'qotadi.

---

## 1. Yopiq brend tovari — `closed_brand`

**Nega jozibali:** sotuvchi 1–2 ta, sotuv juda katta → "bo'sh maydon!"

**Aslida:** brendni faqat egasi sotadi. Bu imkoniyat emas, yopiq eshik.

**Signal (hammasi birga):**
- sotuvchilar soni ≤ `closedBrand.maxSellers`
- uzoq davr o'zgarmagan (yangi sotuvchi kirmagan)
- brendning BUTUN assortimentini ≤ `closedBrand.maxBrandSellers` do'kon sotadi
- brend YANGI EMAS: 60 kun sotuvchi o'zgarmagan YOKI brend ≥180 kunlik
- brend nomi tovar nomida uchraydi
- yuqori sotuvga qaramay hech kim kirmagan

**Harakat:** `block`. Sabab: "Bu brendni faqat egasi sotadi — bu imkoniyat
emas, yopiq eshik."

**O'lchangan nomzodlar** (Uzum, 663 779 tovar, 2026-08-19):

| Brend | Tovar | Sotuvchi do'kon |
|---|---|---|
| Lamart | 170 | 1 |
| VITACCI | 138 | 1 |
| Thule | 130 | 1 |
| Lirene | 122 | 1 |
| Jenavi | 81 | 1 |

> **Olib tashlangan signal.** Avval beshinchi signal "sotuvchi rasmiy brend
> do'koni" edi. Uzum `Shop.official` maydonini to'ldirmaydi — 2026-08-19 da
> jonli tekshirildi: Artel Brand Shop, ARTEL_OFFICIAL, ARTEL • STORE,
> Яшкино (207 847 sharh) — hammasi `false` qaytardi. Maydon API'da bor,
> lekin bo'sh. Bazadagi ustun `not null default false` bo'lgani uchun
> "yo'q" bilan "bilmadim" farqlanmasdi va filtr jimgina hech qachon
> ishlamasdi. Migratsiya `0009` ustunni NULL qilib qo'ydi, signal esa
> brend darajasidagi do'kon soniga almashtirildi — bu o'lchov bazada
> haqiqatan bor.

> **Yangilanish (o'sha kuni, kechroq).** Dastlab "Uzum maydonni bo'sh
> qoldiradi" deb o'ylagandik va yig'uvchida `bool(...)` ni olib tashlash
> yetarli deb hisoblagandik. Noto'g'ri edi: Uzum haqiqiy `false` yuboradi.
> 63 113 do'kondan **birortasi ham `true` emas**. Ya'ni bu `false` —
> o'lchov emas, doimiy. Shuning uchun Uzum manbasi endi bu ustunga
> umuman yozmaydi (`shop_official=None`). Boshqa bozor haqiqiy belgi
> bersa — o'sha manba yozadi.


## 2. Mavsumiy tovar — `seasonal`

**Nega jozibali:** hozir sotuv o'sib turibdi (isitgich — kuzda).

**Signal:** kategoriya mavsumiylik jadvali + tarixda cho'qqi-pasayish
shakli. Tarix to'plangan sari kuchayadi.

**Harakat:** `warn` — "Mavsum tugashiga ~X hafta". Taklif miqdori
kamaytiriladi yoki mavsumdan tashqari alternativa beriladi.

## 3. Demping / zararga sotish — `dumping`

**Nega jozibali:** eng ko'p sotilayotgan tovar — demak "ishlayapti".

**Signal:** sotuv narxi < (Xitoy tannarxi + kargo + komissiya + minimal foyda)

**Harakat:** `block`. "Bu narxda foyda yo'q — katta o'yinchi bozorni siqyapti."

## 4. Sun'iy sotuv (nakrutka) — `fake_sales`

**Nega jozibali:** grafikda keskin o'sish — "trend!"

**Signal:**
- 1–2 kunlik anomal sakrash
- sharh soni sotuvga mos emas
- reyting-sharh nisbati g'alati

**Harakat:** `warn` + ishonch balli pasayadi, ro'yxatda pastga tushadi,
"shubhali statistika" belgisi.

## 5. Majburiy sertifikat / markirovka — `certification`

**Nega jozibali:** elektronika oson va foydali ko'rinadi.

**Signal:** kategoriya → talablar jadvali (Asl Belgisi markirovkasi,
sertifikat kerak toifalar). `category_requirements` jadvalidan.

**Harakat:** `note` — yashirilmaydi. "Kirishdan oldin: markirovka +
sertifikat, ~X so'm va Y hafta". Boshlovchiga soddaroq yo'nalish taklif.

## 6. Monopol kategoriya — `monopoly`

**Nega jozibali:** bozor hajmi juda katta.

**Signal (ikkalasi birga):**
- top-3 sotuvchi ulushi > `monopoly.top3SharePercent`
- ulush turkumdagi sotuvchilarning kamida `monopoly.minSellerCoveragePercent`
  i ustida hisoblangan

**Harakat:** `warn`. "Kirish qiyin: bozorning 4/5 qismi 3 do'konda" +
kichik o'yinchilar qancha olayotgani ko'rsatiladi.

> **Ulush PEREPISDAN hisoblanadi, namunadan emas.** 2026-08-20 da
> o'lchandi va eski qoida rad etildi. Avval filtr faqat "kamida 8 ta
> o'lchangan sotuvchi" ni talab qilardi. Yetarli emas ekan:
>
> | Turkum | Namuna | Namuna ulushi | Haqiqiy sotuvchi | Haqiqiy ulush |
> |---|---|---|---|---|
> | Qoplamalar | 10 | **76%** | 2 052 | **21%** |
> | Cho'tkalar | 8 | **79%** | 720 | 43% |
> | Sumkalar | 9 | 63% | 2 439 | **12%** |
> | Ziraklar | 8 | 57% | 1 452 | 19% |
>
> Yettita turkumning yettitasida ham namuna konsentratsiyani 2–4 barobar
> oshirib ko'rsatdi — o'lchovga aynan yirik sotuvchilar tushadi.
> "Qoplamalar" namuna bilan berilsa, filtr yolg'on ogohlantirish berardi.
>
> O'lchangan haqiqiy monopoliyalar: "Chop etish uchun qog'oz" (293
> sotuvchi, top-3 = 97%), "Dush uchun gellar" (82 / 95%), "Filtrli
> kuvshinlar" (57 / 96%).

## 7. Og'ir / katta hajmli tovar — `heavy`

**Nega jozibali:** Xitoyda juda arzon turibdi.

**Signal:** og'irlik/hajm toifasi; kargo har kg/m³ tannarxga qo'shilganda
marja yo'qoladi.

**Harakat:** real kargo tannarx hisobida **majburiy** qatnashadi. Marja
chegaradan tushsa — `block`.

### Og'irlik SOTUVCHI kiritadi va unga ishonib bo'lmaydi

O'lchandi 2026-08-25, Uzumning 3 016 tovari bo'yicha. Taqsimot
sog'lom ko'rinadi — mediana 226 g, p95 1 641 g — lekin uchi axlat:

| Tovar | Yozilgan og'irlik |
|---|---|
| Campus krossovkalari | **987 kg** |
| Mikrofiber sochiq | **500 kg** |
| Aqlli soat, 45 mm | **20 kg** |
| Muzlatgich Biryusa 139 | 64 kg — **to'g'ri** |

Ya'ni raqamning o'zi haqiqiy og'irlikni ham, terish xatosini ham
bildirishi mumkin, va ularni faqat qarab ajratib bo'lmaydi.

**Nima qilindi.** Uzum har VARIANT uchun alohida og'irlik beradi.
Krossovkada 63 ta variant bor: 571–820 g, va ikkitasida 987455.
Skreyper ilgari eng kattasini olardi — bitta xato butun tovarni
buzardi. Endi **mediana** olinadi: 695 g. Mikrofiber sochiqda ham
xuddi shunday, 28 variantdan uchtasi buzuq, mediana 290 g.

Mediana variantlarning yarmi buzilmaguncha turadi. Haqiqiy
variantlar orasidagi farq kichik (krossovkada 44%), shuning uchun
"eng og'irini olamiz, kargo shunga qarab" degan eski dalil xato
xavfidan arzon turadi.

Ustiga **150 kg shifti** qo'yildi: undan og'iri `null` bo'ladi —
"juda og'ir" emas, **o'lchanmagan**. Filtr tovarni ayblamaydi,
"baholanmadi" deydi.

**Hal qilinmagan.** Bitta variantli tovarda mediana yordam
bermaydi. "Aqlli soat 20 kg" hamon o'tadi, chunki 20 kg o'zi
mumkin bo'lgan og'irlik — ofis kreslosi uchun u to'g'ri javob.
Buni ajratish uchun TURKUM bo'yicha solishtirish kerak, u esa
og'irlik qamrovi to'lgach mumkin bo'ladi.

## 8. Qisqa trend (hype) — `hype`

**Nega jozibali:** hamma joyda ko'rinyapti (TikTok tovari).

**Signal:**
- tovar "yoshi" bir necha hafta
- o'sish faqat so'nggi kunlarda
- o'xshash tovarlar birdan ko'payyapti

**Harakat:** `warn` — "Yuqori xavf: trend so'nishi mumkin". Faqat kichik
sinov partiyasi taklif qilinadi.

---

## Sifat nazorati

Ro'yxat `apps/backend/test/fixtures/traps.json` da.

**Ro'yxatning 100% i to'g'ri baholanishi SHART.** Noto'g'ri bo'lsa —
merge bo'lmaydi.

### Ro'yxat qanday tuziladi

Avval "nazoratchi qo'lda yozib beradi" deb rejalashtirilgandi. Ikki
sababdan voz kechildi: (1) ro'yxat yozilguncha ish to'xtaydi;
(2) ro'yxat bir kishining xotirasi bilan cheklanadi.

Endi u **o'lchovdan** chiqadi: `supabase/seed/tuzoq_nomzodlari.sql`.

**Aylanmalikdan qochish — asosiy shart.** Nomzodni topadigan belgi
filtrning o'z signallaridan BO'LMASLIGI kerak. Aks holda filtr o'zi
topgan narsada o'zini sinaydi va test doim yashil bo'ladi.

Ishlatilgan belgi: **do'kon NOMI brend nomi bilan bir xil.** "Lamart"
degan do'kon "Lamart" mahsulotini sotsa — bu brendning o'z do'koni.
Filtr bunga qaramaydi.

**Salbiy misollar ham shart.** Ro'yxat faqat tuzoqlardan iborat bo'lsa,
hammaga "tuzoq" deydigan filtr ham 100% oladi. Shuning uchun `expect:
null` qatorlari — filtr bayroq QO'YMASLIGI kerak bo'lgan holatlar.

Hozirgi holat (2026-08-20):

| Roʻyxat | Tuzoq | Tuzoq emas | Baholanmadi |
|---|---|---|---|
| `traps.json` — 1-tuzoq | 14 | 38 | 2 |
| `monopoliya.json` — 6-tuzoq | 12 | 10 | 7 |

Pilot davomida boyitiladi: hodisa → shu faylga → filtr qoidasi → CI
testi. Ro'yxat doim o'sadi. Bu jarayon — mahsulotning o'zi.

---

## Yosh qanday o'lchanadi

1-tuzoqning "hech kim kira olmagan" da'vosi vaqtga tayanadi. Uni ikki
xil o'lchash mumkin va ikkalasi ham ishlaydi:

1. **O'z tariximiz** — sotuvchilar soni 60 kun o'zgarmadi. Kuchli dalil,
   lekin 60 kunlik tarix kerak. Bazada hozir 3 kun bor.
2. **Uzum id soati** — Uzum mahsulot id larini ketma-ket beradi. Brendning
   eng kichik id li mahsuloti uning yoshini ko'rsatadi. Birinchi kuniyoq
   mavjud.

**Kalibrovka** (id → sana). Har mahsulotning eng eski sharhi ≈ u paydo
bo'lgan vaqt. 526 mahsulot, korrelyatsiya **0.81**:

| id | Median sana | Yosh (2026-08-19) |
|---|---|---|
| 0 | 2023-04-06 | 1231 kun |
| 1 000 000 | 2024-08-31 | 718 kun |
| 1 250 000 | 2025-01-18 | 578 kun |
| 1 500 000 | 2025-05-20 | 456 kun |
| 1 750 000 | 2025-08-08 | 376 kun |
| 2 000 000 | 2025-12-08 | 254 kun |
| 2 250 000 | 2026-02-21 | 179 kun |
| 2 500 000 | 2026-04-15 | 126 kun |
| 3 000 000 | 2026-08-02 | 17 kun |

### Rad etilgan usul: sharhlar yig'indisi

Avval yosh "brendning sharhlar yig'indisi ≥200" bilan o'lchanardi.
**Noto'g'ri edi va o'z-o'zidan sezilmasdi** — u ham xuddi shunday
ishonarli ko'rinardi.

Mustaqil soat (id) bilan solishtirilganda:
- korrelyatsiya atigi **−0.29** (log-log, 195 brend)
- 195 dan 16 tasi ochiq ziddiyatda

Sabab: sharh yoshni emas, **yosh × sotuvni** o'lchaydi. Ikki xil xato
beradi:
- **Rieker** — 1102 kunlik brend, 11 sharh. Sharh qoidasi "yangi" dedi.
- **SOLAB** — 391 kunlik brend, 3 798 sharh. Tez o'sgani uchun "eski"
  bo'lib ko'rindi.

Dars: proksi o'lchov **mustaqil o'lchov bilan tekshirilmaguncha**
ishonchli emas. Ikkalasi ham ma'lumotdan chiqarilgan bo'lsa, ular bir
xil xatoni takrorlaydi.
