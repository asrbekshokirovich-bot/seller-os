-- Sotuv sahifasidagi "Bazamizda bugun" raqamlari — bazadan.
--
-- MUAMMO. Toʻrtta raqam `qurish.mjs` ichida QOʻLDA yozilgan edi va
-- sahifa ostida "2026-08-24 holatiga" deb turardi. Bir kunda
-- tovarlar soni 1 528 764 dan 1 850 863 ga oʻsdi — yaʼni sahifa
-- 320 000 ga yanglishardi va uni faqat qoʻlda tuzatish mumkin edi.
--
-- Sarlavha esa "Har bir raqam oʻlchangan" deb turadi. Qoʻlda
-- yozilgan raqam bilan bu daʼvo toʻgʻri emas.
--
-- NEGA RPC. Raqamlar `zumsavdo` sxemasidan — u PostgREST ga ochiq
-- emas va ochilmasligi ham kerak. SECURITY DEFINER funksiya faqat
-- shu beshta sonni beradi, boshqa hech narsani emas.
--
-- TEZLIGI. `count(*)` 1,85 mln qatorda ~540 ms. Beshtasi ~1,5 s —
-- bu har tashrif uchun koʻp. Shuning uchun web tomonida bir soatlik
-- kesh bor: baza kuniga ~24 marta soʻraladi, tashrif soni qancha
-- boʻlishidan qatʼi nazar. Supurish kuniga uch marta boʻlgani
-- uchun bir soatlik kesh maʼlumotni eskirtirmaydi.

create or replace function public.so_bazamiz()
returns jsonb
language sql
security definer
set search_path = zumsavdo, selleros, public
set statement_timeout = '20s'
as $$
  select jsonb_build_object(
    'tovar',      (select count(*) from zumsavdo.product),
    'dokon',      (select count(*) from zumsavdo.shop),
    'turkum',     (select count(*) from zumsavdo.category),
    -- Kuniga necha tovar oʻlchanadi: bugun kunlik yozuv olgan
    -- tovarlar. Bu "reja" emas, HAQIQATDA yozilgani.
    'kunlik',     (select count(distinct product_id) from zumsavdo.product_day
                   where date = (now() at time zone 'Asia/Tashkent')::date),
    'olchandi',   (now() at time zone 'Asia/Tashkent')::date
  );
$$;

revoke all on function public.so_bazamiz() from public, anon, authenticated;
