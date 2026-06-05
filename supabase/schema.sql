-- ================================================================
-- JACKLAW Client Portal — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- ================================================================

-- Clients
create table if not exists clients (
  id          text primary key,
  name        text not null,
  phone       text not null unique,   -- digits only, e.g. "3105550000"
  case_type   text not null,
  onboarding_status text not null default 'not_started',
  created_at  timestamptz not null default now()
);

-- Questionnaire answers per client
create table if not exists questionnaire_states (
  client_id          text primary key references clients(id) on delete cascade,
  answers            jsonb not null default '{}',
  completed_sections integer[] not null default '{}',
  submitted          boolean not null default false,
  last_saved         timestamptz default now()
);

-- Document metadata per client
create table if not exists documents (
  id          bigserial primary key,
  client_id   text not null references clients(id) on delete cascade,
  name        text not null,
  category    text not null,
  uploaded_at timestamptz not null default now()
);

-- Row Level Security (all access via service role key through API routes)
alter table clients              enable row level security;
alter table questionnaire_states enable row level security;
alter table documents            enable row level security;
