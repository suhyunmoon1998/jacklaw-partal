-- Which questionnaire modules have been handed to which client.
--
-- Until now Module 1 was simply there for everyone and Module 2 appeared on its
-- own once Module 1 was submitted. The office decides instead: a module is
-- something you send, the way a question set is.
--
-- A send is an event, not a flag, so it lives in its own table beside
-- client_question_set_assignments rather than as more columns on
-- questionnaire_states — which does not even have a row for a client who has
-- never opened the portal, and those are exactly the clients you send to.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE TABLE lands somewhere
-- PostgREST does not look and the portal cannot reach.

create table if not exists public.client_module_sends (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null references public.clients(id) on delete cascade,
  module_id  text not null check (module_id in ('module1', 'module2', 'module3')),
  sent_at    timestamptz not null default now(),
  sent_to    text,
  sent_lang  text,
  created_by text,
  unique (client_id, module_id)
);

create index if not exists module_sends_client_idx
  on public.client_module_sends (client_id);

alter table public.client_module_sends enable row level security;

-- Everything reaches this through the service role from the API routes, as the
-- rest of the schema does. Without these grants PostgREST does not expose the
-- table at all, and answers "could not find the table" rather than saying the
-- grant is missing.
grant select, insert, update, delete, references, trigger, truncate
  on table public.client_module_sends to service_role;
grant references, trigger, truncate
  on table public.client_module_sends to anon, authenticated;

-- Every client who existed when this shipped keeps the intake questionnaire they
-- already had. Gating it without this would take the portal away from all of
-- them.
insert into public.client_module_sends (client_id, module_id, sent_at, created_by)
select id, 'module1', created_at, 'backfill'
from public.clients
on conflict (client_id, module_id) do nothing;
