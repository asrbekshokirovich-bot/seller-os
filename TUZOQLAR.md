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
- sotuvchilar soni ≤ `CLOSED_BRAND_MAX_SELLERS`
- uzoq davr o'zgarmagan (yangi sotuvchi kirmagan)
- sotuvchi rasmiy brend do'koni
- brend nomi tovar nomida uchraydi
- yuqori sotuvga qaramay hech kim kirmagan

**Harakat:** `block`. Sabab: "Bu brendni faqat egasi sotadi — bu imkoniyat
emas, yopiq eshik."

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

**Signal:** top-3 sotuvchi ulushi > `MONOPOLY_TOP3_SHARE`

**Harakat:** `warn`. "Kirish qiyin: bozorning 4/5 qismi 3 do'konda" +
kichik o'yinchilar qancha olayotgani ko'rsatiladi.

## 7. Og'ir / katta hajmli tovar — `heavy`

**Nega jozibali:** Xitoyda juda arzon turibdi.

**Signal:** og'irlik/hajm toifasi; kargo har kg/m³ tannarxga qo'shilganda
marja yo'qoladi.

**Harakat:** real kargo tannarx hisobida **majburiy** qatnashadi. Marja
chegaradan tushsa — `block`.

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

Nazoratchi 20+ "tuzoq tovar" ro'yxatini tuzadi (yopiq brendlar,
mavsumiylar, nakrutkalar). CI da avtomatik test:

**Ro'yxatning 100% i filtrlar tomonidan ushlanishi SHART.**
Ushlanmasa — merge bo'lmaydi.

Ro'yxat `apps/backend/test/fixtures/traps.json` da. Pilot davomida
boyitiladi: hodisa → shu faylga → filtr qoidasi → CI testi.

Ro'yxat doim o'sadi. Bu jarayon — mahsulotning o'zi.
