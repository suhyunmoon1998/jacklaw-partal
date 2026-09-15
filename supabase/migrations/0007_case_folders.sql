-- Case folders: the thing a client belongs to.
--
-- The office was already writing a case name on each client, one at a time, as
-- free text. Every one of them was different, so it labelled a person rather
-- than grouping them — two clients on the same case had to be spelled the same
-- by hand, and correcting a case name meant editing every client on it.
--
-- A folder is its own row, so renaming it is one write and everyone in it
-- follows. clients.case_name stays exactly as it is: it is the office's own
-- note on that client, and this migration reads it but never clears it.
--
-- Deleting a folder does NOT delete the clients in it — on delete set null puts
-- them back in Unassigned. A folder is a way of arranging people, and throwing
-- the shelf away must not throw away what was on it.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE TABLE lands somewhere
-- PostgREST does not look and the portal cannot reach.

create table if not exists public.case_folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Two folders with the same name are a filing mistake, not a use case. Compared
-- case- and space-insensitively so "Smith v. Acme" and "smith v. acme " cannot
-- both exist; the API turns the violation into a message the office can act on.
create unique index if not exists case_folders_name_key
  on public.case_folders (lower(btrim(name)));

alter table public.clients
  add column if not exists case_folder_id uuid
    references public.case_folders(id) on delete set null;

-- The client list is read folder by folder, and every client carries this.
create index if not exists clients_case_folder_idx
  on public.clients (case_folder_id);

alter table public.case_folders enable row level security;

-- Everything reaches this through the service role from the API routes, as the
-- rest of the schema does. Without these grants PostgREST does not expose the
-- table at all, and answers "could not find the table" rather than saying the
-- grant is missing.
grant select, insert, update, delete, references, trigger, truncate
  on table public.case_folders to service_role;
grant references, trigger, truncate
  on table public.case_folders to anon, authenticated;

-- Every case name the office has already typed becomes a folder, with that
-- client already in it. Starting empty would have left them to retype work they
-- had already done, and to guess which spelling they had used.
--
-- Guarded on the table being empty so re-running this migration cannot make a
-- second set of folders — and the unique index above would refuse them anyway.
with named as (
  select distinct btrim(case_name) as name
  from public.clients
  where btrim(coalesce(case_name, '')) <> ''
    and not exists (select 1 from public.case_folders)
),
made as (
  insert into public.case_folders (name)
  select name from named
  returning id, name
)
update public.clients c
   set case_folder_id = made.id
  from made
 where btrim(coalesce(c.case_name, '')) = made.name
   and c.case_folder_id is null;
