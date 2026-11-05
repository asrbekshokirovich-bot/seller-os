-- 0080 — AI tahlilchining asboblari (2026-11-05).
--
-- QOIDALAR §3: «LLM SQL yozmaydi — faqat tayyor funksiyalarni chaqiradi; raqamni kod beradi».
-- Bu fayldagi funksiyalar — oʻsha tayyor funksiyalar. AI (Edge Function, `tahlilchi.ts`) ularga
-- faqat TEKSHIRILGAN parametr beradi (turkum raqamlari, narx oraligʻi, saralash nomi …);
-- har raqamni shu yerdagi SQL hisoblaydi, AI uni tushuntiradi va solishtiradi.
--
-- Manba — 0079 dagi tayyor jadvallar. Har javobda `holat`: maʼlumot sanasi (30 kunlik oyna
-- oxiri), oxirgi toʻliq perepis va uning sanasi — AI raqam yonida davrni aytadi (QOIDALAR §4).
--
-- Filtr (`p_filtr`, jsonb, kalitlari ixtiyoriy):
--   turkumlar [id…] — daraxt tugunlari (ota boʻlsa — hamma barglari); boʻsh — butun bozor;
--   narx_min, narx_max (soʻm), reyting_min, sharh_min, oyiga_min, oyiga_max (dona/oy),
--   tushum_min (soʻm/oy), faqat_bor (qoldigʻi bor), yangi_kun (tovar yoshi ≤ N kun),
--   chegirma_min (%), dokon (id), soz (nomida shu soʻz bor).
--
-- «Eng yaxshi 20%» (nazoratchi qarori, 2026-11-05): qamrovdagi sotuvchilar oylik tushum
-- boʻyicha tartiblanadi, yuqori 20% i «yaxshi». Tushumi 0 sotuvchi hech qachon «yaxshi» emas.
--
-- Hammasi faqat service_role (Edge Function).

-- ============================================================ yordamchilar

create or replace function zumsavdo.tahlil_holati()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'sana', j.sana,
    'census_pass', j.census_pass,
    'census_sana', j.census_sana,
    'yangilandi', j.tugadi,
    'daraxt', exists (select 1 from zumsavdo.turkum)
  )
  from (select 1) x
  left join lateral (select * from zumsavdo.tahlil_jurnal order by id desc limit 1) j on true;
$$;

-- Tugunlar → barglar. Daraxtda yoʻq raqam (daraxt hali yuklanmagan yoki yangi barg) — barg deb
-- olinadi (jim tashlanmaydi). Boʻsh roʻyxat — null: butun bozor.
create or replace function zumsavdo.tahlil_barglar(p_turkumlar bigint[])
returns bigint[]
language sql
stable
set search_path = ''
as $$
  select case
    when p_turkumlar is null or cardinality(p_turkumlar) = 0 then null
    else (select coalesce(array_agg(distinct s.x), '{}'::bigint[])
            from (select k.id as x from zumsavdo.turkum k where k.barg and k.yol && p_turkumlar
                  union all
                  select u from unnest(p_turkumlar) u
                   where not exists (select 1 from zumsavdo.turkum k where k.id = u)) s)
  end;
$$;

create or replace function zumsavdo.tahlil_turkumlari(p_filtr jsonb)
returns bigint[]
language sql
immutable
set search_path = ''
as $$
  select array(select (jsonb_array_elements_text(
    case when jsonb_typeof(p_filtr->'turkumlar') = 'array' then p_filtr->'turkumlar' else '[]'::jsonb end))::bigint);
$$;

-- Qamrov tavsifi: qaysi turkumlar (toʻliq yoʻli bilan), nechta barg, qanday filtr.
create or replace function zumsavdo.tahlil_qamrov(p_filtr jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'turkumlar', coalesce((
      select jsonb_agg(jsonb_build_object('id', u, 'yol', coalesce(k.yol_nomi, c.name, 'nomaʼlum turkum')) order by u)
        from unnest(zumsavdo.tahlil_turkumlari(p_filtr)) u
        left join zumsavdo.turkum k on k.id = u
        left join zumsavdo.category c on c.id = u), '[]'::jsonb),
    'barglar', cardinality(zumsavdo.tahlil_barglar(zumsavdo.tahlil_turkumlari(p_filtr))),
    'filtr', coalesce(p_filtr, '{}'::jsonb) - 'turkumlar'
  );
$$;

-- Filtrdagi tovarlar (tayyor jadvaldan).
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

