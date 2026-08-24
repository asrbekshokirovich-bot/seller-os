-- Kuzatuv roʻyxatini toʻldirish va oʻqish.
--
-- Tanlov mantigʻi: eng katta 300 turkum, har biridan 20 ta tovar.
-- Har turkum ichida talab oraligʻi 20 boʻlakka boʻlinadi va HAR
-- BOʻLAKDAN bittadan olinadi. Yaʼni namuna turkumning butun talab
-- oraligʻini qamraydi.
--
-- Oʻlchab tasdiqlangan (2026-08-24), boʻlaklar boʻyicha oʻrtacha
-- xaridor/hafta:
--   1-boʻlak  2 269
--   5-boʻlak     16
--   10-boʻlak     5
--   20-boʻlak     1
-- "Eng koʻp sotiladigan 6 000" ni olganimizda hammasi 1-boʻlakka
-- oʻxshardi va turkum medianasi bir necha barobar shishardi.

create or replace function selleros.kuzatuv_yangilash(
  p_turkum int default 300,
  p_har_turkumdan int default 20
) returns jsonb
language plpgsql
security definer
set search_path = selleros, zumsavdo, public
as $$
declare
  qoshildi int;
  turkumlar int;
begin
  -- Perepis boʻylab yuriladi — bu 8 soniyalik standart byudjetga
  -- sigʻmaydi. Funksiya kamdan-kam ishlaydi, uzunroq byudjet xavfsiz.
  set local statement_timeout = '300s';

  with talab as (
    -- `max` olinadi: perepis ikki oʻtishda yurgan va ikkalasida ham
    -- qiymat boʻlishi mumkin.
    select pc.product_id, max(pc.buyers_per_week) as buyers
    from zumsavdo.product_census pc
    where pc.buyers_per_week is not null
    group by pc.product_id
  ),
  tovar as (
    select p.id, p.category_id, t.buyers
    from zumsavdo.product p
    join talab t on t.product_id = p.id
    where p.category_id is not null
  ),
  eng_katta as (
    -- Turkumlar tovar soni boʻyicha saralanadi, talab boʻyicha emas:
    -- katta turkumda mediana maʼnoli, kichigida esa 20 ta tovar
    -- turkumning oʻzidan koʻp boʻlib qolishi mumkin.
    select category_id
    from tovar
    group by category_id
    having count(*) >= p_har_turkumdan
    order by count(*) desc
    limit p_turkum
  ),
  bolindi as (
    select tv.id, tv.category_id, tv.buyers,
           ntile(p_har_turkumdan) over (
             partition by tv.category_id order by tv.buyers desc, tv.id
           ) as bolak
    from tovar tv
    join eng_katta k on k.category_id = tv.category_id
  ),
  tanlangan as (
    select distinct on (category_id, bolak) id, category_id, buyers, bolak
    from bolindi
    order by category_id, bolak, buyers desc, id
  ),
  yozildi as (
    insert into selleros.tracked_product
      (external_id, category_external_id, buyers_per_week_at_pick, demand_bucket)
    select id, category_id, buyers, bolak from tanlangan
    on conflict (external_id) do update
      set active = true,
          category_external_id = excluded.category_external_id,
          demand_bucket = excluded.demand_bucket
    returning 1
  )
  select count(*) into qoshildi from yozildi;

  select count(distinct category_external_id) into turkumlar
  from selleros.tracked_product where active;

  return jsonb_build_object(
    'yozildi', qoshildi,
    'jami_faol', (select count(*) from selleros.tracked_product where active),
    'turkumlar', turkumlar
  );
end $$;

revoke all on function selleros.kuzatuv_yangilash(int, int) from public, anon, authenticated;

-- Skreyper oʻqiydigan roʻyxat.
--
-- Qator emas, BITTA jsonb massiv qaytaradi — ataylab. PostgREST qator
-- qaytaradigan soʻrovni 1000 tada kesadi va **xato bermaydi**. Aynan
-- shu 2026-08-23 da zumsavdo sweepini jimgina 2% ga tushirgan edi:
-- bazada 50 075 ta tovar turgan, sweep har safar 1000 tasini olib
-- "hammasini oʻlchadim" deb tugagan. Bitta skalyar qiymatga bu
-- chegara tegmaydi, yaʼni sahifalashni unutish ham mumkin emas.
create or replace function public.so_select_tracked(p_limit int default null)
returns jsonb
language sql
security definer
set search_path = selleros, public
as $$
  select coalesce(jsonb_agg(external_id order by external_id), '[]'::jsonb)
  from (
    select external_id from selleros.tracked_product
    where active
    order by external_id
    limit p_limit
  ) x
$$;

revoke all on function public.so_select_tracked(int) from public, anon, authenticated;
