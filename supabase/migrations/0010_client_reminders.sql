-- Automatic reminders for a questionnaire that was sent and never came back.
--
-- The office sends a step and then waits. Nothing chases it, so a client who
-- means to finish and forgets is only found when somebody happens to scroll the
-- list. Two days, five days, seven days: a text each time, and then a call.
--
-- ── One row per reminder actually sent ──────────────────────────────────────
-- This is a log, not a queue. What is due is worked out from the send date and
-- the submission each time the job runs, so a schedule change takes effect
-- immediately and nothing has to be back-filled or cancelled. The unique index
-- is what makes the job safe to run twice in a day: the second insert loses.
--
-- `kind` is the rung on the ladder rather than a date, so "day 5" stays "day 5"
-- in the record even if the office later decides day 5 should be day 4.
--
-- ── Opting out ─────────────────────────────────────────────────────────────
-- clients.sms_opt_out is set when someone replies STOP. Twilio blocks that
-- number at its end too, but the flag is kept here so the office can SEE that a
-- client has opted out rather than wondering why the texts stopped, and so the
-- call — a different channel that STOP does not cover — can respect it too.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE TABLE lands somewhere
-- PostgREST does not look and the portal cannot reach.

create table if not exists public.client_reminders (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null references public.clients(id) on delete cascade,
  module_id   text not null check (module_id in ('module1', 'module2', 'module3')),
  kind        text not null check (kind in ('day2', 'day5', 'day7', 'call')),
  channel     text not null check (channel in ('sms', 'call')),
  to_number   text,
  lang        text,
  body        text,
  status      text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error       text,
  created_at  timestamptz not null default now(),
  unique (client_id, module_id, kind)
);

create index if not exists client_reminders_client_idx
  on public.client_reminders (client_id, module_id);

alter table public.clients
  add column if not exists sms_opt_out boolean not null default false;

alter table public.client_reminders enable row level security;

-- Everything reaches this through the service role from the API routes, as the
-- rest of the schema does. Without these grants PostgREST does not expose the
-- table at all, and answers "could not find the table" rather than saying the
-- grant is missing.
grant select, insert, update, delete, references, trigger, truncate
  on table public.client_reminders to service_role;
grant references, trigger, truncate
  on table public.client_reminders to anon, authenticated;