-- Filtrda tovar darajasidagi shart bormi (turkumdan boshqa). Yoʻq boʻlsa — doʻkon×barg
-- jadvali (tez); bor boʻlsa — tovar qatorlari.
create or replace function zumsavdo.tahlil_tovar_filtri_bor(p_filtr jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (select 1 from jsonb_each(coalesce(p_filtr, '{}'::jsonb) - 'turkumlar') e
                  where e.value <> 'null'::jsonb and e.value <> 'false'::jsonb);
$$;

-- Bitta tovar → AI ga koʻrsatiladigan shakl (tayyor jadvaldan, raqami boʻyicha).
create or replace function zumsavdo.tahlil_tovar_json(p_id bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', t.product_id, 'nom', left(t.nom, 120), 'narx', t.narx,
    'oyiga', t.oyiga, 'holat', t.holat, 'ishonch', t.ishonch,
    'tushum_oyiga', t.tushum, 'tushum_mln', round(t.tushum / 1e6, 1),
    'reyting', t.reyting, 'sharh', t.sharh, 'sharh_30kun', t.sharh_osish, 'chegirma', t.chegirma,
    'tugagan', t.holat = 'tugagan', 'yosh_kun', t.yosh_kun,
    'kunlik_oxirgi7', case when t.k7 > 0 then round(t.s7::numeric / t.k7, 1) end,
    'kunlik_oldingi', case when t.k23 > 0 then round(t.s23::numeric / t.k23, 1) end,
    'dokon', t.dokon, 'dokon_nomi', (select s.name from zumsavdo.shop s where s.id = t.dokon),
    'turkum', t.turkum, 'turkum_yoli', coalesce((select k.yol_nomi from zumsavdo.turkum k where k.id = t.turkum),
                                                (select c.name from zumsavdo.category c where c.id = t.turkum)),
    'havola', 'https://uzum.uz/uz/product/' || t.product_id
  ))
  from zumsavdo.tahlil_tovar t
  where t.product_id = p_id;
$$;

-- ============================================================ 1. turkum qidirish

create or replace function public.so_tahlil_turkum_top(p_soz text, p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lim   integer := least(greatest(coalesce(p_limit, 8), 1), 20);
  v_norm  text := btrim(zumsavdo.norm(coalesce(p_soz, '')));
  v_ildiz text[];
  v_natija jsonb;
begin
  -- Soʻz oʻzagi: oʻzbekcha qoʻshimcha («-lar», «-lari», «-ning») qidiruvni buzmasin.
  select coalesce(array_agg(case when length(w) > 5 then left(w, greatest(4, length(w) - 3)) else w end), '{}')
    into v_ildiz
    from regexp_split_to_table(v_norm, '[^[:alnum:]]+') w
   where length(w) >= 2;

  if exists (select 1 from zumsavdo.turkum) then
    select coalesce(jsonb_agg(x.j order by x.tartib, x.tushum desc nulls last, x.id), '[]'::jsonb) into v_natija
      from (
        select k.id, coalesce(tt.tushum, 0) as tushum,
               case when zumsavdo.norm(k.nom) = v_norm then 0
                    when (select bool_and(zumsavdo.norm(k.nom) like '%' || w || '%') from unnest(v_ildiz) w) then 1
                    else 2 end + k.chuqurlik * 0.01 as tartib,
               jsonb_strip_nulls(jsonb_build_object(
                 'id', k.id, 'nom', k.nom, 'yol', k.yol_nomi, 'barg', k.barg, 'chuqurlik', k.chuqurlik,
                 'bolalar', (select count(*) from zumsavdo.turkum b where b.ota_id = k.id),
                 'tovarlar', tt.tovarlar, 'sotuvchilar', tt.sotuvchilar,
                 'tushum_mln', round(tt.tushum / 1e6, 1))) as j
          from zumsavdo.turkum k
          left join zumsavdo.tahlil_turkum tt on tt.turkum = k.id
         where k.chuqurlik > 0
           and (cardinality(v_ildiz) = 0 and k.chuqurlik = 1
                or cardinality(v_ildiz) > 0
                   and (select bool_and(zumsavdo.norm(k.yol_nomi) like '%' || w || '%') from unnest(v_ildiz) w))
         order by 3, 2 desc nulls last, k.id
         limit v_lim
      ) x;
  else
    -- Daraxt hali yoʻq: faqat barg nomlari (perepis lugʻati).
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nom', c.name, 'yol', c.name, 'barg', true)
                              order by c.id), '[]'::jsonb) into v_natija
      from (select c.id, c.name from zumsavdo.category c
             where cardinality(v_ildiz) > 0
               and (select bool_and(zumsavdo.norm(c.name) like '%' || w || '%') from unnest(v_ildiz) w)
             order by c.id limit v_lim) c;
  end if;

  return jsonb_build_object('holat', zumsavdo.tahlil_holati(), 'soz', p_soz, 'topildi', v_natija);
end;
$$;

-- ============================================================ 2. bozor kesimi

