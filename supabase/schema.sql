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
  case_name   text,
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
  storage_path text,
  uploaded_at timestamptz not null default now()
);

-- ================================================================
-- Question Sets — reusable questionnaires assigned per client
--
-- The default onboarding questionnaire is NOT stored here. It lives in
-- lib/questionnaireData.ts with answers in questionnaire_states above, and is
-- surfaced in the admin panel as a read-only entry. Keeping one source for it
-- is what stops the built-in copy and a database copy from drifting apart.
-- ================================================================

-- Reusable template (Who's Who, Wage & Hour, Harassment Follow-Up …)
create table if not exists question_sets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_es     text,                       -- shown to clients reading in Spanish
  description text not null default '',
  status      text not null default 'active' check (status in ('active', 'archived')),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per question. `question` holds the same shape the portal renders:
-- { id, label, type, required, options, placeholder, helpText, showIf }
-- plus optional Spanish in `es`: { label, helpText, placeholder, options }.
-- The Spanish options are display labels only — matched to the English ones by
-- position — so a Spanish-speaking client's choices are still recorded in
-- English and the office never reads a record in two languages.
create table if not exists question_set_questions (
  id              uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references question_sets(id) on delete cascade,
  question        jsonb not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists question_set_questions_set_idx
  on question_set_questions (question_set_id, sort_order);

-- A template handed to one client. Progress and status live here, never on the
-- reusable template above.
create table if not exists client_question_set_assignments (
  id              uuid primary key default gen_random_uuid(),
  client_id       text not null references clients(id) on delete cascade,
  question_set_id uuid not null references question_sets(id) on delete restrict,
  status          text not null default 'assigned'
                  check (status in ('draft', 'assigned', 'sent', 'in_progress', 'completed')),
  assigned_at     timestamptz not null default now(),
  sent_at         timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists assignments_client_idx
  on client_question_set_assignments (client_id, assigned_at desc);

-- One row per answered question, scoped to the assignment — answers from two
-- clients holding the same set can never mix.
create table if not exists question_set_responses (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references client_question_set_assignments(id) on delete cascade,
  client_id       text not null references clients(id) on delete cascade,
  question_set_id uuid not null references question_sets(id) on delete cascade,
  question_key    text not null,
  answer          jsonb,
  updated_at      timestamptz not null default now(),
  unique (assignment_id, question_key)
);

create index if not exists responses_assignment_idx
  on question_set_responses (assignment_id);

-- Replacing a set's questions must be all-or-nothing. Done as a DELETE then an
-- INSERT from the API, a failure between the two left the set with no questions
-- at all — silently emptying a questionnaire already sent to clients. A function
-- body is one transaction, so the delete only stands if the insert does too.
create or replace function replace_question_set_questions(
  p_set_id uuid,
  p_questions jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  if not exists (select 1 from question_sets where id = p_set_id) then
    raise exception 'question set % does not exist', p_set_id;
  end if;

  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'questions must be a JSON array, got %', jsonb_typeof(p_questions);
  end if;

  delete from question_set_questions where question_set_id = p_set_id;

  insert into question_set_questions (question_set_id, question, sort_order)
  select p_set_id, value, (ordinality - 1)::integer
  from jsonb_array_elements(p_questions) with ordinality;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function replace_question_set_questions(uuid, jsonb) from public;
grant execute on function replace_question_set_questions(uuid, jsonb) to service_role;

-- Row Level Security (all access via service role key through API routes)
alter table clients              enable row level security;
alter table questionnaire_states enable row level security;
alter table documents            enable row level security;
alter table question_sets                   enable row level security;
alter table question_set_questions          enable row level security;
alter table client_question_set_assignments enable row level security;
alter table question_set_responses          enable row level security;
