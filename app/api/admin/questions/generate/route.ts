import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { toLang } from '@/lib/langs'
import { generateQuestions } from '@/lib/questionGenerator'
import { normalizeQuestions } from '@/lib/questionSets'
import { lookupClientLanguage } from '@/lib/sendAssignmentEmail'

/**
 * Reading a paste and writing the questions back takes longer than a normal
 * request. The default would cut it off mid-answer and show the admin a
 * failure for work that was actually still running.
 *
 * A long paste is read in batches that run at the same time, so the wait is the
 * slowest batch rather than the sum of them — measured at about forty seconds
 * for a full one. This is headroom, not the expected time.
 */
export const maxDuration = 120

/**
 * POST /api/admin/questions/generate  { text, clientId?, lang? }
 *
 * Turns pasted text into questions. Creates nothing and sends nothing — the
 * result goes back to the admin panel for review, and only a later, separate
 * call actually hands anything to a client.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === 'string' ? body.text : ''

  // The client's own language, so the draft translation is the one they will
  // actually read. An explicit lang overrides it — staff may know better than
  // the intake form does.
  const lang = body?.lang
    ? toLang(body.lang)
    : body?.clientId
    ? await lookupClientLanguage(String(body.clientId))
    : 'en'

  try {
    const result = await generateQuestions(text, lang)
    return NextResponse.json({
      ...result,
      // Through the same gate the editor's own saves go through, so a question
      // that could not render can never reach the review screen.
      questions: normalizeQuestions(result.questions),
    })
  } catch (err) {
    console.error('question generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not read those questions.' },
      { status: 502 }
    )
  }
}
