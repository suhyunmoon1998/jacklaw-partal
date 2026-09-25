-- Model-written drafts of the four template sections that cannot be assembled.
--
-- Trial Brief Template I, IV and XII, and Factual Brief Template XI. Each row
-- is one draft, every sentence of it already checked against the ledger and the
-- authority library (lib/briefDraft.ts), with the problems stored beside the
-- sentence they belong to. Kept, not overwritten: a draft is paid for, and "what
-- did the draft say before the facts moved" is worth being able to answer.
--
-- `basis` is the digest of the brief version the draft was written from
-- (lib/briefHistory.ts versionDigest). The sheet compares it with the brief as
-- it stands and says when the draft is older than the facts.
--
-- Every name is schema-qualified: this database's search_path puts another
-- project's schema first, and 0018 landed there because it was not.

create table if not exists public.brief_drafts (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null references public.clients(id) on delete cascade,
  draft       jsonb not null,
  basis       text not null,
  model       text not null,
  spent       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists brief_drafts_client_idx
  on public.brief_drafts (client_id, created_at desc);

comment on table public.brief_drafts is
  'Staff-only. Model-written drafts of trial brief I/IV/XII and factual brief XI, each sentence checked against the ledger and the authority library. Never shown to a client.';

alter table public.brief_drafts enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.brief_drafts to service_role;
grant references, trigger, truncate
  on table public.brief_drafts to anon, authenticated;
