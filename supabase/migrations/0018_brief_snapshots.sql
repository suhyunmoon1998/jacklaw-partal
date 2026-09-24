-- The reading as it stood, kept so the next one can say what changed.
--
-- A reading is replaced when the facts move: stages read against different
-- ledgers must not be stitched into an analysis true of neither, so a stale
-- reading is re-read from the beginning. That is right, and it is also why the
-- brief's last section could only ever say "not tracked". Nothing was kept to
-- compare against.
--
-- So the brief is snapshotted before it is replaced, with the ledger it was
-- read against beside it. Both are stored whole rather than as a diff: a diff
-- computed now against a schema that changes later is a diff nobody can
-- recompute, and these are small next to what the office already stores.
--
-- One row per client per snapshot, newest read last. Kept, not rotated: "what
-- did we tell the client in September" is a question a firm gets asked.
--
-- Schema-qualified after the fact: as first written, the unqualified CREATE
-- landed in the `eleanor` schema (first on this database's search_path), where
-- PostgREST does not look, and no snapshot was ever kept. 0019 creates the
-- table in public for databases that ran the original.
create table if not exists public.brief_snapshots (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null references public.clients(id) on delete cascade,
  -- The assembled brief, as lib/caseBrief.ts built it.
  brief        jsonb not null,
  -- The ledger it was read against: id, status, verbatim, provenance.
  facts        jsonb not null default '[]'::jsonb,
  -- When the reading it describes was taken, not when this row was written.
  read_on      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists brief_snapshots_client_idx
  on public.brief_snapshots (client_id, created_at desc);
