-- KUZATUV ROʻYXATINI YANGILASH — uzoq tugagan tovar oʻrniga sotuvdagisi (nazoratchi,
-- 2026-10-20: «hammasini qil»).
--
-- NEGA. Kuzatuv roʻyxati (0013/0014) 2026-08-24 da BIR MARTA tanlangan va hech qachon
-- yangilanmagan: `tracked_product.active` ni hech narsa `false` qilmaydi. Oʻlchandi
-- (2026-10-20): 5 999 faol tovardan 4 536 tasi soʻnggi 14 kunda har kuni qoldiqsiz,
-- 4 326 tasida 24-avgustdan beri BIRORTA ham qoldiq koʻrilmagan. Uzumning oʻzi ularni
-- «Tugadi» deydi (GraphQL `skuList.stock.status = OUT_OF_STOCK`; ayrimi
-- `isBlockedOrArchived`). 3-qadam katalogi (`so_tovar_royxati`) esa turkumdagi HAMMA
-- `selleros.product` ni koʻrsatardi — koʻpi «Uzumda hozir tugagan», turkum medianasi
-- esa nol sotuvlar bilan pastga tortilardi.
--
-- QANDAY (har skreyper ishida, «Oʻlchash» dan oldin — `skreyper.yml`):
--   1. `so_almashtir_nomzodlari` — har oʻlik oʻringa (turkumlar navbat bilan: har
--      birining birinchisi, keyin ikkinchisi…) oʻsha turkumdan nomzodlar: perepisda
--      xaridor belgisi bor, hali kuzatilmagan, yaqinda rad etilmagan; talab boʻlagi
--      (0014 dagidek, 20 ta) yaqini birinchi.
--   2. Skreyper har nomzodni Uzumda OʻLCHAYDI (`almashtir.py`): qoldigʻi bor va turkumi
--      oʻsha — juft; boʻlmasa — rad (`kuzatuv_rad`, `p_kun` kun taklif qilinmaydi).
--      Perepisning «haftalik xaridor» belgisi tirik ekanini AYTMAYDI: u tugagan tovarda
--      ham qoladi (oʻlik oʻrinlarda oʻrtacha 142, oʻlchandi 2026-10-20).
--   3. `so_almashtir` — juftlar bitta tranzaksiyada: yangisi eski oʻrinning turkumi va
--      boʻlagi bilan qoʻshiladi, eskisi `active = false` (tarixi qoladi, oʻlchanmaydi).
--   4. `so_tovar_royxati` — faqat FAOL namuna (oʻsha turkumniki): almashtirilgan eski
--      tovar `selleros.product` da qoladi, katalogga chiqmasin.
--
-- OʻLIK OʻRIN: faol, turkum namunasidan (sotuvchi 11-qadamda qoʻshgani emas), kamida
-- `p_kun` kun oldin qoʻshilgan va soʻnggi `p_kun` kunda — kamida yarmi oʻlchangan va har
-- kuni qoldiq 0, yoki umuman oʻlchanmagan (Uzumdan olib tashlangan: skreyper `YOQ`
-- olganda hech narsa yozmaydi). Skreyper soʻnggi ikki kunda 1 000 dan kam tovar
-- oʻlchagan boʻlsa — hech narsa taklif qilinmaydi: oʻlchov toʻxtagani tovar tugagani
-- degani emas.

create table if not exists selleros.kuzatuv_rad (
  external_id    bigint primary key,
  -- Qachon oʻlchandi: shundan `p_kun` kun oʻtguncha qayta taklif qilinmaydi.
  tekshirildi_at timestamptz not null default now()
);

comment on table selleros.kuzatuv_rad is
  'Kuzatuvga nomzod boʻlib Uzumda oʻlchangan, lekin qoldigʻi yoʻq yoki turkumi boshqa '
  'chiqqan tovarlar (0068). Bir muddat qayta taklif qilinmaydi.';

