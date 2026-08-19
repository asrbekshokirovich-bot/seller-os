-- Seller OS · sxema v1 · 3-qism: Usta jadvallari
--
-- Bular mahsulotning yuragi: tuzoq bayroqlari, kategoriya talablari,
-- foydalanuvchi profili va tavsiya logi.

-- 8 tuzoq turi. TUZOQLAR.md dagi ro'yxat bilan bir xil bo'lishi shart —
-- testda tekshiriladi.
create type selleros.trap_kind as enum (
  'closed_brand',   -- 1. Yopiq brend tovari
  'seasonal',       -- 2. Mavsumiy tovar
  'dumping',        -- 3. Demping / zararga sotish
  'fake_sales',     -- 4. Sun'iy sotuv (nakrutka)
  'certification',  -- 5. Majburiy sertifikat / markirovka
  'monopoly',       -- 6. Monopol kategoriya
  'heavy',          -- 7. Og'ir / katta hajmli tovar
  'hype'            -- 8. Qisqa trend
);

create type selleros.severity as enum (
  'block',  -- tavsiyadan butunlay chiqariladi
  'warn',   -- chiqadi, lekin ogohlantirish va past ball bilan
  'note'    -- faqat izoh
);

create table selleros.product_flags (
  product_id  bigint not null references selleros.product(id),
  kind        selleros.trap_kind not null,
  severity    selleros.severity  not null,
  -- Foydalanuvchiga ko'rsatiladigan matn (o'zbekcha).
  reason      text not null,
  -- Qaysi raqamdan chiqqani. MAJBURIY: sababsiz bayroq ishonchni
  -- yo'qotadi. Foydalanuvchi "nega?" desa shu ko'rsatiladi.
  evidence    jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (product_id, kind)
);

create index product_flags_kind_idx     on selleros.product_flags (kind);
create index product_flags_severity_idx on selleros.product_flags (severity);

-- Qo'lda to'ldiriladi (B0 seed). Skreyper bermaydigan bilim shu yerda:
-- qaysi kategoriyada markirovka kerak, mavsumi qanday.
create table selleros.category_requirements (
  category_id          bigint primary key references selleros.category(id),
  marking_required     boolean not null default false,
  certificate_required boolean not null default false,
  entry_cost_uzs       bigint,
  entry_weeks          integer,
  -- Kategoriyaga kirish uchun "optimal" summa. 2-qadamda byudjet shundan
  -- ~2.5 barobar katta bo'lsa tizim 2–3 yo'nalishga bo'lishni taklif qiladi.
  optimal_entry_uzs    bigint,
  -- 12 oylik koeffitsient: [yanvar … dekabr]. 1.0 — o'rtacha.
  seasonality          numeric(4,2)[] check (seasonality is null or array_length(seasonality, 1) = 12),
  note                 text,
  updated_at           timestamptz not null default now()
);

create table selleros.user_profiles (
  user_id        uuid primary key,
  experience     text[],
  family_field   text[],
  interest       text[],
  budget_uzs     bigint,
  hours_per_week integer,
  city           text,
  -- Xom javoblar — savol matni o'zgarsa ham eski javob o'qilishi uchun.
  answers        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Har tavsiya yoziladi: javobgarlik uchun ham, o'rganish uchun ham.
-- "Aytganingiz sotilmadi" degan shikoyat kelsa, aynan nima aytilgani va
-- qaysi raqamlar asosida aytilgani ko'rinishi kerak.
create table selleros.recommendations (
  id              bigserial primary key,
  user_id         uuid not null,
  step            smallint not null check (step between 1 and 6),
  product_id      bigint references selleros.product(id),
  category_id     bigint references selleros.category(id),
  score           numeric(5,2),
  -- "Nega bu tovar?" tugmasi shu yerdan ochiladi: har qismning balli,
  -- vazni va qaysi raqamdan chiqqani.
  score_breakdown jsonb,
  flags           jsonb,
  formula_version text not null,
  created_at      timestamptz not null default now()
);

create index recommendations_user_idx on selleros.recommendations (user_id, created_at desc);
