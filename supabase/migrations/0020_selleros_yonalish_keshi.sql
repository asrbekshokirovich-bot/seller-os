-- 2-qadam nomzodlari oldindan hisoblanadi.
--
-- NEGA. Jonli oʻlchov (2026-08-24, staging): `/yonalishlar` javobi
-- **25.2 soniya**. Sabab — `so_yonalish_nomzodlari()` har chaqiruvda
-- butun perepis kesimini qaytadan hisoblardi: 300 turkumdagi har
-- tovarning oxirgi oʻlchovi, doʻkonlar boʻyicha yigʻindi, top-3.
--
-- Real vaqtda hisoblashning maʼnosi yoʻq: perepis kuniga 4 marta
-- yangilanadi, yaʼni javob kun davomida deyarli oʻzgarmaydi.
--
-- Endi ikkiga boʻlinadi:
--   `so_yonalish_yangila()`     — ogʻir hisob, jadval boʻyicha ishlaydi
--   `so_yonalish_nomzodlari()`  — tayyor qatorni oʻqiydi
--
-- ESKIRISH KOʻRINIB TURADI. Funksiya endi massiv emas, OBYEKT
-- qaytaradi: `{hisoblandi, yoshi_soat, royxat}`. Kesh eskirsa yoki
-- boʻsh boʻlsa buni foydalanuvchi bilishi kerak — boʻsh roʻyxatni
-- jimgina qaytarish "sizga mos yoʻnalish yoʻq" degan DAʼVO boʻlardi,
-- holbuki javob "hali hisoblanmadi" (QOIDALAR.md, 4-qoida).

create table if not exists selleros.yonalish_nomzodi (
  category_id   bigint primary key,
  name          text,
  talab_olchovi bigint,
  sotuvchi_soni integer,
  top3_ulush    integer,
  hisoblandi    timestamptz not null default now()
);

comment on table selleros.yonalish_nomzodi is
  '2-qadam uchun oldindan hisoblangan turkum raqamlari. Manba: '
  'zumsavdo perepisi. `so_yonalish_yangila()` toʻldiradi.';

-- Ogʻir hisob. Faqat jadval boʻyicha chaqiriladi.
--
-- Vaqt byudjeti alohida: PostgREST `authenticator` roli bilan
-- ulanadi va uning `statement_timeout` i 8 s — service_role ham
-- shuni meros oladi. Qoʻlda sinov `postgres` roli bilan ketadi va
-- bu xatoni KOʻRSATMAYDI.
create or replace function public.so_yonalish_yangila()
returns jsonb
language plpgsql
security definer
set search_path = selleros, zumsavdo, public
set statement_timeout = '300s'
as $$
declare
  n integer;
begin
  with kuzatilgan as (
    select distinct category_external_id as cid
    from selleros.tracked_product where active and category_external_id is not null
  ),
  oxirgi as (
    select distinct on (pc.product_id) pc.product_id, pc.reviews, pc.buyers_per_week
    from zumsavdo.product_census pc
    join zumsavdo.product p on p.id = pc.product_id
    join kuzatilgan k on k.cid = p.category_id
    order by pc.product_id, pc.observed_at desc
  ),
  dokon as (
    select p.category_id, p.shop_id, sum(o.reviews) as sharh
    from zumsavdo.product p
    join oxirgi o on o.product_id = p.id
    where p.shop_id is not null
    group by p.category_id, p.shop_id
  ),
  jami as (
    select category_id, count(*) as sotuvchi, sum(sharh) as sharh_jami
    from dokon group by category_id
  ),
  top3 as (
    select category_id, sum(sharh) as t3 from (
      select category_id, sharh,
             row_number() over (partition by category_id order by sharh desc) as orin
      from dokon) x
    where orin <= 3 group by category_id
  ),
  talab as (
    select p.category_id, sum(o.buyers_per_week) as olchov
    from zumsavdo.product p join oxirgi o on o.product_id = p.id
    group by p.category_id
  ),
  yangi as (
    select c.id as category_id, c.name,
           t.olchov as talab_olchovi,
           j.sotuvchi::int as sotuvchi_soni,
           round(100.0 * k.t3 / nullif(j.sharh_jami, 0))::int as top3_ulush
    from kuzatilgan ku
    join zumsavdo.category c on c.id = ku.cid
    left join jami j  on j.category_id = c.id
    left join top3 k  on k.category_id = c.id
    left join talab t on t.category_id = c.id
  ),
  yozildi as (
    insert into selleros.yonalish_nomzodi
          (category_id, name, talab_olchovi, sotuvchi_soni, top3_ulush, hisoblandi)
    select category_id, name, talab_olchovi, sotuvchi_soni, top3_ulush, now()
    from yangi
    on conflict (category_id) do update
       set name          = excluded.name,
           talab_olchovi = excluded.talab_olchovi,
           sotuvchi_soni = excluded.sotuvchi_soni,
           top3_ulush    = excluded.top3_ulush,
           hisoblandi    = excluded.hisoblandi
    returning 1
  )
  select count(*) into n from yozildi;

  -- Kuzatuvdan chiqarilgan turkum keshda qolib ketmasin: u
  -- yangilanmaydi, yaʼni eskirgan raqam bilan tavsiyaga chiqaverardi.
  delete from selleros.yonalish_nomzodi
  where category_id not in (
    select distinct category_external_id from selleros.tracked_product
    where active and category_external_id is not null
  );

  return jsonb_build_object('yozildi', n, 'hisoblandi', now());
end;
$$;

-- Yengil oʻqish. Uch shuni chaqiradi.
create or replace function public.so_yonalish_nomzodlari()
returns jsonb
language sql
security definer
set search_path = selleros, zumsavdo, public
set statement_timeout = '20s'
as $$
  select jsonb_build_object(
    'hisoblandi', (select max(hisoblandi) from selleros.yonalish_nomzodi),
    'yoshi_soat', (
      select round(extract(epoch from (now() - max(hisoblandi))) / 3600.0, 1)
      from selleros.yonalish_nomzodi
    ),
    'royxat', coalesce((
      select jsonb_agg(jsonb_build_object(
        'categoryId',       y.category_id,
        'name',             y.name,
        'talabOlchovi',     y.talab_olchovi,
        'sotuvchiSoni',     y.sotuvchi_soni,
        'top3Ulush',        y.top3_ulush,
        'optimalKirishSom', cr.optimal_entry_uzs,
        'talablar', jsonb_build_object(
          'markirovka', cr.marking_required,
          'sertifikat', cr.certificate_required,
          'haftalar',   cr.entry_weeks
        ),
        'mavsumiylik',      cr.seasonality
      ) order by y.category_id)
      from selleros.yonalish_nomzodi y
      left join selleros.category sc
        on sc.platform = 'uzum' and sc.external_id = y.category_id
      left join selleros.category_requirements cr on cr.category_id = sc.id
    ), '[]'::jsonb)
  )
$$;

-- Brauzer bazaga toʻgʻridan-toʻgʻri tegmaydi (reja, 5-boʻlim).
revoke all on selleros.yonalish_nomzodi from public, anon, authenticated;
revoke all on function public.so_yonalish_yangila() from public, anon, authenticated;
revoke all on function public.so_yonalish_nomzodlari() from public, anon, authenticated;
