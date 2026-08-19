-- Sifat paneli: qamrov %, xato %, oxirgi yangilanish.
--
-- Nega kerak: yig'uvchi jimgina ishlamay qolsa buni hech narsa
-- ko'rsatmaydi. Baza eski ma'lumot bilan to'g'ridek turaveradi va
-- tavsiyalar eskirgan raqamdan chiqaveradi.

create table selleros.sweep_log (
  id             bigserial primary key,
  platform       text not null references selleros.platform(code),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  -- Nechta id so'ralgan.
  requested      integer not null default 0,
  -- Shundan nechtasi topilgan.
  found          integer not null default 0,
  -- Nechtasi bo'sh chiqqan. BU XATO EMAS: id fazosining ~70% i bo'sh.
  -- Xatoga qo'shilsa, xato darajasi 70% ga chiqib kill-switch bekorga
  -- ishlardi.
  missing        integer not null default 0,
  -- Haqiqiy xatolar: 429, 401, tarmoq uzilishi.
  errors         integer not null default 0,
  written        jsonb,
  -- Kill-switch ishga tushgan bo'lsa sababi. `null` — normal tugagan.
  stopped_reason text
);

create index sweep_log_started_idx on selleros.sweep_log (platform, started_at desc);

/** Sifat hisoboti — panel shundan o'qiydi. */
create or replace function public.so_quality(p_platform text default 'uzum')
returns jsonb
language sql stable security definer
set search_path to 'selleros', 'public'
as $$
  with oxirgi as (
    select * from selleros.sweep_log
    where platform = p_platform and finished_at is not null
    order by started_at desc limit 1
  ),
  bugun as (
    select count(*) filter (where d.date = (now() at time zone 'Asia/Tashkent')::date) as olchangan
    from selleros.product_daily d
    join selleros.product p on p.id = d.product_id
    where p.platform = p_platform
  )
  select jsonb_build_object(
    'platform', p_platform,
    'last_sweep_at', (select finished_at from oxirgi),
    -- Qamrov: so'ralganlarning qanchasi topilgan.
    'coverage_percent', (select case when requested > 0
                                then round(found * 100.0 / requested, 1) end from oxirgi),
    -- Xato darajasi: bo'sh id MAXRAJGA HAM KIRMAYDI.
    'error_percent', (select case when (found + errors) > 0
                                then round(errors * 100.0 / (found + errors), 1) end from oxirgi),
    'requested', (select requested from oxirgi),
    'found',     (select found from oxirgi),
    'missing',   (select missing from oxirgi),
    'errors',    (select errors from oxirgi),
    'stopped_reason', (select stopped_reason from oxirgi),
    'measured_today', (select olchangan from bugun),
    -- Yig'uvchi umuman ishlaganmi. `false` bo'lsa panel raqam emas,
    -- holatni ko'rsatishi kerak.
    'has_data', (select count(*) > 0 from selleros.sweep_log where platform = p_platform)
  );
$$;

/** Yig'uvchi aylanish boshlanganini yozadi va id qaytaradi. */
create or replace function public.so_sweep_open(p_platform text)
returns bigint
language sql security definer
set search_path to 'selleros', 'public'
as $$
  insert into selleros.sweep_log (platform) values (p_platform) returning id;
$$;

/** Aylanish tugadi. */
create or replace function public.so_sweep_close(
  p_id bigint, p_requested int, p_found int, p_missing int, p_errors int,
  p_written jsonb default null, p_stopped_reason text default null
) returns void
language sql security definer
set search_path to 'selleros', 'public'
as $$
  update selleros.sweep_log
     set finished_at = now(), requested = p_requested, found = p_found,
         missing = p_missing, errors = p_errors, written = p_written,
         stopped_reason = p_stopped_reason
   where id = p_id;
$$;

revoke all on function public.so_sweep_open(text)   from public, anon, authenticated;
revoke all on function public.so_sweep_close(bigint, int, int, int, int, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.so_sweep_open(text) to service_role;
grant execute on function public.so_sweep_close(bigint, int, int, int, int, jsonb, text) to service_role;

-- Sifat hisoboti panelga ochiq: unda sir yo'q, faqat holat.
grant execute on function public.so_quality(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
