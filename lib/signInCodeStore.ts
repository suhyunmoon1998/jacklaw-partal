/**
 * The texted sign-in codes, kept in public.client_sign_in_codes
 * (supabase/migrations/0027_client_sign_in_codes.sql).
 *
 * One row per request for a code, whether or not a code was texted: the rows
 * with no code are what let a number and a connection be counted without
 * saying which numbers are on file. No row holds a number or a code — only
 * keyed hashes of them (lib/signInCode.ts).
 *
 * A missing table is an error, not "no codes": signing in is refused until the
 * migration is applied, rather than falling back to letting a number in.
 */

import { getSupabase } from '@/lib/supabase'
import { CODE_TTL_MS, MAX_ATTEMPTS } from '@/lib/signInCode'

const TABLE = 'client_sign_in_codes'

export class SignInStoreUnavailable extends Error {}

function fail(what: string, message?: string): never {
  console.error(`sign-in codes: could not ${what}${message ? ` (${message})` : ''}`)
  throw new SignInStoreUnavailable(what)
}

const since = (ms: number, now: number) => new Date(now - ms).toISOString()

async function count(column: 'phone_hash' | 'ip_hash', value: string, withinMs: number, now: number): Promise<number> {
  const { count: n, error } = await getSupabase()
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .gte('created_at', since(withinMs, now))
  if (error) fail('count requests', error.message)
  return n ?? 0
}

/** How much this number and this connection have asked for lately. */
export async function recentRequests(
  phoneHashValue: string,
  ipHashValue: string,
  now = Date.now()
): Promise<{ number15Min: number; numberDay: number; connectionHour: number }> {
  const [number15Min, numberDay, connectionHour] = await Promise.all([
    count('phone_hash', phoneHashValue, 15 * 60 * 1000, now),
    count('phone_hash', phoneHashValue, 24 * 60 * 60 * 1000, now),
    count('ip_hash', ipHashValue, 60 * 60 * 1000, now),
  ])
  return { number15Min, numberDay, connectionHour }
}

/**
 * Records one request. `codeHash` is null when nothing was texted — an
 * unknown number, an opted-out one, or one past its allowance.
 */
export async function recordRequest(input: {
  phoneHash: string
  ipHash: string
  codeHash: string | null
  now?: number
}): Promise<void> {
  const now = input.now ?? Date.now()
  const { error } = await getSupabase().from(TABLE).insert({
    phone_hash: input.phoneHash,
    ip_hash: input.ipHash,
    code_hash: input.codeHash,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
  })
  if (error) fail('record a request', error.message)
}

export interface Challenge {
  id: string
  codeHash: string
  attempts: number
}

/** The newest code texted to this number that is still usable, or null. */
export async function liveChallenge(phoneHashValue: string, now = Date.now()): Promise<Challenge | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('id, code_hash, attempts')
    .eq('phone_hash', phoneHashValue)
    .not('code_hash', 'is', null)
    .is('consumed_at', null)
    .gt('expires_at', new Date(now).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) fail('read a code', error.message)
  if (!data) return null
  return { id: String(data.id), codeHash: String(data.code_hash), attempts: Number(data.attempts ?? 0) }
}

/**
 * Takes one attempt against a code BEFORE the code is compared, so attempts in
 * parallel cannot all be compared against the same count: each has to move it
 * from n to n+1, and only one can.
 */
export async function takeAttempt(challenge: Challenge): Promise<'taken' | 'used-up' | 'raced'> {
  if (challenge.attempts >= MAX_ATTEMPTS) return 'used-up'
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ attempts: challenge.attempts + 1 })
    .eq('id', challenge.id)
    .eq('attempts', challenge.attempts)
    .is('consumed_at', null)
    .select('id')
  if (error) fail('count an attempt', error.message)
  return (data ?? []).length === 1 ? 'taken' : 'raced'
}

/** Marks the code used. False when another request used it first. */
export async function consume(challenge: Challenge, now = Date.now()): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ consumed_at: new Date(now).toISOString() })
    .eq('id', challenge.id)
    .is('consumed_at', null)
    .select('id')
  if (error) fail('use a code', error.message)
  return (data ?? []).length === 1
}

/** Forgets requests older than a day. Best effort; a failure costs nothing. */
export async function forgetOldRequests(now = Date.now()): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .delete()
    .lt('created_at', since(24 * 60 * 60 * 1000 + 60 * 1000, now))
  if (error) console.warn(`sign-in codes: old requests not cleared (${error.message})`)
}
