-- 0079 — AI tahlilchi: tayyor tahlil jadvallari (2026-11-05).
--
-- NEGA. Nazoratchi soʻradi (05.11): «Uzumga kirib filtrlab ber, nechta sotuvchi kiyim va
-- poyabzal sotgan, nechtasi yaxshi sota olgan, nechtasi yoʻq va nimaga». AI «maʼlumotim
-- yoʻq» dedi — vaholanki javob bazada bor. Lekin xom jadvallardan bunday hisob 1–3 daqiqa
-- oladi (05.11 oʻlchov: 151 turkum, 58 ming tovar — 11 s; «shu paytgacha» — 170 s). Chat
-- uchun bu juda sekin. Shuning uchun har kecha tayyor jadval yasaladi, AI asboblari
-- (0080) uni 1 soniyadan tez oʻqiydi.
--
-- MANBA — FAQAT OʻLCHANGAN MAʼLUMOT. Hech narsa toʻqilmaydi:
--   * `zumsavdo.tovar_30kun` (VPS, har kecha) — 30 kunlik sotuv; har tovar «tovar-sotuvi-v1»
--     bilan (0078, `zumsavdo.tovar_baho`) — kartochkadagi raqam bilan aynan bir xil;
--   * `zumsavdo.product_census` — oxirgi TOʻLIQ perepis oʻtishi: reyting, sharh,
--     doʻkonning jami buyurtmasi (Uzumning oʻz hisobi, «shu paytgacha»);
--   * `zumsavdo.product` — perepis koʻrgan hamma tovar (olib tashlanganlari ham);
--   * `zumsavdo.turkum` (0077) — daraxt: ota turkum = uning barglari yigʻindisi;
--   * tovar yoshi — tovar raqamidan (Uzum raqamni ketma-ket beradi): 0043 dagi statik
--     kalibrovka + `selleros.id_frontier` va `zumsavdo.market_day` nuqtalari, chiziqli.
--
-- JADVALLAR (materialized view, `refresh … concurrently` — oʻqish toʻxtamaydi):
--   tahlil_tovar         — har tovar: turkum, doʻkon, narx, oyiga, holat, ishonch, tushum,
--                          trend (oxirgi 7 / oldingi 23 kun), sharh, reyting, yosh;
--   tahlil_census_dt     — doʻkon × barg, SHU PAYTGACHA: qoʻyilgan tovar, sharhli tovar
--                          (sotilgani isbotlangan), doʻkonning jami buyurtmasi;
--   tahlil_dokon_turkum  — doʻkon × barg, OXIRGI 30 KUN;
--   tahlil_dokon         — doʻkon: ikkalasi + nom, yosh, asosiy turkum;
--   tahlil_turkum        — daraxtning HAR tuguni (ota turkumlar ham).
--
-- YANGILASH: `zumsavdo.tahlil_yangila()` — faqat manba oʻzgarganda (yangi `tovar_30kun`
-- kuni, yangi toʻliq perepis oʻtishi, daraxt yangilandi). Har chaqiruv jurnalga yoziladi
-- (`zumsavdo.tahlil_jurnal`). Jadval — 0080 (pg_cron).
--
-- Tashqaridan oʻqilmaydi: hammasi `zumsavdo` sxemasida, anon/authenticated ga huquq yoʻq;
-- oʻqish faqat 0080 dagi service_role funksiyalari orqali.

-- ============================================================ yordamchi funksiyalar

-- Oxirgi TOʻLIQ perepis oʻtishi (kursor oʻtish oxiriga yetmagan boʻlsa — oldingisi).
create or replace function zumsavdo.tahlil_census_pass()
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select case when c.next_id >= c.max_id then c.pass else c.pass - 1 end
       from zumsavdo.crawl_cursor c
      where c.name = 'census'),
    (select max(p.pass) from zumsavdo.product_census p)
  );
$$;

