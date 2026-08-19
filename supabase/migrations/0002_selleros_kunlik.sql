-- Seller OS · sxema v1 · 2-qism: kunlik tarix va sotuv taxmini

create table selleros.product_daily (
  product_id    bigint not null references selleros.product(id),
  date          date   not null,
  price         bigint,
  stock         integer,
  rating        numeric(3,2),
  reviews       integer,
  -- 1-tuzoq: shu tovarni nechta do'kon sotyapti.
  sellers_count integer,
  -- O'lchov aynan qachon olingani. Sana kunni bildiradi, o'lchov vaqtini
  -- emas: "19.08" turgani bilan raqam 03:06 da olingan bo'lishi mumkin.
  observed_at   timestamptz,
  -- O'lchov oynasi necha soat. Ikki o'lchov orasidagi masofa har xil
  -- bo'lsa, ulardan chiqqan sotuv taxmini ham har xil bo'ladi va kunlarni
  -- to'g'ridan-to'g'ri solishtirib bo'lmaydi. Buni yozmasak, panel
  -- 10 soatlik va 28 soatlik kunni tenglashtirib yolg'on o'sish ko'rsatadi.
  window_hours  numeric(5,2),
  sweeps        integer not null default 1,
  primary key (product_id, date)
);

create index product_daily_date_idx on selleros.product_daily (date);

create table selleros.sales_estimates (
  product_id  bigint not null references selleros.product(id),
  date        date   not null,
  -- Stok kamayishidan. Tovar kun ichida keltirilsa sotuvning bir qismi
  -- ko'rinmay qoladi — shuning uchun bu TAXMINIY.
  sold_units  integer,
  -- Stok o'sishidan. Sotuvdan AYIRILMAYDI — alohida saqlanadi, aks holda
  -- keltirilgan tovar sotuvni yo'qqa chiqarardi.
  restocked_units integer,
  revenue_uzs bigint,
  -- `exact` — platforma hisoblagichi (Uzum). `approx` — stok farqi.
  certainty   text not null check (certainty in ('exact', 'approx')),
  method      text not null,
  primary key (product_id, date)
);

create index sales_estimates_date_idx on selleros.sales_estimates (date);

-- Hisoblagich kamayishi kabi g'alati holatlar. Ular jimgina tashlanmaydi:
-- yozilmasa, ma'lumotdagi teshik ko'rinmay qoladi.
create table selleros.anomaly (
  id          bigserial primary key,
  product_id  bigint references selleros.product(id),
  date        date,
  kind        text not null,
  detail      jsonb,
  noticed_at  timestamptz not null default now()
);
