-- Let the reminder ladder chase a follow-up round, not only the modules.
--
-- The ladder — a text on day 2, a text on day 5, a call on day 10 — read
-- client_module_sends and nothing else. A generated round of follow-up
-- questions was therefore sent once and never chased: the client who meant to
-- finish and forgot was found only when somebody scrolled the list, which is
-- the exact problem the ladder was built to solve.
--
-- A rung now chases either a module or an assignment, never both. module_id
-- keeps its meaning and its check; assignment_id is its own column rather than
-- a uuid stuffed into a field named module_id, because a column that lies
-- about what it holds is a bug waiting for the next person.
--
-- The partial unique index is what makes the claim-before-send safe for
-- assignments the way the existing one does for modules: two overlapping runs
-- cannot both claim a rung, so nobody is texted twice.

alter table public.client_reminders
  add column if not exists assignment_id uuid
    references public.client_question_set_assignments(id) on delete cascade;

alter table public.client_reminders alter column module_id drop not null;

alter table public.client_reminders drop constraint if exists client_reminders_module_id_check;

alter table public.client_reminders
  add constraint client_reminders_chases_one
  check (
    (module_id is not null and assignment_id is null
      and module_id in ('module1','module2','module3'))
    or
    (module_id is null and assignment_id is not null)
  );

comment on column public.client_reminders.assignment_id is
  'Set when the rung chased a question-set assignment — a generated follow-up round — rather than one of the numbered modules. Exactly one of module_id and assignment_id is set.';

create unique index if not exists client_reminders_assignment_rung
  on public.client_reminders (assignment_id, kind)
  where assignment_id is not null;
