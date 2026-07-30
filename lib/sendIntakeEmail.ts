import { generateIntakeEmailHtml, generateClientThankYouEmailHtml } from '@/lib/emailTemplate'
import { AnswerValue } from '@/types'

// Notifies the firm that a client's intake is complete, and best-effort thanks the client.
// Failures are logged, never thrown — a save should still succeed even if email delivery fails.
export async function sendIntakeNotificationEmails(
  clientName: string,
  caseType: string,
  answers: Record<string, AnswerValue>
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

  try {
    const { error } = await resend.emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: `New Client Intake: ${clientName} — ${caseType}`,
      html: generateIntakeEmailHtml(clientName, caseType, submittedAt, answers),
    })
    if (error) console.error('Resend error (firm notification):', error)
  } catch (err) {
    console.error('Firm notification email failed:', err)
  }

  const clientEmail = typeof answers.email === 'string' ? answers.email.trim() : ''
  const calendlyUrl = process.env.CALENDLY_URL
  if (clientEmail && clientEmail.includes('@') && calendlyUrl) {
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
