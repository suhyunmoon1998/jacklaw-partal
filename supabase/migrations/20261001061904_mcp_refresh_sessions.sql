-- Server-only, rotating OAuth refresh tokens. Never store plaintext credentials.
begin;
create table public.mcp_sessions (
 id uuid primary key,
 client_id text not null,
 resource text not null,
 authorization_epoch text not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '90 days'),
 idle_expires_at timestamptz not null default (now() + interval '30 days'),
 revoked_at timestamptz
);
create table public.mcp_refresh_tokens (
 token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
 session_id uuid not null references public.mcp_sessions(id) on delete cascade,
 used_at timestamptz
);
create index mcp_refresh_tokens_session_idx on public.mcp_refresh_tokens(session_id);
alter table public.mcp_sessions enable row level security;
alter table public.mcp_refresh_tokens enable row level security;
revoke all on public.mcp_sessions, public.mcp_refresh_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.mcp_sessions, public.mcp_refresh_tokens to service_role;

create function public.mcp_start_session(p_id uuid, p_hash text, p_client text, p_resource text, p_epoch text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 insert into public.mcp_sessions(id, client_id, resource, authorization_epoch)
 values(p_id, p_client, p_resource, p_epoch);
 insert into public.mcp_refresh_tokens(token_hash, session_id) values(p_hash, p_id);
end;
$$;

create function public.mcp_rotate_refresh(p_hash text, p_next_hash text, p_client text, p_resource text, p_epoch text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 sid uuid;
 s public.mcp_sessions%rowtype;
 used timestamptz;
begin
 select session_id into sid from public.mcp_refresh_tokens where token_hash = p_hash;
 if sid is null then return null; end if;
 -- Every refresh/revocation serializes on the same session, across server instances.
 select * into s from public.mcp_sessions where id = sid for update;
 if not found or s.client_id <> p_client or s.resource <> p_resource or s.authorization_epoch <> p_epoch then
   return null;
 end if;
 if s.revoked_at is not null or s.expires_at <= clock_timestamp() or s.idle_expires_at <= clock_timestamp() then
   return null;
 end if;
 select used_at into used from public.mcp_refresh_tokens where token_hash = p_hash;
 if not found then return null; end if;
 if used is not null then
   -- Reuse indicates a stolen or replayed token. Commit family revocation, not an exception/rollback.
   update public.mcp_sessions set revoked_at = clock_timestamp() where id = sid;
   return null;
 end if;
 update public.mcp_refresh_tokens set used_at = clock_timestamp() where token_hash = p_hash;
 insert into public.mcp_refresh_tokens(token_hash, session_id) values(p_next_hash, sid);
 update public.mcp_sessions set idle_expires_at = least(expires_at, clock_timestamp() + interval '30 days') where id = sid;
 return sid;
end;
$$;

create function public.mcp_revoke_refresh(p_hash text, p_client text)
returns void language plpgsql security invoker set search_path = '' as $$
declare sid uuid;
begin
 select session_id into sid from public.mcp_refresh_tokens where token_hash = p_hash;
 update public.mcp_sessions set revoked_at = coalesce(revoked_at, clock_timestamp()) where id = sid and client_id = p_client;
end;
$$;
revoke all on function public.mcp_start_session(uuid,text,text,text,text), public.mcp_rotate_refresh(text,text,text,text,text), public.mcp_revoke_refresh(text,text) from public, anon, authenticated;
grant execute on function public.mcp_start_session(uuid,text,text,text,text), public.mcp_rotate_refresh(text,text,text,text,text), public.mcp_revoke_refresh(text,text) to service_role;
commit;
-- Cleanup only after absolute expiry, preserving used-token hashes for replay detection:
-- delete from public.mcp_sessions where expires_at < now() - interval '1 day';
