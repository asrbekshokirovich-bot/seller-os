-- Ogʻirlik nihoyat bazaga yoziladi.
--
-- `selleros.product.weight_g` ustuni 0001-migratsiyadan beri bor va
-- 7-tuzoq (ogʻir tovar) uchun moʻljallangan. Bugungacha u BOʻSH edi:
-- 6 025 tovardan bittasida ham qiymat yoʻq.
--
-- Yoʻl uch joyda uzilgan edi:
--   uzum.py           `skuList { weight }` ni soʻraydi va ajratadi  ✓
--   sweep.py          `Kuzatuv.weight_g` ni partiyaga QOʻSHMASDI    ✗
--   so_ingest_batch   maydonni OʻQIMASDI                            ✗
--
-- Yaʼni maʼlumot yigʻilardi va har safar tashlab yuborilardi. Kod
-- yozilgan, ustun bor, hujjatda tuzoq taʼriflangan — va filtr hech
-- qachon ishlay olmasdi (QOIDALAR.md, 8-boʻlim).
--
-- Funksiya 0007 dagi asl matndan olindi va faqat ikkita joyi
-- oʻzgardi. Qayta yozilmadi: bir marta shunday qilib koʻrdim va
-- doʻkon nomi bilan kunlik yozuv mantigʻi bilmasdan oʻzgarib ketdi.

create or replace function public.so_ingest_batch(
  p_platform text,
  p_batch    jsonb
) returns jsonb
language plpgsql security definer
set search_path to 'selleros', 'public'
as $$
declare
  n_cat int := 0; n_shop int := 0; n_prod int := 0; n_daily int := 0; n_obs int := 0;
  today date := (now() at time zone 'Asia/Tashkent')::date;
