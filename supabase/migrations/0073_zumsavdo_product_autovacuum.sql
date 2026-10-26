-- Bosh sahifadagi «N tovar kuzatilmoqda» — 44 s → 2 s (2026-10-22).
--
-- NIMA BOʻLDI. `so_bazamiz` (0033) `count(*) from zumsavdo.product` ni sanaydi
-- (3,02 mln qator). Postgres buni indeksdan sanaydi, lekin faqat jadvalning
-- «hammasi koʻrinadi» deb belgilangan sahifalari uchun; qolganini diskdan
-- qayta oʻqiydi. Skreyper har kecha tovarlarni yangilaydi: 2026-10-22 ertalab
-- 316 ming oʻlik qator, sahifalarning faqat 54 % belgilangan edi — sanash 44 s,
-- funksiya chegarasi 20 s. `/bazamiz` 503 berdi, saytda son oʻrniga «—».
-- Qoʻlda `vacuum (analyze) zumsavdo.product` (egasining ruxsati bilan) — 100 %,
-- `so_bazamiz` 2,4 s.
--
-- NEGA TAKRORLANADI. Standart autovacuum jadvalni 20 % oʻlik qatorda tozalaydi —
-- bu jadvalda ~600 ming. Sekinlik undan ancha oldin boshlanadi.
--
-- TUZATISH — faqat shu ikki jadval, 2 % da (~60 ming / ~2 ming qator):
-- tozalash tez-tez va qisqa boʻladi, sahifalar belgisi yangi turadi.
-- Maʼlumot oʻzgarmaydi.

alter table zumsavdo.product set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);

alter table zumsavdo.shop set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);
