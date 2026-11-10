-- Opinions and agency precedents Eleanor fetched from the bodies that issue them, and the holdings proposed from them.
--
-- The opinions in lib/authority/cases.json were fetched by hand and are checked
-- in the build. These are the ones Eleanor fetches while the office works: the
-- full text as the source served it, where it came from, when, and its hash, so
-- the text can be checked against the source again. A holding is accepted only
-- when its quotation appears in that stored text word for word (whitespace
-- aside) — the same guarantee test/cases.test.ts gives the hand-held ones — and
-- reaches a case's Authority Pack only after an attorney approves it.
--
-- Public law only: no client data is stored here.
--
-- Every name is schema-qualified (see 0015): this database's search_path puts
-- another project's schema first.

create table if not exists public.authority_opinions (
  key          text primary key check (key ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  -- 'court opinion' is a court's decision; 'agency precedent' is a DLSE precedential decision, which is not a court's.
  kind         text        not null check (kind in ('court opinion', 'agency precedent')),
  name         text        not null,
  citation     text        not null,
  court        text        not null,
  docket       text        not null default '',
  decided      text        not null default '',
  source_url   text        not null,
  fetched_on   date        not null,
  sha256       text        not null check (sha256 ~ '^[0-9a-f]{64}$'),
  text         text        not null check (length(text) > 500),
  fetched_by   text        not null default 'Eleanor',
  created_at   timestamptz not null default now()
);

comment on table public.authority_opinions is
  'Public law: court opinions and DLSE precedential decisions held in full, as fetched from the issuing body by Eleanor. No client data.';

create table if not exists public.authority_holdings (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  opinion_key   text        not null references public.authority_opinions(key) on delete restrict,
  proposition   text        not null,
  quote         text        not null check (length(quote) between 20 and 2000),
  pinpoint      text        not null default '',
  opinion_part  text        not null check (opinion_part in ('majority', 'concurrence', 'dissent')),
  -- 'claim-id:element-key', checked against the claim library when proposed.
  bears_on      text[]      not null check (cardinality(bears_on) > 0),
  limits        text        not null check (length(limits) > 0),
  applied_to    text        not null default '',
  -- Contrary authority is held as such, never mixed with what supports the claim.
  adverse       boolean     not null default false,
  status        text        not null default 'Proposed' check (status in ('Proposed', 'Approved', 'Rejected')),
  proposed_by   text        not null,
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.authority_holdings is
  'Holdings proposed from authority_opinions. Accepted only when the quote is verbatim in the stored text; reach a case pack only once an attorney approves.';

create index if not exists authority_holdings_status_idx on public.authority_holdings (status);

alter table public.authority_opinions enable row level security;
alter table public.authority_holdings enable row level security;

-- Reached only through the service role from the API routes. Without these
-- grants PostgREST answers "permission denied" (see 0015).
grant select, insert, update, delete, references, trigger, truncate on table public.authority_opinions to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.authority_holdings to service_role;
grant references, trigger, truncate on table public.authority_opinions to anon, authenticated;
grant references, trigger, truncate on table public.authority_holdings to anon, authenticated;
