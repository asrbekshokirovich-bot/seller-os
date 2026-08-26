-- Uzum komissiyasi turkum boʻyicha — nazoratchi bergan jadvaldan.
--
-- NEGA KERAK. `tannarxHisobi()` va 3-tuzoq (demping) `komissiyaFoizi`
-- ni TALAB qiladi, lekin bugungacha uni foydalanuvchi qoʻlda
-- kiritardi. Yaʼni "bu narxda zarar" degan xulosa foydalanuvchining
-- TAXMINIGA tayanardi.
--
-- MANBA. Uzumning oʻz jadvali: "Новые комиссии c калькулятором"
-- (s.saprikin@uzum.com). Undagi `category ID` bizning
-- `selleros.category.external_id` bilan bir xil fazoda — tekshirildi:
-- 2607 "Soatlar", 2615 "Boshqa avtomobil aksessuarlari".
--
-- QAMROV CHEKLANGAN va bu ochiq yozib qoʻyiladi:
--
--   jadvalda           223 turkum
--   bizda topilgani     19 turkum
--   qamragan tovar     343 / 6 025  (5.7%)
--
-- Sabab: jadvaldagi id lar 11—2799 oraligʻida, Uzumning hozirgi
-- turkumlari esa 16 000 gacha boradi. Yaʼni jadval eski id fazosini
-- ishlatadi va koʻpchilik turkum unda yoʻq.
--
-- NOM BOʻYICHA MOSLASHTIRISH QILINMADI. Turkum nomiga qarab
-- taxmin qilish shu loyihada bir marta 9 tadan 5 tasida notoʻgʻri
-- chiqqan. Komissiya esa marjaga, marja demping bayrogʻiga ulanadi:
-- notoʻgʻri komissiya foydali tovarni "zararli" deb bloklardi.
--
-- FBO OLINDI. Jadvalda uch ustun bor: FBO, FBS, DBS — uch xil
-- bajarish modeli. 223 tadan 221 tasida uchalasi bir xil. Yangi
-- boshlovchi Uzum omborini ishlatadi, shuning uchun FBO.
--
-- `so_tovar_royxati` endi `komissiyaFoizi` va `komissiyaManbasi`
-- qaytaradi. `null` — bu turkum jadvalda yoʻq va 4-qadam
-- foydalanuvchidan soʻraydi.
--
-- Jadval va funksiya jonli bazaga qoʻllangan.

create table if not exists selleros.uzum_komissiya (
  platform             text not null default 'uzum'
                       references selleros.platform(code),
  category_external_id bigint not null,
  komissiya_foizi      smallint not null check (komissiya_foizi between 0 and 100),
  manba                text not null,
  olchandi             date not null default current_date,
  updated_at           timestamptz not null default now(),
  primary key (platform, category_external_id)
);

comment on table selleros.uzum_komissiya is
  'Uzum komissiyasi turkum boʻyicha (FBO). Manba — Uzumning oʻz '
  'jadvali. Qamrov toʻliq emas: 223/5315 turkum.';

revoke all on selleros.uzum_komissiya from public, anon, authenticated;
