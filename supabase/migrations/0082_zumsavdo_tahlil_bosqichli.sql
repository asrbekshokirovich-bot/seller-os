-- 0082 — AI tahlilchi jadvallari: kechasi, kichik qadamlar bilan yangilash (2026-11-05).
--
-- NEGA. 0081 qoʻygan yangilash (`tahlil_yangila`: beshta materialized view BITTA
-- tranzaksiyada, work_mem 64MB) 05.11 kunduzi 10:50 UTC da birinchi marta ishga tushdi va
-- Supabase bazasini (Micro: 1 GB xotira, cheklangan disk tezligi) toʻliq band qildi — sayt
-- bazaga ulana olmadi, bazani qayta ishga tushirishga toʻgʻri keldi. Sabablari:
--   * 3 mln qatorli `zumsavdo.product` va butun `zumsavdo.product_census` (hamma oʻtishlar)
--     bitta soʻrovda birlashtirildi — bir necha GB oʻqish, xotiraga sigʻmagan hash;
--   * beshala jadval bitta tranzaksiyada — toʻxtatib ham, boʻlib ham boʻlmaydi;
--   * kunduzi, birinchi chaqiruvdayoq toʻliq hajmda;
--   * oʻlchov (0078 izohi) faqat 50 ming qatorli NAMUNADA qilingan — toʻliq ishning disk va
--     xotira yuki oʻlchanmagan edi.
--
-- YANGI TARTIB (`zumsavdo.tahlil_qadam()`):
--   * Har chaqiruv — BITTA kichik qadam, oʻz tranzaksiyasida: 25 000 tovar, 100 000 perepis
--     raqami, bir guruh doʻkon yoki bir guruh turkum. Qadam bir necha soniya; qadamlar orasida
--     baza boʻsh. Katta birlashma yoʻq — har qadam raqam oraligʻini indeks bilan oʻqiydi.
--   * pg_cron FAQAT KECHASI: UTC 20:00–02:59 (Toshkent 01:00–07:59), daqiqada bitta qadam.
--     Kunduzi (yoki birinchi marta) faqat qoʻlda: `tahlil_qadam(true)`.
--   * Xotira chegarasi: work_mem 16MB, parallel ishchi yoʻq; qadam 60 s dan oshsa — toʻxtaydi.
--   * Ikki nusxa (a/b). Yangi maʼlumot NOFAOL nusxaga yoziladi; hammasi tayyor boʻlganda
--     koʻrinishlar (`zumsavdo.tahlil_tovar` va boshqalar) bir lahzada yangisiga oʻtadi.
--     AI hech qachon yarim tayyor yoki qulflangan jadvalni oʻqimaydi; 0080 asboblari
--     oʻzgarmaydi (xuddi shu nomlar, xuddi shu ustunlar).
--   * Almashgandan keyingi qadamda eski nusxa boʻshatiladi — diskda doim bitta nusxa
--     (qurilish paytida ikkita).
--   * Xato yozib qoʻyiladi; 5 ta ketma-ket xato — qurilish toʻxtaydi (jim aylanmaydi).
--   * Har qadam `zumsavdo.tahlil_qurilish` da koʻrinadi: qaysi bosqich, qayerda, nechta qadam.
--
-- BOSQICHLAR: tovar → tovar_indeks (+ANALYZE) → census → census_yig (yoki census_nusxa)
-- → dokon_turkum → dokon → turkum → yakun (koʻrinishlar almashadi, jurnalga yoziladi).
-- Har jadval toʻlgan zahoti ANALYZE — keyingi bosqich va AI asboblari toʻgʻri reja tuzadi.
--
-- Hisob 0079 dagi bilan AYNAN BIR XIL (formula, ustunlar, «eng yaxshi 20%», daraxt
-- yigʻindisi) — faqat qanday bajarilishi oʻzgardi. `supabase/test/tahlil-jadval.test.ts`.

-- ============================================================ 1. qurilish holati

create table if not exists zumsavdo.tahlil_qurilish (
  id                integer primary key default 1 check (id = 1),
  faol              text check (faol in ('a', 'b')),       -- koʻrinishlar shu nusxada; null — hali yoʻq
  quriladi          text check (quriladi in ('a', 'b')),   -- hozir yozilayotgan nusxa; null — boʻsh
  bosqich           text,
  kursor            bigint,
  kursor_max        bigint,
  sana              date,          -- qurilayotgan nusxa: tovar_30kun oynasi
  census_pass       integer,
  census_sana       date,
  daraxt            timestamptz,
  faol_sana         date,          -- faol nusxa nimadan qurilgan
  faol_census_pass  integer,
  faol_census_sana  date,
  faol_daraxt       timestamptz,
  boshlandi         timestamptz,
  qadam_vaqti       timestamptz,
  qadamlar          integer not null default 0,
  qatorlar          jsonb not null default '{}'::jsonb,
  xato_soni         integer not null default 0,
  oxirgi_xato       text,
  tozala            text check (tozala in ('a', 'b'))   -- almashgandan keyin boʻshatiladigan eski nusxa
);
alter table zumsavdo.tahlil_qurilish add column if not exists tozala text check (tozala in ('a', 'b'));
insert into zumsavdo.tahlil_qurilish (id) values (1) on conflict (id) do nothing;
alter table zumsavdo.tahlil_qurilish enable row level security;
revoke all on zumsavdo.tahlil_qurilish from public, anon, authenticated;

-- ============================================================ 2. a/b nusxalar (0079 ustunlari bilan aynan)

