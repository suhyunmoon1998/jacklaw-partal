import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { advancesTo, assignmentLink, getAssignmentDetail } from '@/lib/questionSets'
import { isConfigured, sendSms } from '@/lib/twilio'
import { unreviewedRound } from '@/lib/followUpStore'
import { invitationSms, lookupClientPhone, origin } from '@/lib/assignmentInvite'
import { Lang, isLang } from '@/lib/langs'
import { localizeName } from '@/lib/questionLogic'
import { lookupClientEmail, lookupClientLanguage, sendAssignmentEmail } from '@/lib/sendAssignmentEmail'
import { AssignmentStatus } from '@/types'

// GET /api/admin/assignments/[id]/send — the link plus the email we would use
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignment = await getAssignmentDetail(params.id)
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [email, lang] = await Promise.all([
    lookupClientEmail(assignment.clientId),
    lookupClientLanguage(assignment.clientId),
  ])

  return NextResponse.json({ link: assignmentLink(req.nextUrl.origin, params.id), email, lang })
}

/**
 * Sending one assignment to the client.
 *
 * Text first, email second, and either alone counts as sent.
 *
 * This route was email-only, which for this office's clients meant it often
 * did not arrive: the reminder ladder that chases an unfinished questionnaire
 * is text on day 2, text on day 5, a telephone call on day 10 — three of three
 * by phone — because that is how these clients are actually reached. A round
 * of follow-up questions that could only go out by email was a round most
 * people would never see.
 */
// POST /api/admin/assignments/[id]/send  { email?, sms? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // forClient: the count in the email has to match the questionnaire they open.
  const assignment = await getAssignmentDetail(params.id, { forClient: true })
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A generated round of follow-up questions reaches a client only after
  // somebody has opened it and read what it says. The draft status hides it
  // from the client; this is what stops it being sent from the Question Sets
  // tab by an admin who never saw the questions.
  const unread = await unreviewedRound(params.id)
  if (unread) {
    return NextResponse.json(
      {
        error:
          'These questions were written by the follow-up reader and nobody has approved them yet. ' +
          'Open the client, read them under Analysis, and approve the round first.',
        needsReview: unread.planId,
      },
      { status: 409 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const to = String(body?.email ?? '').trim() || (await lookupClientEmail(assignment.clientId))
  const lang: Lang = isLang(body?.lang) ? body.lang : await lookupClientLanguage(assignment.clientId)
  const link = assignmentLink(req.nextUrl.origin, params.id)

  const wantsSms = body?.sms !== false
  const phone = wantsSms ? await lookupClientPhone(assignment.clientId) : ''
  const name = assignment.clientName || 'there'

  if (!to.includes('@') && !phone) {
    return NextResponse.json(
      {
        error:
          'No email address or phone number on file for this client. Enter an email, or copy the link and send it yourself.',
        link,
      },
      { status: 400 }
    )
  }

  // The text carries the front door, not this assignment's URL: sign-in is by
  // phone, and nothing in a text should be a key to somebody's case file.
  const sms = phone && isConfigured() ? await sendSms(phone, invitationSms(lang, name, origin(req))) : null
  let emailed = false
  let emailError = ''

  if (to.includes('@')) {
    try {
      await sendAssignmentEmail({
        to,
        clientName: name,
        setName: localizeName(assignment.questionSetName, assignment.questionSetNameTranslations, lang),
        // The set description is a staff-only note, so it stays out of the client's email.
        questionCount: assignment.questionCount,
        link,
        lang,
      })
      emailed = true
    } catch (err) {
      console.error('assignment send failed:', err)
      emailError = err instanceof Error ? err.message : 'Could not send the email.'
    }
  }

  // Either channel arriving is a send. Both failing is not — and the status is
  // not advanced, so the office sees it is still a draft rather than believing
  // a client was contacted.
  if (!emailed && !sms?.ok) {
    return NextResponse.json(
      { error: emailError || sms?.error || 'Neither the text nor the email could be sent.', link },
      { status: 502 }
    )
  }

  // Recorded only after the email actually went out, so "Sent" on the admin
  // screen always means a message left the building. sent_at is stamped on every
  // send — including reminders to a client already working — while the status
  // only moves forward, so a reminder cannot drag their progress backwards.
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now, sent_at: now }
  if (advancesTo(assignment.status as AssignmentStatus, 'sent')) patch.status = 'sent'

  await getSupabase().from('client_question_set_assignments').update(patch).eq('id', params.id)

  return NextResponse.json({
    sent: true,
    email: emailed ? to : null,
    emailError: emailError || undefined,
    sms: sms?.ok ? phone : null,
    smsError: sms && !sms.ok ? sms.error : undefined,
    link,
    lang,
  })
}