-- Tovar raqami → qoʻyilgan sana: kalibrovka nuqtalari, raqam boʻyicha oʻsib boradi.
-- Sanasi oldingi nuqtadan ESKI nuqta (oʻlchov shovqini) tashlanadi — chiziq oʻsuvchi qoladi.
create or replace function zumsavdo.tahlil_id_nuqtalari(out ids bigint[], out sanalar date[])
language sql
stable
set search_path = ''
as $$
  with n as (
    select x.id, x.sana
      from (values
        (0::bigint, date '2023-04-06'), (1000000, date '2024-08-31'), (1250000, date '2025-01-18'),
        (1500000, date '2025-05-20'), (1750000, date '2025-08-08'), (2000000, date '2025-12-08'),
        (2250000, date '2026-02-21'), (2500000, date '2026-04-15'), (3000000, date '2026-08-02')
      ) as x(id, sana)
    union all
    select f.max_id, f.sana from selleros.id_frontier f where f.platform = 'uzum' and f.max_id > 3000000
    union all
    select m.id_frontier, m.date from zumsavdo.market_day m where m.id_frontier > 3000000
  ),
  t as (select n.id, min(n.sana) as sana from n group by n.id),
  m as (
    select t.id, t.sana,
           max(t.sana) over (order by t.id rows between unbounded preceding and 1 preceding) as oldingi
      from t
  )
  select array_agg(m.id order by m.id), array_agg(m.sana order by m.id)
    from m
   where m.oldingi is null or m.sana >= m.oldingi;
$$;

-- Bitta raqam → yosh (kun) shu kunga. Eng yangi nuqtadan katta raqam — oʻsha nuqta kunidan
-- keyin qoʻyilgan (yoshi shu kungacha boʻlgan kunlardan oshmaydi).
create or replace function zumsavdo.tahlil_yosh(p_id bigint, p_ids bigint[], p_sanalar date[], p_bugun date)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_id is null or p_ids is null or cardinality(p_ids) < 2 or p_bugun is null then null
    else greatest(0, p_bugun - (
      select case
        when w.j < 1 then p_sanalar[1]
        when w.j >= cardinality(p_ids) then p_sanalar[cardinality(p_ids)]
        else p_sanalar[w.j] + (((p_id - p_ids[w.j])::float8 / nullif(p_ids[w.j + 1] - p_ids[w.j], 0))
                               * (p_sanalar[w.j + 1] - p_sanalar[w.j]))::integer
      end
      from (select width_bucket(p_id, p_ids) as j) w))
  end;
$$;

-- ============================================================ 1. tovar

create materialized view if not exists zumsavdo.tahlil_tovar as
with k as (select n.ids, n.sanalar from zumsavdo.tahlil_id_nuqtalari() n),
     cp as (select zumsavdo.tahlil_census_pass() as pass)
select t.product_id,
       coalesce(t.kategoriya, pr.category_id)                                  as turkum,
       coalesce(t.dokon, pr.shop_id)                                           as dokon,
       coalesce(t.nom, pr.title)                                               as nom,
       t.narx_oxirgi                                                           as narx,
       b.oyiga,
       b.holat,
       b.ishonch,
       -- Talabga qoʻshiladi: raqam bor va ziddiyat yoʻq (bozor-paneli-v1 bilan bir xil).
       (b.oyiga is not null and b.holat <> 'ziddiyat')                         as hisobga,
       case when b.oyiga is not null and b.holat <> 'ziddiyat'
            then b.oyiga::bigint * t.narx_oxirgi end                           as tushum,
       b.s7, b.k7, b.s23, b.k23,
       t.sharh,
       b.sharh_osish,
       c.rating                                                                as reyting,
       t.belgi,
       t.chegirma,
       t.qoldiq_oxirgi                                                         as qoldiq,
       zumsavdo.tahlil_yosh(t.product_id, k.ids, k.sanalar, t.sana)            as yosh_kun,
       t.sana
  from zumsavdo.tovar_30kun t
  cross join k
  cross join cp
  cross join lateral zumsavdo.tovar_baho(t.olchangan_kun, t.qoldiq_oxirgi, t.tugaganiga, t.sotildi,
                                         t.olchangan_mask, t.belgi, t.belgi_max, t.sharh_bosh, t.sharh) b
  left join zumsavdo.product pr on pr.id = t.product_id
  left join zumsavdo.product_census c on c.pass = cp.pass and c.product_id = t.product_id
with no data;

create unique index if not exists tahlil_tovar_pk on zumsavdo.tahlil_tovar (product_id);
create index if not exists tahlil_tovar_turkum_idx on zumsavdo.tahlil_tovar (turkum);
create index if not exists tahlil_tovar_dokon_idx on zumsavdo.tahlil_tovar (dokon);
create index if not exists tahlil_tovar_tushum_idx on zumsavdo.tahlil_tovar (tushum desc nulls last);

-- ============================================================ 2. doʻkon × barg, shu paytgacha