-- Ustun turlari eski koʻrinishlardan olinadi (`like`) — 0080 asboblari bilan mos boʻlishi shart.
do $$
declare
  v text;
  x text;
begin
  foreach v in array array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum'] loop
    foreach x in array array['a', 'b'] loop
      execute format('create table if not exists zumsavdo.%I (like zumsavdo.%I)', v || '_' || x, v);
    end loop;
  end loop;
  -- Perepis qismlari: har qadam oʻz oraligʻidagi doʻkon×turkum yigʻindisini yozadi, oxirida jamlanadi.
  foreach x in array array['a', 'b'] loop
    execute format('create table if not exists zumsavdo.%I (like zumsavdo.tahlil_census_dt)', 'tahlil_census_qism_' || x);
  end loop;
end $$;

do $$
declare
  x text;
begin
  foreach x in array array['a', 'b'] loop
    -- Tovar: faqat asosiy kalit doim turadi (raqam tartibida yoziladi — arzon). Qolgan uchtasi
    -- har qurilishda tovarlar yozib boʻlingach yasaladi (`tovar_indeks`).
    execute format('create unique index if not exists %I on zumsavdo.%I (product_id)', 'tahlil_tovar_' || x || '_pk', 'tahlil_tovar_' || x);
    execute format('create unique index if not exists %I on zumsavdo.%I (dokon, turkum)', 'tahlil_census_dt_' || x || '_pk', 'tahlil_census_dt_' || x);
    execute format('create index if not exists %I on zumsavdo.%I (turkum)', 'tahlil_census_dt_' || x || '_turkum_idx', 'tahlil_census_dt_' || x);
    execute format('create unique index if not exists %I on zumsavdo.%I (dokon, turkum)', 'tahlil_dokon_turkum_' || x || '_pk', 'tahlil_dokon_turkum_' || x);
    execute format('create index if not exists %I on zumsavdo.%I (turkum)', 'tahlil_dokon_turkum_' || x || '_turkum_idx', 'tahlil_dokon_turkum_' || x);
    execute format('create unique index if not exists %I on zumsavdo.%I (dokon)', 'tahlil_dokon_' || x || '_pk', 'tahlil_dokon_' || x);
    execute format('create index if not exists %I on zumsavdo.%I (tushum desc)', 'tahlil_dokon_' || x || '_tushum_idx', 'tahlil_dokon_' || x);
    execute format('create unique index if not exists %I on zumsavdo.%I (turkum)', 'tahlil_turkum_' || x || '_pk', 'tahlil_turkum_' || x);
    execute format('create index if not exists %I on zumsavdo.%I (ota_id)', 'tahlil_turkum_' || x || '_ota_idx', 'tahlil_turkum_' || x);
  end loop;
end $$;

-- ============================================================ 3. eski MV → koʻrinish

-- 0079 dagi materialized view lar va ularni yangilovchi funksiyalar olib tashlanadi.
-- `tahlil_filtrla` (0080) `setof zumsavdo.tahlil_tovar` qaytaradi — MV bilan birga ketadi,
-- pastda aynan shu matn bilan qayta yaratiladi. Boshqa 0080 funksiyalari jadvallarni nomi
-- bilan oʻqiydi (bogʻliqlik yozilmaydi) — koʻrinishlar xuddi shu nomda boʻlgani uchun ishlaydi.
drop function if exists zumsavdo.tahlil_yangila(boolean);
drop function if exists zumsavdo.tahlil_mv_yangila(text);

do $$
declare
  v text;
begin
  foreach v in array array['tahlil_turkum', 'tahlil_dokon', 'tahlil_dokon_turkum', 'tahlil_census_dt', 'tahlil_tovar'] loop
    if exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'zumsavdo' and c.relname = v and c.relkind = 'm') then
      execute format('drop materialized view zumsavdo.%I cascade', v);
    end if;
  end loop;
  -- Koʻrinishlar faqat birinchi marta yaratiladi (qayta qoʻllashda faol nusxa oʻzgarmasin).
  foreach v in array array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum'] loop
    if not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'zumsavdo' and c.relname = v) then
      execute format('create view zumsavdo.%I as select * from zumsavdo.%I', v,
                     v || '_' || coalesce((select q.faol from zumsavdo.tahlil_qurilish q where q.id = 1), 'a'));
    end if;
  end loop;
end $$;

