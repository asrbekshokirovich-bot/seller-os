-- 0085 — AI tahlilchiga kunlik limit (nazoratchi, 2026-11-10: «Ha, limit bilan yoq»).
--
-- Nega: `AI_TAHLIL=on` dan keyin har Uzum savoli tahlilchiga ketadi (2–5 Claude chaqiruvi + SQL asboblari,
-- jonli sinovda ~$0.045 savoliga). Chatda kunlik limit yoʻq edi — bitta sessiya ketma-ket yozib xarajat va
-- baza yukini oshira olardi (BACKLOG, 2026-11-05). Endi:
--   - shaxsiy: bitta foydalanuvchiga kuniga `p_limit` ta tahlil savoli (kod: `TAHLIL_LIMIT.kunlik`, 30);
--   - umumiy: hamma foydalanuvchi yigʻindisi kuniga `p_umumiy_limit` (kod: `TAHLIL_LIMIT.jamiKunlik`) —
--     anonim sessiya cheksiz yaratilsa ham (0055 dagi teshik) xarajatga QATTIQ shift.
-- Limitdan oshsa — savol eski oddiy AI yoʻliga ketadi (kod), xato koʻrsatilmaydi.
--
-- `so_xitoy_limit` (0055) andozasi: BAND QILISH atomik (advisory lock — bir vaqtdagi soʻrovlar ham limitni
-- teshmaydi), chegaradan tashqarida `ruxsat: false` — sanoq oʻzgarmaydi. QAYTARISH YOʻQ: tahlil yiqilsa ham
-- Claude chaqiruvlari boʻlgan (pul ketgan) — urinish sanaladi.
--   so_tahlil_limit(p_token, p_oshir, p_limit, p_umumiy_limit) → {soni, jami, ruxsat} yoki {xato}
-- Kun — `current_date` (baza UTC: Toshkentda 05:00 da yangilanadi).
-- Qaytarish: `drop function public.so_tahlil_limit(text, boolean, integer, integer); drop table selleros.tahlil_limit;`

create table if not exists selleros.tahlil_limit (
  user_id uuid    not null references selleros.users(id) on delete cascade,
  sana    date    not null default current_date,
  soni    integer not null default 0 check (soni >= 0),
  primary key (user_id, sana)
);

create index if not exists tahlil_limit_sana_idx on selleros.tahlil_limit (sana);

comment on table selleros.tahlil_limit is
  'AI tahlilchi kunlik sanogi (0085): foydalanuvchi x kun. Faqat so_tahlil_limit orqali.';

alter table selleros.tahlil_limit enable row level security;
revoke all on table selleros.tahlil_limit from public, anon, authenticated;

create or replace function public.so_tahlil_limit(
  p_token        text,
  p_oshir        boolean default false,
  p_limit        integer default null,
  p_umumiy_limit integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u        uuid;
  v_soni   integer;
  v_jami   integer;
  v_ruxsat boolean := true;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_oshir then
    -- Bitta qulf: shaxsiy va umumiy tekshiruv + oshirish bir butun.
    perform pg_advisory_xact_lock(hashtext('so_tahlil_limit'));

    insert into selleros.tahlil_limit (user_id, sana) values (u, current_date)
    on conflict (user_id, sana) do nothing;

    select coalesce(sum(soni), 0) into v_jami from selleros.tahlil_limit where sana = current_date;

    if p_umumiy_limit is not null and v_jami >= p_umumiy_limit then
      v_ruxsat := false;
    else
      update selleros.tahlil_limit
         set soni = soni + 1
       where user_id = u and sana = current_date
         and (p_limit is null or soni < p_limit)
      returning soni into v_soni;
      if not found then
        v_ruxsat := false;
      end if;
    end if;
  end if;

  if v_soni is null then
    select soni into v_soni from selleros.tahlil_limit where user_id = u and sana = current_date;
  end if;
  select coalesce(sum(soni), 0) into v_jami from selleros.tahlil_limit where sana = current_date;

  return jsonb_build_object('soni', coalesce(v_soni, 0), 'jami', v_jami, 'ruxsat', v_ruxsat);
end;
$$;

comment on function public.so_tahlil_limit(text, boolean, integer, integer) is
  'AI tahlilchi kunlik sanogi (0085). p_oshir: limit ichida bolsa atomik band qiladi (ruxsat false - sanoq '
  'ozgarmaydi). jami - bugun hamma foydalanuvchi.';

revoke all on function public.so_tahlil_limit(text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.so_tahlil_limit(text, boolean, integer, integer) to service_role;
