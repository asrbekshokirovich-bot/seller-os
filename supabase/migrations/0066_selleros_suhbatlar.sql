-- «Suhbatlarim» — mijozning oldingi suhbatlari (nazoratchi, 2026-10-14: "mijoz
-- kirib oldingi yozishgan chatini ham topishi kerak … suhbatlarim degan tugma
-- boʻladi, ichida oldin yozishilgan chatlar").
--
-- YANGI JADVAL YOʻQ. Suhbatlar jurnaldan (`suhbat_xabar`, faqat qoʻshiladi)
-- «Boshidan boshlash» belgilari bilan ajratiladi (rol = 'kod', savol_id =
-- 'boshdan'): har belgi oʻzidan OLDINGI suhbatni yopadi. 2026-10-14 dan belgining
-- `javob` ida oʻsha suhbatning holati turadi — {holat, qadam} (`suhbat.ts`,
-- `suhbatBoshdan`); shu bilan uni davom ettirish mumkin. Eski belgilarda holat
-- yoʻq — u suhbatlarni faqat oʻqish mumkin.
--
-- Uch funksiya, hammasi sessiya tokeni bilan — har mijoz faqat oʻzinikini koʻradi:
--   so_suhbatlar(p_token)                    — suhbatlar roʻyxati (oxirgi 30 ta);
--   so_suhbat_bolagi(p_token, boshi, oxiri)  — bitta suhbat xabarlari (oʻqish uchun);
--   so_suhbat_qaytar(p_token, boshi)         — eski suhbatga qaytish: joriy suhbat
--       belgi bilan yopiladi (holati saqlanadi — unga ham qaytish mumkin), eski
--       suhbat xabarlari jurnal oxiriga nusxalanadi, holat — eski suhbatniki.
-- Jurnaldan hech narsa oʻchmaydi va oʻzgarmaydi (`suhbat_ozgarmas` triggeri).

/*
 * Roʻyxat: har suhbatning chegarasi (birinchi va oxirgi seq), xabarlar soni,
 * mijoz yozganlari soni, vaqtlari, qadami va sarlavha uchun kerakli qism —
 * javoblar va tanlangan turkum nomi (butun holat emas: u katta boʻlishi mumkin).
 * Qaytilgan (nusxasi olingan) suhbat roʻyxatda takrorlanmaydi — nusxasi qoladi.
 */
create or replace function public.so_suhbatlar(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  h jsonb;
  q smallint;
  jami bigint;
  x jsonb;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select holat, qadam into h, q from selleros.yol where user_id = u;
  select count(*) into jami from selleros.suhbat_xabar
   where user_id = u and rol = 'kod' and savol_id = 'boshdan';

  with j as (
    select seq, rol, javob, created_at,
           (rol = 'kod' and savol_id = 'boshdan') as belgi,
           count(*) filter (where rol = 'kod' and savol_id = 'boshdan')
             over (order by seq rows between unbounded preceding and current row) as n
      from selleros.suhbat_xabar
     where user_id = u
  ),
  b as (
    -- Suhbat raqami — undan oldingi belgilar soni; belgining oʻzi suhbatga kirmaydi.
    select n, min(seq) as boshi, max(seq) as oxiri, count(*) as soni,
           count(*) filter (where rol = 'obunachi') as yozgan,
           min(created_at) as boshlandi, max(created_at) as yangilandi
      from j where not belgi
     group by n
  ),
  y as (
    -- Belgi oʻzidan oldingi suhbatni yopadi va uning holatini saqlaydi.
    select n - 1 as n, javob from j where belgi
  ),
  r as (
    select b.*, y.javob as yopuvchi
      from b left join y on y.n = b.n
     where b.n = jami
        or not exists (select 1 from j k where k.belgi and k.javob->>'qaytdi' = b.boshi::text)
     order by b.n desc
     limit 30
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'boshi', r.boshi,
           'oxiri', r.oxiri,
           'soni', r.soni,
           'yozgan', r.yozgan,
           'boshlandi', r.boshlandi,
           'yangilandi', r.yangilandi,
           'joriy', r.n = jami,
           'holatBor', case when r.n = jami then h is not null
                            else coalesce(jsonb_typeof(r.yopuvchi->'holat') = 'object', false) end,
           'qadam', case when r.n = jami then to_jsonb(q) else r.yopuvchi->'qadam' end,
           'javoblar', case when r.n = jami then h->'javoblar' else r.yopuvchi->'holat'->'javoblar' end,
           'turkum', case when r.n = jami then h->'natijalar'->'tovarlar'->'turkum'->>'name'
                          else r.yopuvchi->'holat'->'natijalar'->'tovarlar'->'turkum'->>'name' end
         ) order by r.n desc), '[]'::jsonb)
    into x
    from r;

  return jsonb_build_object('userId', u, 'suhbatlar', x);