create materialized view if not exists zumsavdo.tahlil_census_dt as
with cp as (select zumsavdo.tahlil_census_pass() as pass)
select p.shop_id                                           as dokon,
       p.category_id                                       as turkum,
       count(*)                                            as tovarlar,
       count(*) filter (where c.reviews > 0)               as sharhli,
       coalesce(sum(c.reviews), 0)                         as sharh,
       max(c.shop_orders)                                  as dokon_buyurtma,
       min(p.id)                                           as eng_eski_id,
       max(cp.pass)                                        as pass
  from zumsavdo.product p
  cross join cp
  left join zumsavdo.product_census c on c.pass = cp.pass and c.product_id = p.id
 where p.shop_id is not null and p.category_id is not null
 group by p.shop_id, p.category_id
with no data;

create unique index if not exists tahlil_census_dt_pk on zumsavdo.tahlil_census_dt (dokon, turkum);
create index if not exists tahlil_census_dt_turkum_idx on zumsavdo.tahlil_census_dt (turkum);

-- ============================================================ 3. doʻkon × barg, oxirgi 30 kun

create materialized view if not exists zumsavdo.tahlil_dokon_turkum as
select t.dokon,
       t.turkum,
       count(*)                                                       as tovarlar,
       count(*) filter (where t.oyiga is not null)                    as olchangan,
       count(*) filter (where t.hisobga and t.oyiga >= 1)             as sotgan,
       coalesce(sum(t.oyiga) filter (where t.hisobga), 0)::bigint     as dona,
       coalesce(sum(t.tushum), 0)::bigint                             as tushum,
       percentile_cont(0.5) within group (order by t.narx)            as narx_med,
       avg(t.reyting)                                                 as reyting_ort,
       coalesce(sum(t.sharh), 0)::bigint                              as sharh,
       coalesce(sum(t.sharh_osish), 0)::bigint                        as sharh_osish,
       avg(t.chegirma)                                                as chegirma_ort,
       count(*) filter (where t.holat = 'tugagan')                    as tugagan,
       count(*) filter (where t.yosh_kun <= 60)                       as yangi,
       coalesce(sum(t.s7), 0)::bigint                                 as s7,
       coalesce(sum(t.k7), 0)::bigint                                 as k7,
       coalesce(sum(t.s23), 0)::bigint                                as s23,
       coalesce(sum(t.k23), 0)::bigint                                as k23,
       -- Doʻkon sahifasi manzili bazada yoʻq (slug) — Uzumda doʻkon oʻrniga shu tovar ochiladi.
       (array_agg(t.product_id order by t.tushum desc nulls last, t.product_id))[1] as eng_yaxshi_tovar
  from zumsavdo.tahlil_tovar t
 where t.dokon is not null and t.turkum is not null
 group by t.dokon, t.turkum
with no data;

create unique index if not exists tahlil_dokon_turkum_pk on zumsavdo.tahlil_dokon_turkum (dokon, turkum);
create index if not exists tahlil_dokon_turkum_turkum_idx on zumsavdo.tahlil_dokon_turkum (turkum);

-- ============================================================ 4. doʻkon

