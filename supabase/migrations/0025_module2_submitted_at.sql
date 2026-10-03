-- When a client first submitted Module 2: the moment a damages reading is owed
-- from (lib/damagesAuto.ts).
--
-- The night read that moment off m2_last_saved, which is not it. Every save
-- writes m2_last_saved, including the autosave a client's visit to a Module 2
-- they finished long ago makes, so a client who submitted before damages were
-- read on submission looked like a fresh submission the next time they opened
-- it, and the night would start a paid reading nobody had decided on.
--
-- Written once, by the submission itself (app/api/questionnaire), only while it
-- is still null. Null for every submission made before this column existed:
-- those clients are not read unprompted, which was already the rule.
--
-- Every name is schema-qualified: this database's search_path puts another
-- project's schema first. A new column takes the table's existing grants.

alter table public.questionnaire_states
  add column if not exists m2_submitted_at timestamptz;

comment on column public.questionnaire_states.m2_submitted_at is
  'When Module 2 was first submitted. Written once by the submission; null for submissions before 2026-10-03.';
