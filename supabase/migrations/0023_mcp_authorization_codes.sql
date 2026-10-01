-- OAuth code storage only. No client records or existing permissions change.
create table if not exists public.mcp_authorization_codes (
  code_hash text primary key,
  client_id text not null,
  redirect_uri text not null,
  resource text not null,
  code_challenge text not null,
  authorization_epoch text not null,
  expires_at timestamptz not null
);
alter table public.mcp_authorization_codes enable row level security;
revoke all on public.mcp_authorization_codes from public, anon, authenticated;
grant select, insert, delete on public.mcp_authorization_codes to service_role;
create index if not exists mcp_authorization_codes_expiry_idx
  on public.mcp_authorization_codes (expires_at);
-- Expired unexchanged codes contain hashes only. Periodic housekeeping:
-- delete from public.mcp_authorization_codes where expires_at < now();