-- 0080 dagi bilan aynan bir xil (MV bilan birga oʻchgan edi).
create or replace function zumsavdo.tahlil_filtrla(p_filtr jsonb)
returns setof zumsavdo.tahlil_tovar
language sql
stable
set search_path = ''
as $$
  with f as (
    select zumsavdo.tahlil_barglar(zumsavdo.tahlil_turkumlari(p_filtr)) as barglar,
           (p_filtr->>'narx_min')::bigint      as narx_min,
           (p_filtr->>'narx_max')::bigint      as narx_max,
           (p_filtr->>'reyting_min')::numeric  as reyting_min,
           (p_filtr->>'sharh_min')::integer    as sharh_min,
           (p_filtr->>'oyiga_min')::integer    as oyiga_min,
           (p_filtr->>'oyiga_max')::integer    as oyiga_max,
           (p_filtr->>'tushum_min')::bigint    as tushum_min,
           coalesce((p_filtr->>'faqat_bor')::boolean, false) as faqat_bor,
           (p_filtr->>'yangi_kun')::integer    as yangi_kun,
           (p_filtr->>'chegirma_min')::integer as chegirma_min,
           (p_filtr->>'dokon')::bigint         as dokon,
           nullif(btrim(zumsavdo.norm(p_filtr->>'soz')), '') as soz
  )
  select t.*
    from zumsavdo.tahlil_tovar t, f
   where (f.barglar is null or t.turkum = any(f.barglar))
     and (f.narx_min is null or t.narx >= f.narx_min)
     and (f.narx_max is null or t.narx <= f.narx_max)
     and (f.reyting_min is null or t.reyting >= f.reyting_min)
     and (f.sharh_min is null or t.sharh >= f.sharh_min)
     and (f.oyiga_min is null or (t.hisobga and t.oyiga >= f.oyiga_min))
     and (f.oyiga_max is null or (t.oyiga is not null and t.oyiga <= f.oyiga_max))
     and (f.tushum_min is null or t.tushum >= f.tushum_min)
     and (not f.faqat_bor or (t.holat <> 'tugagan' and coalesce(t.qoldiq, 0) > 0))
     and (f.yangi_kun is null or t.yosh_kun <= f.yangi_kun)
     and (f.chegirma_min is null or t.chegirma >= f.chegirma_min)
     and (f.dokon is null or t.dokon = f.dokon)
     and (f.soz is null or zumsavdo.norm(t.nom) like '%' || f.soz || '%');
$$;
revoke all on function zumsavdo.tahlil_filtrla(jsonb) from public, anon, authenticated;

-- Tashqaridan oʻqib boʻlmaydi (hammasi faqat 0080 dagi service_role funksiyalari orqali).
do $$
declare
  v text;
begin
  foreach v in array array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum',
                           'tahlil_tovar_a', 'tahlil_tovar_b', 'tahlil_census_dt_a', 'tahlil_census_dt_b',
                           'tahlil_census_qism_a', 'tahlil_census_qism_b', 'tahlil_dokon_turkum_a', 'tahlil_dokon_turkum_b',
                           'tahlil_dokon_a', 'tahlil_dokon_b', 'tahlil_turkum_a', 'tahlil_turkum_b'] loop
    execute format('revoke all on zumsavdo.%I from public, anon, authenticated', v);
  end loop;
  foreach v in array array['tahlil_tovar_a', 'tahlil_tovar_b', 'tahlil_census_dt_a', 'tahlil_census_dt_b',
                           'tahlil_census_qism_a', 'tahlil_census_qism_b', 'tahlil_dokon_turkum_a', 'tahlil_dokon_turkum_b',
                           'tahlil_dokon_a', 'tahlil_dokon_b', 'tahlil_turkum_a', 'tahlil_turkum_b'] loop
    execute format('alter table zumsavdo.%I enable row level security', v);
  end loop;
end $$;

-- ============================================================ 4. tun oynasi

-- UTC 20:00–02:59 (Toshkent 01:00–07:59): saytda odam eng kam, skreyperlar (04, 12, 20 UTC
-- supurish; 06:30 turkum) bilan ustma-ust tushmaydi (20:00 dagi supurish 2–3 daqiqa).
create or replace function zumsavdo.tahlil_tunmi(p_vaqt timestamptz)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select extract(hour from p_vaqt at time zone 'UTC') >= 20 or extract(hour from p_vaqt at time zone 'UTC') < 3;
$$;

-- ============================================================ 5. bitta qadam