create materialized view if not exists zumsavdo.tahlil_dokon as
with k as (select n.ids, n.sanalar from zumsavdo.tahlil_id_nuqtalari() n),
a as (
  select d.dokon,
         sum(d.tovarlar)::bigint as tovarlar, sum(d.olchangan)::bigint as olchangan,
         sum(d.sotgan)::bigint as sotgan, sum(d.dona)::bigint as dona, sum(d.tushum)::bigint as tushum,
         count(*) as turkumlar, sum(d.sharh)::bigint as sharh, sum(d.tugagan)::bigint as tugagan,
         sum(d.yangi)::bigint as yangi,
         sum(d.reyting_ort * d.tovarlar) / nullif(sum(d.tovarlar) filter (where d.reyting_ort is not null), 0) as reyting_ort,
         (array_agg(d.turkum order by d.tushum desc, d.tovarlar desc, d.turkum))[1] as asosiy_turkum,
         (array_agg(d.eng_yaxshi_tovar order by d.tushum desc, d.tovarlar desc, d.turkum))[1] as eng_yaxshi_tovar
    from zumsavdo.tahlil_dokon_turkum d
   group by d.dokon
),
c as (
  select c.dokon, sum(c.tovarlar)::bigint as census_tovarlar, sum(c.sharhli)::bigint as census_sharhli,
         max(c.dokon_buyurtma) as jami_buyurtma, min(c.eng_eski_id) as eng_eski_id
    from zumsavdo.tahlil_census_dt c
   group by c.dokon
)
select coalesce(a.dokon, c.dokon)                   as dokon,
       s.name                                       as nom,
       c.jami_buyurtma,
       coalesce(c.census_tovarlar, 0)               as census_tovarlar,
       coalesce(c.census_sharhli, 0)                as census_sharhli,
       coalesce(a.tovarlar, 0)                      as tovarlar,
       coalesce(a.olchangan, 0)                     as olchangan,
       coalesce(a.sotgan, 0)                        as sotgan,
       coalesce(a.dona, 0)                          as dona,
       coalesce(a.tushum, 0)                        as tushum,
       coalesce(a.turkumlar, 0)                     as turkumlar,
       a.asosiy_turkum,
       a.eng_yaxshi_tovar,
       a.reyting_ort,
       coalesce(a.sharh, 0)                         as sharh,
       coalesce(a.tugagan, 0)                       as tugagan,
       coalesce(a.yangi, 0)                         as yangi,
       c.eng_eski_id,
       zumsavdo.tahlil_yosh(c.eng_eski_id, k.ids, k.sanalar, current_date) as yosh_kun
  from a
  full join c on c.dokon = a.dokon
  cross join k
  left join zumsavdo.shop s on s.id = coalesce(a.dokon, c.dokon)
with no data;

create unique index if not exists tahlil_dokon_pk on zumsavdo.tahlil_dokon (dokon);
create index if not exists tahlil_dokon_tushum_idx on zumsavdo.tahlil_dokon (tushum desc);

-- ============================================================ 5. turkum (daraxtning har tuguni)

create materialized view if not exists zumsavdo.tahlil_turkum as
with dt as (
  -- doʻkon × tugun: har barg qatori oʻzining hamma ota-bobolariga qoʻshiladi
  select a.tugun, d.dokon,
         sum(d.tovarlar)::bigint as tovarlar, sum(d.olchangan)::bigint as olchangan,
         sum(d.sotgan)::bigint as sotgan, sum(d.dona)::bigint as dona, sum(d.tushum)::bigint as tushum,
         sum(d.tugagan)::bigint as tugagan, sum(d.yangi)::bigint as yangi,
         sum(d.s7)::bigint as s7, sum(d.k7)::bigint as k7, sum(d.s23)::bigint as s23, sum(d.k23)::bigint as k23
    from zumsavdo.tahlil_dokon_turkum d
    join zumsavdo.turkum k on k.id = d.turkum
    cross join lateral unnest(k.yol) as a(tugun)
   group by a.tugun, d.dokon
),
r as (
  select dt.*,
         row_number() over (partition by dt.tugun order by dt.tushum desc, dt.dokon) as orin,
         count(*) over (partition by dt.tugun) as n
    from dt
),
agg as (
  select r.tugun,
         count(*)                                                   as sotuvchilar,
         count(*) filter (where r.dona > 0)                         as sotgan_sotuvchilar,
         sum(r.tovarlar)::bigint                                    as tovarlar,
         sum(r.olchangan)::bigint                                   as olchangan,
         sum(r.sotgan)::bigint                                      as sotgan_tovarlar,
         sum(r.dona)::bigint                                        as dona,
         sum(r.tushum)::bigint                                      as tushum,
         sum(r.tushum) filter (where r.orin <= ceil(r.n * 0.2))::bigint as top20_tushum,
         sum(r.tushum) filter (where r.orin <= 10)::bigint          as top10_tushum,
         sum(r.tugagan)::bigint                                     as tugagan,
         sum(r.yangi)::bigint                                       as yangi,
         sum(r.s7)::bigint as s7, sum(r.k7)::bigint as k7, sum(r.s23)::bigint as s23, sum(r.k23)::bigint as k23
    from r
   group by r.tugun
),
cen as (
  select a.tugun,
         count(distinct c.dokon)                                    as census_sotuvchilar,
         count(distinct c.dokon) filter (where c.sharhli > 0)       as census_sotgan_sotuvchilar,
         sum(c.tovarlar)::bigint                                    as census_tovarlar,
         sum(c.sharhli)::bigint                                     as census_sharhli
    from zumsavdo.tahlil_census_dt c
    join zumsavdo.turkum k on k.id = c.turkum
    cross join lateral unnest(k.yol) as a(tugun)
   group by a.tugun
),
narx as (
  select a.tugun, percentile_cont(0.5) within group (order by t.narx) as narx_med
    from zumsavdo.tahlil_tovar t
    join zumsavdo.turkum k on k.id = t.turkum
    cross join lateral unnest(k.yol) as a(tugun)
   where t.narx is not null
   group by a.tugun
)
select k.id as turkum, k.nom, k.yol_nomi, k.chuqurlik, k.barg, k.ota_id,
       coalesce(agg.sotuvchilar, 0)                 as sotuvchilar,
       coalesce(agg.sotgan_sotuvchilar, 0)          as sotgan_sotuvchilar,
       coalesce(agg.tovarlar, 0)                    as tovarlar,
       coalesce(agg.olchangan, 0)                   as olchangan,
       coalesce(agg.sotgan_tovarlar, 0)             as sotgan_tovarlar,
       coalesce(agg.dona, 0)                        as dona,
       coalesce(agg.tushum, 0)                      as tushum,
       coalesce(agg.top20_tushum, 0)                as top20_tushum,
       coalesce(agg.top10_tushum, 0)                as top10_tushum,
       coalesce(agg.tugagan, 0)                     as tugagan,
       coalesce(agg.yangi, 0)                       as yangi,
       coalesce(agg.s7, 0) as s7, coalesce(agg.k7, 0) as k7, coalesce(agg.s23, 0) as s23, coalesce(agg.k23, 0) as k23,
       narx.narx_med,
       coalesce(cen.census_sotuvchilar, 0)          as census_sotuvchilar,
       coalesce(cen.census_sotgan_sotuvchilar, 0)   as census_sotgan_sotuvchilar,
       coalesce(cen.census_tovarlar, 0)             as census_tovarlar,
       coalesce(cen.census_sharhli, 0)              as census_sharhli
  from zumsavdo.turkum k
  left join agg on agg.tugun = k.id
  left join cen on cen.tugun = k.id
  left join narx on narx.tugun = k.id
