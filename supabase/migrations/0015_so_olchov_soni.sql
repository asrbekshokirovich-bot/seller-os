-- Bugun nechta oʻlchov yozilgani.
--
-- Jadval boʻyicha ishlaydigan ish shundan "haqiqatan oʻlchadimmi" deb
-- soʻraydi. Xatosiz tugab nol qator yozgan yugurish yashil boʻlib
-- koʻrinmasligi kerak (QOIDALAR.md §8).
--
-- Nega jadvalga toʻgʻridan-toʻgʻri emas: `selleros` sxemasi PostgREST
-- da ochiq boʻlmasligi mumkin va u holda tekshiruv 404 olib, xatoni
-- "oʻlchov yoʻq" deb koʻrsatardi — yaʼni notoʻgʻri sababni aytardi.
-- `public` esa har doim ochiq.
create or replace function public.so_olchov_soni(p_kun date default null)
returns jsonb
language sql
security definer
set search_path = selleros, public
as $$
  select jsonb_build_object(
    'kun', coalesce(p_kun, (now() at time zone 'Asia/Tashkent')::date),
    'olchov', count(*),
    'tovar', count(distinct product_id),
    'qoldiq_olchangan', count(*) filter (where stock is not null)
  )
  from selleros.product_observation
  where (observed_at at time zone 'Asia/Tashkent')::date
        = coalesce(p_kun, (now() at time zone 'Asia/Tashkent')::date)
$$;

revoke all on function public.so_olchov_soni(date) from public, anon, authenticated;
