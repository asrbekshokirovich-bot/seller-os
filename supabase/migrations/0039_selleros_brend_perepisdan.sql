-- `brandSellersCount` bizning 6 000 lik NAMUNADAN sanalardi.
--
-- 1-tuzoq (yopiq brend) shu savolga tayanadi: "brendning butun
-- assortimentini nechta doʻkon sotadi?". Javob `selleros.product`
-- dan olinardi — u esa Uzumning hammasi emas, bizning kuzatuv
-- roʻyxatimiz: 6 025 tovar, 4 297 doʻkon.
--
-- Perepis esa toʻliq: 1 850 863 tovar, 85 866 doʻkon.
--
-- OʻLCHANDI (2026-08-26) — farq halokatli:
--
--   brend      namunadan   perepisdan
--   avon               8         401
--   pandora            3         275
--   just               1         158
--   sokolov            1          13
--   oodji              1           5
--   lamart             1           1
--
-- `maxBrandSellers` chegarasi 2. Yaʼni Avon (401 sotuvchi) va
-- Pandora (275) "yopiq brend" deb belgilanardi.
--
-- NEGA BU ENG QIMMAT XATO TURI. 1-tuzoq `block` beradi — tovar
-- tavsiyadan BUTUNLAY chiqariladi. Yaʼni foydalanuvchi eng ochiq,
-- eng koʻp sotuvchili brendlarni umuman koʻrmasdi va sababini
-- ham bilmasdi.
--
-- `eng_eski` (brend yoshi, `brandAgeDays` uchun) ham xuddi shu
-- kasallikka chalingan edi: brendning eng eski tovari bizning
-- namunamizda emas, butun Uzumda qidirilishi kerak.
--
-- NEGA KESH JADVALI. Hisob 1,85 mln qatorni kechib oʻtadi —
-- oʻlchandi, 31 soniya. Har soʻrovda emas, supurishdan keyin bir
-- marta hisoblanadi. Bu `so_yonalish_yangila` bilan bir xil naqsh
-- (u ham 34,9 s va keshga yozadi).
--
-- NEGA TOKEN BOʻYICHA JOIN, REGEX EMAS. 125 ta brendni 1,85 mln
-- sarlavhaga regex bilan solishtirish 125 ta toʻliq skanerlash
-- degani. Sarlavha bir marta soʻzlarga boʻlinadi va hash-join
-- qilinadi. Natija AYNAN bir xil: oʻlchandi — aniqlangan
-- brendlarning hammasi bir soʻzli, yaʼni soʻz chegarasi bilan
-- regex va token tengligi bitta narsa.
--
-- ============================================================
-- NATIJA — jonli oʻlchandi (2026-08-26)
-- ============================================================
--
--   closed_brand bayrogʻi:  37  →  6
--
-- Yaʼni 31 ta tovar NOTOʻGʻRI bloklanayotgan ekan. Qolgan
-- oltitasi haqiqatan yopiq — har biri butun perepisda 1—2 doʻkon:
--
--   modkids     1 doʻkon, 1 853 dona/oy
--   depilazer   2 doʻkon, 2 769 dona/oy
--   lamart, indenim, nusrat, waterdent
--
-- Yon foyda: `brend_topish` baʼzan brend emas, oddiy soʻzni
-- topadi (doʻkon nomi "Trimmer" boʻlsa). Perepis hisobi ularni
-- OʻZI himoya qiladi — "trimmer" ni 1 696 doʻkon sotadi, yaʼni
-- u hech qachon "yopiq" boʻlmaydi.

create table if not exists selleros.brend_qamrovi (
  brand      text primary key,
  -- Butun Uzumda shu brendni sotadigan doʻkonlar soni.
  dokonlar   int not null,
  -- Brendning eng kichik id li tovari — brend yoshi shundan.
  -- Uzum id larni ketma-ket beradi, yaʼni id soat vazifasini
  -- bajaradi (TUZOQLAR.md, 1-tuzoq).
  eng_eski   bigint,
  olchandi   timestamptz not null default now()
);

comment on table selleros.brend_qamrovi is
  'Brend → uni sotuvchi doʻkonlar soni. Manba PEREPIS (1,85 mln), namuna emas.';

-- Perepisdan qayta hisoblaydi. Supurishdan keyin chaqiriladi.
create or replace function public.so_brend_yangila()
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'public'
set statement_timeout to '300s'
as $$
declare
  n int := 0;
