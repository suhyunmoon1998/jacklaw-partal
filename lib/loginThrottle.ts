/**
 * How many wrong admin passwords are allowed before the door is shut a while.
 *
 * The login route answered every guess at once, so the one password standing
 * between the internet and every client file could be tried as fast as the
 * network allowed. Now each attempt is written down and wrong ones are counted
 * over a window, per connection and across all of them.
 *
 * PER CONNECTION stops one machine guessing. ACROSS ALL stops many machines
 * sharing the work, and it is the one with a cost: while it is shut, the
 * office cannot sign in either. It is set far above anything a person
 * mistyping produces, and it opens again by itself.
 *
 * IF THE COUNT CANNOT BE READ, the login goes ahead and the failure is logged.
 * Shutting the office out because a table was unreachable would make the
 * throttle the likelier thing to stop them working than an attacker.
 */

import { NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const PER_IP = { failures: 10, minutes: 15 }
export const EVERYONE = { failures: 100, minutes: 60 }

/** Rows older than this are deleted as attempts come in. */
const KEEP_HOURS = 24

/**
 * The address the attempt came from.
 *
 * Vercel sets x-real-ip and overwrites x-forwarded-for with the address it
 * saw, so a client cannot choose its own. Anywhere else, one bucket.
 */
export function clientIp(req: NextRequest): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}

export interface Verdict {
  allowed: boolean
  /** Whole minutes until the oldest counted failure leaves the window. */
  retryInMinutes: number
  /** Which limit shut it, for the message. */
  by: 'connection' | 'everyone' | null
}

/**
 * The decision, on counts already read. Separate so it can be tested without
 * a database.
 */
export function judge(
  now: number,
  mine: { count: number; oldest: number | null },
  all: { count: number; oldest: number | null }
): Verdict {
  const wait = (oldest: number | null, minutes: number) =>
    oldest === null ? minutes : Math.max(1, Math.ceil((oldest + minutes * 60_000 - now) / 60_000))
  if (mine.count >= PER_IP.failures) {
    return { allowed: false, retryInMinutes: wait(mine.oldest, PER_IP.minutes), by: 'connection' }
  }
  if (all.count >= EVERYONE.failures) {
    return { allowed: false, retryInMinutes: wait(all.oldest, EVERYONE.minutes), by: 'everyone' }
  }
  return { allowed: true, retryInMinutes: 0, by: null }
}

async function failuresSince(ip: string | null, minutes: number) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  let q = getSupabase()
    .from('admin_login_attempts')
    .select('attempted_at', { count: 'exact' })
    .eq('succeeded', false)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: true })
    .limit(1)
  if (ip) q = q.eq('ip', ip)
  const { data, count, error } = await q
  if (error) throw new Error(error.message)
  return { count: count ?? 0, oldest: data?.[0] ? Date.parse(data[0].attempted_at as string) : null }
}

/** Whether this connection may try a password now. */
export async function mayTry(ip: string): Promise<Verdict> {
  try {
    const [mine, all] = await Promise.all([
      failuresSince(ip, PER_IP.minutes),
      failuresSince(null, EVERYONE.minutes),
    ])
    return judge(Date.now(), mine, all)
  } catch (err) {
    console.error('login throttle: could not read attempts, allowing:', (err as Error).message)
    return { allowed: true, retryInMinutes: 0, by: null }
  }
}

/** Writes the attempt down, and clears what has aged out. */
export async function recordAttempt(ip: string, succeeded: boolean): Promise<void> {
  const db = getSupabase()
  const { error } = await db.from('admin_login_attempts').insert({ ip, succeeded })
  if (error) console.error('login throttle: could not record attempt:', error.message)
  const cutoff = new Date(Date.now() - KEEP_HOURS * 3_600_000).toISOString()
  await db.from('admin_login_attempts').delete().lt('attempted_at', cutoff)
}
