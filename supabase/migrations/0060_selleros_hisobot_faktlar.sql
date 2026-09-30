-- 11-qadam (Sotuv boshlandi) va 12-qadam (Hisobot) faktlari: soliq hisoboti
-- kim va qachon topshiradi, Uzum komissioner hisoboti muddati, soliq portali.
-- Agent oʻlchadi 2026-09-30. Manba sifati izohda: rasmiy / ikkilamchi,
-- `[TASDIQ]` — nazoratchi tekshiradi. Qoida oʻzgarsa — shu qatorlar
-- tuzatiladi, kod oʻzgarmaydi. `on conflict do nothing`: nazoratchi
-- tuzatgani saqlanadi.
--
-- DIQQAT: jsonb literallarida ASCII apostrof YOʻQ — faqat ʻ (U+02BB).
-- `supabase/test/migratsiya-jsonb.test.ts` buni tekshiradi.

insert into selleros.fakt (kalit, qiymat, birlik, manba, olchandi, izoh) values
  ('soliq.agent', '"Toʻlov tashkiloti yoki raqamli platforma orqali tushgan (yiliga 1 mlrd soʻmgacha) daromad boʻyicha aylanma soligʻini toʻlash, hisobotni toʻgʻri shakllantirish va oʻz vaqtida topshirish javobgarligi soliq agenti — toʻlov tashkilotiga yuklatilgan"'::jsonb, 'matn',
   'OʻRQ-1108 (25.12.2025), Soliq kodeksi 461-modda; buxgalter.uz text212712, text212722 (2025-12-29)', '2026-09-30',
   '[TASDIQ] Uzum sotuvchisi uchun soliq agenti kim (Uzum yoki toʻlov tashkiloti) va aylanma soligʻi ushlab qolinadimi — komissioner hisobotida koʻrinadi.'),
  ('soliq.aylanma.hisobot_davri', '"chorak"'::jsonb, 'matn',
   'azma.uz — YATT hisobotlari 2026 (ikkilamchi)', '2026-09-30',
   '[TASDIQ] Oʻzi topshiradigan holatda. Baʼzi manbalarda oylik deyilgan; rasmiy matn topilmadi.'),
  ('soliq.aylanma.hisobot_kun', '15'::jsonb, 'kun',
   'azma.uz — YATT hisobotlari 2026 (ikkilamchi)', '2026-09-30',
   '[TASDIQ] Davrdan keyingi oyning shu sanasigacha.'),
  ('soliq.portal.url', '"https://my3.soliq.uz"'::jsonb, 'url',
   'soliq.uz — interaktiv xizmatlar; docs/RASMIYLASHTIRISH-FAKTLAR.md 5-boʻlim', '2026-09-30',
   'YATT hisobotlari va toʻlovlari; kirish uchun E-imzo (ERI) moduli kerak.'),
  ('uzum.hisobot.komissioner_kun', '19'::jsonb, 'kun',
   'seller.uzum.uz/manual/uz (3.3)', '2026-09-28',
   'Komissioner hisoboti — soliq hisobotining asos hujjati; hisob-faktura va dalolatnoma oyning shu sanasigacha; nol hisobot yoʻq.')
on conflict (kalit) do nothing;
