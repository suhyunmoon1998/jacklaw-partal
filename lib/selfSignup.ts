/**
 * A client who started on the portal by themselves: their row, their Step 1,
 * and a line to the office saying they are there.
 *
 * Until 2026-10-30 the office added every client by hand (app/api/admin/clients)
 * before that person could sign in. A new number that proves itself with a
 * texted code (lib/signUpCode.ts) now gets the same row the office would have
 * made, with Step 1 open, and the office is emailed — they did not choose this
 * client, so they have to be told one arrived.
 *
 * The row is tagged so the office can tell it from one they made, filed in no
 * folder (Unassigned), and given the office's own default case type, which the
 * office corrects once it has spoken to them.
 */

import { getSupabase } from '@/lib/supabase'
import { LANG_ENGLISH_NAME, Lang } from '@/lib/langs'
import { phoneKey, phoneVariants } from '@/lib/phoneNumber'
import { numberOptedOut } from '@/lib/numberOptOut'
import { formatPhone } from '@/lib/auth'
import { escapeHtml } from '@/lib/emailTemplate'

/** On the row, so the office can tell a client who signed up from one it added. */
export const SELF_SIGNUP_TAG = 'Self sign-up'

/** The first case type the office's own Add Client form offers. */
export const SELF_SIGNUP_CASE_TYPE = 'Wage & Hour'

/**
 * Who opened Step 1, on client_module_sends. Not 'on-create': the client asked
 * for this themselves, so the reminder ladder chases it if they stop part way
 * (lib/reminderSchedule.ts, chasedFrom).
 */
export const SELF_SIGNUP_SENDER = 'self'

/** Whether any case is on this number already. Null when it could not be read. */
export async function numberOnFile(phone: string): Promise<boolean | null> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('id')
    .in('phone', phoneVariants(phoneKey(phone)))
    .limit(1)
  if (error) {
    console.error('self sign-up: could not look the number up:', error.message)
    return null
  }
  return (data ?? []).length > 0
}

export interface SelfSignupClient {
  id: string
  name: string
  case_type: string
  portal_lang: Lang
  /** False when Step 1 could not be opened; the office is told to press Send. */
  stepOpen: boolean
}

/** Makes the row and opens Step 1. Throws when the row itself cannot be made. */
export async function createSelfSignupClient(input: { name: string; phone: string; lang: Lang }): Promise<SelfSignupClient> {
  const db = getSupabase()
  // A person who told the office to stop on another case has told it for this
  // one too. They could not have received the code, so this is belt and braces.
  const stopped = await numberOptedOut(input.phone)

  const id = `client-${Date.now()}`
  const { error } = await db.from('clients').insert({
    id,
    name: input.name,
    phone: phoneKey(input.phone),
    case_type: SELF_SIGNUP_CASE_TYPE,
    portal_lang: input.lang,
    sms_opt_out: stopped === true,
    tags: [SELF_SIGNUP_TAG],
  })
  if (error) throw new Error(`Could not create the client: ${error.message}`)

  const openStep = () =>
    db.from('client_module_sends').upsert(
      {
        client_id: id,
        module_id: 'module1',
        sent_at: new Date().toISOString(),
        sent_lang: input.lang,
        created_by: SELF_SIGNUP_SENDER,
      },
      { onConflict: 'client_id,module_id' }
    )
  // Retried once, as the office's own add does: without this row the portal
  // opens to an empty list.
  let { error: stepError } = await openStep()
  if (stepError) ({ error: stepError } = await openStep())
  if (stepError) console.error('self sign-up: could not open Step 1 to', id, stepError.message)

  return { id, name: input.name, case_type: SELF_SIGNUP_CASE_TYPE, portal_lang: input.lang, stepOpen: !stepError }
}

/** The email to the office. Never throws: the client is in either way. */
export async function notifyFirmOfSelfSignup(client: SelfSignupClient, phone: string, origin: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const firmEmail = process.env.FIRM_EMAIL
  const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'
  if (!apiKey || !firmEmail) {
    console.error('Missing env: RESEND_API_KEY or FIRM_EMAIL')
    return
  }

  const rows: [string, string][] = [
    ['Name', client.name],
    ['Phone', formatPhone(phoneKey(phone))],
    ['Language', LANG_ENGLISH_NAME[client.portal_lang]],
    ['Case type', `${client.case_type} (default; change it once you have spoken to them)`],
    ['Step 1', client.stepOpen ? 'Open to them now' : 'Could not be opened. Press Send on Step 1 for this client.'],
  ]
  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
  <p style="margin:0 0 4px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">JACKLAW Client Portal</p>
  <h2 style="margin:0 0 16px 0;font-size:20px;">A new client started on the portal</h2>
  <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
    They typed their own number, confirmed it with a texted code, and began Step 1. They are in
    <strong>Unassigned</strong> with the tag <strong>${escapeHtml(SELF_SIGNUP_TAG)}</strong>.
  </p>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(v)}</td></tr>`
      )
      .join('')}
  </table>
  <a href="${escapeHtml(`${origin.replace(/\/$/, '')}/admin`)}" style="display:inline-block;background:#E07820;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:10px 22px;border-radius:99px;">Open the admin panel</a>
</div>`.trim()

  try {
    const { Resend } = await import('resend')
    const { error } = await new Resend(apiKey).emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: `New client on the portal: ${client.name}`,
      html,
    })
    if (error) console.error('Resend error (self sign-up):', error)
  } catch (err) {
    console.error('Self sign-up email failed:', err)
  }
}
