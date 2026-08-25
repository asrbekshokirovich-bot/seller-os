# Seed — qo'lda to'ldiriladigan bilim

Skreyper bermaydigan narsalar shu yerda. Ular **odam bilimi**: qaysi
kategoriyada markirovka kerak, mavsumi qanday, kirish uchun qancha pul
kerak.

Reja B0: "Seed: kategoriya talablari jadvali (markirovka toifalari,
mavsumiylik) qo'lda to'ldiriladi."

## Fayllar

| Fayl | Nima | Kim to'ldiradi |
|---|---|---|
| `category_requirements.csv` | Kategoriya talablari va mavsumiylik | Nazoratchi |
| `traps.json` | 20+ ma'lum tuzoq tovar — CI testining asosi | Nazoratchi |

## Qanday yuklanadi

```bash
node supabase/seed/yukla.mjs --tekshir   # faqat shaklni tekshiradi
node supabase/seed/yukla.mjs             # tekshiradi va bazaga yozadi
```

Yozish uchun `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` kerak.
`--tekshir` CI da har yugurishda ishlaydi, ya'ni buzilgan CSV
merge bo'lmaydi.

## BO'SH KATAK — `null`, NOL EMAS

Bu faylning eng muhim qoidasi. `marking_required` bo'sh bo'lsa
"markirovka kerak emas" degani **emas**, "bilmaymiz" degani.

Farqi qimmat: aralashtirsak, odam sota olmaydigan tovarga butun
partiya pulini tikadi va kod bironta xato bermaydi. Bu xato bazada
allaqachon bir marta bo'lgan (`NOT NULL boolean` + bo'sh jadval →
har turkum "sertifikat kerak emas").

Shuning uchun:

- **bilmasangiz — bo'sh qoldiring.** Taxmin yozmang.
- `0` yozish "yo'q" degan **javob**, bo'shliq esa "so'ralmagan".
- yarim to'ldirilgan `seasonality` (12 tadan kam son) **rad etiladi**:
  undan chiqqan ball noto'g'ri bo'ladi va buni hech narsa ko'rsatmaydi.
- notanish `category_external_id` **rad etiladi**, jimgina
  tashlanmaydi — aks holda "yozildi: 12" ko'rinardi, siz esa 15 ta
  qator yozgan bo'lardingiz.

## Mavsumiylik — nima to'ldirilgan va nima yo'q

*2026-08-25.* 31 turkumga mavsumiylik yozildi. **Bular o'lchov
emas, asoslangan mulohaza** — va bu `source` ustunida har qatorda
yozilgan.

Mavsumiylikni o'lchash uchun bir yillik tarix kerak; perepis
19-avgustda boshlangan. Ya'ni o'lchangan egri chiziq 2027-avgustdan
oldin bo'lmaydi.

**Faqat mavsumi jismonan yoki taqvim bo'yicha aniq turkumlar
to'ldirildi:**

| Guruh | Misol | Nega aniq |
|---|---|---|
| qish | isitgich, qishki kurtka, sharf | harorat |
| kuz-qish | sviter, kardigan, uy shippagi | harorat |
| yoz | ventilyator, shippak, quyoshdan himoya | harorat |
| maktab | penal, daftar, ryukzak | 2-sentyabr |
| Yangi yil | girlyanda, bayram dekori, sovg'a | 31-dekabr |
| bahorgi ekish | urug' | ekish vaqti |
| abituriyent | talabalar uchun adabiyot | hujjat topshirish |

**To'ldirilmagani:** kiyim (umumiy), kosmetika, elektronika,
kitoblar, o'yinchoqlar, sumkalar, taqinchoqlar, tozalash
vositalari. Bularning mavsumi bir ma'noli emas — taxmin yozish
noto'g'ri signal beradi.

### Nima ishonchli, nima yo'q

**Shakl ishonchli** — qaysi oy yuqori, qaysi past. Isitgich
qishda ko'proq sotiladi va bu o'lchovsiz ham ma'lum.

**Amplituda taxminiy** — dekabrda yozdagidan 6 barobar ko'pmi
yoki 3 barobarmi, buni faqat o'lchov aytadi.

Har egri chiziqning o'rtachasi roppa-rosa **1.0** ga teng
(`1.0` = o'rtacha oy). O'rtacha 1.0 bo'lmasa, turkum boshqalarga
nisbatan sun'iy ravishda yuqori yoki past chiqardi. Buni
yuklashdan oldin tekshirish kerak.

## `category_requirements.csv` ustunlari

- `category_external_id` — Uzumdagi kategoriya id si (**majburiy**)
- `marking_required` — Asl Belgisi markirovkasi kerakmi (0/1)
- `certificate_required` — sertifikat kerakmi (0/1)
- `entry_cost_uzs` — hujjatlar uchun taxminiy xarajat
- `entry_weeks` — necha hafta ketadi
- `optimal_entry_uzs` — kategoriyaga kirish uchun "normal" summa
- `seasonality` — 12 ta son, vergul bilan: yanvar…dekabr. `1.0` — o'rtacha.
  Vergul bo'lgani uchun **tirnoq ichida** yoziladi.
- `source` — bu ma'lumot qayerdan olingan. Huquqiy hujjat bo'lsa
  havolasi bilan: `"VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh"`
- `note` — qo'shimcha izoh

`source` **ma'lumotning bir qismi**, yuklash usulining emas. "Markirovka
kerak" degan da'vo dalilsiz qolmasligi kerak: foydalanuvchi "nega?"
desa, unga hujjat ko'rsatiladi.

Mavsumiylik misoli (isitgich):
`0.4,0.4,0.5,0.6,0.6,0.5,0.5,0.7,1.4,1.9,2.0,1.5`

## `traps.json`

Har element — ma'lum tuzoq tovar va uni qaysi filtr ushlashi kerakligi:

```json
{
  "platform": "uzum",
  "external_id": 1705639,
  "expect": "closed_brand",
  "note": "Faqat brend egasi sotadi, 2 yildan beri yangi sotuvchi yo'q"
}
```

CI da: **ro'yxatning 100% i ushlanishi shart.** Ushlanmasa merge bo'lmaydi.

Ro'yxat `tuzoq_nomzodlari.sql` bilan o'lchovdan chiqariladi, qo'lda
yozilmaydi. Nomzodni topadigan belgi filtrning signallaridan bo'lmasligi
shart — batafsil TUZOQLAR.md, "Sifat nazorati".