create or replace function selleros.almashtir_nomzodlari(
  p_kun int default 14,
  p_turkum int default 300,
  p_nomzod int default 5
) returns jsonb
language plpgsql
stable
security definer
set search_path = selleros, zumsavdo, public
-- Perepis katta (3 mln tovar, 12 mln qator): indeks bilan bittalab oʻqish 60 turkumga
-- 3–4 daqiqa ketardi (oʻlchandi 2026-10-20: 5 turkum — 18 s, har qator ~0,3 ms disk).
-- Ketma-ket oʻqib hash bilan qoʻshish — 300 turkumning hammasiga ~17 s.
set enable_nestloop = off
as $$
declare
  v_bugun date := (now() at time zone 'Asia/Tashkent')::date;
  v_pass int;
  v_olchangan bigint;
  v_natija jsonb;
begin
  select count(*) into v_olchangan from selleros.product_daily where date >= v_bugun - 1;
  if v_olchangan < 1000 then
    return jsonb_build_object('slotlar', '[]'::jsonb, 'olik_jami', 0, 'turkumlar', 0,
                              'sabab', 'oʻlchov yoʻq', 'olchangan', v_olchangan);
  end if;
  select max(pass) into v_pass from zumsavdo.product_census;

  with kunlik as (
    select d.product_id, count(*) as kun, max(d.stock) as eng_kop
    from selleros.product_daily d
    where d.date > v_bugun - p_kun
    group by d.product_id
  ),
  olik as (
    select tp.external_id as eski, tp.category_external_id as turkum, tp.demand_bucket as bolak
    from selleros.tracked_product tp
    left join selleros.product p on p.platform = 'uzum' and p.external_id = tp.external_id
    left join kunlik k on k.product_id = p.id
    where tp.active
      and tp.category_external_id is not null
      and tp.demand_bucket is not null
      and tp.added_at < now() - make_interval(days => p_kun)
      and not exists (select 1 from selleros.sotuvchi_tovar s where s.external_id = tp.external_id)
      and (coalesce(k.kun, 0) = 0 or (k.kun >= greatest(p_kun / 2, 1) and k.eng_kop = 0))
  ),
  turkum as (
    -- Eng koʻp tugagan turkumlar birinchi (`p_turkum` dan koʻp boʻlsa).
    select o.turkum from olik o group by o.turkum
    order by count(*) desc, o.turkum
    limit p_turkum
  ),
  perepis as (
    -- Turkum tovarlari va soʻnggi perepis xaridor belgisi (soʻnggi ikki oʻtishdan yangisi).
    select z.id, z.category_id as turkum, coalesce(c1.buyers_per_week, c0.buyers_per_week) as xaridor
    from zumsavdo.product z
    join turkum t on t.turkum = z.category_id
    left join zumsavdo.product_census c1 on c1.pass = v_pass and c1.product_id = z.id
    left join zumsavdo.product_census c0 on c0.pass = v_pass - 1 and c0.product_id = z.id
  ),
  bolindi as (
    -- 0014 dagidek: turkum ichida talab 20 boʻlakka — xaridor belgisi borlar orasida.
    select pr.id, pr.turkum, pr.xaridor,
           ntile(20) over (partition by pr.turkum order by pr.xaridor desc, pr.id) as bolak
    from perepis pr
    where pr.xaridor is not null
  ),
  nomzod as (
    -- Har boʻlakdan eng talablilari: kuzatilmagan, yaqinda rad etilmagan.
    select b.id, b.turkum, b.xaridor, b.bolak,
           row_number() over (partition by b.turkum, b.bolak order by b.xaridor desc, b.id) as r
    from bolindi b
    where not exists (select 1 from selleros.tracked_product x where x.external_id = b.id)
      and not exists (select 1 from selleros.kuzatuv_rad q
                      where q.external_id = b.id and q.tekshirildi_at > now() - make_interval(days => p_kun))
  ),
  juft as (
    -- Oʻrinning boʻlagiga eng yaqini, keyin talabi kattasi. Yaqin boʻlaklar tugasa —
    -- uzoqrogʻidan: tugagan tovar katalogda turgandan koʻra boshqa boʻlakdagisi yaxshi.
    select o.eski, n.id, n.xaridor,
           row_number() over (partition by o.eski
                              order by abs(n.bolak - o.bolak), n.xaridor desc, n.id) as tartib
    from olik o
    join turkum t on t.turkum = o.turkum
    join nomzod n on n.turkum = o.turkum and n.r <= p_nomzod
  ),
  slot as (
    select o.eski, o.turkum, o.bolak,
           coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'xaridor', j.xaridor) order by j.tartib)
                    filter (where j.id is not null), '[]'::jsonb) as nomzodlar
    from olik o
    join turkum t on t.turkum = o.turkum
    left join juft j on j.eski = o.eski and j.tartib <= p_nomzod
    group by o.eski, o.turkum, o.bolak
  ),
  navbatli as (
    -- Navbat: har turkumdan birinchi oʻrin, keyin ikkinchisi… — har ishda hamma turkum
    -- katalogi birga yaxshilanadi (skreyperning soʻrov byudjeti cheklangan).
    select s.*, row_number() over (partition by s.turkum order by s.bolak, s.eski) as navbat
    from slot s
  )
  select jsonb_build_object(
    'slotlar', coalesce((
      select jsonb_agg(jsonb_build_object('eski', s.eski, 'turkum', s.turkum, 'bolak', s.bolak,
                                          'nomzodlar', s.nomzodlar)
                       order by s.navbat, s.turkum, s.eski)
      from navbatli s), '[]'::jsonb),
    'olik_jami', (select count(*) from olik),
    'turkumlar', (select count(*) from turkum),
    'pass', v_pass
  ) into v_natija;
  return v_natija;
