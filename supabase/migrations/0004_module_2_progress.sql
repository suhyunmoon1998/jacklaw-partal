-- Module 2 (wage and hour) progress, alongside Module 1's.
--
-- The answers themselves need no column. Both modules write into the existing
-- `answers` jsonb under ids that cannot collide — Module 2's all begin `m2_` —
-- and that shared record is the point: Module 2 asks nothing Module 1 already
-- established, and its skip logic reads Module 1's answers directly. Splitting
-- the answers into two tables would have meant copying facts between them.
--
-- What does need columns is where the client is IN Module 2, kept apart from
-- Module 1's so that finishing one says nothing about the other.
--
-- Both are non-null with defaults, so every existing row is already correct:
-- a client who has never opened Module 2 has done none of it.

alter table questionnaire_states
  add column if not exists m2_completed_sections integer[] not null default '{}';

alter table questionnaire_states
  add column if not exists m2_submitted boolean not null default false;

alter table questionnaire_states
  add column if not exists m2_last_saved timestamptz;
