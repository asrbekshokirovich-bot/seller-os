-- 0078 — «tovar-sotuvi-v1» formulasining SQL nusxasi (2026-11-05).
--
-- NEGA. AI tahlilchi butun bozor boʻyicha javob beradi («kiyimda nechta sotuvchi
-- yaxshi sotyapti?») — bu yuz minglab tovarni bir vaqtda hisoblash demak. Formula
-- hozir faqat TypeScript da (`packages/shared/src/tovar-sotuvi.ts`, `sotuvBahosi`):
-- Edge Function bir soʻrovda 810 ming tovarni oʻqiy olmaydi. Shuning uchun har
-- kechagi tayyor jadval (`tahlil_tovar`, 0079) shu funksiya bilan hisoblanadi.
--
-- BU YANGI FORMULA EMAS. FORMULA.md «Tovar sotuvi» (tovar-sotuvi-v1, nazoratchi
-- tasdigʻi 2026-10-26) ning aynan nusxasi: kunlik chegara
-- `max(10, 5×p75, ⌈3×belgi_max/7⌉, ⌈30×yangi sharh/oʻlchangan kun⌉)`, chegaradan
-- oshgan kun 0, `oyiga = Σ × 30 / maʼlum kun` (7 kundan kam — raqam yoʻq), holat va
-- ishonch. Ikki nusxa bir-biridan ajralmasligi uchun PARITET TESTI bor
-- (`supabase/test/tovar-baho.test.ts`): 1 200 ta HAQIQIY qator (05.11, qatlamlab
-- tanlangan) TS va SQL da hisoblanadi — har biri bir xil chiqishi shart.
-- TS ni oʻzgartirgan odam shu faylni ham oʻzgartiradi, aks holda CI qizaradi.
--
-- Qoʻshimcha (TS da faqat kunlik roʻyxat sifatida bor): trend uchun oxirgi 7 kun
-- va undan oldingi 23 kundagi SANALGAN sotuv va maʼlum kunlar soni (`s7/k7`,
-- `s23/k23`). Harakatsiz tovarda kunlar joyi nomaʼlum — `k7`, `k23` null.

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'zumsavdo' and t.typname = 'tovar_baho_t') then
    create type zumsavdo.tovar_baho_t as (
      oyiga       integer,   -- null: raqam yoʻq (oʻlchanmagan yoki 7 kundan kam)
      holat       text,      -- sotilyapti | sekin | sotilmadi | tugagan | ziddiyat | kam | olchanmagan
      ishonch     text,      -- yuqori | orta | past | null
      malum_kun   smallint,
      xom         integer,   -- tozalashdan oldingi kamayish
      kesildi     integer,   -- sanalmagan qism
      sharh_osish integer,
      belgi_oylik integer,
      s7          integer,
      k7          smallint,
      s23         integer,
      k23         smallint
    );
  end if;
end $$;

create or replace function zumsavdo.tovar_baho(
  p_olchangan_kun   integer,
  p_qoldiq_oxirgi   integer,
  p_tugaganiga      integer,
  p_sotildi         smallint[],
  p_olchangan_mask  integer,
  p_belgi           integer,
  p_belgi_max       integer,
  p_sharh_bosh      integer,
  p_sharh           integer
)
returns zumsavdo.tovar_baho_t
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  r            zumsavdo.tovar_baho_t;
  faol         boolean := p_sotildi is not null and p_olchangan_mask is not null;
  kunlik       integer[] := array_fill(null::integer, array[30]);
  malum        integer[] := '{}';
  saralangan   integer[];
  i            integer;
  s            integer;
  v            integer;
  p75          integer := 0;
  chegara      integer;
  jami         integer := 0;
  xom          integer := 0;
  n            integer;
  sharh_yoq    boolean;
  zid_a        boolean;
  zid_b        boolean;
  zid_c        boolean;
  zid          boolean;
  ulush        numeric;
  tasdiq       boolean;