create or replace function public.so_tahlil_bozor(p_filtr jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_filtr    jsonb := coalesce(p_filtr, '{}'::jsonb);
  v_barglar  bigint[] := zumsavdo.tahlil_barglar(zumsavdo.tahlil_turkumlari(v_filtr));
  v_tovarda  boolean := zumsavdo.tahlil_tovar_filtri_bor(v_filtr);
  v_dokonlar jsonb;
  v_tovarlar jsonb;
  v_narx     jsonb;
  v_census   jsonb;
  v_top_t    jsonb;
  v_top_d    jsonb;
begin
  perform set_config('work_mem', '32MB', true);

  -- Doʻkon darajasi.
  with d as (
    select x.dokon, sum(x.tushum)::bigint as tushum, sum(x.dona)::bigint as dona, sum(x.tovarlar)::bigint as tovarlar
      from (
        select dt.dokon, dt.tushum, dt.dona, dt.tovarlar
          from zumsavdo.tahlil_dokon_turkum dt
         where not v_tovarda and (v_barglar is null or dt.turkum = any(v_barglar))
        union all
        select t.dokon, coalesce(t.tushum, 0), case when t.hisobga then t.oyiga else 0 end, 1
          from zumsavdo.tahlil_filtrla(v_filtr) t
         where v_tovarda and t.dokon is not null
      ) x
     group by x.dokon
  ),
  r as (select d.*, row_number() over (order by d.tushum desc, d.dokon) as orin, count(*) over () as n,
               sum(d.tushum) over () as jami from d)
  select jsonb_build_object(
           'jami', count(*),
           'sotgan', count(*) filter (where r.tushum > 0),
           'sotmagan', count(*) filter (where r.tushum = 0),
           'top20_soni', count(*) filter (where r.orin <= ceil(r.n * 0.2) and r.tushum > 0),
           'top20_ulush_foiz', round(100.0 * sum(r.tushum) filter (where r.orin <= ceil(r.n * 0.2)) / nullif(max(r.jami), 0), 1),
           'top10_ulush_foiz', round(100.0 * sum(r.tushum) filter (where r.orin <= 10) / nullif(max(r.jami), 0), 1),
           'tushum_oyiga', coalesce(sum(r.tushum), 0),
           'tushum_mln', round(coalesce(sum(r.tushum), 0) / 1e6, 1),
           'dona_oyiga', coalesce(sum(r.dona), 0)),
         (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', r2.dokon, 'nom', s.name, 'tushum_mln', round(r2.tushum / 1e6, 1), 'dona_oyiga', r2.dona,
                    'tovarlar', r2.tovarlar, 'ulush_foiz', round(100.0 * r2.tushum / nullif(r2.jami, 0), 1))
                  order by r2.orin), '[]'::jsonb)
            from r r2 left join zumsavdo.shop s on s.id = r2.dokon
           where r2.orin <= 3 and r2.tushum > 0)
    into v_dokonlar, v_top_d
    from r;

  -- Tovar darajasi: soni, holatlar, narx zinapoyasi, trend, eng koʻp sotilganlar.
  with t as (select * from zumsavdo.tahlil_filtrla(v_filtr)),
  b as (select t.*, ntile(5) over (order by t.narx) as pog from t where t.narx is not null)
  select jsonb_build_object(
           'jami', (select count(*) from t),
           'olchangan', (select count(*) from t where t.oyiga is not null),
           'sotgan', (select count(*) from t where t.hisobga and t.oyiga >= 1),
           'sotilyapti_30plus', (select count(*) from t where t.hisobga and t.oyiga >= 30),
           'tugagan', (select count(*) from t where t.holat = 'tugagan'),
           'ziddiyat', (select count(*) from t where t.holat = 'ziddiyat'),
           'yangi_60kun', (select count(*) from t where t.yosh_kun <= 60),
           'yangi_60kun_sotgan', (select count(*) from t where t.yosh_kun <= 60 and t.hisobga and t.oyiga >= 1),
           'narx_mediana', (select round(percentile_cont(0.5) within group (order by t.narx)) from t where t.narx is not null),
           'reyting_ortacha', (select round(avg(t.reyting), 2) from t),
           'kunlik_oxirgi7', (select round(sum(t.s7)::numeric / nullif(sum(t.k7), 0) * count(*), 0) from t where t.k7 > 0),
           'kunlik_oldingi', (select round(sum(t.s23)::numeric / nullif(sum(t.k23), 0) * count(*), 0) from t where t.k23 > 0)),
         (select coalesce(jsonb_agg(z.j order by z.pog), '[]'::jsonb) from (
            select b.pog, jsonb_build_object(
                     'narx_dan', min(b.narx), 'narx_gacha', max(b.narx), 'tovarlar', count(*),
                     'sotgan', count(*) filter (where b.hisobga and b.oyiga >= 1),
                     'dona_oyiga', coalesce(sum(b.oyiga) filter (where b.hisobga), 0),
                     'tushum_ulush_foiz', round(100.0 * coalesce(sum(b.tushum), 0)
                                                / nullif((select sum(t2.tushum) from t t2), 0), 1)) as j
              from b group by b.pog) z),
         (select coalesce(jsonb_agg(zumsavdo.tahlil_tovar_json(t3.product_id) order by t3.tushum desc), '[]'::jsonb)
            from (select t.product_id, t.tushum from t where t.tushum > 0 order by t.tushum desc, t.product_id limit 3) t3)
    into v_tovarlar, v_narx, v_top_t;

  -- Shu paytgacha (perepis) — faqat turkum filtri boʻlganda (tovar shartlari perepisda yoʻq).
  if not v_tovarda then
    select jsonb_build_object(
             'sotuvchilar', count(distinct c.dokon),
             'sotgan_sotuvchilar', count(distinct c.dokon) filter (where c.sharhli > 0),
             'tovarlar', coalesce(sum(c.tovarlar), 0),
             'sharhli_tovarlar', coalesce(sum(c.sharhli), 0),
             'izoh', 'Perepis: hamma qoʻyilgan tovarlar (olib tashlanganlari ham). «Sotgan» — kamida bitta tovari sharh olgan (sotuvi isbotlangan; sharh yozilmagan sotuv sanalmaydi).')
      into v_census
      from zumsavdo.tahlil_census_dt c
     where v_barglar is null or c.turkum = any(v_barglar);
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'holat', zumsavdo.tahlil_holati(),
    'qamrov', zumsavdo.tahlil_qamrov(v_filtr),
    'sotuvchilar_30kun', v_dokonlar,
    'tovarlar_30kun', v_tovarlar,
    'narx_zinapoyasi', v_narx,
    'shu_paytgacha', v_census,
    'eng_kop_sotgan_tovarlar', v_top_t,
    'eng_katta_dokonlar', v_top_d,
    'izoh', 'Sotuv — qoldiq kamayishidan, tovar-sotuvi-v1 (taxminiy, pastga qiyshiq: zaxira toʻldirish kunlari sotuvni yashiradi). «Ziddiyat» tovarlar sotuvga qoʻshilmagan.'
  ));
