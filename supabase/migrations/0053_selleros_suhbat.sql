-- Suhbat: xabarlar tarixi va yoʻl holati.
--
-- Nazoratchi topshirigʻi (2026-09-25): ssenariy sunʼiy intellektga
-- joylashsin — bir vaqtda BITTA savol, javob kelgach keyingisi.
-- Savollar tartibini KOD hal qiladi (`packages/shared/src/ssenariy.ts`),
-- bu jadvallar esa "qayerda turibmiz" va "nima deyilgan" ni saqlaydi.
--
-- NEGA IKKI JADVAL. `suhbat_xabar` — xom jurnal, faqat QOʻSHILADI:
-- kim nima dedi, qaysi savolga qaysi javob. `yol` — hozirgi holat,
-- bitta qator, har javobda yangilanadi. Holatni xabarlardan qayta
-- hisoblash mumkin, lekin har soʻrovda qayta hisoblash qimmat va
-- xatoga moyil; holat esa kichik (`jsonb`) va tayyor.
--
-- HOLAT `jsonb` DA, USTUNLARDA EMAS — ataylab. Ssenariy oʻzgaradi
-- (savol qoʻshiladi, 5–12 qadamlar quriladi); har oʻzgarish
-- migratsiya talab qilmasligi kerak. Shakl `ssenariy.ts` dagi
-- `YolHolati`: `{javoblar: {...}, natijalar: {...}}`.
--
-- NAVBAT BAZADA HAM HIMOYALANADI. `so_suhbat_yoz` `yol` qatorini
-- `for update` bilan qulflaydi: bitta odamning ikki soʻrovi bir
-- vaqtda kelsa, ikkinchisi birinchisini kutadi va uning holatini
-- koʻradi. Aks holda ikkalasi bir xil `seq` ga yozib, biri
-- yoʻqolardi (zumsavdo/ai da aynan shu xato oʻlchangan, 2026-09-24).
--
-- PROFIL. Byudjet va Uzum doʻkoni javoblari `user_profiles` ga ham
-- yoziladi — 2-qadam (`/yonalishlar`) profilni oʻsha yerdan oʻqiydi.
-- Boʻsh javob `null`, NOL EMAS (QOIDALAR.md, 4-boʻlim).

create table if not exists selleros.suhbat_xabar (
  user_id    uuid        not null references selleros.users(id) on delete cascade,
  seq        bigint      not null,
  -- 'obunachi' — odam yozdi; 'menejer' — savol/javob matni;
  -- 'kod' — deterministik hisob natijasi (kartochka uchun).
  rol        text        not null check (rol in ('obunachi', 'menejer', 'kod')),
  matn       text        not null,
  savol_id   text,
  javob      jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, seq)
);

comment on table selleros.suhbat_xabar is
  'Suhbat jurnali. Faqat qoshiladi. Har qator: kim, nima, qaysi savolga.';

create table if not exists selleros.yol (
  user_id    uuid        primary key references selleros.users(id) on delete cascade,
  holat      jsonb       not null default '{"javoblar":{},"natijalar":{}}'::jsonb,
  qadam      smallint    not null default 1 check (qadam between 1 and 12),
  updated_at timestamptz not null default now()
);

comment on table selleros.yol is
  'Obunachining yoldagi orni. Shakli ssenariy.ts dagi YolHolati.';

-- Jurnal tahrirlanmaydi (0027 dagi `recommendations` bilan bir xil sabab).
create or replace function selleros.suhbat_ozgarmas()
returns trigger
language plpgsql
as $$
begin
  raise exception 'suhbat_xabar faqat QOSHILADI. Tahrirlash va ochirish taqiqlangan.';
end;
$$;

drop trigger if exists suhbat_ozgarmas_trig on selleros.suhbat_xabar;
create trigger suhbat_ozgarmas_trig
  before update or delete on selleros.suhbat_xabar
  for each row execute function selleros.suhbat_ozgarmas();

/*
 * Oʻqish: holat + oxirgi 60 xabar.
 *
 * Yoʻl qatori boʻlmasa `holat` null — bu "birinchi tashrif", xato
 * emas. Chaqiruvchi boshlangʻich holatdan boshlaydi.
 */
