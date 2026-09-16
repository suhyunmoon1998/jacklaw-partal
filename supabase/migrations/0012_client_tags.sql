-- Name tags on a client, as well as on the case.
--
-- The case carries what the matter is about, but two people on one case do not
-- always have the same claim: one is wage and hour, the next is wage and hour
-- and retaliation because of what happened after they complained. Tagging only
-- the case flattens that, and tagging only the client loses what they share.
-- So both, and the client's own tags are theirs alone.
--
-- Seeded from clients.case_type, which is the single value the office has been
-- writing on each client since the beginning. That column is read and never
-- cleared: the intake email subject and the recommended question banks still
-- key off it, and taking it away would break both for no gain here.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified ALTER lands somewhere PostgREST
-- does not look and the portal cannot reach.

alter table public.clients
  add column if not exists tags text[] not null default '{}';

-- Whatever each client was already marked as becomes their first tag. Only
-- where they have none, so re-running this cannot undo an edit since made.
update public.clients
   set tags = array[btrim(case_type)]
 where btrim(coalesce(case_type, '')) <> ''
   and coalesce(array_length(tags, 1), 0) = 0;
