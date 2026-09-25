-- Machine translations of clients' own words, kept so each is fetched once.
--
-- The admin panel put every non-English answer through MyMemory's free
-- endpoint from the browser, every time a client was opened, and the facts
-- API did the same for every fact's verbatim on every load — two hundred
-- calls for one Korean file. The endpoint's free allowance is per address and
-- per day; one afternoon of work ran it out, and after that the office read
-- untranslated answers. (lib/translationCache.ts)
--
-- Keyed by a digest of the language pair and the exact text, so an answer the
-- client edits is a new row, never a stale one. Only successful translations
-- are stored: a refusal is not an answer to cache.
--
-- Every name is schema-qualified: this database's search_path puts another
-- project's schema first.

create table if not exists public.translation_cache (
  key         text primary key,
  from_lang   text not null,
  to_lang     text not null,
  source      text not null,
  translated  text not null,
  created_at  timestamptz not null default now()
);

comment on table public.translation_cache is
  'Staff-only. Machine translations of client answers, keyed by sha256(from|to|text). A draft for the office to read, never shown to a client.';

alter table public.translation_cache enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.translation_cache to service_role;
grant references, trigger, truncate
  on table public.translation_cache to anon, authenticated;
