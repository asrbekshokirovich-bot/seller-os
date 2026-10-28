-- 0076 — bosh sahifa hisoblagichi: ismsiz sanoq (nazoratchi, 2026-10-28: «hisoblagich qoʻy»).
--
-- NIMA YOʻQ EDI. Bosh sahifani nechta odam ochgani, nechtasi chatni boshlagani bilinmasdi.
-- Bazada faqat chat bor (`suhbat_xabar`, `yol`) va uning ichida sinov sessiyalari aralash:
-- 30 kunda 240 ta chat, 88 tasida birorta javob yoʻq — lekin qaysi biri haqiqiy mijoz, qaysi
-- biri sinov, ajratib boʻlmasdi. Bosh sahifa yangilansa, «yaxshi boʻldimi?» degan savolga
-- javob yoʻq edi.
--
-- ENDI toʻrt bosqich sanaladi (sayt brauzerdan yuboradi, Edge `POST /hisob`):
--   bosh_ochildi           — bosh sahifa ochildi (bir varaqda bir marta);
--   bosh_boshladi          — bosh sahifada «Boshlash» bosildi yoki 2 savolga javob berildi;
--   suhbat_birinchi_javob  — chatdagi birinchi javob (yangi suhbatda bir marta);
--   suhbat_yonalish        — yoʻnalish kartalari birinchi marta chiqdi.
--
-- ISMSIZ. `events` ga faqat nom va vaqt yoziladi: `user_id` boʻsh, IP, brauzer, sessiya va
-- matn YOʻQ. Sinovchi brauzeri (`?sinov=1`) `props.sinov = true` bilan yozadi — sanoqqa
-- kirmaydi, alohida soni koʻrsatiladi.
--
-- `so_hisob_voronka` — /olchov paneli uchun: Toshkent kunlari boʻyicha sanoq. Hisoblagich
-- ishga tushgan kun (`boshlandi`) ham qaytadi: undan oldingi kunlar NOL EMAS, oʻlchanmagan
-- (QOIDALAR §4) — panel ularni chiziqcha bilan koʻrsatadi.
--
-- Jadval oʻzgarmaydi: `events` (0004) va uning `(name, created_at)` indeksi bor.

create or replace function public.so_hisob_yoz(
  p_nom   text,
  p_sinov boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
as $$
begin
  -- Faqat shu toʻrt nom — tashqi input, ixtiyoriy narsa yozilmaydi.
  if p_nom is null
     or p_nom not in ('bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish') then
    return jsonb_build_object('xato', 'nomaʼlum hisob');
  end if;

  -- Toʻlib ketishdan himoya: Edge uchiga anon kalit bilan kirsa boʻladi (kalit kengaytmada
  -- ochiq). Bitta nom daqiqasiga 600 tadan oshsa — yozilmaydi (haqiqiy tashrif bunchalik emas).
  if (select count(*) from selleros.events
       where name = p_nom and created_at > now() - interval '1 minute') >= 600 then
    return jsonb_build_object('ok', false, 'sabab', 'chegara');
  end if;

  insert into selleros.events (user_id, name, props)
  values (null, p_nom,
          case when coalesce(p_sinov, false) then jsonb_build_object('sinov', true) end);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.so_hisob_yoz(text, boolean) from public, anon, authenticated;
grant execute on function public.so_hisob_yoz(text, boolean) to service_role;

create or replace function public.so_hisob_voronka(p_kun int default 14)
returns jsonb
language sql
stable
security definer
set search_path = selleros, public
as $$
  with davr as (
    select greatest(1, least(coalesce(p_kun, 14), 90)) as kun,
           (now() at time zone 'Asia/Tashkent')::date  as bugun
  ),
  kunlar as (
    select davr.bugun - g as kun
      from davr, generate_series(0, davr.kun - 1) as g
  ),
  hisob as (
    select (e.created_at at time zone 'Asia/Tashkent')::date as kun,
           e.name,
           coalesce(e.props->>'sinov', '') = 'true'          as sinov
      from selleros.events e, davr
     where e.name in ('bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish')
       and e.created_at >= ((davr.bugun - (davr.kun - 1))::timestamp at time zone 'Asia/Tashkent')
  ),
  qator as (
    select k.kun,
           count(h.name) filter (where h.name = 'bosh_ochildi'          and not h.sinov) as ochdi,
           count(h.name) filter (where h.name = 'bosh_boshladi'         and not h.sinov) as boshladi,
           count(h.name) filter (where h.name = 'suhbat_birinchi_javob' and not h.sinov) as javob,
           count(h.name) filter (where h.name = 'suhbat_yonalish'       and not h.sinov) as yonalish
      from kunlar k
      left join hisob h on h.kun = k.kun
     group by k.kun
  )
  select jsonb_build_object(
    'kun', (select kun from davr),
    -- Hisoblagich birinchi marta yozgan kun (sinovsiz, butun tarix boʻyicha). Undan oldin — oʻlchanmagan.
    'boshlandi', (select to_char(min((e.created_at at time zone 'Asia/Tashkent')::date), 'YYYY-MM-DD')
                    from selleros.events e
                   where e.name in ('bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish')
                     and coalesce(e.props->>'sinov', '') <> 'true'),
    'sinov', (select count(*) from hisob where sinov),
    'kunlar', coalesce((
      select jsonb_agg(jsonb_build_object(
               'sana', to_char(kun, 'YYYY-MM-DD'),
               'ochdi', ochdi, 'boshladi', boshladi, 'javob', javob, 'yonalish', yonalish)
             order by kun desc)
        from qator), '[]'::jsonb)
  );
$$;

revoke all on function public.so_hisob_voronka(int) from public, anon, authenticated;
grant execute on function public.so_hisob_voronka(int) to service_role;
