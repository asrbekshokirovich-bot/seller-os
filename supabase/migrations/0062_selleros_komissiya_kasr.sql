-- Uzum komissiyasi: yarim foiz (18,5 %) — butun son emas.
--
-- NEGA. Uzumning joriy jadvali — "Kalkulyator: Logistika va saqlash"
-- (a.yermakova@uzum.com, 2026-10-06 da yangilangan), "Комиссия на продажу"
-- varagʻi: 4 992 turkum. Chegirmadan keyingi FBO komissiyasi 407 turkumda
-- yarim foizli (7,5 %, 9,5 %, 18,5 % ...). `smallint` ularni jimgina
-- yaxlitlardi: 18,5 → 19 — har marja hisobiga 0,5 punkt xato, va xato
-- demping bayrogʻiga ulanadi (QOIDALAR.md, 4-boʻlim: toʻqilgan raqam yoʻq).
--
-- Ustun `numeric(5,2)` ga kengaytiriladi: mavjud butun qiymatlar oʻzgarmaydi,
-- 0–100 tekshiruvi qoladi. Komissiyani oʻqiydigan yagona funksiya —
-- `so_tovar_royxati` (CTE da ustunni oʻzicha oladi, tur eʼlon qilmaydi).
--
-- Maʼlumot (4 684 turkum) migratsiyada emas: u Uzum jadvalidan yuklanadi va
-- har qatorda manba va sana turadi (`docs/KOMISSIYA.md`, "Yangilash").

alter table selleros.uzum_komissiya
  alter column komissiya_foizi type numeric(5,2) using komissiya_foizi::numeric(5,2);

comment on table selleros.uzum_komissiya is
  'Uzum komissiyasi turkum boʻyicha (FBO, chegirmadan keyin). Manba — Uzumning oʻz '
  'jadvali; manba va sana har qatorda. 2026-10-06: «Kalkulyator: Logistika va saqlash».';
