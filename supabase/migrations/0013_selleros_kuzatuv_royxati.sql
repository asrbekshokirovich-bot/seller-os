-- SellerOS kuzatuv roʻyxati — turkum boʻyicha muvozanatli.
--
-- QAROR (2026-08-24). Skreyper nimani oʻlchashi hech qayerda
-- yozilmagan edi, shuning uchun u faqat qoʻlda, berilgan id oraligʻida
-- ishlardi. Endi roʻyxat bazada turadi.
--
-- Nega turkum boʻyicha muvozanatli, "eng koʻp sotiladigan" emas.
-- Tuzoq filtrlari `categoryMedianUnits30d` ni talab qiladi va u faqat
-- turkum ICHIDA keng qamrov boʻlsa hisoblanadi. Faqat eng yaxshi
-- sotuvchilarni olsak, mediana yuqori chiqadi va "bu tovar
-- medianadan 3 barobar koʻp sotadi" degan shart hech qachon
-- bajarilmaydi. Zumsavdo 2-qatlamida aynan shu boʻlgan: monopoliya
-- filtri qamrov qorovuli bilan toʻsib qoʻyishga majbur boʻlgan.
--
-- Nega 300 turkum × 20 tovar. Oʻlchandi: katalogda 4 996 turkum bor,
-- shulardan eng kattasi 300 tasi tovarlarning 54% ini qamraydi
-- (808 561 / 1 501 132). Har turkumdan 20 ta olsak, mediana hisoblash
-- uchun yetarli boʻladi.
--
-- Nega 6 000 dan koʻp emas. Python skreyper hurmat rejimida ~1,1
-- tovar/soniya (oʻlchandi: 10 ta 8,75 soniyada). 6 000 tovar bir
-- aylanishda ~1,5 soat — kuniga uch marta sigʻadi va `certainty`
-- `yuqori` boʻladi. 50 000 esa ~12 soat, bitta ishga sigʻmaydi.

create table if not exists selleros.tracked_product (
  external_id bigint primary key,
  platform text not null default 'uzum' references selleros.platform(code),
  category_external_id bigint,
  -- Roʻyxatga olingandagi talab. Keyin oʻzgaradi — bu tanlov sababi,
  -- oʻlchov emas.
  buyers_per_week_at_pick integer,
  -- Turkum ichida qaysi boʻlakdan olingani (1 = eng koʻp sotiladigan).
  -- Namuna haqiqatan tarqalganini keyin tekshirish uchun saqlanadi.
  demand_bucket integer,
  active boolean not null default true,
  added_at timestamptz not null default now()
);

create index if not exists tracked_product_active_idx
  on selleros.tracked_product (active) where active;
create index if not exists tracked_product_category_idx
  on selleros.tracked_product (category_external_id);

comment on table selleros.tracked_product is
  'Skreyper oʻlchaydigan tovarlar. Turkum boʻyicha muvozanatli namuna — '
  'faqat eng koʻp sotiladiganlar emas, aks holda turkum medianasi buziladi.';
