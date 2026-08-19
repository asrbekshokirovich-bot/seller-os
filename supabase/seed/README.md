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

## `category_requirements.csv` ustunlari

- `category_external_id` — Uzumdagi kategoriya id si
- `marking_required` — Asl Belgisi markirovkasi kerakmi (0/1)
- `certificate_required` — sertifikat kerakmi (0/1)
- `entry_cost_uzs` — hujjatlar uchun taxminiy xarajat
- `entry_weeks` — necha hafta ketadi
- `optimal_entry_uzs` — kategoriyaga kirish uchun "normal" summa
- `seasonality` — 12 ta son, vergul bilan: yanvar…dekabr. `1.0` — o'rtacha

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

Hozir ro'yxat bo'sh. U to'lguncha tuzoq testi ishlamaydi — bu B1
darvozasining bir qismi.
