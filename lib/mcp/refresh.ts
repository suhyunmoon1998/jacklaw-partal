import { randomUUID } from 'node:crypto'
import { getSupabase } from '@/lib/supabase'
import { authorizationEpoch, hash, mcpConfig, randomCode } from './auth'

export async function startRefreshSession() {
  const c = mcpConfig()!
  const id = randomUUID(), token = randomCode()
  const { error } = await getSupabase().rpc('mcp_start_session', {
    p_id: id, p_hash: hash(token), p_client: c.clientId,
    p_resource: c.resource, p_epoch: authorizationEpoch(),
  })
  if (error) throw new Error('Could not create connection')
  return { id, token }
}

export async function rotateRefreshToken(token: string) {
  const c = mcpConfig()!, replacement = randomCode()
  const { data, error } = await getSupabase().rpc('mcp_rotate_refresh', {
    p_hash: hash(token), p_next_hash: hash(replacement), p_client: c.clientId,
    p_resource: c.resource, p_epoch: authorizationEpoch(),
  })
  if (error) throw new Error('Could not renew connection')
  return typeof data === 'string' ? { id: data, token: replacement } : null
}

export async function activeSession(id: string) {
  const c = mcpConfig()!
  const { data, error } = await getSupabase().from('mcp_sessions')
    .select('id').eq('id', id).eq('client_id', c.clientId).eq('resource', c.resource)
    .eq('authorization_epoch', authorizationEpoch()).is('revoked_at', null)
    .gt('expires_at', new Date().toISOString()).gt('idle_expires_at', new Date().toISOString()).maybeSingle()
  return !error && Boolean(data)
}

export async function revokeRefreshToken(token: string) {
  const { error } = await getSupabase().rpc('mcp_revoke_refresh', {
    p_hash: hash(token), p_client: mcpConfig()!.clientId,
  })
  if (error) throw new Error('Could not revoke connection')
}
