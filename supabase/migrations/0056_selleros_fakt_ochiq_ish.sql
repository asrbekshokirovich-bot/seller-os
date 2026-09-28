-- 6-qadam (Buyurtma va kargo) uchun poydevor: `fakt` roʻyxati, `ochiq_ish`,
-- profilga `city`.
--
-- NAZORATCHI QARORI (2026-09-28): kargo hamkori HOZIRCHA YOʻQ. Demak
-- kargo stavkasi ham yoʻq. Ssenariyning oʻzi bu raqamlarni "{fakt: ...}"
-- deb belgilaydi — ular ODAM kiritadigan bilim, kod oʻylab topmaydi
-- (QOIDALAR §4). Shuning uchun:
--
--   1. `fakt` — kalit/qiymat roʻyxati. Qiymat `null` = "bilmaymiz".
--      Kargo kalitlari shu migratsiyada BOʻSH qatorlar bilan yaratiladi:
--      nazoratchi hamkor topgach Supabase jadval muharririda toʻldiradi
--      (yoki keyin CSV yuklovchi — BACKLOG). Har qiymat yonida `manba`
--      va `olchandi` — raqam qayerdan kelgani koʻrinib tursin.
--   2. `ochiq_ish` — ssenariydagi "ochiq ish": yuk kelishini kutish,
--      toʻlov qolib ketishi, tekshirish. Bugun faqat YOZILADI va suhbatda
--      koʻrsatiladi; eslatma (cron) — alohida bosqich (BACKLOG).
--   3. `so_suhbat_yoz` `city` ni ham profilga yozadi (6-qadam "Yuk qaysi
--      shaharga keladi?").

-- ------------------------------------------------------------ fakt
create table if not exists selleros.fakt (
  kalit      text primary key,
  qiymat     jsonb,
  birlik     text,
  manba      text,
  olchandi   date,
  izoh       text,
  updated_at timestamptz not null default now()
);

comment on table selleros.fakt is
  'Odam kiritadigan faktlar (kargo stavkasi, YATT narxi...). qiymat NULL = bilmaymiz, nol emas. Har qiymatga manba va olchandi.';

-- Kargo kalitlari — BOʻSH. Nazoratchi toʻldiradi.
insert into selleros.fakt (kalit, qiymat, birlik, izoh) values
  ('kargo.hamkor',           null, 'matn',   'Kargo hamkori nomi. 2026-09-28: hamkor yoʻq (nazoratchi).'),
  ('kargo.avia.usd_kg',      null, 'USD/kg', 'Avia yoʻl: 1 kg uchun USD. Hamkor bergan stavka, sanasi bilan.'),
  ('kargo.avia.kun',         null, 'kun',    'Avia yoʻl: oʻrtacha muddat, kun. Vaʼda emas — hamkorning oʻrtacha koʻrsatkichi.'),
  ('kargo.quruqlik.usd_kg',  null, 'USD/kg', 'Quruqlik yoʻl: 1 kg uchun USD.'),
  ('kargo.quruqlik.kun',     null, 'kun',    'Quruqlik yoʻl: oʻrtacha muddat, kun.'),
  ('kargo.usd_m3',           null, 'USD/m3', 'Hajm boʻyicha stavka (ogʻirlik va hajmdan qimmati olinadi — FORMULA.md). Boʻlsa.'),
  ('kargo.min_usd',          null, 'USD',    'Bitta yuk uchun minimal toʻlov. Boʻlsa.')
on conflict (kalit) do nothing;

create or replace function public.so_fakt_oqi(p_kalitlar text[])
returns jsonb
language sql
security definer
set search_path = selleros, public
as $$
  select coalesce(jsonb_object_agg(kalit, jsonb_build_object(
           'qiymat', qiymat, 'birlik', birlik, 'manba', manba, 'olchandi', olchandi, 'izoh', izoh
         )), '{}'::jsonb)
  from selleros.fakt
  where kalit = any(p_kalitlar);
$$;

revoke all on selleros.fakt from public, anon, authenticated;
revoke all on function public.so_fakt_oqi(text[]) from public, anon, authenticated;
grant execute on function public.so_fakt_oqi(text[]) to service_role;

-- ------------------------------------------------------------ ochiq_ish
create table if not exists selleros.ochiq_ish (
  id         bigserial primary key,
  user_id    uuid not null references selleros.users(id) on delete cascade,
  -- 'kutyapman' — tashqi hodisani kutish (yuk kelishi, ariza javobi);
  -- 'tolov' — toʻlov qolib ketdi; 'tekshirish' — menejer oʻzi tekshiradi.
  tur        text not null check (tur in ('kutyapman', 'tolov', 'tekshirish')),
  sabab      text not null,
  -- Taxminiy muddat. NULL = nomaʼlum (masalan kargo muddati yoʻq) — nol emas.
  muddat     date,
  holat      text not null default 'ochiq' check (holat in ('ochiq', 'yopiq')),
  props      jsonb,
  created_at timestamptz not null default now(),
  yopildi_at timestamptz
);

create index if not exists ochiq_ish_user_idx on selleros.ochiq_ish (user_id, holat);

comment on table selleros.ochiq_ish is
  'Ssenariydagi ochiq ish: kutish/tolov/tekshirish. muddat NULL = nomalum. Eslatma mexanizmi alohida (BACKLOG).';

/*
 * Ochiq ish yozish. Bir xil (tur, sabab) OCHIQ ish bor boʻlsa — yangisi
 * yozilmaydi, mavjudi qaytadi: suhbat qayta yuklansa ikkita "yuk kelishini
 * kutyapman" paydo boʻlmasin.
 */
create or replace function public.so_ochiq_ish_yoz(
  p_token  text,
  p_tur    text,
  p_sabab  text,
  p_muddat date default null,
  p_props  jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_id bigint;
  v_yangi boolean := false;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;
  if length(p_sabab) > 300 then
    return jsonb_build_object('xato', 'sabab juda uzun');
  end if;

  select id into v_id from selleros.ochiq_ish
  where user_id = u and tur = p_tur and sabab = p_sabab and holat = 'ochiq'
  order by created_at desc limit 1;

  if v_id is null then
    insert into selleros.ochiq_ish (user_id, tur, sabab, muddat, props)
    values (u, p_tur, p_sabab, p_muddat, p_props)
    returning id into v_id;
    v_yangi := true;
  end if;

  return jsonb_build_object('id', v_id, 'yangi', v_yangi, 'muddat', p_muddat);
end;
$$;

revoke all on selleros.ochiq_ish from public, anon, authenticated;
revoke all on function public.so_ochiq_ish_yoz(text, text, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.so_ochiq_ish_yoz(text, text, text, date, jsonb) to service_role;

-- ------------------------------------------------------------ so_suhbat_yoz: city
-- Jonli taʼrif patchlanadi (0039/0050/0054 usuli); boʻlak topilmasa xato.
do $migratsiya$
declare
  eski text;
  yangi text;
  matn text;
begin
  select pg_get_functiondef(p.oid) into matn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'so_suhbat_yoz';

  eski := '    if p_profil ? ''hasUzumShop'' then';
  yangi := '    -- 6-qadam: yuk keladigan shahar (0056). Boʻsh matn — null.
    if p_profil ? ''city'' then
      update selleros.user_profiles
         set city = nullif(trim(p_profil->>''city''), ''''),
             answers = answers || jsonb_build_object(''city'', p_profil->''city''),
             updated_at = now()
       where user_id = u;
    end if;
    if p_profil ? ''hasUzumShop'' then';
  if position(eski in matn) = 0 then
    raise exception 'so_suhbat_yoz: almashtiriladigan bolak topilmadi';
  end if;
  execute replace(matn, eski, yangi);
end
$migratsiya$;
