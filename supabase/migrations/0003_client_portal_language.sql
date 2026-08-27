-- The language a client actually reads the portal in.
--
-- Until now the only signal was the "Preferred Language" answer on their intake
-- questionnaire — a thing they ticked once, months ago, and which is empty for
-- every client who never finished the intake. Meanwhile the portal already
-- knows: they picked a language from the header and have been reading in it
-- ever since. That choice lived in their browser and never reached us.
--
-- Nullable on purpose. Null means "they have not chosen in the portal", which
-- is different from choosing English, and lets the intake answer still be used
-- as the fallback.

alter table clients add column if not exists portal_lang text;
