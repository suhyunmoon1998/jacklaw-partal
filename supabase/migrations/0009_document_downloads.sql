-- Which client files the office has already taken a copy of.
--
-- The documents list showed name, category and upload date, and nothing about
-- what had been done with them. Five files in a case all look the same, so
-- working out which ones had already been pulled into the case file meant
-- downloading them again to check — or pulling the same file twice and finding
-- out in the downloads folder.
--
-- Downloading is the act that matters, because that is the copy that leaves the
-- portal. Viewing is not recorded: opening a file to see what it is happens
-- constantly and marking it would make the flag mean nothing.
--
-- The count is kept alongside the timestamp so a second download is visible as
-- a second download rather than just moving the date.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified ALTER lands somewhere PostgREST
-- does not look and the portal cannot reach.

alter table public.documents
  add column if not exists downloaded_at   timestamptz,
  add column if not exists download_count  integer not null default 0;

-- Stamping the download is one statement, so the count cannot be lost when two
-- people pull the same file at once. Reading the row and writing count + 1 from
-- the API would let the second read see the first's old value.
--
-- SECURITY DEFINER with a pinned search_path: the API reaches this through the
-- service role, and pinning stops the function resolving `documents` against
-- whatever schema happens to be first on the caller's path.
create or replace function public.mark_document_downloaded(doc_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.documents
     set downloaded_at  = now(),
         download_count = download_count + 1
   where id = doc_id;
$$;

revoke all on function public.mark_document_downloaded(bigint) from public, anon, authenticated;
grant execute on function public.mark_document_downloaded(bigint) to service_role;
