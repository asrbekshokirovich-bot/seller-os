-- 3-qadam katalogi: Uzum yozuvi va 30 kunlik sharh oʻsishi.
--
-- NAZORATCHI (2026-10-13): "mijoz tushunmaydi; bu maʼlumotlarni qayerdan
-- olyapsan?". Katalog kodda oddiy tilga oʻtkazildi (`Suhbat.tsx`,
-- `qadamlar.ts` `sotuvToifasi`/`katalogOrni`). Bazadan yana ikki maydon
-- kerak — `so_tovar_royxati` qaytaradi:
--
--   `sharhOsishi30k` — shu 30 kunlik oynada qoʻshilgan sharhlar
--     (`product_daily.reviews`: oynadagi oxirgi − birinchi, kamida 2 kun).
--     4-tuzoq (`nakrutka.ts`) "sharh juda koʻp" ni FAQAT shu bilan
--     baholaydi. Ilgari jami sharh (yillab yigʻilgan) 30 kunlik sotuv bilan
--     solishtirilardi va eng ishonchli tovarlarga "reytingga ishonmang"
--     tushardi: katalogdagi eng koʻp sotilgan sumka (53 dona, jami 86
--     sharh), Bref (128 dona, jami 1 233 sharh; shu 30 kunda — 21,
--     kutilgani ~10). Bu maydonsiz "juda koʻp" tomoni baholanmaydi.
--
--   `xaridorYozuvi` — Uzum sahifasidagi «N kishi shu hafta sotib oldi»
--     (oxirgi oʻlchovdagi; sanasi — `olchandi`). Katalog uni UZUM YOZUVI
--     deb koʻrsatadi, oʻz oʻlchovimiz deb emas: oʻlchandi 2026-10-13, 378
--     tovarda bizning haftalik sotuv / Uzum yozuvi medianasi 0,69 (oraliq
--     0,27–1,39) — bir tartibda, lekin teng emas. Miqdor undan
--     hisoblanmaydi (`qadamlar.ts`, MIQDOR_UCHUN_MANBA).
--
-- `tovar_sotuvi` va tanlov tartibi OʻZGARMAYDI: turkumda 22 tadan koʻp
-- tovar yoʻq (2026-10-13, 300 turkum) — tartib kodda; qoldigʻi 0 tovar
-- kartada "Uzumda hozir tugagan" boʻlib chiqadi.

do $migratsiya$
declare
  matn text;
  yangi text;
begin
  select pg_get_functiondef('public.so_tovar_royxati(bigint,integer)'::regprocedure) into matn;

  if position('sharhOsishi30k' in matn) > 0 then
    raise notice 'so_tovar_royxati: allaqachon yangilangan — oʻtkazildi';
    return;
  end if;

  -- (a) oxirgi oʻlchovda Uzum yozuvi ham.
  yangi := replace(matn,
    '           o.price, o.stock, o.rating, o.reviews, o.observed_at',
    '           o.price, o.stock, o.rating, o.reviews, o.observed_at, o.buyers_per_week');
  -- (b) shu 30 kunlik oynada qoʻshilgan sharhlar (4-tuzoq, sotuv bilan bir oyna).
  yangi := replace(yangi,
    '  komissiya as (',
    '  sharh_osishi as (
    -- 0064: oynadagi oxirgi − birinchi sharh soni; kamida 2 kun boʻlsa.
    select d.product_id,
           (array_agg(d.reviews order by d.date desc))[1]
         - (array_agg(d.reviews order by d.date asc))[1] as osish
    from selleros.product_daily d
    join tovar tv on tv.id = d.product_id
    cross join bugun
    where d.date > bugun.d - 30 and d.reviews is not null
    group by d.product_id
    having count(distinct d.date) >= 2
  ),
  komissiya as (');
  -- (c) chiqishda Uzum yozuvi va sharh oʻsishi.
  yangi := replace(yangi,
    '''qoldiq'',                 o.stock,',
    '''qoldiq'',                 o.stock,
        -- Uzum sahifasidagi «N kishi shu hafta sotib oldi» (0064). Katalog uni
        -- Uzum yozuvi deb koʻrsatadi, miqdor undan hisoblanmaydi.
        ''xaridorYozuvi'',          o.buyers_per_week,
        -- Shu 30 kunda qoʻshilgan sharhlar (0064) — 4-tuzoq "sharh juda koʻp".
        ''sharhOsishi30k'',         so.osish,');
  yangi := replace(yangi,
    '      left join yangi_sotuv y on y.product_id = tv.id',
    '      left join yangi_sotuv y on y.product_id = tv.id
      left join sharh_osishi so on so.product_id = tv.id');

  if position('o.observed_at, o.buyers_per_week' in yangi) = 0
     or position('sharh_osishi as (' in yangi) = 0
     or position('''sharhOsishi30k''' in yangi) = 0
     or position('left join sharh_osishi so' in yangi) = 0 then
    raise exception 'so_tovar_royxati: almashtiriladigan boʻlak topilmadi';
  end if;
  execute yangi;
end
$migratsiya$;
