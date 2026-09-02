-- Demping va Hype fikstura RPC funksiyalari.
-- fikstura_yasash.py ularni chaqirib JSON fikstura yasaydi.

-- 3-tuzoq: demping nomzodlari
--
-- Demping filtri DB ga SAQLANMAYDIgan tannarxni ishlatadi (xitoyNarxi,
-- kargo, bojxonaQqs, komissiya sotuvchidan olinadi). Shuning uchun bu
-- RPC haqiqiy tannarxni HISOBLAMAYDI — u sotuv narxi va turkum
-- komissiyasini oladi, qolganini fikstura generatori Python da
-- sintez qiladi.
CREATE OR REPLACE FUNCTION public.zs_demping_nomzodlari()
RETURNS TABLE(
  pid bigint, title text,
  sotuv_narxi bigint,
  komissiya_foiz numeric,
  sold_30d integer, manba text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'selleros', 'zumsavdo', 'public'
SET statement_timeout TO '120s'
AS $$
  WITH asosiy AS (
    SELECT p.external_id AS pid, p.title,
           pd.price AS sotuv_narxi,
           cr.commission_percent AS komissiya_foiz,
           ts.sold_30d, ts.manba
    FROM selleros.product p
    LEFT JOIN selleros.tovar_sotuvi ts ON ts.product_id = p.id
    LEFT JOIN selleros.category_requirements cr
      ON cr.category_id = p.category_id
    LEFT JOIN LATERAL (
      SELECT price FROM selleros.product_daily
      WHERE product_id = p.id AND price IS NOT NULL
      ORDER BY date DESC LIMIT 1
    ) pd ON true
    WHERE p.platform = 'uzum'
      AND pd.price IS NOT NULL
      AND ts.sold_30d IS NOT NULL
      AND ts.sold_30d > 0
  ),
  arzon AS (
    -- Eng arzon tovarlar: marja past bo'lish ehtimoli katta
    SELECT * FROM asosiy
    WHERE sotuv_narxi < 50000
    ORDER BY sotuv_narxi ASC
    LIMIT 10
  ),
  o_rtacha AS (
    -- O'rtacha narxli tovarlar: marja yaxshi bo'lishi kerak
    SELECT * FROM asosiy
    WHERE sotuv_narxi BETWEEN 100000 AND 500000
    ORDER BY pid
    LIMIT 8
  ),
  qimmat AS (
    -- Qimmat tovarlar: marja odatda yuqori
    SELECT * FROM asosiy
    WHERE sotuv_narxi > 500000
    ORDER BY pid
    LIMIT 7
  )
  SELECT * FROM arzon
  UNION ALL SELECT * FROM o_rtacha
  UNION ALL SELECT * FROM qimmat;
$$;

-- 8-tuzoq: hype nomzodlari
--
-- Hype filtri ikkita signalni tekshiradi:
-- 1) productAgeDays — tovar necha kunlik (first_seen_at dan)
-- 2) yangiSotuvUlushi — so'nggi 14 kunlik sotuv / 30 kunlik sotuv
CREATE OR REPLACE FUNCTION public.zs_hype_nomzodlari()
RETURNS TABLE(
  pid bigint, title text,
  product_age_days integer,
  sold_30d integer, sold_14d integer,
  manba text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'selleros', 'public'
SET statement_timeout TO '120s'
AS $$
  WITH kunlar_14 AS (
    SELECT product_id, sum(sold_units)::int AS sotuv
    FROM selleros.sales_estimates
    WHERE date > (now() AT TIME ZONE 'Asia/Tashkent')::date - 14
      AND sold_units IS NOT NULL
    GROUP BY product_id
  ),
  asosiy AS (
    SELECT p.external_id AS pid, p.title,
           (now()::date - p.first_seen_at::date)::int AS product_age_days,
           ts.sold_30d,
           k14.sotuv AS sold_14d,
           ts.manba
    FROM selleros.product p
    LEFT JOIN selleros.tovar_sotuvi ts ON ts.product_id = p.id
    LEFT JOIN kunlar_14 k14 ON k14.product_id = p.id
    WHERE p.platform = 'uzum'
      AND ts.sold_30d IS NOT NULL
      AND ts.sold_30d > 0
      AND ts.manba = 'olchandi'
  ),
  yosh AS (
    -- Yosh tovarlar (< 42 kun): hype bo'lishi mumkin
    SELECT * FROM asosiy
    WHERE product_age_days <= 42
    ORDER BY product_age_days ASC
    LIMIT 12
  ),
  eski AS (
    -- Eski tovarlar (> 42 kun): hype bo'lmasligi kerak
    SELECT * FROM asosiy
    WHERE product_age_days > 90
    ORDER BY pid
    LIMIT 8
  ),
  bosh AS (
    -- Sotuv ma'lumoti yo'q tovarlar
    SELECT p.external_id AS pid, p.title,
           (now()::date - p.first_seen_at::date)::int AS product_age_days,
           ts.sold_30d,
           NULL::int AS sold_14d,
           ts.manba
    FROM selleros.product p
    LEFT JOIN selleros.tovar_sotuvi ts ON ts.product_id = p.id
    WHERE p.platform = 'uzum'
      AND (ts.sold_30d IS NULL OR ts.manba = 'taxmin')
    ORDER BY p.external_id
    LIMIT 5
  )
  SELECT * FROM yosh
  UNION ALL SELECT * FROM eski
  UNION ALL SELECT * FROM bosh;
$$;

GRANT EXECUTE ON FUNCTION public.zs_demping_nomzodlari() TO service_role;
GRANT EXECUTE ON FUNCTION public.zs_hype_nomzodlari() TO service_role;