begin
  with kirish as (
    select distinct
      (x->>'category_external_id')::bigint as ext,
      x->>'category_name' as nomi
    from jsonb_array_elements(p_batch) x
    where x->>'category_external_id' is not null
  ),
  yozildi as (
    insert into selleros.category (platform, external_id, name_uz, updated_at)
    select p_platform, ext, nomi, now() from kirish
    on conflict (platform, external_id) do update
      set name_uz = coalesce(excluded.name_uz, selleros.category.name_uz), updated_at = now()
    returning 1
  )
  select count(*) into n_cat from yozildi;

  with kirish as (
    select distinct on ((x->>'shop_external_id')::bigint)
      (x->>'shop_external_id')::bigint as ext,
      x->>'shop_name' as nomi,
      (x->>'shop_official')::boolean as rasmiy
    from jsonb_array_elements(p_batch) x
    where x->>'shop_external_id' is not null
  ),
  yozildi as (
    insert into selleros.shop (platform, external_id, name, official, updated_at)
    select p_platform, ext, coalesce(nomi, 'Sotuvchi ' || ext), coalesce(rasmiy, false), now()
    from kirish
    on conflict (platform, external_id) do update
      set name = excluded.name, official = excluded.official, updated_at = now()
    returning 1
  )
  select count(*) into n_shop from yozildi;

  with kirish as (
    select distinct on ((x->>'external_id')::bigint)
      (x->>'external_id')::bigint as ext,
      x->>'title' as nomi,
      (x->>'shop_external_id')::bigint as shop_ext,
      (x->>'category_external_id')::bigint as cat_ext,
      (x->>'weight_g')::int as ogirlik
    from jsonb_array_elements(p_batch) x
  ),
  yozildi as (
    insert into selleros.product
      (platform, external_id, title, shop_id, category_id, weight_g, updated_at)
    select p_platform, k.ext, k.nomi, s.id, c.id, k.ogirlik, now()
    from kirish k
    left join selleros.shop s     on s.platform = p_platform and s.external_id = k.shop_ext
    left join selleros.category c on c.platform = p_platform and c.external_id = k.cat_ext
    on conflict (platform, external_id) do update
      set title = excluded.title,
          shop_id = coalesce(excluded.shop_id, selleros.product.shop_id),
          category_id = coalesce(excluded.category_id, selleros.product.category_id),
          -- Yengil soʻrovdagi `null` oʻlchangan ogʻirlikni OʻCHIRMASIN.
          -- Ogʻirlik faqat `--stok` bilan keladi.
          weight_g = coalesce(excluded.weight_g, selleros.product.weight_g),
          updated_at = now()
    returning 1
  )
  select count(*) into n_prod from yozildi;

  -- Xom o'lchov. CHANGE-ONLY: oldingi o'lchov bilan bir xil bo'lsa
  -- yozilmaydi. Aks holda kuniga uch marta yig'sak, o'zgarmagan
  -- mahsulot yiliga 1000 ta bir xil qator qoldirardi. Zumsavdoda
  -- o'lchandi: yillik hajm 460 GB o'rniga 14 GB.
  with kirish as (
    select distinct on ((x->>'external_id')::bigint, (x->>'observed_at')::timestamptz)
      (x->>'external_id')::bigint as ext,
      coalesce((x->>'observed_at')::timestamptz, now()) as vaqt,
      (x->>'price')::bigint as narx,
      (x->>'stock')::int as qoldiq,
      (x->>'reviews')::int as sharh,
      (x->>'rating')::numeric as baho,
      (x->>'buyers_per_week')::int as xaridor
    from jsonb_array_elements(p_batch) x
  ),
  bilan_id as (
    select pr.id as product_id, k.*
    from kirish k
    join selleros.product pr on pr.platform = p_platform and pr.external_id = k.ext
  ),
  oxirgi as (
    select b.*, o.price as e_narx, o.stock as e_qoldiq, o.reviews as e_sharh
    from bilan_id b
    left join lateral (
      select price, stock, reviews from selleros.product_observation po
      where po.product_id = b.product_id order by po.observed_at desc limit 1
    ) o on true
  ),
  yozildi as (
    insert into selleros.product_observation
      (product_id, observed_at, price, stock, reviews, rating, buyers_per_week)
    select product_id, vaqt, narx, qoldiq, sharh, baho, xaridor
    from oxirgi
    where e_narx is distinct from narx
       or e_qoldiq is distinct from qoldiq
       or e_sharh is distinct from sharh
    on conflict (product_id, observed_at) do nothing
    returning 1
  )
  select count(*) into n_obs from yozildi;

  with kirish as (
    select distinct on ((x->>'external_id')::bigint)
      (x->>'external_id')::bigint as ext,
      (x->>'price')::bigint as narx,
      (x->>'stock')::int as qoldiq,
      (x->>'reviews')::int as sharh,
      (x->>'rating')::numeric as baho,
      coalesce((x->>'observed_at')::timestamptz, now()) as vaqt
    from jsonb_array_elements(p_batch) x
    order by (x->>'external_id')::bigint, (x->>'observed_at')::timestamptz desc nulls last
  ),
  yozildi as (
    insert into selleros.product_daily
      (product_id, date, price, stock, reviews, rating, observed_at, sweeps)
    select pr.id, today, k.narx, k.qoldiq, k.sharh, k.baho, k.vaqt, 1
    from kirish k
    join selleros.product pr on pr.platform = p_platform and pr.external_id = k.ext
    on conflict (product_id, date) do update
      set price = excluded.price, stock = excluded.stock, reviews = excluded.reviews,
          rating = excluded.rating, observed_at = excluded.observed_at,
          sweeps = selleros.product_daily.sweeps + 1
    returning 1
  )
  select count(*) into n_daily from yozildi;

  return jsonb_build_object(
    'categories', n_cat, 'shops', n_shop, 'products', n_prod,
    'daily', n_daily, 'observations', n_obs
  );
end;
$$;

revoke all on function public.so_ingest_batch(text, jsonb) from public, anon, authenticated;
