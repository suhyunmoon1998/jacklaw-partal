/**
 * An opt-out belongs to the person, and the person is the phone number.
 *
 * One person can be on two cases, which is two rows sharing a number, and the
 * inbound webhook sets the flag on every row for the number. But a row added
 * later — a second case opened after the client said stop — started with the
 * flag off, and every send read only its own row, so the day-2 and day-5 texts
 * and the day-10 recorded call went to someone who had asked the office to
 * stop. Every send now asks about the number, not the row.
 */

import { getSupabase } from '@/lib/supabase'
import { phoneKey, phoneVariants } from '@/lib/signInCode'

/**
 * Whether any row with this number has opted out. Null when it could not be
 * read — and a caller that cannot tell does not send.
 */
export async function numberOptedOut(phone: string): Promise<boolean | null> {
  const key = phoneKey(phone)
  if (!key) return false
  const { data, error } = await getSupabase()
    .from('clients')
    .select('id')
    .in('phone', phoneVariants(key))
    .eq('sms_opt_out', true)
    .limit(1)
  if (error) return null
  return (data ?? []).length > 0
}

/** The opted-out numbers among rows already read, as phone keys. */
export function optedOutNumbers(rows: { phone?: string | null; sms_opt_out?: boolean | null }[]): Set<string> {
  return new Set(rows.filter(r => r.sms_opt_out).map(r => phoneKey(String(r.phone ?? ''))).filter(Boolean))
}

/** Stops texts and calls to a number, on every row that has it. */
export async function stopTextingNumber(phone: string): Promise<number> {
  const key = phoneKey(phone)
  if (!key) return 0
  const { data, error } = await getSupabase()
    .from('clients')
    .update({ sms_opt_out: true })
    .in('phone', phoneVariants(key))
    .select('id')
  if (error) throw new Error(`The opt-out could not be recorded: ${error.message}`)
  return (data ?? []).length
}
