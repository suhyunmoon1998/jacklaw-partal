-- Every attempt at the admin password, so wrong ones can be counted.
--
-- The login route compared the password and answered at once, as often as it
-- was asked, so the one password between the internet and every client file
-- could be guessed at the speed of the network. A count kept in memory would
-- not hold: each serverless instance starts at zero. (lib/loginThrottle.ts)
--
-- Rows are kept for a day and cleared by the route itself.
--
-- Every name is schema-qualified: this database's search_path puts another
-- project's schema first.

create table if not exists public.admin_login_attempts (
  id            bigint generated always as identity primary key,
  ip            text not null,
  succeeded     boolean not null,
  attempted_at  timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_time
  on public.admin_login_attempts (ip, attempted_at desc);
create index if not exists admin_login_attempts_time
  on public.admin_login_attempts (attempted_at desc);

comment on table public.admin_login_attempts is
  'Staff-only. One row per admin password attempt, for throttling guesses. Cleared after a day.';

alter table public.admin_login_attempts enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.admin_login_attempts to service_role;
grant references, trigger, truncate
  on table public.admin_login_attempts to anon, authenticated;
