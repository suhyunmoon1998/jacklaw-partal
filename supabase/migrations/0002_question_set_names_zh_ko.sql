-- Chinese and Korean names for a question set.
--
-- The portal was built for English and Spanish; question_sets already carried
-- name_es. Adding a column per language rather than a jsonb map keeps the
-- existing Spanish data and every query that reads it working untouched.
--
-- Nullable with no default: a set that has not been translated falls back to
-- its English name, which is what an untranslated set should show.
--
-- The per-question translations need no migration at all. They live inside the
-- `question` jsonb as sibling keys next to `es`, so a set translated before
-- these languages existed keeps rendering exactly as it did.

alter table question_sets add column if not exists name_zh text;
alter table question_sets add column if not exists name_ko text;