with no data;

create unique index if not exists tahlil_turkum_pk on zumsavdo.tahlil_turkum (turkum);
create index if not exists tahlil_turkum_ota_idx on zumsavdo.tahlil_turkum (ota_id);

-- ============================================================ jurnal va yangilash

create table if not exists zumsavdo.tahlil_jurnal (
  id           bigserial primary key,
  boshlandi    timestamptz not null,
  tugadi       timestamptz not null default clock_timestamp(),
  sana         date,             -- tovar_30kun oynasining oxirgi kuni
  census_pass  integer,
  census_sana  date,             -- shu oʻtishning oxirgi kuzatuvi («shu paytgacha» raqamlari sanasi)
  daraxt       timestamptz,      -- zumsavdo.turkum oxirgi yangilanishi
  yangilandi   text[] not null,  -- qaysi jadvallar yangilandi
  qatorlar     jsonb
);

-- Oʻqish uchun ham, yozish uchun ham faqat funksiyalar (egasi nomidan).
do $$
declare v text;
begin
  foreach v in array array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon',
                           'tahlil_turkum', 'tahlil_jurnal'] loop
    execute format('revoke all on zumsavdo.%I from public, anon, authenticated', v);
  end loop;
end $$;
alter table zumsavdo.tahlil_jurnal enable row level security;