end;
$$;

-- ============================================================ 3. sotuvchilar tahlili

create or replace function public.so_tahlil_sotuvchilar(p_filtr jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_filtr   jsonb := coalesce(p_filtr, '{}'::jsonb);
  v_barglar bigint[] := zumsavdo.tahlil_barglar(zumsavdo.tahlil_turkumlari(v_filtr));
  v_tovarda boolean := zumsavdo.tahlil_tovar_filtri_bor(v_filtr);
  v_poglar  jsonb;
  v_misol   jsonb;
  v_census  jsonb;
  v_narx    numeric;
begin
  perform set_config('work_mem', '32MB', true);

  select percentile_cont(0.5) within group (order by t.narx) into v_narx
    from zumsavdo.tahlil_filtrla(v_filtr) t where t.narx is not null;

  with d as (
    select x.dokon,
           sum(x.tovarlar)::bigint as tovarlar, sum(x.sotgan)::bigint as sotgan, sum(x.dona)::bigint as dona,
           sum(x.tushum)::bigint as tushum, sum(x.tugagan)::bigint as tugagan, sum(x.yangi)::bigint as yangi,
           sum(x.sharh)::bigint as sharh,
           sum(x.reyting * x.tovarlar) / nullif(sum(x.tovarlar) filter (where x.reyting is not null), 0) as reyting,
           sum(x.chegirma * x.tovarlar) / nullif(sum(x.tovarlar) filter (where x.chegirma is not null), 0) as chegirma,
           sum(x.narx * x.tovarlar) / nullif(sum(x.tovarlar) filter (where x.narx is not null), 0) as narx
      from (
        select dt.dokon, dt.tovarlar, dt.sotgan, dt.dona, dt.tushum, dt.tugagan, dt.yangi, dt.sharh,
               dt.reyting_ort as reyting, dt.chegirma_ort as chegirma, dt.narx_med::numeric as narx
          from zumsavdo.tahlil_dokon_turkum dt
         where not v_tovarda and (v_barglar is null or dt.turkum = any(v_barglar))
        union all
        select t.dokon, 1, (t.hisobga and t.oyiga >= 1)::int, case when t.hisobga then t.oyiga else 0 end,
               coalesce(t.tushum, 0), (t.holat = 'tugagan')::int, (t.yosh_kun <= 60)::int, coalesce(t.sharh, 0),
               t.reyting, t.chegirma::numeric, t.narx::numeric
          from zumsavdo.tahlil_filtrla(v_filtr) t
         where v_tovarda and t.dokon is not null
      ) x
     group by x.dokon
  ),
  r as (
    select d.*, row_number() over (order by d.tushum desc, d.dokon) as orin, count(*) over () as n,
           sum(d.tushum) over () as jami, td.yosh_kun, td.jami_buyurtma, td.nom
      from d left join zumsavdo.tahlil_dokon td on td.dokon = d.dokon
  ),
  p as (
    select r.*,
           case when r.tushum <= 0 then '4_sotmagan'
                when r.orin <= ceil(r.n * 0.2) then '1_eng_yaxshi_20'
                when r.orin <= ceil(r.n * 0.5) then '2_orta_30'
                else '3_past' end as pog
      from r
  ),
  g as (
    select p.pog,
           count(*) as soni,
           round(100.0 * count(*) / nullif(max(p.n), 0), 1) as sotuvchilar_foiz,
           round(100.0 * sum(p.tushum) / nullif(max(p.jami), 0), 1) as tushum_ulush_foiz,
           round(min(p.tushum) / 1e6, 1) as tushum_min_mln,
           round(max(p.tushum) / 1e6, 1) as tushum_max_mln,
           round((percentile_cont(0.5) within group (order by p.tushum) / 1e6)::numeric, 2) as tushum_mediana_mln,
           percentile_cont(0.5) within group (order by p.tovarlar) as tovar_soni_mediana,
           round(avg(p.tovarlar), 1) as tovar_soni_ortacha,
           round(percentile_cont(0.5) within group (order by p.narx)) as narx_mediana,
           round((percentile_cont(0.5) within group (order by p.narx) / nullif(v_narx, 0))::numeric, 2) as narx_qamrovga_nisbat,
           round(avg(p.reyting), 2) as reyting_ortacha,
           round(percentile_cont(0.5) within group (order by p.sharh::numeric / nullif(p.tovarlar, 0))::numeric, 1) as sharh_tovarga_mediana,
           round(avg(p.chegirma), 1) as chegirma_ortacha,
           round(100.0 * avg(p.tugagan::numeric / nullif(p.tovarlar, 0)), 1) as tugagan_tovar_foiz,
           round(100.0 * avg(p.yangi::numeric / nullif(p.tovarlar, 0)), 1) as yangi_tovar_foiz,
           percentile_cont(0.5) within group (order by p.yosh_kun) as dokon_yoshi_mediana_kun,
           percentile_cont(0.5) within group (order by p.jami_buyurtma) as jami_buyurtma_mediana
      from p group by p.pog
  )
  select coalesce(jsonb_object_agg(substr(g.pog, 3), jsonb_strip_nulls(to_jsonb(g) - 'pog') order by g.pog), '{}'::jsonb),
         (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', p2.dokon, 'nom', p2.nom, 'tushum_mln', round(p2.tushum / 1e6, 1), 'dona_oyiga', p2.dona,
                    'tovarlar', p2.tovarlar, 'jami_buyurtma', p2.jami_buyurtma, 'yosh_kun', p2.yosh_kun)
                  order by p2.orin), '[]'::jsonb)
            from p p2 where p2.orin <= 5 and p2.tushum > 0)
    into v_poglar, v_misol
    from g;

  if not v_tovarda then
    select jsonb_build_object(
             'sotuvchilar', count(distinct c.dokon),
             'sotgan_sotuvchilar', count(distinct c.dokon) filter (where c.sharhli > 0),
             'hech_sotmagan', count(distinct c.dokon) - count(distinct c.dokon) filter (where c.sharhli > 0))
      into v_census
      from zumsavdo.tahlil_census_dt c
     where v_barglar is null or c.turkum = any(v_barglar);
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'holat', zumsavdo.tahlil_holati(),
    'qamrov', zumsavdo.tahlil_qamrov(v_filtr),
    'qamrov_narx_mediana', round(v_narx),
    'pogonalar_30kun', v_poglar,
    'eng_katta_5', v_misol,
    'shu_paytgacha', v_census,
    'izoh', jsonb_build_array(
      'Pogʻonalar oylik tushum boʻyicha (oxirgi 30 kun): eng_yaxshi_20 — yuqori 20% sotuvchi, orta_30 — keyingi 30%, past — qolgan sotganlar, sotmagan — tushum 0.',
      'Tushum = taxminiy oylik sotuv × oxirgi narx (tovar-sotuvi-v1). Doʻkon yoshi — eng eski tovar raqamidan, taxminiy.',
      'Bu bogʻliqlik, sabab emas: pogʻonalar orasidagi farq — kuzatilgan farq.')
  ));
