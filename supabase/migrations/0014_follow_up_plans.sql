-- What each follow-up question is FOR, so the answer can be filed rather than
-- merely stored.
--
-- The questions themselves go where every other question goes: a question set,
-- with an assignment, rendered by the portal the client already uses and
-- chased by the reminders that already run. Nothing about delivery is new.
--
-- What IS new is the return path. An answer in question_set_responses is a
-- string against a question key. To turn it back into a fact — one that
-- supersedes a named fact in case_facts, or confirms a REPORTED one, or closes
-- an element the matrix could not reach — something has to remember why the
-- question was asked. That is this table. Without it every round of follow-up
-- produces answers nobody can route, and the brief stops being living and goes
-- back to being rewritten by hand.
--
-- It is kept apart from the question jsonb deliberately. That column is what a
-- client is shown and what the firm's own question-set editor lets an admin
-- edit; internal reasoning about a case does not belong in a row whose whole
-- purpose is to be rendered on a worker's phone.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE lands somewhere PostgREST
-- does not look and the portal cannot reach.

create table if not exists public.follow_up_plans (
  id              uuid primary key default gen_random_uuid(),
  client_id       text        not null references public.clients(id) on delete cascade,
  -- The set the questions were written into, and the assignment that carries
  -- them. Dropping either drops the plan: a plan pointing at questions nobody
  -- can open is worse than no plan.
  question_set_id uuid        not null references public.question_sets(id) on delete cascade,
  assignment_id   uuid        not null references public.client_question_set_assignments(id) on delete cascade,
  -- What the reading was built from, so a plan written against a ledger that
  -- has since moved can be spotted rather than trusted.
  fact_count      integer     not null,
  model           text        not null,
  -- Gaps the reading deliberately did not ask about, and why. The corpus's
  -- stopping rule makes this a finding, not an omission, and the office may
  -- disagree with any of it.
  left_out        jsonb       not null default '[]'::jsonb,
  -- Anything vet() objected to, kept with the plan so review starts from the
  -- list rather than from a clean page.
  vet_problems    jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  -- A person has read every question. The assignment is created as a draft,
  -- which the portal already hides from clients, and nothing here releases it.
  reviewed_at     timestamptz,
  reviewed_by     text
);

create index if not exists follow_up_plans_client_idx
  on public.follow_up_plans (client_id, created_at desc);

comment on table public.follow_up_plans is
  'Staff-only. One generated round of follow-up questions for a client, and what it deliberately left out. Never shown to a client.';

create table if not exists public.follow_up_questions (
  id              uuid primary key default gen_random_uuid(),
  plan_id         uuid        not null references public.follow_up_plans(id) on delete cascade,
  -- Matches question_set_responses.question_key, which is how an answer finds
  -- its way back here.
  question_key    text        not null,
  -- Which rung of the corpus's ladder (sec. 9), 1 to 10.
  rung            integer     not null,
  -- The kind of gap this closes, and the thing itself: a fact id from
  -- case_facts, a 'claim-id:element-key', or the gap's own words.
  resolves_kind   text        not null,
  resolves_ref    text        not null,
  -- What the office learns from the answer. Internal; never rendered.
  why_it_matters  text        not null default '',
  sort_order      integer     not null default 0,
  unique (plan_id, question_key)
);

create index if not exists follow_up_questions_ref_idx
  on public.follow_up_questions (resolves_ref);

comment on table public.follow_up_questions is
  'Staff-only. Why each follow-up question was asked, so its answer can be filed against the fact or element it was meant to settle.';

alter table public.follow_up_plans enable row level security;
alter table public.follow_up_questions enable row level security;

-- Everything reaches these through the service role from the API routes, as
-- the rest of the schema does. Without these grants PostgREST does not expose
-- the table at all — it answers "permission denied", which has already cost
-- this project one whole reading that ran, was paid for, and was then lost.
--
-- anon and authenticated get no data access. This is internal reasoning about
-- a client's own case and the client must never be able to read it.
grant select, insert, update, delete, references, trigger, truncate
  on table public.follow_up_plans to service_role;
grant select, insert, update, delete, references, trigger, truncate
  on table public.follow_up_questions to service_role;
grant references, trigger, truncate
  on table public.follow_up_plans to anon, authenticated;
grant references, trigger, truncate
  on table public.follow_up_questions to anon, authenticated;

-- Added after the first round was written, because the round was built from
-- the fact ledger alone and nothing in the record said so. The claim matrix
-- and the evidence spine exist as readings but are not yet wired into the app,
-- so a round generated today draws on open loops and unsettled facts and not
-- on the contradictions, silences and unreachable elements the other layers
-- find. That is a thinner round, and the office should be able to see it
-- rather than infer it from the questions.
alter table public.follow_up_plans
  add column if not exists built_from jsonb not null default '{}'::jsonb;

comment on column public.follow_up_plans.built_from is
  'Which readings were on file when the round was written — the fact ledger always, the claim matrix and evidence spine only if they had been run.';
