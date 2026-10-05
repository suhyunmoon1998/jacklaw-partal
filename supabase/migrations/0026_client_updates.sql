-- Update texts the office sent a client about their case.
--
-- Eleanor, the office's assistant, can now text a client how their case
-- stands — a mediation date, that their documents arrived — after Jack has
-- approved the exact words on his own screen (app/api/eleanor/sends,
-- kind=update). The words are fixed sentences written in four languages
-- (lib/clientUpdates.ts); nothing is machine-translated.
--
-- ── One row per text ───────────────────────────────────────────────────────
-- Written BEFORE the text goes out (status 'sending'), then marked 'sent' or
-- 'failed'. The partial unique index is what stops a retried approval from
-- texting the same client twice: `seal` is the HMAC over everything the client
-- would receive, the firm's day included, so the same text to the same client
-- can be claimed once a day. A failed text drops out of the index and can be
-- approved again.
--
-- `body` is what the client read, in their language; `english` the same fixed
-- sentences in English, for the office. `sentences` is the short form Eleanor
-- reads back ("date_mediation:2026-10-20,docs_received") — she never reads the
-- number or the words.
--
-- Until this migration is applied, an update is refused before anything is
-- sent: the claim cannot be written, so the text never goes out.
--
-- Every name is schema-qualified (see 0015).

create table if not exists public.client_updates (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null references public.clients(id) on delete cascade,
  seal         text not null,
  day          date not null,
  sentences    text not null,
  lang         text not null,
  body         text not null,
  english      text not null,
  to_number    text not null,
  status       text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  provider_id  text,
  error        text,
  requested_by text not null default 'eleanor',
  created_at   timestamptz not null default now()
);

comment on table public.client_updates is
  'Update texts sent to a client from Eleanor after Jack approved the exact words. Fixed sentences in the client''s language; one row per text, claimed before it is sent.';

create unique index if not exists client_updates_once
  on public.client_updates (client_id, seal)
  where status in ('sending', 'sent');

create index if not exists client_updates_client_idx
  on public.client_updates (client_id, created_at desc);

alter table public.client_updates enable row level security;

-- Without these grants PostgREST answers "permission denied" (see 0015), and
-- every update would be refused at its claim.
grant select, insert, update, delete, references, trigger, truncate
  on table public.client_updates to service_role;
grant references, trigger, truncate
  on table public.client_updates to anon, authenticated;
