-- Name tags on a case.
--
-- A case list where every row is a folder icon and a company name tells the
-- office nothing about what the case is. The kind of claim was on each client
-- as case_type — one value, from a fixed list of six, written when the client
-- was added — so it could not say "wage and hour AND retaliation", and the
-- answer lived on the people rather than on the matter they share.
--
-- Tags are free text, because the point is a label the office recognises. The
-- six old case types are seeded as tags, so the list starts from what is
-- already there and grows however the firm actually talks about its work.
--
-- clients.case_type is read but never cleared: it is what the intake email
-- subject and the recommended question banks still key off, and taking it away
-- would break both for no gain here.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified ALTER lands somewhere PostgREST
-- does not look and the portal cannot reach.

alter table public.case_folders
  add column if not exists tags text[] not null default '{}';

-- Whatever the clients on a case were marked as becomes the case's tags. Each
-- distinct value once, in a stable order, and only where the case has none yet
-- so re-running this cannot undo an edit the office has since made.
with seeded as (
  select c.case_folder_id as id,
         array_agg(distinct btrim(c.case_type) order by btrim(c.case_type)) as tags
    from public.clients c
   where c.case_folder_id is not null
     and btrim(coalesce(c.case_type, '')) <> ''
   group by c.case_folder_id
)
update public.case_folders f
   set tags = seeded.tags
  from seeded
 where f.id = seeded.id
   and coalesce(array_length(f.tags, 1), 0) = 0;
