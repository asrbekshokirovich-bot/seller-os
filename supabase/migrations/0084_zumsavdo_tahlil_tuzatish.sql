-- 0084 — AI tahlilchi qurilishi: ikki tuzatish (2026-11-10, birinchi jonli qurilishda topildi).
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
--    DIQQAT: `tahlil_qadam` keyinchalik `create or replace` bilan qayta yozilsa, bu sozlama
--    yoʻqoladi — oʻsha migratsiyada qayta `alter function … set enable_nestloop = off`.
--
-- 2. DARAXT HAR KUNI «YANGILANDI» DER EDI. `so_turkum_daraxti_yoz` (0077) har yozuvda
--    hamma 7 080 qatorning `yangilandi` sini `now()` qilardi → `turkum.yml` har kuni
--    ishlagani uchun tahlil har kecha hech narsa oʻzgarmasa ham toʻliq qayta qurilardi.
--    Endi faqat haqiqatan oʻzgargan qator yangilanadi; tugun oʻchsa — ildiz belgilanadi
--    (`max(yangilandi)` oʻzgarishi uchun).

do $$
begin
  if pg_catalog.to_regprocedure('zumsavdo.tahlil_qadam(boolean)') is not null then
    alter function zumsavdo.tahlil_qadam(boolean) set enable_nestloop = off;
  end if;
end $$;

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