create or replace function public.so_suhbat_oqi(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  h jsonb;
  q smallint;
  x jsonb;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select holat, qadam into h, q from selleros.yol where user_id = u;

  select coalesce(jsonb_agg(jsonb_build_object(
           'seq', seq, 'rol', rol, 'matn', matn,
           'savolId', savol_id, 'javob', javob, 'at', created_at
         ) order by seq), '[]'::jsonb)
    into x
  from (
    select * from selleros.suhbat_xabar
    where user_id = u order by seq desc limit 60
  ) s;

  return jsonb_build_object('userId', u, 'holat', h, 'qadam', q, 'xabarlar', x);
end;
$$;

/*
 * Yozish: bir turndagi HAMMA xabar + yangi holat + profil — BITTA
 * tranzaksiyada.
 *
 * `p_xabarlar` — [{rol, matn, savolId?, javob?}, ...]. `seq` shu
 * yerda beriladi, chaqiruvchi tomonda emas: ikki soʻrov poygasi
 * boʻlmasin.
 *
 * `p_profil` — {budgetUzs?, hasUzumShop?}. Kalit BOʻLMASA tegilmaydi;
 * kalit bor va qiymati null boʻlsa — null yoziladi ("aytmadi").
 */
create or replace function public.so_suhbat_yoz(
  p_token    text,
  p_xabarlar jsonb,
  p_holat    jsonb,
  p_qadam    smallint,
  p_profil   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u       uuid;
  bosh    bigint;
  n       int := 0;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  -- Navbat: shu foydalanuvchining yoʻl qatori qulflanadi.
  insert into selleros.yol (user_id) values (u) on conflict (user_id) do nothing;
  perform 1 from selleros.yol where user_id = u for update;

  select coalesce(max(seq), 0) into bosh from selleros.suhbat_xabar where user_id = u;

  if p_xabarlar is not null and jsonb_typeof(p_xabarlar) = 'array' then
    insert into selleros.suhbat_xabar (user_id, seq, rol, matn, savol_id, javob)
    select u,
           bosh + ord,
           x->>'rol',
           coalesce(x->>'matn', ''),
           x->>'savolId',
           x->'javob'
    from jsonb_array_elements(p_xabarlar) with ordinality as t(x, ord);
    get diagnostics n = row_count;
  end if;

  update selleros.yol
     set holat = coalesce(p_holat, holat),
         qadam = coalesce(p_qadam, qadam),
         updated_at = now()
   where user_id = u;

  if p_profil is not null and jsonb_typeof(p_profil) = 'object' then
    insert into selleros.user_profiles (user_id) values (u) on conflict (user_id) do nothing;
    if p_profil ? 'budgetUzs' then
      update selleros.user_profiles
         set budget_uzs = nullif(p_profil->>'budgetUzs', '')::bigint,
             answers = answers || jsonb_build_object('budgetUzs', p_profil->'budgetUzs'),
             updated_at = now()
       where user_id = u;
    end if;
    if p_profil ? 'hasUzumShop' then
      update selleros.user_profiles
         set answers = answers || jsonb_build_object('hasUzumShop', p_profil->'hasUzumShop'),
             updated_at = now()
       where user_id = u;
    end if;
  end if;

  return jsonb_build_object('userId', u, 'yozildi', n, 'seq', bosh + n);
end;
$$;

/* Boshidan boshlash — holat tozalanadi, JURNAL QOLADI. */
create or replace function public.so_suhbat_boshdan(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;
  insert into selleros.yol (user_id) values (u)
  on conflict (user_id) do update
    set holat = '{"javoblar":{},"natijalar":{}}'::jsonb, qadam = 1, updated_at = now();
  return jsonb_build_object('userId', u, 'tozalandi', true);
end;
$$;

revoke all on selleros.suhbat_xabar from public, anon, authenticated;
revoke all on selleros.yol from public, anon, authenticated;
revoke all on function public.so_suhbat_oqi(text) from public, anon, authenticated;
revoke all on function public.so_suhbat_yoz(text, jsonb, jsonb, smallint, jsonb) from public, anon, authenticated;
revoke all on function public.so_suhbat_boshdan(text) from public, anon, authenticated;
