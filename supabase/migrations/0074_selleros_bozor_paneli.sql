-- 0074 — kengaytma: bozor paneli — Uzum turkumining hamma faol tovari (2026-10-26).
--
-- Nazoratchi qarori («Sotuvchi koʻzoynagi», 2-bosqich): Uzum turkum yoki qidiruv
-- sahifasida shu turkum boʻyicha talab, taklif, narx zinapoyasi va raqobat (B).
-- Panelni `packages/shared/src/bozor-paneli.ts` yasaydi — har tovar sotuvi
-- `tovar-sotuvi.ts` dagi oʻsha formula bilan (FORMULA.md «Tovar sotuvi»); bu
-- funksiya HECH NARSA HISOBLAMAYDI, faqat turkum qatorlarini beradi:
--   qatorlar      — `zumsavdo.tovar_30kun` (kunlik `narx` massivi va `yangilandi` siz —
--                   panelga kerak emas, eng katta turkumda javob ~4 MB);
--   dokonlar      — shu qatorlardagi doʻkonlar nomi (eng katta doʻkonlar roʻyxati uchun);
--   yangi_chegara — «yangi» tovar chegarasi: `p_yangi_kun` kun oldingi (yoki undan
--                   oldingi eng yaqin) kundagi eng katta tovar raqami — Uzum tovar
--                   raqamlari ketma-ket beriladi (`zumsavdo.market_day.id_frontier`);
--   kesildi       — turkumda `p_max` dan koʻp tovar.
--
-- Turkum boʻyicha oʻqish uchun indeks: usiz har soʻrov 436 MB jadvalni toʻliq oʻqirdi.
-- Jadval zumsavdo omboriniki (migratsiya 20261021113923) — indeks oʻqish tomoni
-- uchun, shu yerda.
--
-- Faqat service_role (Edge Function) — 0071 dagidek.

create index if not exists tovar_30kun_kategoriya_idx on zumsavdo.tovar_30kun (kategoriya);

create or replace function public.so_bozor_qatorlar(p_kategoriya bigint, p_yangi_kun int, p_max int)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select t.*
    from zumsavdo.tovar_30kun t
    where t.kategoriya = p_kategoriya
    order by t.product_id
    limit least(greatest(p_max, 1), 20000) + 1
  ),
  oxirgi as (select max(q.sana) as sana from q)
  select jsonb_build_object(
    'kategoriya', p_kategoriya,
    'nom', (select c.name from zumsavdo.category c where c.id = p_kategoriya),
    'qatorlar', coalesce(
      (select jsonb_agg(to_jsonb(x) - 'narx' - 'yangilandi' order by x.product_id)
         from (select * from q order by q.product_id limit least(greatest(p_max, 1), 20000)) x),
      '[]'::jsonb),
    'kesildi', (select count(*) > least(greatest(p_max, 1), 20000) from q),
    'dokonlar', coalesce(
      (select jsonb_agg(jsonb_build_object('id', s.id, 'nom', s.name))
         from zumsavdo.shop s
        where s.id in (select distinct q.dokon from q where q.dokon is not null)),
      '[]'::jsonb),
    'yangi_chegara', (
      select jsonb_build_object('sana', m.date, 'id', m.id_frontier)
        from zumsavdo.market_day m, oxirgi o
       where m.id_frontier is not null and m.date <= o.sana - p_yangi_kun
       order by m.date desc
       limit 1)
  );
$$;

revoke all on function public.so_bozor_qatorlar(bigint, int, int) from public, anon, authenticated;
grant execute on function public.so_bozor_qatorlar(bigint, int, int) to service_role;
