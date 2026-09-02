-- 0051: frontier zondining yozish yoʻli — hech qachon ishlamagan.
--
-- MUAMMO. `0043` `selleros.frontier_yoz()` ni yaratgan, skreyperda
-- `frontier.py` yozilgan, testi bor, CLI buyrugʻi bor. Lekin
-- `selleros.id_frontier` da BUGUNGACHA 0 qator.
--
-- Ikkita sabab bor va ikkalasi ham skreyper ishga tushganda darhol
-- yiqitardi:
--
--   1. SXEMA. Funksiya `selleros` sxemasida. PostgREST esa faqat
--      `public` ni koʻradi (`skreyper.yml` da bu allaqachon yozilgan:
--      "`selleros` sxemasi PostgREST da ochiq boʻlmasligi mumkin").
--      Skreyper `/rest/v1/rpc/frontier_yoz` ga soʻrov yuboradi va u
--      `public` da qidiriladi — u yerda bunday funksiya yoʻq.
--
--   2. HUQUQ. `0043` `revoke all ... from public, anon, authenticated`
--      yozgan, lekin `grant execute ... to service_role` YOZMAGAN.
--      Yaʼni sxema toʻgʻri boʻlganda ham skreyper chaqira olmasdi.
--
-- Hech kim sezmagan, chunki funksiyani chaqiradigan qadam hech bir
-- workflow da yoʻq edi — bu migratsiya bilan birga qoʻshilyapti.
--
-- YECHIM. `public.so_frontier_yoz` — reponing qolgan uchlari bilan bir
-- xil naqsh (`so_ingest_batch`, `so_select_tracked`, `so_bayroq_yoz`).
-- Ish `selleros.frontier_yoz` da qoladi; bu faqat ochiq eshik.
--
-- ZOND ISHLAYDIMI — tekshirildi. 2026-09-02, jonli Uzum, quruq yurish:
--
--     max_id 3 285 215, 23 qadam
--
-- Mustaqil tasdiq: zumsavdoning oʻz zondi oʻsha kuni 3 284 229 topgan.
-- Ikki boshqa amalga oshirish 986 id (0,03%) farq bilan bir xil javob
-- bergan.

create or replace function public.so_frontier_yoz(
  p_platform text,
  p_max_id   bigint,
  p_steps    int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
as $$
declare
  v_sana date;
  v_max  bigint;
begin
  -- Nol yoki manfiy id — oʻlchov emas, nosozlik. Uni yozib qoʻysak
  -- regressiya buziladi va buni keyin ajratib boʻlmaydi.
  if p_max_id is null or p_max_id <= 0 then
    raise exception 'so_frontier_yoz: max_id musbat boʻlishi kerak (kelgan: %)', p_max_id;
  end if;

  perform selleros.frontier_yoz(p_platform, p_max_id, coalesce(p_steps, 0));

  -- Chaqiruvchiga NIMA yozilganini qaytaramiz. `frontier_yoz` ichida
  -- `greatest(...)` bor: bir kunda ikki marta oʻlchansa kattasi
  -- qoladi, yaʼni qaytgan qiymat yuborilganidan farq qilishi mumkin.
  -- Workflow aynan shu qiymatni tekshiradi.
  select sana, max_id into v_sana, v_max
  from selleros.id_frontier
  where platform = p_platform and sana = current_date;

  return jsonb_build_object('sana', v_sana, 'max_id', v_max, 'qadamlar', p_steps);
end;
$$;

revoke all on function public.so_frontier_yoz(text, bigint, int)
  from public, anon, authenticated;
grant execute on function public.so_frontier_yoz(text, bigint, int)
  to service_role;

comment on function public.so_frontier_yoz(text, bigint, int) is
  'Kunlik frontier oʻlchovini yozadi va yozilganini qaytaradi. '
  'Skreyper chaqiradi (`python -m selleros_scraper frontier`). '
  '`selleros.frontier_yoz` ga ochiq eshik: PostgREST faqat `public` ni '
  'koʻradi.';
