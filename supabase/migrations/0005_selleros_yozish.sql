-- Seller OS · yig'uvchi uchun yozish uchi
--
-- Bitta atomik chaqiruv: lug'at (turkum, do'kon, mahsulot) va kunlik
-- o'lchov birga yoziladi. Sabab: partiya yarim yozilib qolmasin —
-- mahsulot bor, o'lchovi yo'q degan holat tahlilni buzadi.
--
-- Nega PostgREST RPC, to'g'ridan-to'g'ri ulanish emas: yig'uvchi ko'p
-- parallel ishlaydi va har biri o'z ulanishini ochsa Supabase ning
-- ulanish chegarasiga uriladi. RPC da ulanish pooler tomonida.

create or replace function public.so_ingest_batch(
  p_platform text,
  p_batch    jsonb
) returns jsonb
language plpgsql security definer
set search_path to 'selleros', 'public'
as $$
declare
  n_cat int := 0; n_shop int := 0; n_prod int := 0; n_daily int := 0;
  today date := (now() at time zone 'Asia/Tashkent')::date;
begin
  -- 1) Turkumlar. Nom o'zgargan bo'lsa yangilanadi: Uzumda nom istalgan
  -- kuni o'zgarishi mumkin, id esa o'zgarmaydi.
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
      set name_uz = coalesce(excluded.name_uz, selleros.category.name_uz),
          updated_at = now()
    returning 1
  )
  select count(*) into n_cat from yozildi;

  -- 2) Do'konlar. `official` — 1-tuzoq uchun majburiy maydon.
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

  -- 3) Mahsulotlar. `first_seen_at` FAQAT birinchi marta yoziladi —
  -- 8-tuzoq (hype) tovar yoshini shundan o'lchaydi va uni har sweepda
  -- yangilasak, hamma tovar abadiy "yangi" bo'lib qolardi.
  with kirish as (
    select distinct on ((x->>'external_id')::bigint)
      (x->>'external_id')::bigint as ext,
      x->>'title' as nomi,
      (x->>'shop_external_id')::bigint as shop_ext,
      (x->>'category_external_id')::bigint as cat_ext
    from jsonb_array_elements(p_batch) x
  ),
  yozildi as (
    insert into selleros.product (platform, external_id, title, shop_id, category_id, updated_at)
    select p_platform, k.ext, k.nomi, s.id, c.id, now()
    from kirish k
    left join selleros.shop s     on s.platform = p_platform and s.external_id = k.shop_ext
    left join selleros.category c on c.platform = p_platform and c.external_id = k.cat_ext
    on conflict (platform, external_id) do update
      set title = excluded.title,
          shop_id = coalesce(excluded.shop_id, selleros.product.shop_id),
          category_id = coalesce(excluded.category_id, selleros.product.category_id),
          updated_at = now()
    returning 1
  )
  select count(*) into n_prod from yozildi;

  -- 4) Kunlik o'lchov.
  --
  -- Bir kunda bir necha sweep bo'lsa OXIRGISI qoladi va `sweeps` oshadi.
  -- O'rtacha olinmaydi: kun yakunidagi qoldiq kerak, kun o'rtachasi emas.
  --
  -- `observed_at` yoziladi, chunki sana kunni bildiradi, o'lchov vaqtini
  -- emas. "19.08" turgani bilan raqam 03:06 da olingan bo'lishi mumkin.
  with kirish as (
    select distinct on ((x->>'external_id')::bigint)
      (x->>'external_id')::bigint as ext,
      (x->>'price')::bigint as narx,
      (x->>'stock')::int as qoldiq,
      (x->>'reviews')::int as sharh,
      (x->>'rating')::numeric as baho,
      (x->>'buyers_per_week')::int as xaridor,
      coalesce((x->>'observed_at')::timestamptz, now()) as vaqt
    from jsonb_array_elements(p_batch) x
    order by (x->>'external_id')::bigint, (x->>'observed_at')::timestamptz desc nulls last
  ),
  yozildi as (
    insert into selleros.product_daily
      (product_id, date, price, stock, reviews, rating, sellers_count, observed_at, sweeps)
    select pr.id, today, k.narx, k.qoldiq, k.sharh, k.baho, null, k.vaqt, 1
    from kirish k
    join selleros.product pr on pr.platform = p_platform and pr.external_id = k.ext
    on conflict (product_id, date) do update
      set price = excluded.price,
          stock = excluded.stock,
          reviews = excluded.reviews,
          rating = excluded.rating,
          observed_at = excluded.observed_at,
          sweeps = selleros.product_daily.sweeps + 1
    returning 1
  )
  select count(*) into n_daily from yozildi;

  return jsonb_build_object(
    'categories', n_cat, 'shops', n_shop, 'products', n_prod, 'daily', n_daily
  );
end;
$$;

-- Faqat yig'uvchi yozadi. Anon hech qachon.
revoke all on function public.so_ingest_batch(text, jsonb) from public, anon, authenticated;
grant execute on function public.so_ingest_batch(text, jsonb) to service_role;

notify pgrst, 'reload schema';
