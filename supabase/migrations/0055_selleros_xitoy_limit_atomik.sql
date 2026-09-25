-- Xitoy qidiruv limiti — ATOMIK band qilish, UMUMIY kunlik shift, qaytarish.
--
-- Mustaqil tekshiruv (2026-09-25, provayder ulangach) uchta teshik topdi:
--
--   1. POYGA. Sanoq provayder chaqiruvidan OLDIN oʻqilar, KEYIN oshirilar
--      edi. Bir odam 10 ta soʻrovni bir vaqtda yuborsa, hammasi "0 ta
--      ishlatilgan" ni koʻrib oʻtardi — limit qogʻozda.
--   2. ANONIM SESSIYA. `POST /sessiya` har chaqiruvda yangi foydalanuvchi
--      yaratadi (cheklovsiz). Limit foydalanuvchi boshiga, yaʼni yangi
--      sessiya = yangi 3 ta qidiruv = cheksiz pullik soʻrov.
--   3. NOMAʼLUM = NOL. `so_xitoy_limit` notoʻgʻri tokenga `{xato}` qaytarar,
--      uch esa `soni ?? 0` deb oʻqib oʻtkazib yuborardi (QOIDALAR §8-a).
--      Bu uchinchisi kodda tuzatildi (nomaʼlum → toʻxtash), bu yerda emas.
--
-- BU FUNKSIYA ENDI:
--   `p_oshir = true`  — BAND QILADI: bitta tranzaksiyada (advisory lock)
--                       shaxsiy (`p_limit`) va umumiy (`p_umumiy_limit`)
--                       chegarani tekshiradi va limit ichida boʻlsa
--                       sanoqni oshiradi. Chegaradan tashqarida `ruxsat:
--                       false` — sanoq oʻzgarmaydi. Chaqiruvchi provayderni
--                       FAQAT `ruxsat: true` bilan chaqiradi.
--   `p_qaytar = true` — provayder yiqilsa band qilingan birlikni qaytaradi
--                       (0 dan pastga tushmaydi). Qidiruv boʻlmadi — sanalmaydi.
--   ikkalasi ham yoʻq — faqat oʻqiydi.
--
-- Javob: `{soni, jami, ruxsat}`. `jami` — BUGUN hamma foydalanuvchi
-- yigʻindisi; umumiy shift shunga qaraydi (`XITOY_LIMIT.jamiKunlik`,
-- xitoy.ts). Bu haqiqiy autentifikatsiya oʻrnini bosmaydi (BACKLOG),
-- lekin xarajatga QATTIQ shift qoʻyadi: sessiya qancha boʻlmasin,
-- kuniga shundan koʻp pullik soʻrov ketmaydi.
--
-- Eski imzo (text, boolean) OʻCHIRILADI: ikkita variant tursa PostgREST
-- nomli argumentlar bilan chalkashadi. Yangi funksiya eski chaqiruvni
-- (`p_token` yolgʻiz, yoki `p_token` + `p_oshir`) standart qiymatlar
-- bilan qabul qiladi.

drop function if exists public.so_xitoy_limit(text, boolean);

create or replace function public.so_xitoy_limit(
  p_token         text,
  p_oshir         boolean default false,
  p_limit         integer default null,
  p_umumiy_limit  integer default null,
  p_qaytar        boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'extensions', 'public'
as $$
declare
  v_user   uuid;
  v_soni   integer;
  v_jami   integer;
  v_ruxsat boolean := true;
begin
  select user_id into v_user
  from selleros.user_session
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_user is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_qaytar then
    update selleros.xitoy_limit
       set soni = greatest(soni - 1, 0)
     where user_id = v_user and sana = current_date
    returning soni into v_soni;

  elsif p_oshir then
    -- Bitta qulf: shaxsiy va umumiy tekshiruv + oshirish bir butun.
    perform pg_advisory_xact_lock(hashtext('so_xitoy_limit'));

    insert into selleros.xitoy_limit (user_id, sana, soni)
    values (v_user, current_date, 0)
    on conflict (user_id, sana) do nothing;

    select coalesce(sum(soni), 0) into v_jami
    from selleros.xitoy_limit where sana = current_date;

    if p_umumiy_limit is not null and v_jami >= p_umumiy_limit then
      v_ruxsat := false;
    else
      update selleros.xitoy_limit
         set soni = soni + 1
       where user_id = v_user and sana = current_date
         and (p_limit is null or soni < p_limit)
      returning soni into v_soni;
      if not found then
        v_ruxsat := false;
      end if;
    end if;
  end if;

  if v_soni is null then
    select soni into v_soni
    from selleros.xitoy_limit
    where user_id = v_user and sana = current_date;
  end if;

  select coalesce(sum(soni), 0) into v_jami
  from selleros.xitoy_limit where sana = current_date;

  return jsonb_build_object(
    'soni', coalesce(v_soni, 0),
    'jami', v_jami,
    'ruxsat', v_ruxsat
  );
end;
$$;

comment on function public.so_xitoy_limit(text, boolean, integer, integer, boolean) is
  'Xitoy qidiruv kunlik sanogi. p_oshir: limit ichida bolsa atomik band qiladi '
  '(ruxsat false - sanoq ozgarmaydi). p_qaytar: bandni qaytaradi. jami - bugun hamma.';

revoke all on function public.so_xitoy_limit(text, boolean, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.so_xitoy_limit(text, boolean, integer, integer, boolean) to service_role;