-- Yangilash. Faqat manba oʻzgarganda (yoki `p_majburiy`). Birinchi marta — oddiy refresh
-- (`concurrently` boʻsh jadvalda ishlamaydi), keyin — concurrently: AI oʻqishda davom etadi.
create or replace function zumsavdo.tahlil_yangila(p_majburiy boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_boshlandi timestamptz := clock_timestamp();
  v_sana      date;
  v_pass      integer;
  v_daraxt    timestamptz;
  v_oxirgi    zumsavdo.tahlil_jurnal%rowtype;
  v_tovar     boolean;
  v_census    boolean;
  v_turkum    boolean;
  v_yangi     text[] := '{}';
  v_qatorlar  jsonb;
  v_census_sana date;
begin
  perform set_config('work_mem', '64MB', true);

  select x.sana into v_sana from zumsavdo.xulosa_jurnal x order by x.id desc limit 1;
  v_pass := zumsavdo.tahlil_census_pass();
  select max(k.yangilandi) into v_daraxt from zumsavdo.turkum k;
  select * into v_oxirgi from zumsavdo.tahlil_jurnal j order by j.id desc limit 1;

  v_tovar  := p_majburiy or v_oxirgi.id is null or v_oxirgi.sana is distinct from v_sana
              or not (select c.relispopulated from pg_catalog.pg_class c where c.oid = 'zumsavdo.tahlil_tovar'::regclass);
  v_census := p_majburiy or v_oxirgi.id is null or v_oxirgi.census_pass is distinct from v_pass
              or not (select c.relispopulated from pg_catalog.pg_class c where c.oid = 'zumsavdo.tahlil_census_dt'::regclass);
  v_turkum := v_tovar or v_census or v_oxirgi.daraxt is distinct from v_daraxt
              or not (select c.relispopulated from pg_catalog.pg_class c where c.oid = 'zumsavdo.tahlil_turkum'::regclass);

  if not (v_tovar or v_census or v_turkum) then
    return jsonb_build_object('yangilandi', '[]'::jsonb, 'sana', v_sana, 'census_pass', v_pass);
  end if;

  if v_tovar then
    perform zumsavdo.tahlil_mv_yangila('tahlil_tovar');
    perform zumsavdo.tahlil_mv_yangila('tahlil_dokon_turkum');
    v_yangi := v_yangi || array['tahlil_tovar', 'tahlil_dokon_turkum'];
  end if;
  v_census_sana := v_oxirgi.census_sana;
  if v_census then
    select max(c.observed_at)::date into v_census_sana from zumsavdo.product_census c where c.pass = v_pass;
    perform zumsavdo.tahlil_mv_yangila('tahlil_census_dt');
    v_yangi := array_append(v_yangi, 'tahlil_census_dt');
  end if;
  if v_tovar or v_census then
    perform zumsavdo.tahlil_mv_yangila('tahlil_dokon');
    v_yangi := array_append(v_yangi, 'tahlil_dokon');
  end if;
  perform zumsavdo.tahlil_mv_yangila('tahlil_turkum');
  v_yangi := array_append(v_yangi, 'tahlil_turkum');

  select jsonb_build_object(
    'tovar', (select count(*) from zumsavdo.tahlil_tovar),
    'dokon_turkum', (select count(*) from zumsavdo.tahlil_dokon_turkum),
    'census_dt', (select count(*) from zumsavdo.tahlil_census_dt),
    'dokon', (select count(*) from zumsavdo.tahlil_dokon),
    'turkum', (select count(*) from zumsavdo.tahlil_turkum),
    -- Daraxtda yoʻq barg — ota turkum hisobiga kirmaydi (jim emas: shu yerda koʻrinadi).
    'daraxtsiz_tovar', (select count(*) from zumsavdo.tahlil_tovar t
                         where not exists (select 1 from zumsavdo.turkum k where k.id = t.turkum))
  ) into v_qatorlar;

  insert into zumsavdo.tahlil_jurnal (boshlandi, sana, census_pass, census_sana, daraxt, yangilandi, qatorlar)
  values (v_boshlandi, v_sana, v_pass, v_census_sana, v_daraxt, v_yangi, v_qatorlar);

  return jsonb_build_object('yangilandi', to_jsonb(v_yangi), 'sana', v_sana, 'census_pass', v_pass,
                            'qatorlar', v_qatorlar,
                            'soniya', round(extract(epoch from clock_timestamp() - v_boshlandi)::numeric, 1));
end;
$$;

-- Bitta jadvalni yangilash: toʻla boʻlsa — concurrently, boʻsh boʻlsa — oddiy.
create or replace function zumsavdo.tahlil_mv_yangila(p_nom text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_nom not in ('tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum') then
    raise exception 'tahlil_mv_yangila: nomaʼlum jadval %', p_nom;
  end if;
  if (select c.relispopulated from pg_catalog.pg_class c
       where c.oid = format('zumsavdo.%I', p_nom)::regclass) then
    execute format('refresh materialized view concurrently zumsavdo.%I', p_nom);
  else
    execute format('refresh materialized view zumsavdo.%I', p_nom);
  end if;
end;
$$;

revoke all on function zumsavdo.tahlil_yangila(boolean) from public, anon, authenticated;
revoke all on function zumsavdo.tahlil_mv_yangila(text) from public, anon, authenticated;
revoke all on function zumsavdo.tahlil_census_pass() from public, anon, authenticated;
revoke all on function zumsavdo.tahlil_id_nuqtalari() from public, anon, authenticated;
