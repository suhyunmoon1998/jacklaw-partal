import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { translateAnswersCached } from '@/lib/translationCache'
import { AnswerValue } from '@/types'

/**
 * A client's answers in English, for the admin panel.
 *
 * The browser used to call the free translation endpoint itself, once per
 * answer, every time a client was opened. It now asks here, and each text is
 * translated once and kept (lib/translationCache.ts).
 */
export const maxDuration = 120

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const answers = (body?.answers ?? {}) as Record<string, AnswerValue>
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Send { answers }.' }, { status: 400 })
  }
  return NextResponse.json({ english: await translateAnswersCached(answers) })
}
