-- 0084 — AI tahlilchi: toʻrt tuzatish (2026-11-10, birinchi jonli qurilishda topildi).
--
-- 1. TURKUM BOSQICHI SEKIN REJA TANLARDI. `yol @> array[X]` (GIN) uchun Postgres ostki
--    daraxtni doim ~35 tugun deb hisoblaydi (standart tanlanuvchanlik). Ildiz uchun aslida
--    7 080 tugun, 810 ming tovar → u har tovarni indeks orqali bittalab oʻqiydigan «nested
--    loop» ni tanlardi: 2-darajadagi 40 tugunlik guruh 11–23 s, ildiz — daqiqalar (60 s
--    chegarasida yiqilib, kechasi 5 marta xato → toʻxtardi). `enable_nestloop = off` bilan
--    xuddi shu ildiz qadami 2,7 s (jonli oʻlchov, 10.11): jadvallar ketma-ket oʻqiladi,
--    xotira chegaralangan (work_mem 16MB). Boshqa bosqichlarga zarari yoʻq: ular hash /
--    merge birlashma yoki indeks diapazonidan foydalanadi (korrelyatsiyali soʻrovlar —
--    birlashma emas, bu sozlama ularga taʼsir qilmaydi).
--    Sozlama funksiya taʼrifida (`set enable_nestloop = off`, 4-band) — keyinchalik
--    `create or replace` qilinsa, shu qatorni saqlash SHART (testi bor).
--
-- 2. DARAXT HAR KUNI «YANGILANDI» DER EDI. `so_turkum_daraxti_yoz` (0077) har yozuvda
--    hamma 7 080 qatorning `yangilandi` sini `now()` qilardi → `turkum.yml` har kuni
--    ishlagani uchun tahlil har kecha hech narsa oʻzgarmasa ham toʻliq qayta qurilardi.
--    Endi faqat haqiqatan oʻzgargan qator yangilanadi; tugun oʻchsa — ildiz belgilanadi
--    (`max(yangilandi)` oʻzgarishi uchun).


