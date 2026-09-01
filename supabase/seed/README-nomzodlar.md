# Darvoza roʻyxatlari qayerdan keladi

Roʻyxatlar **bazadan** yasaladi, qoʻlda yozilmaydi.

```
python supabase/seed/fikstura_yasash.py
```

Kalit muhitdan olinadi:
`ZUMSAVDO_SUPABASE_URL`, `ZUMSAVDO_SUPABASE_SERVICE_ROLE_KEY`.
Biri yoʻq boʻlsa skript aniq xabar bilan toʻxtaydi.

## Nomzodlarni kim tanlaydi

SQL **bazada** turadi, skriptda emas:

| Funksiya | Nima qaytaradi |
|---|---|
| `zs_tuzoq_nomzodlari()` | 1-tuzoq: doʻkon nomi brend nomi bilan bir xil boʻlgan holatlar |
| `zs_monopoliya_nomzodlari()` | 6-tuzoq: eng konsentratsiyalangan 20 + eng tarqoq 20 + yupqa namuna |
| `zs_nakrutka_nomzodlari()` | 4-tuzoq: sharh/sotuv nisbati gʻalati + taxmin + nol sotuv |
| `zs_mavsumiy_nomzodlari()` | 2-tuzoq: mavsumiylik jadvali bor turkumlar |
| `zs_ogir_nomzodlari()` | 7-tuzoq: ogʻir/katta tovarlar + oʻlchovi yoʻq |
| `zs_sertifikat_nomzodlari()` | 5-tuzoq: sertifikat/markirovka talab qilingan + talab nomaʼlum |

Nega bazada: skriptga *"ixtiyoriy SQL"* RPC si kerak boʻlardi, u esa
kalit sizib ketsa butun bazani ochib beradi.

## Uch sinf ham shart

| Sinf | Nima uchun |
|---|---|
| tuzoq | filtr ushlashi kerak |
| tuzoq emas | filtr **ushlamasligi** kerak — busiz hammaga "tuzoq" deydigan filtr ham 100% olardi |
| baholanmadi | maʼlumot yetarli emas — filtr **javob bermasligi** kerak |

Uchinchisi eng qimmatli. Aynan oʻsha yerda eski filtr yolgʻon
ogohlantirish berardi: "Qoplamalar" namunada 76%, haqiqatda 21%.
