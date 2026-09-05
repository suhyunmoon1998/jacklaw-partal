import { generateIntakeEmailHtml, generateClientThankYouEmailHtml } from '@/lib/emailTemplate'
import { questionnaireSections } from '@/lib/questionnaireSections'
import { module2Sections } from '@/lib/module2Sections'
import { answersForReading } from '@/lib/modules'
import { prepareSections } from '@/lib/repeatSections'
import { AnswerValue, QuestionnaireSection } from '@/types'

/**
 * What the office is told a client finished, per module.
 *
 * The subject line matters more than it looks: the firm gets one of these per
 * submission and files it. "New Client Intake" on a wage-and-hour submission
 * sent the reader looking for contact details that were never in it.
 */
const MODULE_EMAIL: Record<
  'module1' | 'module2',
  { subject: (name: string, caseType: string) => string; heading: string }
> = {
  module1: {
    subject: (name, caseType) => `New Client Intake: ${name} — ${caseType}`,
    heading: 'Client Intake',
  },
  module2: {
    subject: (name, caseType) => `Wage & Hour Answers: ${name} — ${caseType}`,
    heading: 'Wage & Hour',
  },
}

// Notifies the firm that a client's questionnaire is complete, and best-effort
// thanks the client. Failures are logged, never thrown — a save should still
// succeed even if email delivery fails.
export async function sendIntakeNotificationEmails(
  clientName: string,
  caseType: string,
  answers: Record<string, AnswerValue>,
  moduleId: 'module1' | 'module2' = 'module1'
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const firmEmail = process.env.FIRM_EMAIL
  const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey || !firmEmail) {
    console.error('Missing env: RESEND_API_KEY or FIRM_EMAIL')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const submittedAt = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // The sections this submission is actually about, and the answers the client
  // actually stands behind. An answer whose gate they later closed — the whole
  // wrongful-termination section, after they corrected themselves to say they
  // still work there — must not arrive as a fact in the case file.
  const { filed } = answersForReading(answers)
  const sections: QuestionnaireSection[] =
    moduleId === 'module2'
      ? prepareSections(module2Sections('en'), filed)
      : questionnaireSections('en')

  const copy = MODULE_EMAIL[moduleId]

  try {
    const { error } = await resend.emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: copy.subject(clientName, caseType),
      html: generateIntakeEmailHtml(clientName, caseType, submittedAt, filed, sections),
    })
    if (error) console.error('Resend error (firm notification):', error)
  } catch (err) {
    console.error('Firm notification email failed:', err)
  }

  // The thank-you and its booking link belong to finishing the intake. Sending
  // it again after every module would read as though they had just signed up.
  const clientEmail = typeof answers.email === 'string' ? answers.email.trim() : ''
  const calendlyUrl = process.env.CALENDLY_URL
  if (moduleId === 'module1' && clientEmail && clientEmail.includes('@') && calendlyUrl) {
    try {
      await resend.emails.send({
        from: `JACKLAW Portal <${fromEmail}>`,
        to: [clientEmail],
        subject: 'Thank You — Law Offices of Jack D. Josephson, APC',
        html: generateClientThankYouEmailHtml(clientName, calendlyUrl),
      })
    } catch (err) {
      console.error('Client thank-you email failed:', err)
    }
  }
}