create or replace function public.so_turkum_daraxti_yoz(p_tugunlar jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_soni      int;
  v_ildiz     int;
  v_takror    int;
  v_yetim     int;
  v_yetmadi   int;
  v_ochirildi int;
  v_ozgardi   int;
  v_barglar   int;
  v_chuqur    int;
begin
  if p_tugunlar is null or jsonb_typeof(p_tugunlar) <> 'array' then
    raise exception 'so_turkum_daraxti_yoz: tugunlar massiv emas';
  end if;

  create temp table _daraxt on commit drop as
    select (x->>'id')::bigint                             as id,
           nullif(x->>'ota_id', '')::bigint               as ota_id,
           coalesce(nullif(btrim(x->>'nom'), ''), 'Turkum ' || (x->>'id')) as nom,
           coalesce((x->>'kattalar')::boolean, false)     as kattalar
      from jsonb_array_elements(p_tugunlar) x;

  select count(*), count(*) filter (where ota_id is null and id = 1)
    into v_soni, v_ildiz from pg_temp._daraxt;
  select count(*) - count(distinct id) into v_takror from pg_temp._daraxt;
  select count(*) into v_yetim
    from pg_temp._daraxt d
   where d.ota_id is not null
     and not exists (select 1 from pg_temp._daraxt o where o.id = d.ota_id);

  if v_soni < 5000 then
    raise exception 'so_turkum_daraxti_yoz: atigi % tugun (kamida 5 000) — yozilmadi', v_soni;
  end if;
  if v_ildiz <> 1 or exists (select 1 from pg_temp._daraxt where ota_id is null and id <> 1) then
    raise exception 'so_turkum_daraxti_yoz: ildiz (1) bitta boʻlishi kerak — yozilmadi';
  end if;
  if v_takror > 0 then
    raise exception 'so_turkum_daraxti_yoz: % ta takror id — yozilmadi', v_takror;
  end if;
  if v_yetim > 0 then
    raise exception 'so_turkum_daraxti_yoz: % ta tugunning otasi roʻyxatda yoʻq — yozilmadi', v_yetim;
  end if;

  create temp table _yol on commit drop as
    with recursive d as (
      select t.id, t.ota_id, t.nom, t.kattalar, 0 as chuqurlik,
             array[t.id] as yol, ''::text as yol_nomi
        from pg_temp._daraxt t
       where t.ota_id is null
      union all
      select t.id, t.ota_id, t.nom, t.kattalar, d.chuqurlik + 1,
             d.yol || t.id,
             case when d.chuqurlik = 0 then t.nom else d.yol_nomi || ' › ' || t.nom end
        from pg_temp._daraxt t
        join d on t.ota_id = d.id
       where d.chuqurlik < 30          -- halqa boʻlsa ham tugaydi
    )
    select d.*, not exists (select 1 from pg_temp._daraxt b where b.ota_id = d.id) as barg
      from d;

  -- Halqa yoki ildizga bogʻlanmagan qism: daraxtga yetib borilmagan tugun.
  select v_soni - count(distinct id) into v_yetmadi from pg_temp._yol;
  if v_yetmadi > 0 then
    raise exception 'so_turkum_daraxti_yoz: % ta tugun ildizga bogʻlanmagan — yozilmadi', v_yetmadi;
  end if;

  -- Faqat oʻzgargan qator yoziladi (0084): `yangilandi` — haqiqiy oʻzgarish vaqti.
  insert into zumsavdo.turkum as k (id, ota_id, nom, chuqurlik, yol, yol_nomi, barg, kattalar, yangilandi)
  select y.id, y.ota_id, y.nom, y.chuqurlik, y.yol,
         case when y.chuqurlik = 0 then y.nom else y.yol_nomi end,
         y.barg, y.kattalar, now()
    from pg_temp._yol y
  on conflict (id) do update
     set ota_id = excluded.ota_id, nom = excluded.nom, chuqurlik = excluded.chuqurlik,
         yol = excluded.yol, yol_nomi = excluded.yol_nomi, barg = excluded.barg,
         kattalar = excluded.kattalar, yangilandi = excluded.yangilandi
   where (k.ota_id, k.nom, k.chuqurlik, k.yol, k.yol_nomi, k.barg, k.kattalar)
         is distinct from
         (excluded.ota_id, excluded.nom, excluded.chuqurlik, excluded.yol, excluded.yol_nomi, excluded.barg, excluded.kattalar);
  get diagnostics v_ozgardi = row_count;

  delete from zumsavdo.turkum k where not exists (select 1 from pg_temp._yol y where y.id = k.id);
  get diagnostics v_ochirildi = row_count;
  -- Oʻchgan tugun qolgan qatorlarda koʻrinmaydi — daraxt oʻzgargani ildizda belgilanadi.
  if v_ochirildi > 0 then
    update zumsavdo.turkum k set yangilandi = now() where k.id = 1;
  end if;

  select count(*) filter (where barg), max(chuqurlik) into v_barglar, v_chuqur from pg_temp._yol;

  return jsonb_build_object(
    'tugunlar', v_soni, 'barglar', v_barglar, 'chuqurlik_max', v_chuqur, 'ochirildi', v_ochirildi,
    'ozgardi', v_ozgardi
  );
end;
$$;

revoke all on function public.so_turkum_daraxti_yoz(jsonb) from public, anon, authenticated;
grant execute on function public.so_turkum_daraxti_yoz(jsonb) to service_role;

-- 3. AI ASBOBLARI VAQTDAN OSHARDI (10.11, birinchi jonli maʼlumotda). 0080 dagi
--    `tahlil_filtrla` SQL funksiya edi: `with f as (select tahlil_barglar(…) …)` — CTE bir
--    marta ishlatilgani uchun Postgres uni soʻrovga qoʻshib yuboradi va `tahlil_barglar`
--    (turkum jadvaliga soʻrov) 810 ming tovarning HAR BIRI uchun qayta chaqiriladi:
--    «Kiyim + Poyabzal» boʻyicha `so_tahlil_sotuvchilar` / `so_tahlil_bozor` vaqtdan oshdi
--    (PGlite dagi 6 qatorli sinovda koʻrinmagan). Endi plpgsql: filtr qiymatlari BIR MARTA
--    hisoblanadi, soʻrovga faqat berilgan shartlar qoʻshiladi va u haqiqiy qiymatlar bilan
--    rejalashtiriladi — turkum/doʻkon indeksi ishlaydi. Natija va ustunlar 0080 dagi bilan
--    aynan bir xil (`tahlil-asboblar.test.ts`).
create or replace function zumsavdo.tahlil_filtrla(p_filtr jsonb)
returns setof zumsavdo.tahlil_tovar
language plpgsql
stable
set search_path = ''
as $$
declare
  v_barglar      bigint[] := zumsavdo.tahlil_barglar(zumsavdo.tahlil_turkumlari(p_filtr));
  v_narx_min     bigint   := (p_filtr->>'narx_min')::bigint;
  v_narx_max     bigint   := (p_filtr->>'narx_max')::bigint;
  v_reyting_min  numeric  := (p_filtr->>'reyting_min')::numeric;
  v_sharh_min    integer  := (p_filtr->>'sharh_min')::integer;
  v_oyiga_min    integer  := (p_filtr->>'oyiga_min')::integer;
  v_oyiga_max    integer  := (p_filtr->>'oyiga_max')::integer;
  v_tushum_min   bigint   := (p_filtr->>'tushum_min')::bigint;
  v_faqat_bor    boolean  := coalesce((p_filtr->>'faqat_bor')::boolean, false);
  v_yangi_kun    integer  := (p_filtr->>'yangi_kun')::integer;
  v_chegirma_min integer  := (p_filtr->>'chegirma_min')::integer;
  v_dokon        bigint   := (p_filtr->>'dokon')::bigint;
  v_soz          text     := nullif(btrim(zumsavdo.norm(p_filtr->>'soz')), '');
  v_shart        text[]   := '{}';
begin
  if v_barglar is not null then
    if cardinality(v_barglar) = 0 then
      return;
    end if;
    v_shart := array_append(v_shart, 't.turkum = any($1)');
  end if;
  if v_narx_min is not null then v_shart := array_append(v_shart, 't.narx >= $2'); end if;
  if v_narx_max is not null then v_shart := array_append(v_shart, 't.narx <= $3'); end if;
  if v_reyting_min is not null then v_shart := array_append(v_shart, 't.reyting >= $4'); end if;
  if v_sharh_min is not null then v_shart := array_append(v_shart, 't.sharh >= $5'); end if;
  if v_oyiga_min is not null then v_shart := array_append(v_shart, '(t.hisobga and t.oyiga >= $6)'); end if;
  if v_oyiga_max is not null then v_shart := array_append(v_shart, '(t.oyiga is not null and t.oyiga <= $7)'); end if;
  if v_tushum_min is not null then v_shart := array_append(v_shart, 't.tushum >= $8'); end if;
  if v_faqat_bor then v_shart := array_append(v_shart, '(t.holat <> ''tugagan'' and coalesce(t.qoldiq, 0) > 0)'); end if;
  if v_yangi_kun is not null then v_shart := array_append(v_shart, 't.yosh_kun <= $9'); end if;
  if v_chegirma_min is not null then v_shart := array_append(v_shart, 't.chegirma >= $10'); end if;
  if v_dokon is not null then v_shart := array_append(v_shart, 't.dokon = $11'); end if;
  if v_soz is not null then v_shart := array_append(v_shart, 'zumsavdo.norm(t.nom) like ''%'' || $12 || ''%'''); end if;

  return query execute
    'select t.* from zumsavdo.tahlil_tovar t'
    || case when cardinality(v_shart) > 0 then ' where ' || array_to_string(v_shart, ' and ') else '' end
    using v_barglar, v_narx_min, v_narx_max, v_reyting_min, v_sharh_min, v_oyiga_min, v_oyiga_max,
          v_tushum_min, v_yangi_kun, v_chegirma_min, v_dokon, v_soz;
end;
$$;
revoke all on function zumsavdo.tahlil_filtrla(jsonb) from public, anon, authenticated;

-- 4. QURILISH: TURKUM TARTIBIDA (jonli oʻlchov 10.11). Bitta turkumning tovarlari 160 MB
--    jadval boʻylab sochilgan edi («Kiyim + Poyabzal» 140 ming tovar — indeks bilan ham
--    24 ming sahifa, 4 s). Endi: tovar jadvali `cluster … using turkum_idx` (alohida qadam,
--    nofaol nusxada — hech kim oʻqimaydi), doʻkon×turkum va shu paytgacha jadvallari esa
--    yozilishida `order by turkum`. Yana: funksiya darajasida `enable_nestloop = off`
--    (1-band). Qolgani 0082 dagi bilan aynan bir xil.
create or replace function zumsavdo.tahlil_qadam(p_majburiy boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
set enable_nestloop = off
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
      -- 0084: jadval TURKUM tartibida qayta yoziladi (CLUSTER) — bitta turkumning tovarlari
      -- diskda yonma-yon turadi va AI asboblari ularni bir necha MB ketma-ket oʻqiydi
      -- (aks holda 160 MB jadval boʻylab sochilgan sahifalar: «Kiyim + Poyabzal» 4+ s).
      if s.kursor = 0 then
        execute format('create index if not exists %I on zumsavdo.%I (turkum)', 'tahlil_tovar_' || x || '_turkum_idx', 'tahlil_tovar_' || x);
      elsif s.kursor = 1 then
        execute format('cluster zumsavdo.%I using %I', 'tahlil_tovar_' || x, 'tahlil_tovar_' || x || '_turkum_idx');
      elsif s.kursor = 2 then
        execute format('create index if not exists %I on zumsavdo.%I (dokon)', 'tahlil_tovar_' || x || '_dokon_idx', 'tahlil_tovar_' || x);
      elsif s.kursor = 3 then
        execute format('create index if not exists %I on zumsavdo.%I (tushum desc nulls last)', 'tahlil_tovar_' || x || '_tushum_idx', 'tahlil_tovar_' || x);
      else
        -- Yangi jadvalda statistika yoʻq — keyingi bosqichlar (va AI asboblari) uchun reja shunga qarab tuziladi.
        execute format('analyze zumsavdo.%I', 'tahlil_tovar_' || x);
      end if;
      if s.kursor >= 4 then
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
         order by q.turkum, q.dokon
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
      execute format('insert into zumsavdo.%I select * from zumsavdo.%I order by turkum, dokon', 'tahlil_census_dt_' || x, 'tahlil_census_dt_' || s.faol);
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
         order by t.turkum, t.dokon
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

revoke all on function zumsavdo.tahlil_qadam(boolean) from public, anon, authenticated;
