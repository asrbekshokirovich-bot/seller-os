-- B1: sotuv baholash v1 — qoldiq farqidan.
--
-- Reja shuni talab qiladi: "Sotuv baholash v1 (stok farqi + restok
-- qoidasi) — har yangi kunlik nuqta bilan aniqlashadi".
--
-- B1 tekshiruvi bu bandning YOʻQligini ochdi: `sales_estimates` boʻsh
-- edi va qoldiq umuman yigʻilmasdi. Sotuv vaqtincha
-- `buyers_per_week * 4.3` bilan taxmin qilinardi — bu rejadagi usul
-- emas va ancha qoʻpol.
--
-- QOIDA (zumsavdo da isbotlangan, shu yerga koʻchirildi):
--   sotilgan    = qoldiq KAMAYISHLARI yigʻindisi
--   keltirilgan = qoldiq OʻSISHLARI yigʻindisi
--
-- Ikkalasi ALOHIDA va bir-biridan AYIRILMAYDI. Sinaldi:
--   qoldiq 100 → 95 → 98 → 90
--   toʻgʻri javob:  sotilgan 13, keltirilgan 3
--   sodda ayirish:  10 — ikkala raqam ham yoʻqoladi
--
-- TAXMINIY va PASTGA qiyshiq: ikki oʻlchov orasida sotilib qayta
-- toʻldirilgan tovar koʻrinmaydi. Hech qachon oshirib koʻrsatmaydi.

alter table selleros.sales_estimates
  add column if not exists restocked_units integer;

comment on column selleros.sales_estimates.sold_units is
  'Qoldiq KAMAYISHLARI yigʻindisi — TAXMINIY, pastga qiyshiq.';
comment on column selleros.sales_estimates.restocked_units is
  'Qoldiq OʻSISHLARI yigʻindisi — tovar keltirilgani. Sotuvdan ayirilmaydi.';

create or replace function public.so_rollup_days(
  p_platform text default 'uzum',
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'public'
set statement_timeout to '120s'
as $function$
declare
  n integer;
  d_from date := coalesce(p_from, (now() at time zone 'Asia/Tashkent')::date - 7);
  d_to   date := coalesce(p_to,   (now() at time zone 'Asia/Tashkent')::date);
begin
  with obs as (
    select o.product_id,
           (o.observed_at at time zone 'Asia/Tashkent')::date as kun,
           o.observed_at, o.stock, o.price
    from selleros.product_observation o
    join selleros.product p on p.id = o.product_id
    where p.platform = p_platform
      -- Faqat OʻLCHANGAN qoldiq. `null` ni nol deb olsak "hammasi
      -- sotildi" degan yolgʻon chiqardi.
      and o.stock is not null
      and (o.observed_at at time zone 'Asia/Tashkent')::date between d_from - 1 and d_to
  ),
  qadamlar as (
    select product_id, kun, stock, price,
           lag(stock) over (partition by product_id order by observed_at) as oldingi,
           lag(kun)   over (partition by product_id order by observed_at) as oldingi_kun
    from obs
  ),
  harakat as (
    select product_id, kun,
           sum(greatest(0, oldingi - stock))::integer as sotilgan,
           sum(greatest(0, stock - oldingi))::integer as keltirilgan,
           sum(greatest(0, oldingi - stock) * coalesce(price, 0))::bigint as daromad
    from qadamlar
    -- Faqat qoʻshni oʻlchovlar: orada kun tushib qolsa farq ikki kunlik
    -- boʻladi va uni bir kunga yozib boʻlmaydi.
    where oldingi is not null and (oldingi_kun = kun or oldingi_kun = kun - 1)
    group by 1, 2
  ),
  olchov as (
    select product_id, kun, count(*) as soni from obs group by 1, 2
  )
  insert into selleros.sales_estimates
        (product_id, date, sold_units, restocked_units, revenue_uzs, method, certainty)
  select h.product_id, h.kun, h.sotilgan, h.keltirilgan, h.daromad,
         'stock_delta_v1',
         -- Bir kunda qancha koʻp oʻlchansa, "sotilib qayta toʻldirilgan"
         -- koʻrinmas holat shuncha kam boʻladi.
         case when c.soni >= 3 then 'yuqori'
              when c.soni = 2 then 'orta'
              else 'past' end
  from harakat h
  join olchov c on c.product_id = h.product_id and c.kun = h.kun
  where h.kun between d_from and d_to
  on conflict (product_id, date) do update
     set sold_units = excluded.sold_units,
         restocked_units = excluded.restocked_units,
         revenue_uzs = excluded.revenue_uzs,
         method = excluded.method,
         certainty = excluded.certainty;
  get diagnostics n = row_count;

  return jsonb_build_object('qatorlar', n, 'boshi', d_from, 'oxiri', d_to,
                            'usul', 'stock_delta_v1');
end;
$function$;

revoke all on function public.so_rollup_days(text, date, date) from public, anon, authenticated;
grant execute on function public.so_rollup_days(text, date, date) to service_role;
