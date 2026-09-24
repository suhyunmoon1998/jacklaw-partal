-- What each reading of the answers searched, and why each brief version was kept.
--
-- SOURCE SEARCHES. The ledger says where every fact came from; it cannot say
-- where nothing came from. A section never answered, a question set that would
-- not load, an uploaded document no reading has opened — each is invisible in
-- the facts, and each changes what "nothing corroborates this" means. One row
-- per extraction run, kept rather than overwritten, so the record on file is
-- always the one for the facts on file and the earlier ones stay answerable.
--
-- BRIEF VERSIONS. brief_snapshots was written only when somebody opened the
-- sheet, so a re-extraction or a re-read nobody looked at first threw the
-- previous brief away. Snapshots are now also taken just before those, and
-- `reason` says which — "opened" and "before the facts were read again" are
-- different kinds of version and the history should say so.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE lands somewhere PostgREST
-- does not look and the portal cannot reach.

create table if not exists public.source_searches (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null references public.clients(id) on delete cascade,
  -- lib/sourceSearch.ts SearchRecord: reviewed, missing, not read, inaccessible.
  record      jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists source_searches_client_idx
  on public.source_searches (client_id, created_at desc);

comment on table public.source_searches is
  'Staff-only. For each fact extraction: the sources it searched, what it reviewed, what was missing, what it does not read, and what it could not open.';

alter table public.source_searches enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.source_searches to service_role;
grant references, trigger, truncate
  on table public.source_searches to anon, authenticated;

-- 0018 as first written was unqualified and created brief_snapshots in the
-- `eleanor` schema, where PostgREST does not look: every snapshot the portal
-- tried to keep was refused, and keepSnapshot swallows that by design, so
-- nobody saw it. The table is created here in public, where it belongs. The
-- stray eleanor.brief_snapshots is left alone — it is another schema's
-- namespace and it held no rows.
create table if not exists public.brief_snapshots (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null references public.clients(id) on delete cascade,
  brief        jsonb not null,
  facts        jsonb not null default '[]'::jsonb,
  read_on      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists brief_snapshots_client_idx
  on public.brief_snapshots (client_id, created_at desc);

alter table public.brief_snapshots
  add column if not exists reason text not null default 'opened';

comment on table public.brief_snapshots is
  'Staff-only. Each version of a client''s case brief, kept whole with the ledger it was read against, and why it was kept.';

-- Without these PostgREST answers "permission denied" and every snapshot is
-- logged and dropped. Idempotent: granting twice is harmless.
alter table public.brief_snapshots enable row level security;
grant select, insert, update, delete, references, trigger, truncate
  on table public.brief_snapshots to service_role;
grant references, trigger, truncate
  on table public.brief_snapshots to anon, authenticated;
