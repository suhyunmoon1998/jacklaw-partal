-- What the nightly run tried for a client and could not finish, so the next
-- run that night does not pay for the same failure again.
--
-- The follow-ups cron runs six times a night. A step that fails, or comes back
-- with nothing (a round with no questions, an extraction with no facts), used
-- to be skipped only for the rest of that run — so a client whose round kept
-- failing was the first paid call of all six runs, every night. A row here
-- holds that client and step back for twenty hours; the next night tries once.
--
-- The code reads this table tolerantly: until this migration is applied the
-- night simply runs as it did before.
--
-- Every name is schema-qualified (see 0015).

create table if not exists public.nightly_step_skips (
  client_id  text        not null references public.clients(id) on delete cascade,
  step       text        not null,
  failed_at  timestamptz not null default now(),
  reason     text,
  primary key (client_id, step)
);

comment on table public.nightly_step_skips is
  'Staff-only. A nightly step that failed or produced nothing, held back for twenty hours so it is not paid for again the same night.';

alter table public.nightly_step_skips enable row level security;

-- Without these grants PostgREST answers "permission denied" (see 0015).
grant select, insert, update, delete, references, trigger, truncate
  on table public.nightly_step_skips to service_role;
grant references, trigger, truncate
  on table public.nightly_step_skips to anon, authenticated;
