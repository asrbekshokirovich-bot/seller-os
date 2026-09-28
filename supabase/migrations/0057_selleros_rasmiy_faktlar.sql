-- 7-qadam (Rasmiylashtirish) faktlari: BHM, YATT boji, 2026 soliq rejimi,
-- bank tariflari, Uzum kabineti rekvizitlari.
--
-- MANBA VA SANA HAR QATORDA. Agent 2026-09-28 da oʻlchadi
-- (docs/RASMIYLASHTIRISH-FAKTLAR.md); `[TASDIQ]` belgisi bor qatorlarni
-- nazoratchi tekshirib tasdiqlaydi. Raqam eskirsa shu jadvalda tuzatiladi —
-- kod oʻzgarmaydi (QOIDALAR §4: fakt kodda turmaydi).
--
-- `on conflict do nothing`: nazoratchi qoʻlda tuzatgan qiymat qayta
-- qoʻllashda yoʻqolmaydi.

insert into selleros.fakt (kalit, qiymat, birlik, manba, olchandi, izoh) values
  -- ---------------------------------------------------------------- BHM
  ('bhm.som', '440000'::jsonb, 'soʻm',
   'PF-115, 23.06.2026 — lex.uz/en/docs/-8283656 (2026-09-01 dan)', '2026-09-28',
   'Bazaviy hisoblash miqdori. Yiliga 1–2 marta oʻzgaradi — farmon chiqsa shu qator yangilanadi.'),

  -- ---------------------------------------------------------------- YATT roʻyxati
  ('yatt.boj.shaxsan_bhm', '1'::jsonb, 'BHM',
   'Soliq qoʻmitasi: gov.uz/oz/soliq/sections/view/50017 (2025-04-29); yuristpro.uz', '2026-09-28',
   '[TASDIQ] DXM da shaxsan ariza — 1 BHM. Sahifa eski BHM (375 000) bilan yozilgan; koeffitsient oʻzgarmagan deb olindi.'),
  ('yatt.boj.onlayn_bhm', '0.9'::jsonb, 'BHM',
   'Soliq qoʻmitasi 50017 (2025-04-29); unamoliya.uz (2026-05-18): "1 BHM − 10 %"', '2026-09-28',
   '[TASDIQ] Onlayn ariza — 0,9 BHM.'),
  ('yatt.royxat.url', '"https://new.birdarcha.uz/"'::jsonb, 'url',
   'new.birdarcha.uz (Yagona portal moduli, ONE ID); PQ-247 12.08.2025: 2025-11-01 dan masofaviy biometrik roʻyxat', '2026-09-28',
   'Onlayn roʻyxat manzili. DXM — muqobil.'),
  ('yatt.royxat.muddat_daqiqa', '30'::jsonb, 'daqiqa',
   'unamoliya.uz/articles/oyatt-ochish (2026-05-18) — ikkilamchi', '2026-09-28',
   'Hujjatlar toʻliq boʻlsa. Ikkilamchi manba.'),
  ('yatt.xodim_max', '5'::jsonb, 'nafar',
   'Soliq qoʻmitasi 50017 (2025-04-29)', '2026-09-28', null),

  -- ---------------------------------------------------------------- Soliq 2026
  ('soliq.aylanma_foiz', '1'::jsonb, '%',
   'PQ-247 12.08.2025 (lex.uz/docs/-7681520); OʻRQ-1108 25.12.2025 (buxgalter.uz text212712)', '2026-09-28',
   'YATT va oʻzini oʻzi band qilganlar, yillik aylanma 1 mlrd soʻmgacha, 2026-01-01 — 2030-12-31. Baza — xaridor toʻlagan toʻliq narx.'),
  ('soliq.aylanma_chegara_som', '1000000000'::jsonb, 'soʻm/yil',
   'PQ-247; Soliq kodeksi 385-modda', '2026-09-28',
   'Oshsa — QQS 12 % + foyda soligʻi, oshgan kundan.'),
  ('soliq.ijtimoiy_oy_bhm', '1'::jsonb, 'BHM/oy',
   'Soliq qoʻmitasi 50017 (2025-04-29); buxgalter.uz text200042; azma.uz 2026 "oʻzgarmadi"', '2026-09-28',
   '[TASDIQ] Daromad boʻlmasa ham har oy.'),
  ('soliq.tolov_kuni', '15'::jsonb, 'kun',
   'Soliq qoʻmitasi 50017', '2026-09-28', 'Oyning 15-sanasigacha.'),
  ('soliq.rejim_tugaydi', '"2030-12-31"'::jsonb, 'sana',
   'PQ-247, II-2', '2026-09-28', null),

  -- ---------------------------------------------------------------- Banklar
  ('bank.royxat', '[
     {"nom": "Kapitalbank (Uzum Business ilovasi)", "onlayn": true, "ochish_som": 0, "oylik_som": null,
      "izoh": "3 oy bepul, keyin paket (Start/Pro Business — narxi PDF, [TASDIQ]); aksiyada boshqa bankka 0,1 %. Uzum guruhi banki. Toshkent.",
      "manba": "gazeta.uz/oz/2026/02/27/kapitalbank; kapitalbank.uz press-reliz", "olchandi": "2026-09-28"},
     {"nom": "TBC Bank (TBC Biznes)", "onlayn": true, "ochish_som": 0, "oylik_som": 0,
      "izoh": "Basic — bepul, operatsiya boʻyicha toʻlov; Biznes — 170 000/oy; Pro — 600 000/oy. ERI kerak emas, daqiqalarda.",
      "manba": "tbcbank.uz/ru/business; tbcbank.uz blog", "olchandi": "2026-09-28"},
     {"nom": "Anorbank (Anor Business)", "onlayn": true, "ochish_som": 0, "oylik_som": 0,
      "izoh": "TEZ 2.0 — bepul, oʻtkazma 0,1 % (min 100); ZOʻR 2.0 — 300 000/oy; BIRGA 2.0 — 500 000/oy.",
      "manba": "anorbank.uz/uz/business/tariffs (16.06.2026)", "olchandi": "2026-09-28"},
     {"nom": "Hamkorbank", "onlayn": null, "ochish_som": 0, "oylik_som": 220000,
      "izoh": "ILK QADAM — 220 000/oy (aylanma 15 mln gacha); hujjat ofisda [TASDIQ]; naqd 1 %.",
      "manba": "hamkorbank.uz/uz/business/cash-management-services (02.06.2026)", "olchandi": "2026-09-28"}
   ]'::jsonb, 'roʻyxat',
   'docs/RASMIYLASHTIRISH-FAKTLAR.md, 4-boʻlim', '2026-09-28',
   'Har qator: nom, onlayn, ochish_som, oylik_som, izoh, manba, olchandi. Boshqa banklar oʻlchanmagan — qoʻshish mumkin.'),

  -- ---------------------------------------------------------------- Uzum kabineti
  ('uzum.kabinet.url', '"https://seller.uzum.uz/seller/signup"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz/4.start-working (4.1)', '2026-09-28', null),
  ('uzum.qollanma.url', '"https://seller.uzum.uz/manual/uz/4.start-working/"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz', '2026-09-28', 'Rasmiy qoʻllanma, 4-bob "Ishni boshlash".'),
  ('uzum.komissioner.stir', '"309376127"'::jsonb, 'STIR',
   'seller.uzum.uz/manual/uz/4.start-working (4.2); Uzum roʻyxat Google-hujjati', '2026-09-28',
   'my3.soliq.uz → "Yuridik shaxslarning komissionerlari roʻyxatini shakllantirish".'),
  ('uzum.komissioner.nom', '"«Uzum market» MCHJ XK"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/4.start-working (4.2)', '2026-09-28', null),
  ('uzum.komissioner.mfo', '"00974"'::jsonb, 'MFO',
   'seller.uzum.uz/manual/uz/4.start-working (4.2)', '2026-09-28', null),
  ('uzum.komissioner.hisob', '"20208000005504983001"'::jsonb, 'hisob',
   'seller.uzum.uz/manual/uz/4.start-working (4.2)', '2026-09-28', null),
  ('uzum.komissioner.muddat_yil', '5'::jsonb, 'yil',
   'seller.uzum.uz/manual/uz/4.start-working (4.2)', '2026-09-28', 'Shartnoma muddati boshlanish sanasidan kamida 5 yil; "ONKM" va "Marketplace" ikkalasi belgilanadi.'),
  ('uzum.faollashtirish_kun', '2'::jsonb, 'kun',
   'seller.uzum.uz/manual/uz/4.start-working (4.2)', '2026-09-28',
   'Faollashtiruvchilar 2 kun ichida tekshiradi; "vaziyatga qarab yarim yilgacha kechikishi mumkin".'),
  ('uzum.qollab_quvvatlash.url', '"https://t.me/umarket_business_bot"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz/4.start-working', '2026-09-28', 'Biznes-qoʻllab-quvvatlash boti.'),
  ('uzum.tolov.standart', '"2 haftada 1 marta, 0 %"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/3.tariffs (3.1.1)', '2026-09-28',
   'Har hafta — 1 %, har ish kuni — 1,5 %, oyiga 1 — 0 %. Pul 10 kundan oldin olingan tovarlar uchun.')
on conflict (kalit) do nothing;
