import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { generateIntakeEmailHtml, generateClientThankYouEmailHtml } from '@/lib/emailTemplate'
import { AnswerValue } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      clientName: string
      caseType: string
      answers: Record<string, AnswerValue>
    }

    const { clientName, caseType, answers } = body

    if (!clientName || !caseType || !answers) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const firmEmail = process.env.FIRM_EMAIL
    const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'

    if (!apiKey || !firmEmail) {
      console.error('Missing env: RESEND_API_KEY or FIRM_EMAIL')
      return NextResponse.json({ error: 'Email not configured.' }, { status: 500 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const submittedAt = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const html = generateIntakeEmailHtml(clientName, caseType, submittedAt, answers)

    const { error } = await resend.emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: `New Client Intake: ${clientName} — ${caseType}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
    }

    // Send the client a thank-you email with a link to schedule a consultation.
    // Non-fatal: the firm has already been notified, so a failure here shouldn't fail the request.
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Submit route error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
