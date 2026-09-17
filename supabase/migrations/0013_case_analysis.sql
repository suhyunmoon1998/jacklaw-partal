-- The AI reading of a client's answers, kept rather than recomputed.
--
-- An analysis is an Opus call over a hundred answers and twenty kilobytes of
-- law. Regenerating it every time somebody opens the client would make the
-- panel slow, cost real money per glance, and — worse for a case file — show
-- two people slightly different readings of the same facts on the same day.
--
-- So one row per client, holding the last reading. It is keyed on a
-- fingerprint of exactly what was read: the answers, the client's details, the
-- documents on file, the model, and the version of the law text. When any of
-- those move the stored row is still returned, but marked stale, so the office
-- sees the old reading and a note saying the answers have changed since — not
-- an empty panel, and not an old reading passed off as current.
--
-- Nothing here is ever shown to a client. It is staff-only work product.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE lands somewhere PostgREST
-- does not look and the portal cannot reach.

create table if not exists public.case_analyses (
  client_id    text primary key references public.clients(id) on delete cascade,
  -- What was read. Differs from the client's current fingerprint => stale.
  fingerprint  text        not null,
  law_version  text        not null,
  model        text        not null,
  result       jsonb       not null,
  -- How long the reading took, so the office can see what it is paying for.
  duration_ms  integer,
  created_at   timestamptz not null default now()
);

comment on table public.case_analyses is
  'Staff-only AI reading of a client''s intake answers against California wage-and-hour law. Preliminary; never shown to a client.';