create or replace function zumsavdo.tahlil_qadam(p_majburiy boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s          zumsavdo.tahlil_qurilish%rowtype;
  x          text;
  v_sana     date;
  v_pass     integer;
  v_daraxt   timestamptz;
  v_n        bigint;
  v_max      bigint;
  v_hi       bigint;
  v_yetim    bigint;
  v_sana2    date;
  v_chuq     integer;
  v_limit    integer;
  v_tugunlar bigint[];
  v_bosqich  text;
  v_boshi    timestamptz := clock_timestamp();
  v_xato     text;
  v_natija   jsonb;
  -- Qadam hajmlari (har biri bir necha soniya; jonli oʻlchov — SXEMA.md).
  c_tovar    constant integer := 25000;
  c_census   constant integer := 100000;
begin
  -- Bir vaqtda faqat bitta qadam (cron + qoʻlda chaqiruv ustma-ust tushmasin).
  if not pg_catalog.pg_try_advisory_xact_lock(7708201) then
    return jsonb_build_object('band', true);
  end if;
  perform pg_catalog.set_config('work_mem', '16MB', true);
  perform pg_catalog.set_config('max_parallel_workers_per_gather', '0', true);
  perform pg_catalog.set_config('max_parallel_maintenance_workers', '0', true);
  perform pg_catalog.set_config('maintenance_work_mem', '32MB', true);
  perform pg_catalog.set_config('lock_timeout', '10s', true);

  select * into s from zumsavdo.tahlil_qurilish q where q.id = 1 for update;

  if not p_majburiy and not zumsavdo.tahlil_tunmi(now()) then
    return jsonb_build_object('kutish', 'kunduzi qurilmaydi', 'bosqich', s.bosqich);
  end if;
  if s.xato_soni >= 5 and not p_majburiy then
    return jsonb_build_object('toxtadi', true, 'oxirgi_xato', s.oxirgi_xato, 'bosqich', s.bosqich);
  end if;

  -- Koʻrinishlar almashgandan keyingi qadam: eski nusxa boʻshatiladi (disk ikki nusxani
  -- doim saqlamasin). Almashish bilan BIR tranzaksiyada emas: oʻsha lahzada eski jadvalni
  -- oʻqiyotgan soʻrov boʻsh jadvalga tushib qolmasin. Qulf olinmasa — keyingi qadamda.
  if s.quriladi is null and s.tozala is not null then
    begin
      perform pg_catalog.set_config('lock_timeout', '5s', true);
      perform zumsavdo.tahlil_nusxa_tozala(s.tozala);
      update zumsavdo.tahlil_qurilish q set tozala = null where q.id = 1;
      return jsonb_build_object('tozalandi', s.tozala, 'davom', true);
    exception when lock_not_available then
      return jsonb_build_object('tozalash_kutadi', s.tozala, 'davom', false);
    end;
  end if;

  select j.sana into v_sana from zumsavdo.xulosa_jurnal j order by j.id desc limit 1;
  v_pass := zumsavdo.tahlil_census_pass();
  select max(k.yangilandi) into v_daraxt from zumsavdo.turkum k;

  -- ---------------------------------------------------------- boshlash
  if s.quriladi is null then
    if s.faol is not null and s.faol_sana is not distinct from v_sana
       and s.faol_census_pass is not distinct from v_pass and s.faol_daraxt is not distinct from v_daraxt then
      return jsonb_build_object('yangi_yoq', true, 'sana', v_sana, 'census_pass', v_pass);
    end if;
    if v_sana is null then
      return jsonb_build_object('kutish', 'tovar_30kun hali yoʻq');
    end if;
    x := case when coalesce(s.faol, 'a') = 'a' then 'b' else 'a' end;
    perform zumsavdo.tahlil_nusxa_tozala(x);
    update zumsavdo.tahlil_qurilish q
       set quriladi = x, bosqich = 'tovar', kursor = -1, kursor_max = null, tozala = null,
           sana = v_sana, census_pass = v_pass, census_sana = null, daraxt = v_daraxt,
           boshlandi = clock_timestamp(), qadam_vaqti = clock_timestamp(), qadamlar = 1,
           qatorlar = '{}'::jsonb, xato_soni = 0, oxirgi_xato = null
     where q.id = 1;
    return jsonb_build_object('boshlandi', x, 'sana', v_sana, 'census_pass', v_pass, 'davom', true);
  end if;

  x := s.quriladi;
  v_bosqich := s.bosqich;

  begin
    -- ---------------------------------------------------------- tovar: 25 000 tadan
    if v_bosqich = 'tovar' then
      -- Oyna oʻzgardi (VPS yangi kunni yozdi) — qurilish boshidan: aralash nusxa boʻlmasin.
      if v_sana is distinct from s.sana then
        perform zumsavdo.tahlil_nusxa_tozala(x);
        update zumsavdo.tahlil_qurilish q
           set kursor = -1, sana = v_sana, census_pass = v_pass, daraxt = v_daraxt, qatorlar = '{}'::jsonb,
               qadamlar = q.qadamlar + 1, qadam_vaqti = clock_timestamp()
         where q.id = 1;
        return jsonb_build_object('qayta', 'yangi tovar_30kun kuni', 'sana', v_sana, 'davom', true);
      end if;
      execute format($q$
        with t as (
          select * from zumsavdo.tovar_30kun
           where product_id > $1
           order by product_id
           limit $2
        ),
        k as (select n.ids, n.sanalar from zumsavdo.tahlil_id_nuqtalari() n),
        c as (
          select pc.product_id, pc.rating
            from zumsavdo.product_census pc
           where pc.pass = $3
             and pc.product_id >= (select min(t.product_id) from t)
             and pc.product_id <= (select max(t.product_id) from t)
        ),
        ins as (
          insert into zumsavdo.%I (product_id, turkum, dokon, nom, narx, oyiga, holat, ishonch, hisobga, tushum,
                                   s7, k7, s23, k23, sharh, sharh_osish, reyting, belgi, chegirma, qoldiq, yosh_kun, sana)
          select t.product_id,
                 coalesce(t.kategoriya, (select pr.category_id from zumsavdo.product pr where pr.id = t.product_id)),
                 coalesce(t.dokon, (select pr.shop_id from zumsavdo.product pr where pr.id = t.product_id)),
                 coalesce(t.nom, (select pr.title from zumsavdo.product pr where pr.id = t.product_id)),
                 t.narx_oxirgi,
                 b.oyiga,
                 b.holat,
                 b.ishonch,
                 (b.oyiga is not null and b.holat <> 'ziddiyat'),
                 case when b.oyiga is not null and b.holat <> 'ziddiyat' then b.oyiga::bigint * t.narx_oxirgi end,
                 b.s7, b.k7, b.s23, b.k23,
                 t.sharh,
                 b.sharh_osish,
                 c.rating,
                 t.belgi,
                 t.chegirma,
                 t.qoldiq_oxirgi,
                 zumsavdo.tahlil_yosh(t.product_id, k.ids, k.sanalar, t.sana),
                 t.sana
            from t
            cross join k
            cross join lateral zumsavdo.tovar_baho(t.olchangan_kun, t.qoldiq_oxirgi, t.tugaganiga, t.sotildi,
                                                   t.olchangan_mask, t.belgi, t.belgi_max, t.sharh_bosh, t.sharh) b
            left join c on c.product_id = t.product_id
          returning product_id, turkum
        )
        select count(*), max(ins.product_id),
               count(*) filter (where not exists (select 1 from zumsavdo.turkum kk where kk.id = ins.turkum))
          from ins
      $q$, 'tahlil_tovar_' || x)
      into v_n, v_max, v_yetim
      using s.kursor, c_tovar, s.census_pass;

      update zumsavdo.tahlil_qurilish q
         set kursor = coalesce(v_max, q.kursor),
             bosqich = case when v_n < c_tovar then 'tovar_indeks' else 'tovar' end,
             qatorlar = q.qatorlar
                        || jsonb_build_object('tovar', coalesce((q.qatorlar->>'tovar')::bigint, 0) + v_n,
                                              'daraxtsiz_tovar', coalesce((q.qatorlar->>'daraxtsiz_tovar')::bigint, 0) + v_yetim)
       where q.id = 1;
      if v_n < c_tovar then
        update zumsavdo.tahlil_qurilish q set kursor = 0 where q.id = 1;
      end if;

    -- ---------------------------------------------------------- tovar indekslari va statistikasi: bittadan
    elsif v_bosqich = 'tovar_indeks' then
      if s.kursor = 0 then
        execute format('create index if not exists %I on zumsavdo.%I (turkum)', 'tahlil_tovar_' || x || '_turkum_idx', 'tahlil_tovar_' || x);
      elsif s.kursor = 1 then
        execute format('create index if not exists %I on zumsavdo.%I (dokon)', 'tahlil_tovar_' || x || '_dokon_idx', 'tahlil_tovar_' || x);
      elsif s.kursor = 2 then
        execute format('create index if not exists %I on zumsavdo.%I (tushum desc nulls last)', 'tahlil_tovar_' || x || '_tushum_idx', 'tahlil_tovar_' || x);
      else
        -- Yangi jadvalda statistika yoʻq — keyingi bosqichlar (va AI asboblari) uchun reja shunga qarab tuziladi.
        execute format('analyze zumsavdo.%I', 'tahlil_tovar_' || x);
      end if;
      if s.kursor >= 3 then
        -- «Shu paytgacha» faqat yangi perepis oʻtishida qayta hisoblanadi; oʻzgarmagan boʻlsa — faol nusxadan.
        if s.faol is not null and s.faol_census_pass is not distinct from s.census_pass then
          update zumsavdo.tahlil_qurilish q set bosqich = 'census_nusxa', kursor = 0 where q.id = 1;
        else
          select max(p.id) into v_max from zumsavdo.product p;
          update zumsavdo.tahlil_qurilish q set bosqich = 'census', kursor = 0, kursor_max = coalesce(v_max, 0) where q.id = 1;
        end if;
      else
        update zumsavdo.tahlil_qurilish q set kursor = q.kursor + 1 where q.id = 1;
      end if;

    -- ---------------------------------------------------------- shu paytgacha: 100 000 raqamdan
    elsif v_bosqich = 'census' then
      v_hi := s.kursor + c_census;
      execute format($q$
        insert into zumsavdo.%I (dokon, turkum, tovarlar, sharhli, sharh, dokon_buyurtma, eng_eski_id, pass)
        select p.shop_id, p.category_id, count(*), count(*) filter (where c.reviews > 0), coalesce(sum(c.reviews), 0),
               max(c.shop_orders), min(p.id), $1
          from zumsavdo.product p
          left join zumsavdo.product_census c
                 on c.pass = $1 and c.product_id = p.id and c.product_id > $2 and c.product_id <= $3
         where p.id > $2 and p.id <= $3 and p.shop_id is not null and p.category_id is not null
         group by p.shop_id, p.category_id
      $q$, 'tahlil_census_qism_' || x)
      using s.census_pass, s.kursor, v_hi;
      select max(c.observed_at)::date into v_sana2
        from zumsavdo.product_census c
       where c.pass = s.census_pass and c.product_id > s.kursor and c.product_id <= v_hi;
      update zumsavdo.tahlil_qurilish q
         set kursor = v_hi,
             census_sana = greatest(q.census_sana, v_sana2),
             bosqich = case when v_hi >= coalesce(q.kursor_max, 0) then 'census_yig' else 'census' end
       where q.id = 1;

    elsif v_bosqich = 'census_yig' then
      execute format($q$
        insert into zumsavdo.%I (dokon, turkum, tovarlar, sharhli, sharh, dokon_buyurtma, eng_eski_id, pass)
        select q.dokon, q.turkum, sum(q.tovarlar), sum(q.sharhli), sum(q.sharh), max(q.dokon_buyurtma), min(q.eng_eski_id), $1
          from zumsavdo.%I q
         group by q.dokon, q.turkum
      $q$, 'tahlil_census_dt_' || x, 'tahlil_census_qism_' || x)
      using s.census_pass;
      get diagnostics v_n = row_count;
      execute format('truncate zumsavdo.%I', 'tahlil_census_qism_' || x);
      execute format('analyze zumsavdo.%I', 'tahlil_census_dt_' || x);
      update zumsavdo.tahlil_qurilish q
         set bosqich = 'dokon_turkum', kursor = 0,
             qatorlar = q.qatorlar || jsonb_build_object('census_dt', v_n)
       where q.id = 1;

    elsif v_bosqich = 'census_nusxa' then
      execute format('insert into zumsavdo.%I select * from zumsavdo.%I', 'tahlil_census_dt_' || x, 'tahlil_census_dt_' || s.faol);
      get diagnostics v_n = row_count;
      execute format('analyze zumsavdo.%I', 'tahlil_census_dt_' || x);
      update zumsavdo.tahlil_qurilish q
         set bosqich = 'dokon_turkum', kursor = 0, census_sana = q.faol_census_sana,
             qatorlar = q.qatorlar || jsonb_build_object('census_dt', v_n)
       where q.id = 1;

    -- ---------------------------------------------------------- doʻkon × turkum: bitta qadam
    -- Bitta ketma-ket oʻqish + saralash (work_mem 16MB, diskka toʻkiladi — xotira oshmaydi).
    -- Doʻkon boʻyicha boʻlaklash indeks orqali jadvalni tartibsiz qayta-qayta oʻqirdi — bu arzonroq.
    elsif v_bosqich = 'dokon_turkum' then
      execute format($q$
        insert into zumsavdo.%I (dokon, turkum, tovarlar, olchangan, sotgan, dona, tushum, narx_med, reyting_ort, sharh,
                                 sharh_osish, chegirma_ort, tugagan, yangi, s7, k7, s23, k23, eng_yaxshi_tovar)
        select t.dokon,
               t.turkum,
               count(*),
               count(*) filter (where t.oyiga is not null),
               count(*) filter (where t.hisobga and t.oyiga >= 1),
               coalesce(sum(t.oyiga) filter (where t.hisobga), 0)::bigint,
               coalesce(sum(t.tushum), 0)::bigint,
               percentile_cont(0.5) within group (order by t.narx),
               avg(t.reyting),
               coalesce(sum(t.sharh), 0)::bigint,
               coalesce(sum(t.sharh_osish), 0)::bigint,
               avg(t.chegirma),
               count(*) filter (where t.holat = 'tugagan'),
               count(*) filter (where t.yosh_kun <= 60),
               coalesce(sum(t.s7), 0)::bigint,
               coalesce(sum(t.k7), 0)::bigint,
               coalesce(sum(t.s23), 0)::bigint,
               coalesce(sum(t.k23), 0)::bigint,
               (array_agg(t.product_id order by t.tushum desc nulls last, t.product_id))[1]
          from zumsavdo.%I t
         where t.dokon is not null and t.turkum is not null
         group by t.dokon, t.turkum
      $q$, 'tahlil_dokon_turkum_' || x, 'tahlil_tovar_' || x);
      get diagnostics v_n = row_count;
      execute format('analyze zumsavdo.%I', 'tahlil_dokon_turkum_' || x);
      update zumsavdo.tahlil_qurilish q
         set bosqich = 'dokon', kursor = 0,
             qatorlar = q.qatorlar || jsonb_build_object('dokon_turkum', v_n)
       where q.id = 1;

    -- ---------------------------------------------------------- doʻkon: bitta qadam
    elsif v_bosqich = 'dokon' then
      execute format($q$
        insert into zumsavdo.%1$I (dokon, nom, jami_buyurtma, census_tovarlar, census_sharhli, tovarlar, olchangan, sotgan,
                                   dona, tushum, turkumlar, asosiy_turkum, eng_yaxshi_tovar, reyting_ort, sharh, tugagan,
                                   yangi, eng_eski_id, yosh_kun)
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
            from zumsavdo.%2$I d
           group by d.dokon
        ),
        c as (
          select c.dokon, sum(c.tovarlar)::bigint as census_tovarlar, sum(c.sharhli)::bigint as census_sharhli,
                 max(c.dokon_buyurtma) as jami_buyurtma, min(c.eng_eski_id) as eng_eski_id
            from zumsavdo.%3$I c
           group by c.dokon
        )
        select coalesce(a.dokon, c.dokon),
               s.name,
               c.jami_buyurtma,
               coalesce(c.census_tovarlar, 0),
               coalesce(c.census_sharhli, 0),
               coalesce(a.tovarlar, 0),
               coalesce(a.olchangan, 0),
               coalesce(a.sotgan, 0),
               coalesce(a.dona, 0),
               coalesce(a.tushum, 0),
               coalesce(a.turkumlar, 0),
               a.asosiy_turkum,
               a.eng_yaxshi_tovar,
               a.reyting_ort,
               coalesce(a.sharh, 0),
               coalesce(a.tugagan, 0),
               coalesce(a.yangi, 0),
               c.eng_eski_id,
               zumsavdo.tahlil_yosh(c.eng_eski_id, k.ids, k.sanalar, current_date)
          from a
          full join c on c.dokon = a.dokon
          cross join k
          left join zumsavdo.shop s on s.id = coalesce(a.dokon, c.dokon)
      $q$, 'tahlil_dokon_' || x, 'tahlil_dokon_turkum_' || x, 'tahlil_census_dt_' || x);
      get diagnostics v_n = row_count;
      execute format('analyze zumsavdo.%I', 'tahlil_dokon_' || x);
      update zumsavdo.tahlil_qurilish q
         set bosqich = 'turkum', kursor = 0,
             qatorlar = q.qatorlar || jsonb_build_object('dokon', v_n)
       where q.id = 1;

    -- ---------------------------------------------------------- turkum: bir chuqurlikdagi guruh
    elsif v_bosqich = 'turkum' then
      -- Tartib: chuqurroq tugunlar avval (kichik ostki daraxt — katta guruh), ildiz oxirida yolgʻiz.
      select k.chuqurlik into v_chuq
        from zumsavdo.turkum k
       where (100 - k.chuqurlik)::bigint * 1000000000 + k.id > s.kursor
       order by (100 - k.chuqurlik)::bigint * 1000000000 + k.id
       limit 1;
      if v_chuq is null then
        update zumsavdo.tahlil_qurilish q set bosqich = 'yakun', kursor = 0 where q.id = 1;
      else
        v_limit := case when v_chuq >= 4 then 1000 when v_chuq = 3 then 300 when v_chuq = 2 then 40
                        when v_chuq = 1 then 2 else 1 end;
        select array_agg(z.id order by z.id), max((100 - z.chuqurlik)::bigint * 1000000000 + z.id)
          into v_tugunlar, v_hi
          from (select k.id, k.chuqurlik
                  from zumsavdo.turkum k
                 where k.chuqurlik = v_chuq
                   and (100 - k.chuqurlik)::bigint * 1000000000 + k.id > s.kursor
                 order by k.id
                 limit v_limit) z;
        execute format($q$
          insert into zumsavdo.%1$I (turkum, nom, yol_nomi, chuqurlik, barg, ota_id, sotuvchilar, sotgan_sotuvchilar, tovarlar,
                                     olchangan, sotgan_tovarlar, dona, tushum, top20_tushum, top10_tushum, tugagan, yangi,
                                     s7, k7, s23, k23, narx_med, census_sotuvchilar, census_sotgan_sotuvchilar,
                                     census_tovarlar, census_sharhli)
          with b as (select unnest($1::bigint[]) as tugun),
          ich as (
            -- tugun va uning hamma avlodlari (ota turkum = ostki daraxt yigʻindisi)
            select b.tugun, s.id as turkum from b join zumsavdo.turkum s on s.yol @> array[b.tugun]
          ),
          dt as (
            select ich.tugun, d.dokon,
                   sum(d.tovarlar)::bigint as tovarlar, sum(d.olchangan)::bigint as olchangan,
                   sum(d.sotgan)::bigint as sotgan, sum(d.dona)::bigint as dona, sum(d.tushum)::bigint as tushum,
                   sum(d.tugagan)::bigint as tugagan, sum(d.yangi)::bigint as yangi,
                   sum(d.s7)::bigint as s7, sum(d.k7)::bigint as k7, sum(d.s23)::bigint as s23, sum(d.k23)::bigint as k23
              from ich join zumsavdo.%2$I d on d.turkum = ich.turkum
             group by ich.tugun, d.dokon
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
            select ich.tugun,
                   count(distinct c.dokon)                                    as census_sotuvchilar,
                   count(distinct c.dokon) filter (where c.sharhli > 0)       as census_sotgan_sotuvchilar,
                   sum(c.tovarlar)::bigint                                    as census_tovarlar,
                   sum(c.sharhli)::bigint                                     as census_sharhli
              from ich join zumsavdo.%3$I c on c.turkum = ich.turkum
             group by ich.tugun
          ),
          narx as (
            select ich.tugun, percentile_cont(0.5) within group (order by t.narx) as narx_med
              from ich join zumsavdo.%4$I t on t.turkum = ich.turkum
             where t.narx is not null
             group by ich.tugun
          )
          select k.id, k.nom, k.yol_nomi, k.chuqurlik, k.barg, k.ota_id,
                 coalesce(agg.sotuvchilar, 0),
                 coalesce(agg.sotgan_sotuvchilar, 0),
                 coalesce(agg.tovarlar, 0),
                 coalesce(agg.olchangan, 0),
                 coalesce(agg.sotgan_tovarlar, 0),
                 coalesce(agg.dona, 0),
                 coalesce(agg.tushum, 0),
                 coalesce(agg.top20_tushum, 0),
                 coalesce(agg.top10_tushum, 0),
                 coalesce(agg.tugagan, 0),
                 coalesce(agg.yangi, 0),
                 coalesce(agg.s7, 0), coalesce(agg.k7, 0), coalesce(agg.s23, 0), coalesce(agg.k23, 0),
                 narx.narx_med,
                 coalesce(cen.census_sotuvchilar, 0),
                 coalesce(cen.census_sotgan_sotuvchilar, 0),
                 coalesce(cen.census_tovarlar, 0),
                 coalesce(cen.census_sharhli, 0)
            from b
            join zumsavdo.turkum k on k.id = b.tugun
            left join agg on agg.tugun = k.id
            left join cen on cen.tugun = k.id
            left join narx on narx.tugun = k.id
        $q$, 'tahlil_turkum_' || x, 'tahlil_dokon_turkum_' || x, 'tahlil_census_dt_' || x, 'tahlil_tovar_' || x)
        using v_tugunlar;
        get diagnostics v_n = row_count;
        update zumsavdo.tahlil_qurilish q
           set kursor = v_hi,
               qatorlar = q.qatorlar || jsonb_build_object('turkum', coalesce((q.qatorlar->>'turkum')::bigint, 0) + v_n)
         where q.id = 1;
      end if;

    -- ---------------------------------------------------------- yakun: koʻrinishlar bir lahzada yangisiga
    elsif v_bosqich = 'yakun' then
      execute format('analyze zumsavdo.%I', 'tahlil_turkum_' || x);
      execute format('create or replace view zumsavdo.tahlil_tovar as select * from zumsavdo.%I', 'tahlil_tovar_' || x);
      execute format('create or replace view zumsavdo.tahlil_census_dt as select * from zumsavdo.%I', 'tahlil_census_dt_' || x);
      execute format('create or replace view zumsavdo.tahlil_dokon_turkum as select * from zumsavdo.%I', 'tahlil_dokon_turkum_' || x);
      execute format('create or replace view zumsavdo.tahlil_dokon as select * from zumsavdo.%I', 'tahlil_dokon_' || x);
      execute format('create or replace view zumsavdo.tahlil_turkum as select * from zumsavdo.%I', 'tahlil_turkum_' || x);

      insert into zumsavdo.tahlil_jurnal (boshlandi, sana, census_pass, census_sana, daraxt, yangilandi, qatorlar)
      values (s.boshlandi, s.sana, s.census_pass, s.census_sana, s.daraxt,
              array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum'],
              s.qatorlar || jsonb_build_object('nusxa', x, 'qadamlar', s.qadamlar + 1,
                                               'daqiqa', round(extract(epoch from clock_timestamp() - s.boshlandi)::numeric / 60, 1)));

      update zumsavdo.tahlil_qurilish q
         set faol = x, quriladi = null, bosqich = null, kursor = null, kursor_max = null, tozala = q.faol,
             faol_sana = q.sana, faol_census_pass = q.census_pass, faol_census_sana = q.census_sana, faol_daraxt = q.daraxt
       where q.id = 1;

      -- pg_cron oʻz jurnalini oʻzi tozalamaydi (daqiqada bitta yozuv) — 7 kundan eskisi oʻchiriladi.
      if pg_catalog.to_regclass('cron.job_run_details') is not null then
        execute 'delete from cron.job_run_details where end_time < now() - interval ''7 days''';
      end if;
    else
      raise exception 'tahlil_qadam: nomaʼlum bosqich %', v_bosqich;
    end if;
  exception
    when query_canceled then
      v_xato := 'vaqt tugadi (statement_timeout): ' || coalesce(v_bosqich, '?');
    when others then
      get stacked diagnostics v_xato = message_text;
  end;

  if v_xato is not null then
    update zumsavdo.tahlil_qurilish q
       set xato_soni = q.xato_soni + 1, oxirgi_xato = left(v_bosqich || ': ' || v_xato, 500), qadam_vaqti = clock_timestamp()
     where q.id = 1;
    return jsonb_build_object('xato', v_xato, 'bosqich', v_bosqich, 'davom', false);
  end if;

  update zumsavdo.tahlil_qurilish q
     set qadamlar = q.qadamlar + 1, qadam_vaqti = clock_timestamp(), xato_soni = 0, oxirgi_xato = null
   where q.id = 1
  returning jsonb_build_object('bosqich', coalesce(q.bosqich, 'tayyor'), 'kursor', q.kursor, 'nusxa', coalesce(q.quriladi, q.faol),
                               'qadamlar', q.qadamlar, 'davom', q.quriladi is not null or q.tozala is not null,
                               'soniya', round(extract(epoch from clock_timestamp() - v_boshi)::numeric, 2))
    into v_natija;
  return v_natija;
