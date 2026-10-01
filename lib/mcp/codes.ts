import { getSupabase } from '@/lib/supabase'
import { authorizationEpoch, Grant, hash, randomCode } from './auth'

export async function saveCode(grant: Grant) {
  const code = randomCode()
  const { error } = await getSupabase().from('mcp_authorization_codes').insert({
    code_hash: hash(code), client_id: grant.client_id, redirect_uri: grant.redirect_uri,
    resource: grant.resource, code_challenge: grant.code_challenge,
    expires_at: new Date(Date.now() + 300_000).toISOString(), authorization_epoch: authorizationEpoch(),
  })
  if (error) throw new Error('Could not save authorization')
  return code
}

/** DELETE ... RETURNING makes a valid code single-use even on concurrent instances. */
export async function consumeCode(code: string, clientId: string, redirect: string, resource: string, pkce: string) {
  const { data, error } = await getSupabase().from('mcp_authorization_codes').delete()
    .eq('code_hash', hash(code)).eq('client_id', clientId).eq('redirect_uri', redirect)
    .eq('resource', resource).eq('code_challenge', pkce)
    .eq('authorization_epoch', authorizationEpoch())
    .gt('expires_at', new Date().toISOString()).select('code_hash').maybeSingle()
  if (error) throw new Error('Could not exchange authorization')
  return Boolean(data)
}
