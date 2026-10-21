-- 3-qadam katalogi va yoʻnalish rasmlari — 11 s → 0,3 s (2026-10-21).
--
-- NIMA BOʻLDI. 0068 `so_tovar_royxati` ning `tovar` qismiga faol namunani
-- (`tracked_product`) qoʻshdi. Toʻgʻri shart, lekin Postgres endi `tovar` ni
-- "1 qator" deb baholaydi (aslida 20). Shu baho bilan u ikki ogʻir hisobni —
-- `tovar_sotuvi` koʻrinishi (30 kunlik hamma sotuv, ~0,26 s) va `yangi_sotuv`
-- (~0,29 s) — har tovar uchun QAYTA bajaradigan reja tanladi (Nested Loop,
-- loops=20): bitta chaqiruv 11 s. `/turkum-rasmlari` (yoʻnalish kartalari)
-- 11–45 s ochildi, 2026-10-21 09:00 da 30 s chegaradan oshib 503 berdi;
-- `/tovarlar` (3-qadam) ham shu funksiyada.
--
-- TUZATISH — natija oʻzgarmaydi, faqat hisob BIR MARTA:
--   1. `sotuv` (materialized) — `tovar_sotuvi` faqat shu turkum tovarlari uchun;
--      roʻyxat ham, mediana ham undan oʻqiydi.
--   2. `yangi_sotuv` (materialized) — faqat shu turkum tovarlari.
-- Oʻlchandi (turkum 11770, 20 tovar): 11 362 ms → 279 ms (0068 dan oldin 663 ms).
-- Natija oʻzgarmagani tekshirildi: 4 turkum, md5(jsonb) oldin = keyin.
--
-- 0068 dagidek jonli tarifga yamoq: fayllardagi tarif jonlisidan farq qiladi
-- (0036 dagi `komissiya` va keyingilari). Har boʻlak AYNAN bir marta
-- topilishi shart — aks holda xato va hech narsa oʻzgarmaydi.

do $$
declare
  matn text;
  juftlar text[] := array[
    -- 1) yangi_sotuv bir marta hisoblansin
    '  yangi_sotuv as (
',
    '  yangi_sotuv as materialized (
',
    -- 2) …va faqat shu turkum tovarlari uchun
    '    where e.date > bugun.d - 30 and e.sold_units is not null
    group by e.product_id
',
    '    where e.date > bugun.d - 30 and e.sold_units is not null
      -- 0070: faqat shu turkum tovarlari (oldin — 30 kunlik HAMMA sotuv).
      and e.product_id in (select id from tovar)
    group by e.product_id
',
    -- 3) tovar_sotuvi bir marta, faqat shu turkum; mediana undan
    '  mediana as (
    select percentile_cont(0.5) within group (order by s.sold_30d)::int as med
    from tovar tv join selleros.tovar_sotuvi s on s.product_id = tv.id
',
    '  sotuv as materialized (
    -- 0070: `tovar_sotuvi` koʻrinishi BIR MARTA, faqat shu turkum tovarlari
    -- uchun. Oldin roʻyxat va mediana uni alohida chaqirardi va reja uni har
    -- tovar uchun qayta hisoblardi (loops=20, 11 s).
    select s.* from selleros.tovar_sotuvi s
    where s.product_id in (select id from tovar)
  ),
  mediana as (
    select percentile_cont(0.5) within group (order by s.sold_30d)::int as med
    from sotuv s
',
    -- 4) roʻyxat ham shundan oʻqisin
    '      left join selleros.tovar_sotuvi s on s.product_id = tv.id
',
    '      left join sotuv s on s.product_id = tv.id
'
  ];
  i int;
  soni int;
begin
  select pg_get_functiondef('public.so_tovar_royxati(bigint,integer)'::regprocedure) into matn;
  if position('sotuv as materialized' in matn) > 0 then
    raise notice 'so_tovar_royxati: 0070 allaqachon qoʻllangan — oʻtkazildi';
    return;
  end if;
  for i in 1 .. array_length(juftlar, 1) by 2 loop
    soni := (length(matn) - length(replace(matn, juftlar[i], ''))) / length(juftlar[i]);
    if soni <> 1 then
      raise exception 'so_tovar_royxati: % -boʻlak % marta topildi (aynan 1 boʻlishi kerak)', (i + 1) / 2, soni;
    end if;
    matn := replace(matn, juftlar[i], juftlar[i + 1]);
  end loop;
  execute matn;
end $$;
