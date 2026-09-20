-- Where a client's own answers disagree.
--
-- The extraction pass reads the whole file at once and reports these: the two
-- answers, why it matters, and what would settle it. Nothing stored them, so
-- the pass ran, was paid for, and its findings went out with the response —
-- while the follow-up engine had a parameter sitting empty waiting for them.
--
-- Not recoverable from the facts alone. The facts on both sides are marked
-- DISPUTED, which says THAT something is contested; this says what the two
-- answers were and how to settle it, and the two are not the same thing.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE lands somewhere PostgREST
-- does not look and the portal cannot reach.

create table if not exists public.case_fact_contradictions (
  id             uuid primary key default gen_random_uuid(),
  client_id      text        not null references public.clients(id) on delete cascade,
  about          text        not null,
  one_answer     text        not null default '',
  other_answer   text        not null default '',
  why_it_matters text        not null default '',
  how_to_resolve text        not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists case_fact_contradictions_client_idx
  on public.case_fact_contradictions (client_id);

comment on table public.case_fact_contradictions is
  'Staff-only. Places a client''s own intake answers disagree. Never shown to a client.';

alter table public.case_fact_contradictions enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.case_fact_contradictions to service_role;
grant references, trigger, truncate
  on table public.case_fact_contradictions to anon, authenticated;