end;
$$;

/*
 * Bitta suhbat xabarlari — oʻqish uchun (javobsiz: kartalar katta). Oxirgi 300 ta.
 */
create or replace function public.so_suhbat_bolagi(p_token text, p_boshi bigint, p_oxiri bigint)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  x jsonb;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'seq', seq, 'rol', rol, 'matn', matn, 'savolId', savol_id, 'at', created_at
         ) order by seq), '[]'::jsonb)
    into x
    from (
      select * from selleros.suhbat_xabar
       where user_id = u and seq between p_boshi and p_oxiri
         and not (rol = 'kod' and savol_id = 'boshdan')
       order by seq desc
       limit 300
    ) s;

  return jsonb_build_object('userId', u, 'xabarlar', x);
end;
$$;

/*
 * Eski suhbatga qaytish. `p_boshi` — suhbatning birinchi xabari (roʻyxatdagi
 * `boshi`). Hozirgi suhbat boʻlsa yoki holati saqlanmagan boʻlsa — xato, hech
 * narsa yozilmaydi. Yoʻl qatori qulflanadi (`so_suhbat_yoz` bilan bir xil navbat).
 */
create or replace function public.so_suhbat_qaytar(p_token text, p_boshi bigint)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u         uuid;
  belgi_seq bigint;
  yopuvchi  jsonb;
  oldingi   text;
  bosh      bigint;
  n         int := 0;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  insert into selleros.yol (user_id) values (u) on conflict (user_id) do nothing;
  perform 1 from selleros.yol where user_id = u for update;

  -- `p_boshi` suhbat boshi boʻlishi kerak: oʻzi belgi emas, oldingi xabari — belgi yoki yoʻq.
  select rol || ':' || coalesce(savol_id, '') into oldingi
    from selleros.suhbat_xabar
   where user_id = u and seq < p_boshi
   order by seq desc limit 1;
  if not exists (select 1 from selleros.suhbat_xabar
                  where user_id = u and seq = p_boshi and not (rol = 'kod' and savol_id = 'boshdan'))
     or (oldingi is not null and oldingi <> 'kod:boshdan') then
    return jsonb_build_object('xato', 'suhbat topilmadi');
  end if;

  -- Uni yopgan belgi — undan keyingi birinchi belgi; yoʻq boʻlsa — bu hozirgi suhbat.
  select seq, javob into belgi_seq, yopuvchi
    from selleros.suhbat_xabar
   where user_id = u and rol = 'kod' and savol_id = 'boshdan' and seq > p_boshi
   order by seq limit 1;
  if belgi_seq is null then
    return jsonb_build_object('xato', 'bu — hozirgi suhbat');
  end if;
  if jsonb_typeof(yopuvchi->'holat') is distinct from 'object' then
    return jsonb_build_object('xato', 'bu suhbatni faqat oʻqish mumkin');
  end if;

  select coalesce(max(seq), 0) into bosh from selleros.suhbat_xabar where user_id = u;

  -- 1) Hozirgi suhbat yopiladi: belgi va uning holati (keyin unga ham qaytish mumkin).
  insert into selleros.suhbat_xabar (user_id, seq, rol, matn, savol_id, javob)
  select u, bosh + 1, 'kod', 'Avvalgi suhbatga qaytildi', 'boshdan',
         jsonb_build_object('holat', y.holat, 'qadam', y.qadam, 'qaytdi', p_boshi)
    from selleros.yol y where y.user_id = u;

  -- 2) Eski suhbat xabarlari jurnal oxiriga nusxalanadi.
  insert into selleros.suhbat_xabar (user_id, seq, rol, matn, savol_id, javob)
  select u, bosh + 1 + row_number() over (order by s.seq), s.rol, s.matn, s.savol_id, s.javob
    from selleros.suhbat_xabar s
   where s.user_id = u and s.seq >= p_boshi and s.seq < belgi_seq
     and not (s.rol = 'kod' and s.savol_id = 'boshdan');
  get diagnostics n = row_count;

  -- 3) Holat — eski suhbatniki.
  update selleros.yol
     set holat = yopuvchi->'holat',
         qadam = coalesce(nullif(yopuvchi->>'qadam', '')::smallint, qadam),
         updated_at = now()
   where user_id = u;

  return jsonb_build_object('userId', u, 'qaytdi', p_boshi, 'nusxa', n);
end;
$$;

revoke all on function public.so_suhbatlar(text) from public, anon, authenticated;
revoke all on function public.so_suhbat_bolagi(text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.so_suhbat_qaytar(text, bigint) from public, anon, authenticated;
