-- 4 ta yangi fikstura RPC funksiyasi.
-- fikstura_yasash.py ularni chaqirib JSON fikstura yasaydi.

-- 4-tuzoq: nakrutka nomzodlari
CREATE OR REPLACE FUNCTION public.zs_nakrutka_nomzodlari()
RETURNS TABLE(
  pid bigint, title text,
  sold_30d integer, manba text,
  reviews integer, rating numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'selleros', 'zumsavdo', 'public'
SET statement_timeout TO '120s'
AS $$
  WITH ox AS (
    SELECT DISTINCT ON (product_id) product_id, reviews, rating
    FROM zumsavdo.product_census ORDER BY product_id, observed_at DESC
  ),
  base AS (
    SELECT p.external_id AS pid, p.title,
           ts.sold_30d, ts.manba,
           ox.reviews, ox.rating
    FROM selleros.product p
    LEFT JOIN selleros.tovar_sotuvi ts ON ts.product_id = p.id
    LEFT JOIN ox ON ox.product_id = p.external_id
    WHERE p.platform = 'uzum'
  ),
  yuqori AS (
    SELECT * FROM base
    WHERE manba = 'olchandi' AND sold_30d > 0 AND reviews IS NOT NULL
      AND reviews::numeric / (sold_30d * 0.08) > 4.0
    ORDER BY reviews::numeric / (sold_30d * 0.08) DESC
    LIMIT 11
  ),
  normal AS (
    SELECT * FROM base
    WHERE manba = 'olchandi' AND sold_30d > 0 AND reviews IS NOT NULL
      AND reviews::numeric / (sold_30d * 0.08) BETWEEN 0.25 AND 4.0
    ORDER BY pid LIMIT 1
  ),
  taxmin_q AS (
    SELECT * FROM base WHERE manba = 'taxmin' ORDER BY pid LIMIT 3
  ),
  nol AS (
    SELECT * FROM base
    WHERE manba = 'olchandi' AND sold_30d = 0
    ORDER BY pid LIMIT 10
  )
  SELECT * FROM yuqori
  UNION ALL SELECT * FROM normal
  UNION ALL SELECT * FROM taxmin_q
  UNION ALL SELECT * FROM nol;
$$;

-- 2-tuzoq: mavsumiy nomzodlari
CREATE OR REPLACE FUNCTION public.zs_mavsumiy_nomzodlari()
RETURNS TABLE(
  category_external_id bigint,
  turkum text,
  seasonality numeric[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'selleros', 'public'
AS $$
  SELECT c.external_id, c.name_uz, cr.seasonality
  FROM selleros.category_requirements cr
  JOIN selleros.category c ON c.id = cr.category_id
  WHERE cr.seasonality IS NOT NULL
  ORDER BY c.external_id;
$$;

-- 7-tuzoq: ogir/katta nomzodlari
CREATE OR REPLACE FUNCTION public.zs_ogir_nomzodlari()
RETURNS TABLE(
  pid bigint, title text,
  weight_g integer, volume_ml integer, oversized boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'selleros', 'public'
SET statement_timeout TO '120s'
AS $$
  WITH ogir AS (
    SELECT external_id AS pid, title, weight_g, volume_ml, oversized
    FROM selleros.product
    WHERE platform = 'uzum'
      AND (weight_g >= 5000 OR volume_ml >= 30000 OR oversized = true)
    ORDER BY pid LIMIT 20
  ),
  bosh AS (
    SELECT external_id AS pid, title, weight_g, volume_ml, oversized
    FROM selleros.product
    WHERE platform = 'uzum'
      AND weight_g IS NULL AND volume_ml IS NULL AND oversized IS NULL
    ORDER BY pid LIMIT 10
  )
  SELECT * FROM ogir
  UNION ALL SELECT * FROM bosh;
$$;

-- 5-tuzoq: sertifikat nomzodlari
CREATE OR REPLACE FUNCTION public.zs_sertifikat_nomzodlari()
RETURNS TABLE(
  category_external_id bigint, turkum text,
  marking_required boolean, certificate_required boolean,
  entry_cost_uzs bigint, entry_weeks integer,
  source text, note text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'selleros', 'public'
AS $$
  WITH sert AS (
    SELECT c.external_id, c.name_uz,
           cr.marking_required, cr.certificate_required,
           cr.entry_cost_uzs, cr.entry_weeks, cr.source, cr.note
    FROM selleros.category_requirements cr
    JOIN selleros.category c ON c.id = cr.category_id
    WHERE cr.marking_required = true OR cr.certificate_required = true
    ORDER BY c.external_id LIMIT 15
  ),
  bosh AS (
    SELECT c.external_id, c.name_uz,
           cr.marking_required, cr.certificate_required,
           cr.entry_cost_uzs, cr.entry_weeks, cr.source, cr.note
    FROM selleros.category_requirements cr
    JOIN selleros.category c ON c.id = cr.category_id
    WHERE cr.marking_required IS NULL AND cr.certificate_required IS NULL
    ORDER BY c.external_id LIMIT 7
  )
  SELECT * FROM sert
  UNION ALL SELECT * FROM bosh;
$$;

GRANT EXECUTE ON FUNCTION public.zs_nakrutka_nomzodlari() TO service_role;
GRANT EXECUTE ON FUNCTION public.zs_mavsumiy_nomzodlari() TO service_role;
GRANT EXECUTE ON FUNCTION public.zs_ogir_nomzodlari() TO service_role;
GRANT EXECUTE ON FUNCTION public.zs_sertifikat_nomzodlari() TO service_role;