end $$;

create or replace function selleros.almashtir(p_juftlar jsonb, p_rad jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
as $$
declare
  v_rad int := 0;
  v_qoshildi int := 0;
  v_ochirildi int := 0;
begin
  if jsonb_typeof(coalesce(p_juftlar, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_rad, '[]'::jsonb)) <> 'array' then
    raise exception 'almashtir: p_juftlar va p_rad — massiv boʻlsin';
  end if;

  -- Rad etilganlar: `p_kun` kun qayta taklif qilinmaydi (qayta oʻlchansa — sanasi yangilanadi).
  insert into selleros.kuzatuv_rad (external_id, tekshirildi_at)
  select distinct x::bigint, now()
  from jsonb_array_elements_text(coalesce(p_rad, '[]'::jsonb)) x
  where x ~ '^[0-9]{1,18}$'
  on conflict (external_id) do update set tekshirildi_at = excluded.tekshirildi_at;
  get diagnostics v_rad = row_count;

  with j0 as (
    select (x->>'eski')::bigint as eski, (x->>'yangi')::bigint as yangi,
           case when x->>'xaridor' ~ '^[0-9]{1,9}$' then (x->>'xaridor')::int end as xaridor
    from jsonb_array_elements(coalesce(p_juftlar, '[]'::jsonb)) x
    where x->>'eski' ~ '^[0-9]{1,18}$' and x->>'yangi' ~ '^[0-9]{1,18}$'
  ),
  -- Bitta eski — bitta yangi, bitta yangi — bitta eski: turkum hajmi oʻzgarmasin.
  j1 as (select distinct on (eski) * from j0 order by eski, yangi),
  j as (select distinct on (yangi) * from j1 order by yangi, eski),
  tekshir as (
    -- Eskisi hali faol va turkum namunasidan (sotuvchiniki emas); yangisi hali kuzatilmagan.
    select j.eski, j.yangi, j.xaridor, tp.category_external_id, tp.demand_bucket
    from j
    join selleros.tracked_product tp
      on tp.external_id = j.eski and tp.active and tp.category_external_id is not null
    where j.eski <> j.yangi
      and not exists (select 1 from selleros.tracked_product x where x.external_id = j.yangi)
      and not exists (select 1 from selleros.sotuvchi_tovar s where s.external_id = j.eski)
  ),
  qosh as (
    insert into selleros.tracked_product
      (external_id, category_external_id, buyers_per_week_at_pick, demand_bucket)
    select t.yangi, t.category_external_id, t.xaridor, t.demand_bucket from tekshir t
    on conflict (external_id) do nothing
    returning external_id
  ),
  ochir as (
    -- Faqat oʻrniga yangisi HAQIQATAN qoʻshilgan eski oʻchadi.
    update selleros.tracked_product tp set active = false
    from tekshir t
    where tp.external_id = t.eski and t.yangi in (select q.external_id from qosh q)
    returning tp.external_id
  )
  select (select count(*) from qosh), (select count(*) from ochir) into v_qoshildi, v_ochirildi;

  return jsonb_build_object(
    'qoshildi', v_qoshildi,
    'ochirildi', v_ochirildi,
    'rad', v_rad,
    'faol', (select count(*) from selleros.tracked_product where active)
  );
end $$;

-- Skreyper chaqiradigan uchlar (PostgREST faqat `public` ni koʻradi — 0051 darsi).
create or replace function public.so_almashtir_nomzodlari(
  p_kun int default 14,
  p_turkum int default 300,
  p_nomzod int default 5
) returns jsonb
language sql
security definer
set search_path = selleros, public
set statement_timeout = '120s'
as $$ select selleros.almashtir_nomzodlari(p_kun, p_turkum, p_nomzod) $$;

create or replace function public.so_almashtir(p_juftlar jsonb, p_rad jsonb default '[]'::jsonb)
returns jsonb
language sql
security definer
set search_path = selleros, public
as $$ select selleros.almashtir(p_juftlar, p_rad) $$;

revoke all on selleros.kuzatuv_rad from public, anon, authenticated;
revoke all on function selleros.almashtir_nomzodlari(int, int, int) from public, anon, authenticated;
revoke all on function selleros.almashtir(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.so_almashtir_nomzodlari(int, int, int) from public, anon, authenticated;
revoke all on function public.so_almashtir(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.so_almashtir_nomzodlari(int, int, int) to service_role;
grant execute on function public.so_almashtir(jsonb, jsonb) to service_role;

-- Katalog — faqat faol namuna. Jonli funksiya fayllardagidan farq qiladi (0036: `komissiya`
-- bevosita bazaga qoʻshilgan) — shuning uchun qayta yaratilmaydi, bitta boʻlagi almashtiriladi
-- (0039/0054/0064 dagidek); boʻlak topilmasa — xato, jimgina oʻtib ketmaydi.
do $migratsiya$
declare
  matn text;
  eski text;
  yangi text;
begin
  select pg_get_functiondef('public.so_tovar_royxati(bigint,integer)'::regprocedure) into matn;
  if position('selleros.tracked_product tp' in matn) > 0 then
    raise notice 'so_tovar_royxati: allaqachon faol namuna boʻyicha — oʻtkazildi';
    return;
  end if;
  eski := '    join turkum t on t.id = p.category_id
    left join selleros.shop s on s.id = p.shop_id';
  yangi := '    join turkum t on t.id = p.category_id
    -- 0068: faqat FAOL namuna (shu turkumniki). Almashtirilgan eski tovar
    -- `selleros.product` da qoladi — katalogga chiqmasin.
    join selleros.tracked_product tp
      on tp.external_id = p.external_id and tp.active and tp.category_external_id = t.external_id
    left join selleros.shop s on s.id = p.shop_id';
  if position(eski in matn) = 0 then
    raise exception 'so_tovar_royxati: almashtiriladigan boʻlak topilmadi';
  end if;
  execute replace(matn, eski, yangi);
end
$migratsiya$;