begin
  r.xom := 0; r.kesildi := 0; r.malum_kun := 0;
  if p_olchangan_kun is null or p_olchangan_kun <= 0 then
    r.holat := 'olchanmagan';
    return r;
  end if;

  r.belgi_oylik := case when p_belgi is null then null else round(p_belgi * 30.0 / 7)::integer end;
  r.sharh_osish := case when p_sharh is not null and p_sharh_bosh is not null
                        then greatest(0, p_sharh - p_sharh_bosh) else null end;

  -- Kunlik kamayish: oʻlchangan va maʼlum kun — max(0, s); boshqasi — null (nol emas).
  -- Jonli oʻlchov (05.11, 50 000 qator): ~150 µs/qator, 810 ming ≈ 2 daqiqa.
  if faol then
    for i in 0..29 loop
      s := p_sotildi[i + 1];
      if ((p_olchangan_mask >> i) & 1) = 1 and s is not null then
        v := greatest(0, s);
        kunlik[i + 1] := v;
        malum := malum || v;
        xom := xom + v;
      end if;
    end loop;
  else
    -- Harakatsiz: har oʻlchangan kun 0 (kunlar joyi nomaʼlum).
    for i in 1..p_olchangan_kun loop
      malum := malum || 0;
    end loop;
  end if;

  n := coalesce(array_length(malum, 1), 0);
  r.malum_kun := n;
  if n > 0 then
    select array_agg(x order by x) into saralangan from unnest(malum) x;
    -- TS `persentil75`: s[floor(0.75 × (n − 1))] (0 dan sanaladi) — percentile_disc EMAS.
    p75 := saralangan[floor(0.75 * (n - 1))::integer + 1];
  end if;

  chegara := greatest(
    10,
    5 * p75,
    ceil(3 * coalesce(p_belgi_max, 0) / 7.0)::integer,
    ceil(30 * coalesce(r.sharh_osish, 0) / greatest(1, p_olchangan_kun)::numeric)::integer
  );

  -- Chegaradan oshgan kun BUTUNLAY sanalmaydi.
  if faol then
    r.s7 := 0; r.k7 := 0; r.s23 := 0; r.k23 := 0;
    for i in 0..29 loop
      v := kunlik[i + 1];
      continue when v is null;
      if v > chegara then v := 0; end if;
      jami := jami + v;
      if i >= 23 then r.s7 := r.s7 + v; r.k7 := r.k7 + 1;
      else r.s23 := r.s23 + v; r.k23 := r.k23 + 1; end if;
    end loop;
  else
    r.s7 := 0; r.s23 := 0;   -- harakatsiz: sotuv 0, kunlar joyi nomaʼlum (k7/k23 null)
  end if;

  r.xom := xom;
  r.kesildi := xom - jami;
  if n >= 7 then
    r.oyiga := round(jami * 30.0 / n)::integer;
  end if;

  -- Ziddiyat (FORMULA.md, `ZIDDIYAT` a/b/c).
  sharh_yoq := coalesce(r.sharh_osish, 0) = 0;
  zid_a := r.belgi_oylik is not null and r.oyiga is not null
           and r.oyiga > greatest(10 * r.belgi_oylik, r.belgi_oylik + 50) and sharh_yoq;
  zid_b := r.belgi_oylik is not null and r.belgi_oylik >= 100 and r.oyiga is not null
           and r.oyiga < r.belgi_oylik / 10.0 and coalesce(p_qoldiq_oxirgi, 0) > 0
           and coalesce(p_tugaganiga, 0) < 3;
  zid_c := xom > 0 and r.kesildi::numeric / xom > 0.5 and r.kesildi >= 50 and sharh_yoq
           and (r.belgi_oylik is null or r.belgi_oylik * 3 < r.kesildi);
  zid := zid_a or zid_b or zid_c;

  if coalesce(p_tugaganiga, 0) >= 3 then
    r.holat := 'tugagan';
  elsif n < 7 then
    r.holat := 'kam';
    r.oyiga := null;
  elsif zid then
    r.holat := 'ziddiyat';
  elsif coalesce(r.oyiga, 0) >= 30 then
    r.holat := 'sotilyapti';
  elsif coalesce(r.oyiga, 0) >= 1 then
    r.holat := 'sekin';
  else
    r.holat := 'sotilmadi';
  end if;

  if r.oyiga is null then
    r.ishonch := null;
  else
    ulush := case when xom > 0 then r.kesildi::numeric / xom else 0 end;
    tasdiq := case
      when r.belgi_oylik is null then r.oyiga < 30 or coalesce(r.sharh_osish, 0) >= 1
      when r.belgi_oylik = 0 then r.oyiga = 0
      else r.oyiga::numeric / r.belgi_oylik >= 0.2 and r.oyiga::numeric / r.belgi_oylik <= 5
    end;
    if zid or n < 14 or (ulush > 0.5 and not tasdiq) then r.ishonch := 'past';
    elsif n >= 20 and tasdiq then r.ishonch := 'yuqori';
    else r.ishonch := 'orta';
    end if;
  end if;

  return r;
end;
$$;

revoke all on function zumsavdo.tovar_baho(integer, integer, integer, smallint[], integer, integer, integer, integer, integer)
  from public, anon, authenticated;
