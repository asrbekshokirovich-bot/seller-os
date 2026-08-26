-- Sotuv oʻlchovi kun chegarasidagi harakatni TASHLAB YUBORARDI.
--
-- `so_rollup_sales` qoldiq farqini shunday oladi:
--
--   lag(o.stock) over (
--     partition by o.product_id, (observed_at ...)::date   ← KUN BOʻYICHA
--     order by o.observed_at)
--
-- `partition by ... kun` degani: har kun yangidan boshlanadi va
-- kunning BIRINCHI oʻlchovida `oldingi_stock` `null` boʻladi.
-- `coalesce(null, stock) - stock = 0`. Yaʼni kechagi oxirgi
-- oʻlchov bilan bugungi birinchi oʻlchov orasidagi HARAKAT
-- BUTUNLAY YOʻQOLADI.
--
-- Jonli oʻlchandi (2026-08-26, mavjud kuzatuvlar boʻyicha):
--
--   kun ichida                 5 274 dona   ← sanaladi
--   kun chegarasida            1 615 dona   ← TASHLANADI
--   uzunroq tanaffusda           394 dona   ← TASHLANADI
--
-- Yaʼni harakatning 27,6% i hisobga kirmaydi. Supurish kuniga uch
-- marta yuradi, demak kunda toʻrtta oraliq bor va ulardan bittasi
-- — tunggisi — har doim tushib qoladi.
--
-- NEGA BU AYNAN QIMMAT XATO. Sotuv kam koʻrinsa:
--   * aylanma katta chiqadi (qoldiq / sotuv),
--   * aylanma katta boʻlsa ombor saqlash haqi katta chiqadi,
--   * natijada FOYDALI tovar zararli deb koʻrsatiladi.
-- Yaʼni xato bitta joyda emas, butun tannarx zanjiri boʻylab
-- kattalashib boradi.
--
-- ============================================================
-- `so_rollup_days` — OʻLIK VA BUZUQ, oʻchiriladi
-- ============================================================
--
-- 0010-migratsiyada ikkinchi hisoblovchi bor va u kun chegarasini
-- toʻgʻri kesib oʻtadi. Lekin:
--
--   1. Uni HECH KIM chaqirmaydi (`grep` boʻyicha: faqat migratsiya
--      va BACKLOG).
--   2. Chaqirilsa ham DARHOL YIQILARDI: u `certainty` ga
--      'yuqori'/'orta'/'past' yozadi, jadvaldagi CHECK esa faqat
--      'exact'/'approx' ga ruxsat beradi.
--
-- Ikkita hisoblovchi bitta jadvalga yozishi — oʻzi nosozlik:
-- qaysi biri oxirgi yozgani natijani belgilaydi. Bittasi qoladi.
--
-- ============================================================
-- NATIJA — jonli oʻlchandi (2026-08-26)
-- ============================================================
--
--   kun         eski (v1)   yangi (v2)
--   2026-08-24      4 177       4 177    (birinchi kun — chegara yoʻq)
--   2026-08-25        955       2 308    +142%
--   2026-08-26        142         798    +462%
--
-- 08-24 oʻzgarmadi va bu TOʻGʻRI: undan oldin oʻlchov yoʻq, yaʼni
-- kesib oʻtiladigan chegara ham yoʻq. Shu qator tuzatish
-- haqiqatan kun chegarasiga tegayotganini koʻrsatadi — agar
-- birinchi kun ham oʻzgarganda, xato boshqa joyda boʻlardi.
--
-- `olchov_soni` ham toʻldi: 08-24 da 2, 08-25 da 4, 08-26 da 3.

-- ------------------------------------------------------------
-- 1. Oʻlchov soni — ALOHIDA USTUN, `certainty` ga tiqilmaydi
-- ------------------------------------------------------------
--
-- `certainty` ikki qiymatli va maʼnosi aniq: 'exact' — platforma
-- oʻzi aytgan son, 'approx' — biz qoldiq farqidan chiqarganimiz.
-- Bizning usul HAR DOIM 'approx' va bu toʻgʻri.
--
-- Yetishmayotgan narsa boshqa: shu kuni necha marta oʻlchaganimiz.
-- Bir marta oʻlchangan kunda "sotilib qayta toʻldirilgan" harakat
-- koʻrinmay qoladi, uch marta oʻlchangan kunda esa kamroq.
-- Bu FAKT, yorliq emas — shuning uchun oʻz ustunida turadi.
alter table selleros.sales_estimates
  add column if not exists olchov_soni int;

comment on column selleros.sales_estimates.olchov_soni is
  'Shu kuni necha marta oʻlchandi. Koʻp boʻlsa koʻrinmagan harakat kam.';

