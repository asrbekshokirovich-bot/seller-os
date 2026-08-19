-- Seller OS · sxema v1 · 4-qism: mijoz, to'lov, o'lchov

create table selleros.users (
  id          uuid primary key,
  telegram_id bigint unique,
  phone       text,
  name        text,
  lang        text not null default 'uz' check (lang in ('uz', 'ru')),
  created_at  timestamptz not null default now()
);

create table selleros.subscriptions (
  id         bigserial primary key,
  user_id    uuid not null references selleros.users(id),
  plan       text not null,
  status     text not null check (status in ('trial','active','grace','paused','cancelled')),
  started_at timestamptz not null default now(),
  ends_at    timestamptz,
  -- Dunning: 1/3/7-kun qayta urinish. Hech narsa o'chirilmaydi —
  -- imtiyoz, keyin yumshoq pasaytirish.
  retry_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table selleros.payments (
  id           bigserial primary key,
  user_id      uuid not null references selleros.users(id),
  provider     text not null check (provider in ('payme','click','nasiya')),
  amount_uzs   bigint not null,
  status       text not null,
  external_id  text,
  -- Sandbox rejimidagi to'lov jonli to'lovdan ajratilishi shart, aks holda
  -- hisobotga soxta pul kirib qoladi.
  sandbox      boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Har LLM javobining narxi. Maqsad: AI xarajati tarif narxining 8% idan
-- oshmasin. O'lchanmasa — bilinmaydi.
create table selleros.ai_usage (
  id            bigserial primary key,
  user_id       uuid references selleros.users(id),
  model         text not null,
  purpose       text not null,
  input_tokens  integer,
  output_tokens integer,
  cost_usd      numeric(10,6),
  cached        boolean not null default false,
  created_at    timestamptz not null default now()
);

create table selleros.events (
  id         bigserial primary key,
  user_id    uuid references selleros.users(id),
  name       text not null,
  props      jsonb,
  created_at timestamptz not null default now()
);

create index ai_usage_created_idx on selleros.ai_usage (created_at);
create index events_name_idx      on selleros.events (name, created_at);