begin
  with brendlar as (
    select distinct coalesce(p.brand, selleros.brend_topish(p.title, s.name)) as brand
    from selleros.product p
    left join selleros.shop s on s.id = p.shop_id
    where p.platform = 'uzum'
  ),
  b as (select brand from brendlar where brand is not null),
  tokenlar as (
    -- Sarlavha bir marta soʻzlarga boʻlinadi.
    select c.shop_id, c.id, lower(w) as soz
    from zumsavdo.product c,
         lateral regexp_split_to_table(c.title, '[^[:alnum:]]+') w
    where w <> ''
  ),
  hisob as (
    select b.brand,
           count(distinct t.shop_id)::int as dokonlar,
           min(t.id) as eng_eski
    from b join tokenlar t on t.soz = b.brand
    group by b.brand
  ),
  yozildi as (
    insert into selleros.brend_qamrovi (brand, dokonlar, eng_eski, olchandi)
    select brand, dokonlar, eng_eski, now() from hisob
    on conflict (brand) do update
      set dokonlar = excluded.dokonlar,
          eng_eski = excluded.eng_eski,
          olchandi = now()
    returning 1
  )
  select count(*) into n from yozildi;

  return jsonb_build_object('brendlar', n);
end;
$$;

revoke all on function public.so_brend_yangila() from public, anon, authenticated;
grant execute on function public.so_brend_yangila() to service_role;

-- ------------------------------------------------------------
-- Ikkala isteʼmolchini keshga oʻtkazish
-- ------------------------------------------------------------
--
-- Funksiyalar 200 qatordan uzun. Ularni qoʻlda qayta yozish —
-- koʻchirish xatosi uchun ochiq eshik. `pg_get_functiondef` bilan
-- olinadi, faqat kerakli boʻlak almashtiriladi va qaytadan
-- bajariladi. Almashtirish topilmasa `raise exception` —
-- jimgina oʻtib ketmaydi.
do $migratsiya$
declare
  eski text;
  yangi text;
  matn text;
begin
  -- so_tovar_holati
  select pg_get_functiondef(p.oid) into matn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'so_tovar_holati';

  eski := 'brend_dokoni as (
    select t.brand, count(distinct p2.shop_id) as dokonlar, min(p2.external_id) as eng_eski
    from tovar t
    join selleros.product p2
      on p2.platform = p_platform
     and p2.title ~* (''(^|[^[:alnum:]])'' || t.brand || ''([^[:alnum:]]|$)'')
    where t.brand is not null
    group by t.brand
  ),';
  yangi := 'brend_dokoni as (
    -- Perepisdan hisoblangan kesh (`so_brend_yangila`). Ilgari bu
    -- yerda 6 000 lik namuna sanalardi va Avon (401 sotuvchi)
    -- "yopiq brend" boʻlib chiqardi.
    --
    -- `distinct` SHART. Eski CTE `group by t.brand` bilan tugardi,
    -- yaʼni brend boshiga BITTA qator berardi. Join da guruhlash
    -- yoʻq: usiz CTE tovar boshiga qator qaytaradi va u tovarlarga
    -- qaytib qoʻshilganda qatorlar koʻpayadi.
    --
    -- Bu jimgina xato EMAS edi, lekin sababi koʻrinmasdi:
    -- `so_tovar_holati(''uzum'', 50)` 68 qator qaytardi va
    -- `product_flags` ga yozish 409 (takror kalit) berdi. Yaʼni
    -- bayroqlar umuman yozilmay qoldi.
    select distinct t.brand, k.dokonlar, k.eng_eski
    from tovar t
    join selleros.brend_qamrovi k on k.brand = t.brand
    where t.brand is not null
  ),';
  if position(eski in matn) = 0 then
    raise exception 'so_tovar_holati: almashtiriladigan bolak topilmadi';
  end if;
  execute replace(matn, eski, yangi);

  -- so_tovar_royxati
  select pg_get_functiondef(p.oid) into matn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'so_tovar_royxati';

  eski := 'brend_dokoni as (
    select tv.brand, count(distinct p2.shop_id) as dokonlar,
           min(p2.external_id) as eng_eski
    from tovar tv
    join selleros.product p2
      on p2.platform = ''uzum''
     and p2.title ~* (''(^|[^[:alnum:]])'' || tv.brand || ''([^[:alnum:]]|$)'')
    where tv.brand is not null
    group by tv.brand
  ),';
  yangi := 'brend_dokoni as (
    -- Perepisdan hisoblangan kesh (`so_brend_yangila`).
    -- `distinct` SHART — `so_tovar_holati` dagi izohga qarang.
    select distinct tv.brand, k.dokonlar, k.eng_eski
    from tovar tv
    join selleros.brend_qamrovi k on k.brand = tv.brand
    where tv.brand is not null
  ),';
  if position(eski in matn) = 0 then
    raise exception 'so_tovar_royxati: almashtiriladigan bolak topilmadi';
  end if;
  execute replace(matn, eski, yangi);
end
$migratsiya$;