end;
$$;

-- ============================================================ 4. tovar qidirish («Uzumda filtrlash»)

create or replace function public.so_tahlil_tovarlar(p_filtr jsonb, p_saralash text default 'tushum', p_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_filtr jsonb := coalesce(p_filtr, '{}'::jsonb);
  v_lim   integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_sar   text := coalesce(p_saralash, 'tushum');
  v_jami  jsonb;
  v_ruy   jsonb;
begin
  if v_sar not in ('tushum', 'oyiga', 'trend', 'narx_arzon', 'narx_qimmat', 'reyting', 'sharh', 'yangi') then
    raise exception 'so_tahlil_tovarlar: saralash nomaʼlum: %', v_sar;
  end if;
  perform set_config('work_mem', '32MB', true);

  with t as (select * from zumsavdo.tahlil_filtrla(v_filtr))
  select jsonb_build_object(
           'mos_tovarlar', count(*),
           'sotgan', count(*) filter (where t.hisobga and t.oyiga >= 1),
           'dona_oyiga', coalesce(sum(t.oyiga) filter (where t.hisobga), 0),
           'tushum_mln', round(coalesce(sum(t.tushum), 0) / 1e6, 1),
           'narx_mediana', round(percentile_cont(0.5) within group (order by t.narx)),
           'dokonlar', count(distinct t.dokon))
    into v_jami from t;

  select coalesce(jsonb_agg(zumsavdo.tahlil_tovar_json(x.product_id)
           || jsonb_strip_nulls(jsonb_build_object('osish_marta', round(x.osish, 2))) order by x.tartib), '[]'::jsonb)
    into v_ruy
    from (
      select s.product_id, s.osish,
             row_number() over (order by
               case when v_sar = 'tushum'      then s.tushum end desc nulls last,
               case when v_sar = 'oyiga'       then case when s.hisobga then s.oyiga end end desc nulls last,
               case when v_sar = 'trend'       then s.osish end desc nulls last,
               case when v_sar = 'narx_arzon'  then s.narx end asc nulls last,
               case when v_sar = 'narx_qimmat' then s.narx end desc nulls last,
               case when v_sar = 'reyting'     then s.reyting end desc nulls last,
               case when v_sar = 'sharh'       then s.sharh end desc nulls last,
               case when v_sar = 'yangi'       then s.yosh_kun end asc nulls last,
               s.tushum desc nulls last, s.product_id) as tartib
        from (
          select t.product_id, t.tushum, t.oyiga, t.hisobga, t.narx, t.reyting, t.sharh, t.yosh_kun,
                 case when t.k7 >= 4 and t.k23 >= 10 and t.s7 >= 3
                      then (t.s7::numeric / t.k7) / nullif(t.s23::numeric / t.k23, 0) end as osish
            from zumsavdo.tahlil_filtrla(v_filtr) t
        ) s
       where v_sar <> 'trend' or s.osish is not null
    ) x
   where x.tartib <= v_lim;

  return jsonb_strip_nulls(jsonb_build_object(
    'holat', zumsavdo.tahlil_holati(),
    'qamrov', zumsavdo.tahlil_qamrov(v_filtr),
    'saralash', v_sar,
    'jami', v_jami,
    'tovarlar', v_ruy,
    'izoh', 'oyiga — taxminiy oylik sotuv (dona); trend: osish_marta = oxirgi 7 kunlik kunlik sotuv / oldingi 23 kunniki (faqat yetarli oʻlchovli tovar).'
  ));
end;
$$;

-- ============================================================ 5. doʻkon

create or replace function public.so_tahlil_dokon(p_dokon bigint, p_nom text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id      bigint := p_dokon;
  v_nomzod  jsonb;
  v_d       zumsavdo.tahlil_dokon%rowtype;
  v_orin    jsonb;
begin
  if v_id is null and coalesce(btrim(p_nom), '') <> '' then
    select coalesce(jsonb_agg(jsonb_build_object('id', x.dokon, 'nom', x.nom, 'tushum_mln', round(x.tushum / 1e6, 1))
                              order by x.tushum desc), '[]'::jsonb),
           (array_agg(x.dokon order by (zumsavdo.norm(x.nom) = zumsavdo.norm(p_nom)) desc, x.tushum desc))[1]
      into v_nomzod, v_id
      from (select d.dokon, d.nom, d.tushum from zumsavdo.tahlil_dokon d
             where zumsavdo.norm(d.nom) like '%' || btrim(zumsavdo.norm(p_nom)) || '%'
             order by d.tushum desc limit 5) x;
  end if;

  select * into v_d from zumsavdo.tahlil_dokon d where d.dokon = v_id;
  if v_d.dokon is null then
    return jsonb_build_object('holat', zumsavdo.tahlil_holati(), 'topilmadi', true, 'nomzodlar', coalesce(v_nomzod, '[]'::jsonb));
  end if;

  -- Asosiy turkumdagi oʻrni (tushum boʻyicha).
  select jsonb_build_object(
           'turkum', v_d.asosiy_turkum,
           'turkum_yoli', (select k.yol_nomi from zumsavdo.turkum k where k.id = v_d.asosiy_turkum),
           'sotuvchilar', count(*),
           'orin', count(*) filter (where x.tushum > coalesce(y.tushum, 0)) + 1,
           'yuqori_foiz', round(100.0 * (count(*) filter (where x.tushum > coalesce(y.tushum, 0)) + 1) / nullif(count(*), 0), 1),
           'turkum_tushum_mediana_mln', round((percentile_cont(0.5) within group (order by x.tushum) / 1e6)::numeric, 2))
    into v_orin
    from zumsavdo.tahlil_dokon_turkum x
    left join zumsavdo.tahlil_dokon_turkum y on y.turkum = x.turkum and y.dokon = v_d.dokon
   where x.turkum = v_d.asosiy_turkum;

  return jsonb_strip_nulls(jsonb_build_object(
    'holat', zumsavdo.tahlil_holati(),
    'dokon', jsonb_build_object(
      'id', v_d.dokon, 'nom', v_d.nom, 'jami_buyurtma', v_d.jami_buyurtma, 'yosh_kun', v_d.yosh_kun,
      'shu_paytgacha_tovarlar', v_d.census_tovarlar, 'sharhli_tovarlar', v_d.census_sharhli,
      'faol_tovarlar', v_d.tovarlar, 'sotgan_tovarlar', v_d.sotgan, 'dona_oyiga', v_d.dona,
      'tushum_oyiga', v_d.tushum, 'tushum_mln', round(v_d.tushum / 1e6, 1), 'turkumlar', v_d.turkumlar,
      'reyting_ortacha', round(v_d.reyting_ort, 2), 'tugagan_tovarlar', v_d.tugagan, 'yangi_tovarlar_60kun', v_d.yangi),
    'asosiy_turkumdagi_orni', v_orin,
    'turkumlari', (select coalesce(jsonb_agg(jsonb_build_object(
                      'turkum', x.turkum, 'yol', coalesce(k.yol_nomi, c.name), 'tovarlar', x.tovarlar,
                      'tushum_mln', round(x.tushum / 1e6, 1), 'dona_oyiga', x.dona) order by x.tushum desc), '[]'::jsonb)
                     from (select * from zumsavdo.tahlil_dokon_turkum dt where dt.dokon = v_d.dokon
                            order by dt.tushum desc limit 5) x
                     left join zumsavdo.turkum k on k.id = x.turkum
                     left join zumsavdo.category c on c.id = x.turkum),
    'eng_kop_sotgan', (select coalesce(jsonb_agg(zumsavdo.tahlil_tovar_json(t.product_id) order by t.tushum desc nulls last, t.product_id), '[]'::jsonb)
                         from (select t.product_id, t.tushum from zumsavdo.tahlil_tovar t where t.dokon = v_d.dokon
                                order by t.tushum desc nulls last, t.product_id limit 5) t),
    'nomzodlar', v_nomzod
  ));
end;
$$;

-- ============================================================ 6. tovar

create or replace function public.so_tahlil_tovar(p_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_t   zumsavdo.tahlil_tovar%rowtype;
  v_tur jsonb;
begin
  select * into v_t from zumsavdo.tahlil_tovar t where t.product_id = p_id;
  if v_t.product_id is null then
    return jsonb_build_object('holat', zumsavdo.tahlil_holati(), 'topilmadi', true,
      'izoh', 'Bu tovar oxirgi 30 kunlik oʻlchovda yoʻq (yangi, olib tashlangan yoki kuzatilmagan).',
      'perepisda', exists (select 1 from zumsavdo.product p where p.id = p_id));
  end if;

  select jsonb_build_object(
           'tovarlar', count(*),
           'oyiga_mediana', percentile_cont(0.5) within group (order by x.oyiga) filter (where x.hisobga),
           'narx_mediana', round(percentile_cont(0.5) within group (order by x.narx)),
           'oyiga_boyicha_orin', count(*) filter (where x.hisobga and x.oyiga > coalesce(case when v_t.hisobga then v_t.oyiga end, -1)) + 1)
    into v_tur
    from zumsavdo.tahlil_tovar x
   where x.turkum = v_t.turkum;

  return jsonb_strip_nulls(jsonb_build_object(
    'holat', zumsavdo.tahlil_holati(),
    'tovar', zumsavdo.tahlil_tovar_json(v_t.product_id),
    'turkum_ichida', v_tur,
    'raqobatchilar', (select coalesce(jsonb_agg(zumsavdo.tahlil_tovar_json(x.product_id) order by x.tushum desc nulls last, x.product_id), '[]'::jsonb)
                        from (select x.product_id, x.tushum from zumsavdo.tahlil_tovar x
                               where x.turkum = v_t.turkum and x.product_id <> v_t.product_id
                                 and v_t.narx is not null and x.narx between v_t.narx * 0.7 and v_t.narx * 1.3
                               order by x.tushum desc nulls last limit 3) x)
  ));
end;
$$;

-- ============================================================ 7. turkumlar reytingi

create or replace function public.so_tahlil_turkumlar(p_ota bigint, p_saralash text default 'tushum', p_limit integer default 10, p_barglar boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lim integer := least(greatest(coalesce(p_limit, 10), 1), 30);
  v_sar text := coalesce(p_saralash, 'tushum');
  v_ruy jsonb;
begin
  if v_sar not in ('tushum', 'dona', 'osish', 'raqobat_past', 'sotuvchi_boshiga', 'yangi_muvaffaqiyat', 'sotuvchilar') then
    raise exception 'so_tahlil_turkumlar: saralash nomaʼlum: %', v_sar;
  end if;

  with q as (
    select tt.*,
           case when tt.k7 > 0 and tt.k23 > 0 and tt.s23 > 0
                then round(((tt.s7::numeric / tt.k7) / (tt.s23::numeric / tt.k23) - 1) * 100, 1) end as osish_foiz,
           round(100.0 * tt.top20_tushum / nullif(tt.tushum, 0), 1) as top20_ulush_foiz,
           round(tt.tushum::numeric / nullif(tt.sotgan_sotuvchilar, 0) / 1e6, 2) as sotuvchi_boshiga_mln,
           round(100.0 * tt.sotgan_sotuvchilar / nullif(tt.sotuvchilar, 0), 1) as sotgan_sotuvchi_foiz
      from zumsavdo.tahlil_turkum tt
      join zumsavdo.turkum k on k.id = tt.turkum
     where (case when p_barglar then k.barg and (p_ota is null or k.yol @> array[p_ota])
                 else k.ota_id = coalesce(p_ota, 1) end)
       and tt.tovarlar > 0
  )
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'id', x.turkum, 'nom', x.nom, 'yol', x.yol_nomi, 'barg', x.barg,
           'sotuvchilar', x.sotuvchilar, 'sotgan_sotuvchilar', x.sotgan_sotuvchilar, 'sotgan_sotuvchi_foiz', x.sotgan_sotuvchi_foiz,
           'tovarlar', x.tovarlar, 'sotgan_tovarlar', x.sotgan_tovarlar, 'dona_oyiga', x.dona,
           'tushum_mln', round(x.tushum / 1e6, 1), 'top20_ulush_foiz', x.top20_ulush_foiz,
           'sotuvchi_boshiga_mln', x.sotuvchi_boshiga_mln, 'osish_foiz', x.osish_foiz,
           'narx_mediana', round(x.narx_med), 'yangi_tovarlar', x.yangi,
           'shu_paytgacha_sotuvchilar', x.census_sotuvchilar)) order by x.tartib), '[]'::jsonb)
    into v_ruy
    from (
      select q.*, row_number() over (order by
               case when v_sar = 'tushum' then q.tushum end desc nulls last,
               case when v_sar = 'dona' then q.dona end desc nulls last,
               case when v_sar = 'osish' then q.osish_foiz end desc nulls last,
               case when v_sar = 'raqobat_past' then q.top20_ulush_foiz end asc nulls last,
               case when v_sar = 'sotuvchi_boshiga' then q.sotuvchi_boshiga_mln end desc nulls last,
               case when v_sar = 'yangi_muvaffaqiyat' then q.sotgan_sotuvchi_foiz end desc nulls last,
               case when v_sar = 'sotuvchilar' then q.sotuvchilar end desc nulls last,
               q.tushum desc, q.turkum) as tartib
        from q
    ) x
   where x.tartib <= v_lim;

  return jsonb_build_object(
    'holat', zumsavdo.tahlil_holati(),
    'ota', case when p_ota is null then null else (select jsonb_build_object('id', k.id, 'yol', k.yol_nomi) from zumsavdo.turkum k where k.id = p_ota) end,
    'barglar', p_barglar,
    'saralash', v_sar,
    'turkumlar', v_ruy,
    'izoh', 'osish_foiz — oxirgi 7 kunlik kunlik sotuv oldingi 23 kunnikiga nisbatan; top20_ulush_foiz — eng yaxshi 20% sotuvchining tushumdagi ulushi (yuqori = raqobat bir necha kattaning qoʻlida).'
  );
end;
$$;

-- ============================================================ huquqlar

do $$
declare f text;
begin
  foreach f in array array[
    'public.so_tahlil_turkum_top(text, integer)', 'public.so_tahlil_bozor(jsonb)',
    'public.so_tahlil_sotuvchilar(jsonb)', 'public.so_tahlil_tovarlar(jsonb, text, integer)',
    'public.so_tahlil_dokon(bigint, text)', 'public.so_tahlil_tovar(bigint)',
    'public.so_tahlil_turkumlar(bigint, text, integer, boolean)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array[
    'zumsavdo.tahlil_holati()', 'zumsavdo.tahlil_barglar(bigint[])', 'zumsavdo.tahlil_turkumlari(jsonb)',
    'zumsavdo.tahlil_qamrov(jsonb)', 'zumsavdo.tahlil_filtrla(jsonb)', 'zumsavdo.tahlil_tovar_filtri_bor(jsonb)',
    'zumsavdo.tahlil_tovar_json(bigint)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
