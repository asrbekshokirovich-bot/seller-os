-- 8-qadam (Qabul: yuk kelganda tekshirish va Uzum omboriga topshirish)
-- faktlari. Manba — Uzum rasmiy qoʻllanmasi, 6-bob (Tovarlarni omborga
-- tayyorlash va yuborish) va 14-bob (Logistika), oferta (14.08.2026).
-- Agent brauzerda oʻqidi 2026-09-28/29 (docs/RASMIYLASHTIRISH-FAKTLAR.md,
-- 5-boʻlim, 14-band). Qoʻllanma oʻzgarsa — shu qatorlar tuzatiladi, kod
-- oʻzgarmaydi. `on conflict do nothing`: nazoratchi tuzatgani saqlanadi.

insert into selleros.fakt (kalit, qiymat, birlik, manba, olchandi, izoh) values
  -- ---------------------------------------------------------------- ombor
  ('uzum.qabul.ombor.manzil', '"Toshkent, Sergeli tumani, Eshonbuloq MFY, Xonabod koʻchasi, 2/2 (Fulfillment markazi, «Uzum» peshtaxtasi)"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.6)', '2026-09-28', 'KGT, OʻGT, YGT qabul qilinadigan asosiy ombor.'),
  ('uzum.qabul.ombor.soat', '"har kuni 06:00–00:00"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.6)', '2026-09-28', null),
  ('uzum.qabul.qaytarish.manzil', '"Toshkent, Sergeli tumani, Eski Sergeli dahasi, Nilufar koʻchasi, 77/7 (Sergeli ombori)"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.6)', '2026-09-28', 'Faqat qaytarilgan tovarlarni berish.'),
  ('uzum.qabul.qaytarish.soat', '"har kuni 09:00–21:00"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.6)', '2026-09-28', null),

  -- ---------------------------------------------------------------- qabul qoidalari
  ('uzum.qabul.muddat_kun_max', '7'::jsonb, 'kun',
   'Oferta 14.08.2026, 4.6-band: qabul 24 soatdan 7 kalendar kungacha', '2026-09-28', null),
  ('uzum.qabul.tafovut_som', '2500'::jsonb, 'soʻm/birlik',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.4)', '2026-09-28',
   'Har aniqlangan muammo (aralash, ShK yoʻq, brak, markirovka xatosi, ortiqcha, kam) — tovar birligi uchun yagona tarif.'),
  ('uzum.qabul.taqiq_jarima_som', '5000000'::jsonb, 'soʻm',
   'Oferta 14.08.2026, 4.17-band', '2026-09-28', 'Taqiqlangan tovar (qoʻllanma 2.3) yuborilsa — har fakt uchun.'),
  ('uzum.qabul.taymslot.ozgartirish_max', '3'::jsonb, 'marta',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.4)', '2026-09-28', 'Bitta yetkazib berish doirasida.'),
  ('uzum.qabul.taymslot.bekor_soat', '48'::jsonb, 'soat',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.4)', '2026-09-28', 'Taymslotdan shuncha oldin bekor qilinsa jarima yoʻq.'),
  ('uzum.qabul.yetkazma.sku_max', '100'::jsonb, 'SKU',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.3)', '2026-09-28', 'Bitta yetkazib berish = bitta quti yoki palleta.'),
  ('uzum.qabul.yetkazma.akt_nusxa', '2'::jsonb, 'nusxa',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.3)', '2026-09-28', 'Yuborish akti: biri qutida, biri ustida; doʻkon menejeri imzolaydi.'),
  ('uzum.qabul.quti_toliqlik', '"kamida 2/3"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.1)', '2026-09-28', 'Tovar qutining kamida 2/3 qismini egallasin; boʻshliq toʻldirgich bilan.'),

  -- ---------------------------------------------------------------- yorliq
  ('uzum.qabul.yorliq', '{"kod": "EAN-13 (zavod) yoki Uzum QR (kabinetdan chop etiladi)", "tavsiya": "58×40 mm yoki 58×60 mm", "min": "40×30 mm", "dpi": "203 (min) – 300 (optimal)", "qogoz": "termo-yorliq (Thermo ECO/TOP), namlikka chidamli", "joy": "qadoqning tekis tor tomoniga; kiyimda ikkita — qadoqda va birkada", "oqish": "10–30 sm dan birinchi skanerdan oʻqilsin, atrofida 2 mm boʻsh joy"}'::jsonb, 'roʻyxat',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.1 jadval, 6.2)', '2026-09-28', 'Uzum yorligʻi zavod shtrix-kodini TOʻLIQ yopishi shart.'),

  -- ---------------------------------------------------------------- qadoq (toifa boʻyicha)
  ('uzum.qabul.qadoq', '[
     {"kalit_sozlar": ["kiyim", "futbolka", "koʻylak", "shim", "kurtka", "libos", "sport formasi", "kofta", "sviter", "bluzka", "ichki kiyim"],
      "tur": "Kiyim-kechak", "usul": "Klapanli yoki yopishqoq tasmali individual shaffof paket (toʻliq yopiq) yoki butun zavod qutisi", "belgilar": "—"},
     {"kalit_sozlar": ["poyabzal", "krossovka", "botinka", "etik", "tufli", "kedi", "shippak"],
      "tur": "Poyabzal", "usul": "Zavod qutisi (butun) yoki strech plyonka; qimmatbaho — qutiga qadoqlab yopishtiring", "belgilar": "—"},
     {"kalit_sozlar": ["telefon", "quloqchin", "naushnik", "planshet", "noutbuk", "smart-soat", "soat", "zaryad", "kabel", "elektron"],
      "tur": "Mayda elektronika", "usul": "Zavod qadogʻida, seriya raqami / IMEI / Asl belgisi koʻrinishi shart", "belgilar": "—"},
     {"kalit_sozlar": ["shampun", "krem", "suyuq", "bo'yoq", "boʻyoq", "kimyo", "sovun", "gel", "yog'", "yogʻ", "parfyum", "atir"],
      "tur": "Suyuqlik / kosmetika", "usul": "Zavod termousadka yoki strech + quti; bo'g'zi yuqoriga, qopqoq oxirigacha buralgan, dozator OFF; pufakchali plyonka", "belgilar": "Yuqori"},
     {"kalit_sozlar": ["shisha", "idish", "tovoq", "oyna", "lampa", "chinni", "stakan", "vaza", "keramika"],
      "tur": "Nozik buyumlar", "usul": "Toʻldirgichli quti yoki pufakchali plyonka + quti", "belgilar": "Nozik. Ehtiyot boʻling; Aylantirmang"},
     {"kalit_sozlar": ["o'yinchoq", "oʻyinchoq", "bolalar", "taglik", "chaqaloq", "butilka"],
      "tur": "Bolalar tovarlari", "usul": "Quti yoki termousadka paketi ≥ 80 mkm; oʻyinchoqqa pufakchali plyonka + skotch, detallar mahkamlangan", "belgilar": "—"},
     {"kalit_sozlar": ["kitob", "daftar", "plakat", "xarita", "taqvim"],
      "tur": "Bosma tovarlar", "usul": "Termousadka ≥ 20 mkm yoki pufakchali plyonka + quti; yupqa — shakldor xatjild; katta — tubus", "belgilar": "—"},
     {"kalit_sozlar": ["adyol", "pled", "puxovik", "yostiq", "ko'rpa", "koʻrpa", "matras"],
      "tur": "Hajmli va yumshoq", "usul": "Kuryer paketi yoki vakuum paket; zavod qutisi boʻlsa strech", "belgilar": "Namlikdan asrang"},
     {"kalit_sozlar": ["sumka", "ryukzak", "hamyon", "aksessuar", "bijuteriya", "zargarlik", "taqinchoq"],
      "tur": "Sumka / aksessuar", "usul": "Individual paket yoki zavod qutisi; bijuteriya — himoya qoplama + xavfsiz paket", "belgilar": "—"},
     {"kalit_sozlar": ["mebel", "stul", "stol", "shkaf", "javon", "tumba"],
      "tur": "Mebel", "usul": "Har detal pufakchali plyonka + ≥ 3 qatlamli quti; qismlarga 'N dan M' belgisi", "belgilar": "Yuqori; Nozik; Yigʻib qoʻymang"}
   ]'::jsonb, 'roʻyxat',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.1 jadval)', '2026-09-28',
   'Tovar nomi kalit soʻzlar bilan taqqoslanadi; mos kelmasa umumiy qoida: zavod qutisi + strech, qutisiz kichik tovar — kuryer paketi.'),
  ('uzum.qabul.qadoq_umumiy', '"Zavod qutisi boʻlsa — strech plyonka kifoya. Qutisi boʻlmasa: 2×10×10 sm gacha — kuryer paketi; kattasi — toʻldirgichli quti. Ikki qismli tovar — sariq stiker «2 qismli tovar / Товар из 2 частей», QR faqat asosiy qismda."'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/6.product-preparation (6.1)', '2026-09-28', null),

  -- ---------------------------------------------------------------- viloyatdan: Uzum logistikasi
  ('uzum.qabul.logistika.url', '"https://logistics.uzum.uz"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz/12.logistics (14-bob)', '2026-09-29', 'Shahringizda BTP boʻlsa yoki mashina yoʻlida boʻlsa — pullik yetkazish, narx avtomatik.'),
  ('uzum.qabul.logistika.quti_kg_max', '20'::jsonb, 'kg',
   'seller.uzum.uz/manual/uz/12.logistics', '2026-09-29', 'BTP dan topshirishda bitta quti 20 kg dan oshmasin.'),
  ('uzum.qabul.logistika.oldin_kun', '2'::jsonb, 'kun',
   'seller.uzum.uz/manual/uz/12.logistics', '2026-09-29', 'Tovar taymslotdan kamida 2 kun oldin yuklanadi; yukxat 3 nusxa; shaxsni tasdiqlovchi hujjat kerak.'),

  -- ---------------------------------------------------------------- qoʻllanma
  ('uzum.qabul.qollanma.url', '"https://seller.uzum.uz/manual/uz/6.product-preparation/"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz', '2026-09-28', 'Rasmiy qoʻllanma, 6-bob.')
on conflict (kalit) do nothing;