end;
$$;

-- Nofaol nusxani tozalash (qurilish boshida): boʻshatish + qayta yasaladigan indekslar.
create or replace function zumsavdo.tahlil_nusxa_tozala(p_x text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_x not in ('a', 'b') then
    raise exception 'tahlil_nusxa_tozala: nusxa a yoki b boʻlishi kerak: %', p_x;
  end if;
  if p_x = (select q.faol from zumsavdo.tahlil_qurilish q where q.id = 1) then
    raise exception 'tahlil_nusxa_tozala: faol nusxani tozalab boʻlmaydi: %', p_x;
  end if;
  execute format('truncate zumsavdo.%I, zumsavdo.%I, zumsavdo.%I, zumsavdo.%I, zumsavdo.%I, zumsavdo.%I',
                 'tahlil_tovar_' || p_x, 'tahlil_census_dt_' || p_x, 'tahlil_census_qism_' || p_x,
                 'tahlil_dokon_turkum_' || p_x, 'tahlil_dokon_' || p_x, 'tahlil_turkum_' || p_x);
  execute format('drop index if exists zumsavdo.%I', 'tahlil_tovar_' || p_x || '_turkum_idx');
  execute format('drop index if exists zumsavdo.%I', 'tahlil_tovar_' || p_x || '_dokon_idx');
  execute format('drop index if exists zumsavdo.%I', 'tahlil_tovar_' || p_x || '_tushum_idx');
end;
$$;

revoke all on function zumsavdo.tahlil_qadam(boolean) from public, anon, authenticated;
revoke all on function zumsavdo.tahlil_nusxa_tozala(text) from public, anon, authenticated;
revoke all on function zumsavdo.tahlil_tunmi(timestamptz) from public, anon, authenticated;

-- ============================================================ 6. jadval (faqat kechasi)

-- pg_cron 0081 da oʻrnatilgan. `create extension` bu yerda QAYTA chaqirilmaydi: Supabase
-- uning ortidan huquqlarni qayta beradi va 0081 dagi `grant … to postgres` sabab
-- «dependent privileges exist» bilan butun migratsiya qaytadi (10.11 da shunday boʻldi).
do $$
begin
  if not exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    raise notice '0082: pg_cron yoʻq — jadval qoʻyilmadi';
    return;
  end if;
  if exists (select 1 from cron.job where jobname = 'zumsavdo-tahlil') then
    perform cron.unschedule('zumsavdo-tahlil');
  end if;
  -- Daqiqada bitta qadam, faqat UTC 20:00–02:59. Qadam 60 s dan oshsa — bekor (xato yoziladi).
  perform cron.schedule(
    'zumsavdo-tahlil',
    '* 20-23,0-2 * * *',
    $cmd$set statement_timeout = '60s'; select zumsavdo.tahlil_qadam();$cmd$
  );
end $$;
