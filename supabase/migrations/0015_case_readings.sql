-- The claim matrix, the evidence spine and the proposed Wage Order, kept.
--
-- These were built and validated against a real client's facts and then had
-- nowhere to live, so nothing in the running portal could use them: the
-- follow-up engine asked the database for a matrix, found none, and wrote a
-- round from the fact ledger alone — which cannot ask about elements nobody
-- can reach, gaps in the timeline, or dates that do not line up.
--
-- One row per client, accumulated stage by stage, because the hosting plan
-- caps a request at 300 seconds and a full reading does not fit in one. The
-- stages are ordered: the Wage Order has to be settled before the claims are
-- read, since the rest-period duty is read out of the Order.
--
-- Keyed on a fingerprint of the standing ledger. When a fact is added or
-- superseded the stored reading is still returned, marked stale, so the office
-- sees the old reading and a note saying the facts have moved — not an empty
-- panel, and not an old reading passed off as current.
--
-- Nothing here is ever shown to a client. It is staff-only work product.
--
-- Every name is schema-qualified. This database's search_path puts another
-- project's schema first, so an unqualified CREATE lands somewhere PostgREST
-- does not look and the portal cannot reach.

create table if not exists public.case_readings (
  client_id    text primary key references public.clients(id) on delete cascade,
  fingerprint  text        not null,
  result       jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.case_readings is
  'Staff-only. The claim-proof matrix, the evidence spine and the proposed IWC Wage Order for one client, accumulated stage by stage. Never shown to a client.';

comment on column public.case_readings.fingerprint is
  'Hash of the standing fact ledger, the models and the shape version. Differs from the ledger''s current fingerprint => the reading is stale.';

alter table public.case_readings enable row level security;

-- Everything reaches this through the service role from the API routes, as the
-- rest of the schema does. Without these grants PostgREST does not expose the
-- table at all — it answers "permission denied", which has already cost this
-- project one whole reading that ran, was paid for, and was then lost.
grant select, insert, update, delete, references, trigger, truncate
  on table public.case_readings to service_role;
grant references, trigger, truncate
  on table public.case_readings to anon, authenticated;
