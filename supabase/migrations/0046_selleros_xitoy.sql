-- B4: Xitoydan topish — kesh va limit jadvallari.
--
-- Rasm-qidiruv 1688/alibaba provayderiga chaqiriladi (hali
-- ulanmagan — TMAPI/OneBound sinovda). Ikki narsa bu yerda
-- nazorat qilinadi:
--
--   1. KESH. Bir xil rasm uchun provayder qayta chaqirilmaydi —
--      pul tejaydi. Muddat 72 soat (`xitoy.ts`, XITOY_LIMIT.keshSoat).
--   2. KUNLIK LIMIT. Reja boʻyicha (bepul/pro/biznes) qidiruvlar
--      soni cheklanadi — provayder toʻlovli.

-- Qidiruv natijalarini keshlash.
create table if not exists selleros.xitoy_kesh (
  id          bigserial primary key,
  rasm_hash   text not null,
  natijalar   jsonb not null,
  manba       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists xitoy_kesh_rasm_idx
  on selleros.xitoy_kesh (rasm_hash);

comment on table selleros.xitoy_kesh is
  'Rasm-qidiruv natijalari keshi. Bir xil rasm_hash uchun 72 soat ichida provayder qayta chaqirilmaydi.';

-- Kunlik qidiruv hisobi — limitni nazorat qilish.
create table if not exists selleros.xitoy_limit (
  id          bigserial primary key,
  user_id     uuid not null references selleros.users(id),
  sana        date not null default current_date,
  soni        integer not null default 0,
  unique (user_id, sana)
);

comment on table selleros.xitoy_limit is
  'Foydalanuvchining kunlik xitoy-qidiruv soni. Reja boʻyicha chegara xitoy.ts dagi XITOY_LIMIT da.';

-- Keshdan qidirish.
create or replace function public.so_xitoy_kesh_ol(p_rasm_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'public'
as $$
declare
  v_kesh selleros.xitoy_kesh%rowtype;
begin
  select * into v_kesh
  from selleros.xitoy_kesh
  where rasm_hash = p_rasm_hash
    and created_at > now() - interval '72 hours'
  order by created_at desc limit 1;

  if not found then
    return jsonb_build_object('topildi', false);
  end if;

  return jsonb_build_object(
    'topildi', true,
    'natijalar', v_kesh.natijalar,
    'manba', v_kesh.manba,
    'created_at', v_kesh.created_at
  );
end;
$$;

-- Keshga yozish.
create or replace function public.so_xitoy_kesh_yoz(
  p_rasm_hash text,
  p_natijalar jsonb,
  p_manba text
)
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
as $$
  insert into selleros.xitoy_kesh (rasm_hash, natijalar, manba)
  values (p_rasm_hash, p_natijalar, p_manba)
  returning jsonb_build_object('id', id);
$$;

-- Kunlik limit tekshirish va oshirish.
--
-- `p_oshir = false` — faqat hozirgi sonni oʻqiydi (tugma bosilishidan
-- oldin "qolgan qidiruv" koʻrsatish uchun). `p_oshir = true` — bitta
-- qidiruvni hisoblaydi va yangi sonni qaytaradi. Chegarani oʻzi
-- majburlamaydi — bu backend/`limitTekshir()` (xitoy.ts) ishi:
-- funksiya faqat sanoq yuritadi.
create or replace function public.so_xitoy_limit(
  p_token text,
  p_oshir boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'extensions', 'public'
as $$
declare
  v_user uuid;
  v_soni integer;
begin
  select user_id into v_user
  from selleros.user_session
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_user is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_oshir then
    insert into selleros.xitoy_limit (user_id, sana, soni)
    values (v_user, current_date, 1)
    on conflict (user_id, sana)
    do update set soni = selleros.xitoy_limit.soni + 1
    returning soni into v_soni;
  else
    select soni into v_soni
    from selleros.xitoy_limit
    where user_id = v_user and sana = current_date;
    v_soni := coalesce(v_soni, 0);
  end if;

  return jsonb_build_object('soni', coalesce(v_soni, 0));
end;
$$;

revoke all on selleros.xitoy_kesh from public, anon, authenticated;
revoke all on selleros.xitoy_limit from public, anon, authenticated;

revoke all on function public.so_xitoy_kesh_ol(text) from public, anon, authenticated;
revoke all on function public.so_xitoy_kesh_yoz(text, jsonb, text) from public, anon, authenticated;
revoke all on function public.so_xitoy_limit(text, boolean) from public, anon, authenticated;

grant execute on function public.so_xitoy_kesh_ol(text) to service_role;
grant execute on function public.so_xitoy_kesh_yoz(text, jsonb, text) to service_role;
grant execute on function public.so_xitoy_limit(text, boolean) to service_role;