-- ------------------------------------------------------------
-- 2. Bitta hisoblovchi
-- ------------------------------------------------------------
--
-- IKKINCHI XATO — birinchi urinishda oʻzim qoʻygandim va
-- oʻlchov koʻrsatdi. Yangi funksiya faqat HARAKAT boʻlgan
-- kunlarga qator yozdi: 6 000 tovar oʻrniga 253 ta.
--
-- Nega bu yomon: `selleros.tovar_sotuvi` "necha kun oʻlchandi"
-- ni `count(distinct date)` bilan sanaydi va 7 kundan kam boʻlsa
-- oʻlchangan sotuvni ISHLATMAYDI. Harakatsiz kunga qator
-- yozmasak, sekin sotiladigan tovar hech qachon 7 kunga yetmaydi
-- va abadiy "taxmin" da qolib ketardi.
--
-- "0 dona sotildi" — bu OʻLCHOV, maʼlumot yoʻqligi emas.
-- Shuning uchun qator HAR OʻLCHANGAN KUN uchun yoziladi va manba
-- `product_daily` (kuniga har tovarga bitta qator), harakat esa
-- unga chap tomondan qoʻshiladi.
--
-- Faqat bitta holatda `null` yoziladi: tovarning qoldigʻi
-- HALI BIR MARTA HAM oʻlchanmagan boʻlsa. Unda "sotilmadi"
-- deyish "biz qaramadik" ni "sotilmaydi" ga aylantirardi.
create or replace function public.so_rollup_sales(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'public'
set statement_timeout to '180s'
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
      -- KUN BOʻYICHA BOʻLINMAYDI. Zanjir tovarning butun tarixi
      -- boʻylab uzluksiz — aynan shu tuzatilgan xato.
      lag(o.stock) over (
        partition by o.product_id order by o.observed_at
      ) as oldingi_stock
    from selleros.product_observation o
    where o.stock is not null
      -- Bir kun oldindan: `p_from` ning birinchi oʻlchoviga
      -- juft topilishi kerak.
      and (o.observed_at at time zone 'Asia/Tashkent')::date
          between p_from - 1 and p_to
  ),
  harakat as (
    /*
     * Farq KEYINGI oʻlchov kuniga yoziladi.
     *
     * Tanaffus bir kundan uzun boʻlsa harakat aslida bir necha
     * kunga tarqalgan, biz esa hammasini bitta kunga yozamiz.
     * Kunlik raqam shu darajada noaniq — lekin isteʼmolchi
     * (`selleros.tovar_sotuvi`) 30 kunlik YIGʻINDINI oladi va
     * yigʻindi buzilmaydi. Tashlab yuborish esa yigʻindini
     * kamaytirardi, yaʼni xatoni saqlab qolardi.
     */
    select product_id, kun,
           sum(greatest(oldingi_stock - stock, 0))::int as sotilgan,
           sum(greatest(stock - oldingi_stock, 0))::int as keltirilgan,
           /*
            * Narxi nomaʼlum sotuv boʻlsa — daromad `null`.
            *
            * `sum()` null hadni JIMGINA tashlab ketadi, yaʼni
            * narxsiz sotuv daromadni kamaytirib koʻrsatardi va
            * buni hech narsa bildirmasdi.
            *
            * Eski `max(price)` ham notoʻgʻri edi: kun ichida narx
            * tushsa, sotuv baland narxda hisoblanardi.
            */
           case
             when bool_or(greatest(oldingi_stock - stock, 0) > 0 and price is null)
               then null
             else sum(greatest(oldingi_stock - stock, 0) * coalesce(price, 0))::bigint
           end as daromad
    from qadamlar
    where oldingi_stock is not null
    group by product_id, kun
  ),
  boshlanish as (
    -- Birinchi maʼlum qoldiq qachon oʻlchangani. Shundan OLDINGI
    -- kunlar uchun "sotilmadi" deyish mumkin emas — qaramaganmiz.
    select product_id,
           min((observed_at at time zone 'Asia/Tashkent')::date) as birinchi_kun
    from selleros.product_observation
    where stock is not null
    group by product_id
  ),
  yozildi as (
    insert into selleros.sales_estimates
      (product_id, date, sold_units, restocked_units, revenue_uzs,
       certainty, method, olchov_soni)
    select d.product_id, d.date,
           case when b.birinchi_kun is null or b.birinchi_kun > d.date
                then null else coalesce(h.sotilgan, 0) end,
           case when b.birinchi_kun is null or b.birinchi_kun > d.date
                then null else coalesce(h.keltirilgan, 0) end,
           case when b.birinchi_kun is null or b.birinchi_kun > d.date
                then null else coalesce(h.daromad, 0) end,
           -- Har doim 'approx': qoldiq farqi platformaning oʻz
           -- soni emas. 'exact' qilish yolgʻon boʻlardi.
           --
           -- Oʻlchov soni `product_daily.sweeps` dan, XOM kuzatuv
           -- sonidan emas: `product_observation` faqat OʻZGARGANDA
           -- yoziladi (yillik hajm 460 GB → 14 GB qarori), yaʼni
           -- undagi qator soni "necha marta qaradik" degani emas.
           'approx', 'stock_delta_v2', d.sweeps
    from selleros.product_daily d
    left join harakat h on h.product_id = d.product_id and h.kun = d.date
    left join boshlanish b on b.product_id = d.product_id
    where d.date between p_from and p_to
    on conflict (product_id, date) do update
      set sold_units = excluded.sold_units,
          restocked_units = excluded.restocked_units,
          revenue_uzs = excluded.revenue_uzs,
          certainty = excluded.certainty,
          method = excluded.method,
          olchov_soni = excluded.olchov_soni
    returning 1
  )
  select count(*) into n from yozildi;

  return jsonb_build_object('kunlar', p_to - p_from + 1, 'yozildi', n,
                            'usul', 'stock_delta_v2');
end;
$$;

revoke all on function public.so_rollup_sales(date, date) from public, anon, authenticated;
grant execute on function public.so_rollup_sales(date, date) to service_role;

-- ------------------------------------------------------------
-- 3. Oʻlik va buzuq hisoblovchini oʻchirish
-- ------------------------------------------------------------
drop function if exists public.so_rollup_days(text, date, date);
