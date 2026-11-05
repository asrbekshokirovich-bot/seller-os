-- 0077 — Uzum turkum daraxti (2026-11-05).
--
-- NEGA. `zumsavdo.category` da daraxt yoʻq: perepis faqat barg turkumni yozadi,
-- 5 449 qatordan 5 200 tasida `parent_id` boʻsh. Shuning uchun AI tahlilchi
-- «kiyim-poyabzal sotuvchilari nechta?» degan savolga javob bera olmadi (05.11 jonli):
-- «Kiyim» qaysi barglardan iboratligini tizim bilmaydi, 312 ta nom takrorlanadi
-- («Shimlar» — 6 ta). Daraxtni Uzumning oʻzi bitta soʻrovda beradi (`category(id:1)`,
-- ichma-ich — 6 923 tugun). Yuklovchi — SellerOS skreyperi `selleros_scraper.daraxt`
-- (GitHub Actions `turkum.yml`, kuniga bir marta).
--
-- `zumsavdo.category` ga TEGILMAYDI — uni perepis yozadi (`zs_census_batch`).
--
-- Ustunlar: tugun, ota, nom, chuqurlik (ildiz «Barcha toifalar» — 0), yoʻl (ildizdan
-- oʻzigacha id lar), yoʻl nomi («Kiyim › Ayollar kiyimi › Shimlar», ildizsiz), barg
-- (bolasi yoʻq). Barg boʻlmagan turkumda tovar boʻlmaydi (Uzum 900/900 tekshirilgan) —
-- ota turkum boʻyicha jami uning barglari yigʻindisi.
--
-- Yozish faqat `so_turkum_daraxti_yoz` orqali (service_role). TOʻLIQ ALMASHTIRISH:
-- yangi roʻyxatda yoʻq tugun oʻchiriladi. Shuning uchun yarim roʻyxat rad etiladi —
-- 5 000 dan kam tugun, ildiz yoʻq, takror id, otasi topilmagan yoki ildizga bogʻlanmagan
-- tugun boʻlsa HECH NARSA yozilmaydi va xato qaytadi (jim emas).

create table if not exists zumsavdo.turkum (
  id          bigint primary key,
  ota_id      bigint,
  nom         text not null,
  chuqurlik   smallint not null,
  yol         bigint[] not null,
  yol_nomi    text not null,
  barg        boolean not null,
  kattalar    boolean not null default false,
  yangilandi  timestamptz not null default now()
);

-- Ostki daraxt: `where yol @> array[X]` (X va uning hamma avlodlari).
create index if not exists turkum_yol_idx on zumsavdo.turkum using gin (yol);
create index if not exists turkum_ota_idx on zumsavdo.turkum (ota_id);

-- Tashqaridan oʻqilmaydi: anon/authenticated ga huquq yoʻq, RLS siyosatsiz yoqiq
-- (funksiyalar egasi nomidan ishlaydi).
alter table zumsavdo.turkum enable row level security;
revoke all on zumsavdo.turkum from public, anon, authenticated;

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

  insert into zumsavdo.turkum as k (id, ota_id, nom, chuqurlik, yol, yol_nomi, barg, kattalar, yangilandi)
  select y.id, y.ota_id, y.nom, y.chuqurlik, y.yol,
         case when y.chuqurlik = 0 then y.nom else y.yol_nomi end,
         y.barg, y.kattalar, now()
    from pg_temp._yol y
  on conflict (id) do update
     set ota_id = excluded.ota_id, nom = excluded.nom, chuqurlik = excluded.chuqurlik,
         yol = excluded.yol, yol_nomi = excluded.yol_nomi, barg = excluded.barg,
         kattalar = excluded.kattalar, yangilandi = excluded.yangilandi;

  delete from zumsavdo.turkum k where not exists (select 1 from pg_temp._yol y where y.id = k.id);
  get diagnostics v_ochirildi = row_count;

  select count(*) filter (where barg), max(chuqurlik) into v_barglar, v_chuqur from pg_temp._yol;

  return jsonb_build_object(
    'tugunlar', v_soni, 'barglar', v_barglar, 'chuqurlik_max', v_chuqur, 'ochirildi', v_ochirildi
  );
end;
$$;

revoke all on function public.so_turkum_daraxti_yoz(jsonb) from public, anon, authenticated;
grant execute on function public.so_turkum_daraxti_yoz(jsonb) to service_role;
