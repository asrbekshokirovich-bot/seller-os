-- Id→sana kalibrovkasi: kunlik frontier zondi jadvali.
--
-- BACKLOG: "frontier zondini KUNLIK yozib borish. 30 kundan keyin
-- id/kun tezligi to'g'ridan-to'g'ri o'lchanadi va sharhga bog'liq
-- bo'lmaydi."
--
-- Hozirgi `id_yoshi` 526 mahsulotning eng eski sharhidan chiqarilgan
-- statik jadvalga tayanadi (korrelyatsiya 0.81). Kamchiligi:
--   1. Sharh = sotuv × yosh — sotilmagan tovarlar namunaga tushmaydi.
--   2. 3 000 000 dan yuqorida nuqta yetarli emas.
--
-- Yechim: har kuni Uzumdagi eng katta javob beruvchi id yoziladi.
-- 30+ kun yig'ilgach tezlik to'g'ridan-to'g'ri hisoblanadi.

-- ============================================================
-- 1. Jadval
-- ============================================================
create table if not exists selleros.id_frontier (
  id           bigint generated always as identity primary key,
  platform     text not null default 'uzum',
  sana         date not null default current_date,
  max_id       bigint not null,
  probe_steps  int not null default 0,
  created_at   timestamptz not null default now(),

  constraint id_frontier_sana_uq unique (platform, sana)
);

comment on table  selleros.id_frontier is
  'Kunlik frontier zondi: har kuni topilgan eng katta mahsulot id.';
comment on column selleros.id_frontier.max_id is
  'Shu kuni javob bergan eng katta product external_id.';
comment on column selleros.id_frontier.probe_steps is
  'Binary-search nechta qadam oldi (audit uchun).';

-- Panel ko'rmaydi, faqat service_role yozadi.
revoke all on selleros.id_frontier from public, anon, authenticated;

-- ============================================================
-- 2. Yozish funksiyasi (skreyper chaqiradi)
-- ============================================================
create or replace function selleros.frontier_yoz(
  p_platform text,
  p_max_id   bigint,
  p_steps    int default 0
)
returns void
language sql
security definer
set search_path = selleros, public
as $$
  insert into selleros.id_frontier (platform, sana, max_id, probe_steps)
  values (p_platform, current_date, p_max_id, p_steps)
  on conflict (platform, sana) do update
     set max_id      = greatest(excluded.max_id, id_frontier.max_id),
         probe_steps = excluded.probe_steps,
         created_at  = now();
$$;

revoke all on function selleros.frontier_yoz(text, bigint, int)
  from public, anon, authenticated;

-- ============================================================
-- 3. id_yoshi — yangilangan versiya
-- ============================================================
-- Ikki rejim:
--   A) id_frontier da 7+ nuqta bo'lsa — chiziqli regressiya.
--   B) Aks holda — statik kalibrovka jadvali (TUZOQLAR.md, 526 tovar).
--
-- Regressiya formulasi: sana = a + b×id
-- Yosh = current_date - sana (kunlarda).
--
-- NEGA 7 MINIMUM. Ikkita nuqta regressiya beradi, lekin bitta
-- anomal kun (masalan Uzum id larni qayta ishlatsa) uni buzadi.
-- 7 kun — bir haftalik o'lchov; undagi bitta anomaliya og'irlik
-- olmaydi.

create or replace function selleros.id_yoshi(
  p_platform text,
  p_id       bigint
)
returns int
language plpgsql
stable
security definer
set search_path = selleros, public
as $$
declare
  v_nuqtalar int;
  v_a        float8;
  v_b        float8;
  v_sana     date;
  v_yosh     int;
begin
  if p_id is null then return null; end if;

  -- Regressiya urinishi: yetarli nuqta bormi?
  select count(*) into v_nuqtalar
  from selleros.id_frontier
  where platform = p_platform;

  if v_nuqtalar >= 7 then
    -- Chiziqli regressiya: sana = a + b * id
    -- x = max_id, y = sana (epoch kunlarda)
    select
      regr_intercept(extract(epoch from sana) / 86400.0, max_id),
      regr_slope(extract(epoch from sana) / 86400.0, max_id)
    into v_a, v_b
    from selleros.id_frontier
    where platform = p_platform;

    if v_b is not null and v_b > 0 then
      v_sana := '1970-01-01'::date + (v_a + v_b * p_id)::int;
      v_yosh := current_date - v_sana;
      if v_yosh < 0 then v_yosh := 0; end if;
      return v_yosh;
    end if;
  end if;

  -- Statik kalibrovka (TUZOQLAR.md, 526 tovar, korrelyatsiya 0.81).
  -- Ikki nuqta orasida chiziqli interpolyatsiya.
  return (select
    case
      when p_id <= 0       then current_date - '2023-04-06'::date
      when p_id <= 1000000 then current_date - ('2023-04-06'::date +
        ((p_id::float8 / 1000000) * ('2024-08-31'::date - '2023-04-06'::date))::int)
      when p_id <= 1250000 then current_date - ('2024-08-31'::date +
        (((p_id - 1000000)::float8 / 250000) * ('2025-01-18'::date - '2024-08-31'::date))::int)
      when p_id <= 1500000 then current_date - ('2025-01-18'::date +
        (((p_id - 1250000)::float8 / 250000) * ('2025-05-20'::date - '2025-01-18'::date))::int)
      when p_id <= 1750000 then current_date - ('2025-05-20'::date +
        (((p_id - 1500000)::float8 / 250000) * ('2025-08-08'::date - '2025-05-20'::date))::int)
      when p_id <= 2000000 then current_date - ('2025-08-08'::date +
        (((p_id - 1750000)::float8 / 250000) * ('2025-12-08'::date - '2025-08-08'::date))::int)
      when p_id <= 2250000 then current_date - ('2025-12-08'::date +
        (((p_id - 2000000)::float8 / 250000) * ('2026-02-21'::date - '2025-12-08'::date))::int)
      when p_id <= 2500000 then current_date - ('2026-02-21'::date +
        (((p_id - 2250000)::float8 / 250000) * ('2026-04-15'::date - '2026-02-21'::date))::int)
      when p_id <= 3000000 then current_date - ('2026-04-15'::date +
        (((p_id - 2500000)::float8 / 500000) * ('2026-08-02'::date - '2026-04-15'::date))::int)
      else greatest(0, current_date - ('2026-08-02'::date +
        (((p_id - 3000000)::float8 / 500000) * ('2026-08-02'::date - '2026-04-15'::date))::int))
    end
  );
end;
$$;
