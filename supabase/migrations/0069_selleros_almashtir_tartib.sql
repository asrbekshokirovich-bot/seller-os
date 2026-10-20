-- KUZATUV YANGILASH — nomzodlar tartibi: sotuvda boʻlishi ehtimoli kattasi birinchi (2026-10-20).
--
-- NEGA. 0068 ning birinchi ishi (2026-10-20, 2 000 soʻrov): 305 nomzod sotuvda chiqdi,
-- 1 690 tasi — yoʻq (15 %). Boʻlak ichida «xaridor belgisi» kattasi birinchi edi — aynan
-- shular koʻproq tugagan: belgi tugagan tovarda ham qoladi (rad etilganlarda mediana 331,
-- qabul qilinganlarda 65). Oʻlchandi, qaysi nomzod sotuvda chiqqani:
--   0. perepis kursoridan keyingi (bu oʻtish hali yetmagan — yangi tovar)  — 156 / 439 = 36 %
--   1. ikki oʻtish orasida sharhlari oʻsgan (hali sotilyapti)              —  69 / 304 = 23 %
--   2. kursordan oldin, lekin soʻnggi oʻtishda yoʻq (olib tashlangan?)      —  14 / 114 = 12 %
--   3. sharhlari oʻzgarmagan                                               —  66 / 1 138 = 6 %
-- Endi boʻlak ichida shu tartibda; har birida yangisi (id kattasi) birinchi. Boʻlak (talab
-- qatlami) oʻzgarmaydi — 0014 dagidek xaridor belgisidan.

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
  v_kursor bigint;
  v_olchangan bigint;
  v_natija jsonb;
begin
  select count(*) into v_olchangan from selleros.product_daily where date >= v_bugun - 1;
  if v_olchangan < 1000 then
    return jsonb_build_object('slotlar', '[]'::jsonb, 'olik_jami', 0, 'turkumlar', 0,
                              'sabab', 'oʻlchov yoʻq', 'olchangan', v_olchangan);
  end if;
  select max(pass) into v_pass from zumsavdo.product_census;
  -- Perepis kursori: joriy oʻtish shu id gacha yetgan (undan kattasi bu oʻtishda hali yoʻq).
  select c.next_id into v_kursor from zumsavdo.crawl_cursor c where c.name = 'census';

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
    -- Turkum tovarlari, soʻnggi perepis xaridor belgisi (soʻnggi ikki oʻtishdan yangisi) va
    -- sotuvda boʻlish toifasi (yuqoridagi jadval): 0 — kursordan keyingi, 1 — sharhi oʻsgan,
    -- 2 — soʻnggi oʻtishda yoʻq, 3 — qolgani.
    select z.id, z.category_id as turkum, coalesce(c1.buyers_per_week, c0.buyers_per_week) as xaridor,
           case when c1.product_id is null and z.id >= v_kursor then 0
                when c1.product_id is not null and c0.reviews is not null and c1.reviews > c0.reviews then 1
                when c1.product_id is null then 2
                else 3 end as tirik
    from zumsavdo.product z
    join turkum t on t.turkum = z.category_id
    left join zumsavdo.product_census c1 on c1.pass = v_pass and c1.product_id = z.id
    left join zumsavdo.product_census c0 on c0.pass = v_pass - 1 and c0.product_id = z.id
  ),
  bolindi as (
    -- 0014 dagidek: turkum ichida talab 20 boʻlakka — xaridor belgisi borlar orasida.
    select pr.id, pr.turkum, pr.xaridor, pr.tirik,
           ntile(20) over (partition by pr.turkum order by pr.xaridor desc, pr.id) as bolak
    from perepis pr
    where pr.xaridor is not null
  ),
  nomzod as (
    -- Har boʻlakdan sotuvda boʻlishi ehtimoli kattalari: kuzatilmagan, yaqinda rad etilmagan.
    select b.id, b.turkum, b.xaridor, b.bolak, b.tirik,
           row_number() over (partition by b.turkum, b.bolak order by b.tirik, b.id desc) as r
    from bolindi b
    where not exists (select 1 from selleros.tracked_product x where x.external_id = b.id)
      and not exists (select 1 from selleros.kuzatuv_rad q
                      where q.external_id = b.id and q.tekshirildi_at > now() - make_interval(days => p_kun))
  ),
  juft as (
    -- Oʻrinning boʻlagiga eng yaqini; bir xil yaqinlikda — sotuvda boʻlishi ehtimoli kattasi.
    -- Yaqin boʻlaklar tugasa — uzoqrogʻidan: tugagan tovar katalogda turgandan yaxshi.
    select o.eski, n.id, n.xaridor,
           row_number() over (partition by o.eski
                              order by abs(n.bolak - o.bolak), n.tirik, n.id desc) as tartib
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

revoke all on function selleros.almashtir_nomzodlari(int, int, int) from public, anon, authenticated;
