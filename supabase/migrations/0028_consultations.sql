-- Free consultations, booked by the client on /book.
--
-- This replaces the Calendly link the intake thank-you used to carry. The
-- office's own Google Workspace calendars stay the truth about who is free:
-- the portal reads each host's free/busy, offers the times at least one host
-- has open, and writes the booking back to that host's calendar with a Meet
-- link (lib/consultations/google.ts).
--
-- 1. public.consultation_hosts
--
-- The people a consultation can be given by. `email` is the Workspace user the
-- service account acts as, so it is also whose calendar is read and written.
-- `weekly_hours` is when they take consultations, in Pacific time, keyed by
-- weekday with Sunday = "0": {"1": [["09:00","12:00"],["13:00","17:00"]], ...}.
-- A busy block on their calendar still wins over these hours.
--
-- 2. public.consultations
--
-- One row per booking. A row is written as 'held' before the calendar event is
-- made and turned 'booked' once it exists, so two clients pressing the same
-- time at once cannot both get it (hold_consultation, below) and a calendar
-- that refuses the event leaves no booking behind. A hold older than five
-- minutes no longer blocks anything: it is a request that died half way.
--
-- `conflicts` is what lib/consultations/conflicts.ts found when it compared
-- the names on the booking with every client and every earlier consultation.
-- Null means the check did not run, which the office is shown as such. It is a
-- list of possible matches for an attorney to look at, never a decision.
--
-- The client's cancel link carries the booking id and an HMAC of it keyed on
-- SESSION_SECRET (lib/consultations/manageLink.ts), so nothing secret is
-- stored here and the reminder can carry the same link the confirmation did.
--
-- Every name is schema-qualified: this database's search_path puts another
-- project's schema first.

create table if not exists public.consultation_hosts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  weekly_hours jsonb not null default '{
    "1": [["09:00","12:00"],["13:00","17:00"]],
    "2": [["09:00","12:00"],["13:00","17:00"]],
    "3": [["09:00","12:00"],["13:00","17:00"]],
    "4": [["09:00","12:00"],["13:00","17:00"]],
    "5": [["09:00","12:00"],["13:00","17:00"]]
  }'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.consultation_hosts is
  'Who gives free consultations, and in which weekly hours (Pacific). email is the Workspace user whose calendar is read and written.';

create table if not exists public.consultations (
  id                    uuid primary key default gen_random_uuid(),
  host_id               uuid not null references public.consultation_hosts(id),
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  status                text not null default 'held' check (status in ('held', 'booked', 'cancelled')),
  name                  text not null,
  email                 text not null,
  phone                 text not null default '',
  lang                  text not null default 'en',
  adverse_party         text not null default '',
  other_parties         text not null default '',
  summary               text not null default '',
  conflicts             jsonb,
  conflicts_reviewed_at timestamptz,
  google_event_id       text,
  meet_url              text,
  reminded_at           timestamptz,
  cancelled_at          timestamptz,
  cancelled_by          text check (cancelled_by is null or cancelled_by in ('client', 'office')),
  created_at            timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists consultations_host_time
  on public.consultations (host_id, starts_at) where status <> 'cancelled';
create index if not exists consultations_starts_at
  on public.consultations (starts_at);

comment on table public.consultations is
  'Free consultations booked on /book. held -> booked once the calendar event exists; cancelled by the client or the office.';
comment on column public.consultations.conflicts is
  'Possible matches against clients and earlier consultations, for an attorney to review. Null = the check did not run.';

alter table public.consultation_hosts enable row level security;
alter table public.consultations enable row level security;

-- Holds a time for the first of `p_host_ids` (in the order given) that has
-- nothing within `p_buffer_minutes` of it, and returns the new row's id and
-- host. Returns no row when every host is taken.
--
-- One advisory lock per host, taken in the order given, so the check and the
-- insert cannot interleave with another booking for the same host.
create or replace function public.hold_consultation(
  p_host_ids       uuid[],
  p_starts_at      timestamptz,
  p_ends_at        timestamptz,
  p_buffer_minutes integer,
  p_name           text,
  p_email          text,
  p_phone          text,
  p_lang           text,
  p_adverse_party  text,
  p_other_parties  text,
  p_summary        text
)
returns table (id uuid, host_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  candidate uuid;
  pad interval := make_interval(mins => p_buffer_minutes);
begin
  foreach candidate in array p_host_ids loop
    perform pg_advisory_xact_lock(hashtextextended('consultation-host:' || candidate::text, 0));
    if not exists (
      select 1 from public.consultations c
      where c.host_id = candidate
        and (c.status = 'booked' or (c.status = 'held' and c.created_at > now() - interval '5 minutes'))
        and c.starts_at < p_ends_at + pad
        and c.ends_at + pad > p_starts_at
    ) then
      return query
        insert into public.consultations as c (
          host_id, starts_at, ends_at, status, name, email, phone, lang,
          adverse_party, other_parties, summary
        ) values (
          candidate, p_starts_at, p_ends_at, 'held', p_name, p_email, p_phone, p_lang,
          p_adverse_party, p_other_parties, p_summary
        )
        returning c.id, c.host_id;
      return;
    end if;
  end loop;
end;
$$;

revoke all on function public.hold_consultation(uuid[], timestamptz, timestamptz, integer, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.hold_consultation(uuid[], timestamptz, timestamptz, integer, text, text, text, text, text, text, text)
  to service_role;

-- Reached only through the service role from the API routes, as the rest of
-- the schema is (see 0015 and 0027 for why both halves of this matter).
revoke all on table public.consultation_hosts from anon, authenticated;
revoke all on table public.consultations from anon, authenticated;
grant select, insert, update, delete on table public.consultation_hosts to service_role;
grant select, insert, update, delete on table public.consultations to service_role;
