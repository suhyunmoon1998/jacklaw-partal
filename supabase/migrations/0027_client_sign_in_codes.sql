-- Signing a client in with a code texted to the number on file, and the
-- database's outside keys taken off every table.
--
-- 1. public.client_sign_in_codes
--
-- Signing in used to be a phone number and nothing else: anyone who knew a
-- client's number could open their file. Now the portal texts a six-digit code
-- (lib/signInCode.ts, app/api/clients/code). This table holds one row per
-- request for a code, texted or not, so a number and a connection can be
-- counted without saying which numbers are clients.
--
-- No row holds a phone number, an address or a code — only keyed hashes of
-- them, keyed on SESSION_SECRET, which the database does not have. Rows older
-- than a day are deleted as new requests arrive.
--
-- 2. public.case_facts, written down
--
-- The fact ledger was created outside the migrations. This states it as it
-- stands in production (2026-10-06), so a fresh database gets the same table,
-- the same cascade from clients and the same row-level security. On the
-- production database every statement here is a no-op except the grants.
--
-- 3. No table in public answers to the outside keys
--
-- The portal reaches the database only through the service role, from the
-- server. The anon and authenticated roles — the keys a browser could hold —
-- had full read and write grants on clients, documents and
-- questionnaire_states, held back only by row-level security with no
-- policies. One policy added by mistake would have opened them. They are
-- revoked on every table and sequence in public; service_role keeps its own.
--
-- Every name is schema-qualified: this database's search_path puts another
-- project's schema first.

create table if not exists public.client_sign_in_codes (
  id          uuid primary key default gen_random_uuid(),
  phone_hash  text not null check (phone_hash ~ '^[0-9a-f]{64}$'),
  ip_hash     text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  code_hash   text check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$'),
  attempts    integer not null default 0 check (attempts between 0 and 50),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

create index if not exists client_sign_in_codes_phone_idx
  on public.client_sign_in_codes (phone_hash, created_at desc);
create index if not exists client_sign_in_codes_ip_idx
  on public.client_sign_in_codes (ip_hash, created_at desc);

comment on table public.client_sign_in_codes is
  'One row per request for a sign-in code. Keyed hashes only: never a phone number, an address or a code. Rows older than a day are deleted.';

alter table public.client_sign_in_codes enable row level security;

create table if not exists public.case_facts (
  id             text primary key,
  client_id      text not null references public.clients(id) on delete cascade,
  proposition    text not null,
  status         text not null check (status in ('CONFIRMED', 'REPORTED', 'INFERRED', 'DISPUTED', 'UNKNOWN')),
  source_kind    text not null,
  source_pin     text not null default '',
  source_on      text not null default '',
  verbatim       text not null default '',
  period         text not null default '',
  location       text not null default '',
  actors         text[] not null default '{}',
  confidence     text not null default '',
  corroboration  text[] not null default '{}',
  contrary       text not null default '',
  open_loop      text not null default '',
  legal_tags     text[] not null default '{}',
  damages_tags   text[] not null default '{}',
  added_by       text not null default '',
  superseded_by  text references public.case_facts(id) on delete set null,
  superseded_why text,
  created_at     timestamptz not null default now()
);

create index if not exists case_facts_client_standing
  on public.case_facts (client_id) where superseded_by is null;
create index if not exists case_facts_legal_tags
  on public.case_facts using gin (legal_tags);

alter table public.case_facts enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, insert, update, delete on table public.client_sign_in_codes to service_role;
grant select, insert, update, delete on table public.case_facts to service_role;
