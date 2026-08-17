import { generateAssignmentEmailHtml, generateAssignmentCompletedEmailHtml } from '@/lib/emailTemplate'
import { getSupabase } from '@/lib/supabase'
import { AnswerValue, Question } from '@/types'

/**
 * Best guess at a client's email address.
 *
 * The clients table only stores a phone number, so this falls back to the email
 * the client typed into the default onboarding questionnaire. Returns '' when
 * there is nothing to go on — the admin can then type one in or copy the link.
 */
export async function lookupClientEmail(clientId: string): Promise<string> {
  const { data } = await getSupabase()
    .from('questionnaire_states')
    .select('answers')
    .eq('client_id', clientId)
    .maybeSingle()

  const email = (data?.answers as Record<string, AnswerValue> | undefined)?.email
  const value = typeof email === 'string' ? email.trim() : ''
  return value.includes('@') ? value : ''
}

/**
 * Which language to write to this client in.
 *
 * The clients table has no language column, so this reads the answer they gave
 * on the default intake — the same place their email address comes from.
 * Defaults to English when there is nothing to go on.
 */
export async function lookupClientLanguage(clientId: string): Promise<'en' | 'es'> {
  const { data } = await getSupabase()
    .from('questionnaire_states')
    .select('answers')
    .eq('client_id', clientId)
    .maybeSingle()

  const answers = data?.answers as Record<string, AnswerValue> | undefined
  const pref = String(answers?.preferred_language ?? '').toLowerCase()
  return pref === 'spanish' || pref === 'español' || pref === 'espanol' ? 'es' : 'en'
}

/** Emails one client the link to their own assignment. Throws on failure so the route can report it. */
export async function sendAssignmentEmail(opts: {
  to: string
  clientName: string
  setName: string
  questionCount: number
  link: string
  lang?: 'en' | 'es'
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.')

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: `JACKLAW Portal <${fromEmail}>`,
    to: [opts.to],
    subject:
      opts.lang === 'es'
        ? `${opts.setName} — Oficinas Legales de Jack D. Josephson, APC`
        : `${opts.setName} — Law Offices of Jack D. Josephson, APC`,
    html: generateAssignmentEmailHtml(
      opts.clientName,
      opts.setName,
      opts.questionCount,
      opts.link,
      opts.lang ?? 'en'
    ),
  })

  if (error) throw new Error(error.message ?? 'Resend rejected the message.')
}

/**
 * Notifies the firm that a client finished an assigned set. Mirrors the intake
 * notification: failures are logged, never thrown, so a client's submit still
 * succeeds if email delivery is down.
 */
export async function notifyFirmAssignmentCompleted(
  clientName: string,
  setName: string,
  questions: Question[],
  answers: Record<string, AnswerValue>
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const firmEmail = process.env.FIRM_EMAIL
  const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey || !firmEmail) {
    console.error('Missing env: RESEND_API_KEY or FIRM_EMAIL')
    return
  }

  const completedAt = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: `Completed: ${setName} — ${clientName}`,
      html: generateAssignmentCompletedEmailHtml(clientName, setName, completedAt, questions, answers),
    })
    if (error) console.error('Resend error (assignment completed):', error)
  } catch (err) {
    console.error('Assignment completion email failed:', err)
  }
}
