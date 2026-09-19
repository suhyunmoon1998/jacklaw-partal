import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { Lang } from '@/lib/langs'
import { readLedger } from '@/lib/factStore'
import { standing } from '@/lib/factLedger'
import { askFollowUps, vetAll } from '@/lib/followUp'
import { markReviewed, readPlans, savePlan } from '@/lib/followUpStore'
import { ClaimFinding } from '@/lib/claimMatrix'
import { SpineReading } from '@/lib/evidenceSpine'

/**
 * Writing the next round of questions for one client.
 *
 * The round is written as a DRAFT assignment, which the portal already hides
 * from clients. This route cannot send anything and does not try to: a
 * question written by a model reaches a real person only after somebody at the
 * firm has opened it, read the English beside the translation, and pressed
 * send in the assignment panel that already exists.
 */
export const maxDuration = 300

/** What the round is written against. Everything here is already on file. */
async function gather(clientId: string) {
  const db = getSupabase()
  const [entries, { data: client }, { data: analysis }] = await Promise.all([
    readLedger(clientId),
    db.from('clients').select('id, name, portal_lang').eq('id', clientId).maybeSingle(),
    db.from('case_analyses').select('result').eq('client_id', clientId).maybeSingle(),
  ])
  if (!client) return null

  // The matrix and the spine are optional. A client whose facts are read but
  // whose claims have not been mapped still has open loops, contradictions and
  // undated events worth asking about, and a round built from those alone is
  // better than no round — so their absence is a thinner reading, not an error.
  const stored = (analysis?.result ?? {}) as { matrix?: { findings?: ClaimFinding[] }; spine?: SpineReading }
  return {
    entries,
    lang: (client.portal_lang as Lang) ?? 'en',
    findings: stored.matrix?.findings ?? [],
    spine: stored.spine ?? null,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ plans: await readPlans(params.id) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const limit = Number.isInteger(body?.limit) ? Math.min(Math.max(body.limit, 1), 40) : 20

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'No such client.' }, { status: 404 })
  if (!standing(input.entries).length) {
    return NextResponse.json(
      { error: 'This client has no facts on file yet, so there is nothing to follow up on.' },
      { status: 409 }
    )
  }

  let set
  try {
    set = await askFollowUps({
      entries: input.entries,
      findings: input.findings,
      spine: input.spine,
      lang: input.lang,
      limit,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
  if (!set.questions.length) {
    return NextResponse.json({ error: 'The reading found nothing worth asking.', leftOut: set.leftOut }, { status: 409 })
  }

  // A round is saved whether or not vet() objected, and the objections are
  // saved with it. The office reviews everything before it goes out anyway,
  // and discarding twenty good questions because one is badly worded would
  // throw away the reading that produced them.
  try {
    const plan = await savePlan({
      clientId: params.id,
      lang: input.lang,
      set,
      factCount: standing(input.entries).length,
      createdBy: 'admin',
    })
    return NextResponse.json({ plan, questions: set.questions, problems: vetAll(set) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/** Recording that a person has read the round. It still has to be sent by hand. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const planId = String(body?.planId ?? '')
  if (!planId) return NextResponse.json({ error: 'Which round?' }, { status: 400 })

  const plans = await readPlans(params.id)
  if (!plans.some(p => p.id === planId)) {
    return NextResponse.json({ error: 'That round is not this client’s.' }, { status: 404 })
  }
  try {
    await markReviewed(planId, String(body?.by ?? 'admin'))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
