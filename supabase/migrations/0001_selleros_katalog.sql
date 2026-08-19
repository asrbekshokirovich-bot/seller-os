-- Seller OS · sxema v1 · 1-qism: katalog
--
-- SXEMA.md ga mos. O'zgarish avval o'sha faylda, keyin shu yerda.
--
-- `platform` ustuni birinchi kundan bor: reja B6 da WB va Yandex
-- qo'shilishini aytadi, platformani keyin qo'shish esa har jadvalning
-- kalitini qayta qurish degani. Hozir bitta ustun arzon, keyin qimmat.

create schema if not exists selleros;

create table selleros.platform (
  code          text primary key,
  name          text not null,
  base_url      text,
  -- Bu platformada buyurtma ANIQ o'lchanadimi.
  --
  -- Uzumda `Shop.ordersQuantity` hisoblagichi bor va ikki o'lchov farqi
  -- aniq buyurtma beradi. WB da bunday hisoblagich yo'q — u yerda faqat
  -- stok kamayishidan taxmin qilinadi. Panel bu farqni ko'rsatishi shart,
  -- aks holda ikki xil ishonchlilikdagi raqam aralashib ketadi.
  exact_orders  boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

insert into selleros.platform (code, name, base_url, exact_orders, active) values
  ('uzum',   'Uzum Market',             'https://uzum.uz',            true,  true),
  ('wb-uz',  'Wildberries O''zbekiston', 'https://www.wildberries.uz', false, false),
  ('yandex', 'Yandex Market',           'https://market.yandex.uz',   false, false);

create table selleros.category (
  id            bigserial primary key,
  platform      text not null references selleros.platform(code),
  external_id   bigint not null,
  parent_id     bigint references selleros.category(id),
  name_uz       text,
  name_ru       text,
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (platform, external_id)
);

create table selleros.shop (
  id            bigserial primary key,
  platform      text not null references selleros.platform(code),
  external_id   bigint not null,
  name          text not null,
  -- 1-tuzoq (yopiq brend) uchun MAJBURIY: rasmiy brend do'koni belgisi
  -- signalning uchdan biri. Bo'lmasa filtr ishlamaydi.
  official      boolean not null default false,
  rating        numeric(3,2),
  category_id   bigint references selleros.category(id),
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (platform, external_id)
);

create table selleros.product (
  id            bigserial primary key,
  platform      text not null references selleros.platform(code),
  external_id   bigint not null,
  title         text not null,
  shop_id       bigint references selleros.shop(id),
  category_id   bigint references selleros.category(id),
  -- 1-tuzoq: brend nomi tovar nomida uchrashi signalning bir qismi.
  brand         text,
  -- 7-tuzoq (og'ir tovar): kargo tannarxi shulardan hisoblanadi.
  weight_g      integer,
  volume_ml     integer,
  -- 8-tuzoq (hype): tovar "yoshi" shu sanadan o'lchanadi.
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (platform, external_id)
);

create index category_platform_idx on selleros.category (platform);
create index shop_platform_idx     on selleros.shop     (platform);
create index product_platform_idx  on selleros.product  (platform);
create index product_shop_idx      on selleros.product  (shop_id);
create index product_category_idx  on selleros.product  (category_id);
create index product_brand_idx     on selleros.product  (brand) where brand is not null;
