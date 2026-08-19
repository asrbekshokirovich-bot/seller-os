-- Xom o'lchov jadvali va sotuv baholash.
--
-- NEGA KERAK: sotuv qoldiq kamayishidan hisoblanadi. `product_daily`
-- faqat kun oxirini saqlaydi, shuning uchun kun ichidagi to'ldirish
-- sotuvni yashiradi:
--
--   ertalab 100 -> kunduzi 20 -> kechqurun 100
--   kunlik farq = 0, aslida esa 80 dona sotilgan
--
-- Shuning uchun har o'lchov alohida yoziladi va sotuv ketma-ket
-- o'lchovlar orasidagi KAMAYISHLAR YIG'INDISIdan chiqadi.

create table selleros.product_observation (
  id              bigserial primary key,
  product_id      bigint not null references selleros.product(id),
  observed_at     timestamptz not null,
  price           bigint,
  stock           integer,
  reviews         integer,
  rating          numeric(3,2),
  buyers_per_week integer,
  unique (product_id, observed_at)
);

create index product_observation_pd_idx on selleros.product_observation (product_id, observed_at);
create index product_observation_at_idx on selleros.product_observation (observed_at);

/**
 * Kunlik sotuv baholash — v1.
 *
 * Usul: kun ichidagi ketma-ket o'lchovlar orasidagi qoldiq
 * kamayishlari qo'shiladi. O'sishlar alohida yig'iladi va sotuvdan
 * AYIRILMAYDI: keltirilgan tovarni ayirsak, ko'p to'ldiriladigan tovar
 * "sotilmayapti" bo'lib ko'rinardi.
 *
 * Natija TAXMINIY va shunday deb belgilanadi (`certainty = 'approx'`).
 * Ikki o'lchov orasida tovar tugab, qayta to'lib ulgursa, o'sha
 * sotuvning bir qismi ko'rinmay qoladi.
 */
create or replace function public.so_rollup_sales(p_from date, p_to date)
returns jsonb
language plpgsql security definer
set search_path to 'selleros', 'public'
as $$
declare
  n int := 0;
begin
  with qadamlar as (
    select
      o.product_id,
      (o.observed_at at time zone 'Asia/Tashkent')::date as kun,
      o.stock,
      o.price,
      lag(o.stock) over (
        partition by o.product_id, (o.observed_at at time zone 'Asia/Tashkent')::date
        order by o.observed_at
      ) as oldingi_stock
    from selleros.product_observation o
    where (o.observed_at at time zone 'Asia/Tashkent')::date between p_from and p_to
  ),
  yigindi as (
    select product_id, kun,
           -- Faqat kamayishlar. `greatest(...,0)` o'sishni nolga aylantiradi.
           sum(greatest(coalesce(oldingi_stock, stock) - stock, 0))::int as sotilgan,
           sum(greatest(stock - coalesce(oldingi_stock, stock), 0))::int as keltirilgan,
           max(price) as narx
    from qadamlar
    where stock is not null
    group by product_id, kun
  ),
  yozildi as (
    insert into selleros.sales_estimates
      (product_id, date, sold_units, restocked_units, revenue_uzs, certainty, method)
    select product_id, kun, sotilgan, keltirilgan,
           case when narx is not null then sotilgan::bigint * narx end,
           'approx', 'stock_diff_v1'
    from yigindi
    on conflict (product_id, date) do update
      set sold_units = excluded.sold_units,
          restocked_units = excluded.restocked_units,
          revenue_uzs = excluded.revenue_uzs,
          certainty = excluded.certainty,
          method = excluded.method
    returning 1
  )
  select count(*) into n from yozildi;

  return jsonb_build_object('kunlar', p_to - p_from + 1, 'yozildi', n);
end;
$$;

revoke all on function public.so_rollup_sales(date, date) from public, anon, authenticated;
grant execute on function public.so_rollup_sales(date, date) to service_role;

notify pgrst, 'reload schema';
