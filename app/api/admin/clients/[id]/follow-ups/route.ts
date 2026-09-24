import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { Lang } from '@/lib/langs'
import { Meter, describeSpend } from '@/lib/spend'
import { readContradictions, readLedger } from '@/lib/factStore'
import { standing } from '@/lib/factLedger'
import { allClaims } from '@/lib/caseReadingShape'
import { readingFingerprint } from '@/lib/caseReading'
import { readReading } from '@/lib/caseReadingStore'
import { askFollowUps, vetAll } from '@/lib/followUp'
import { planQuestions, readPlans, reviewPlan, savePlan } from '@/lib/followUpStore'
import { ClaimFinding } from '@/lib/claimMatrix'
import { snapshotNow } from '@/lib/briefVersions'
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
  const [entries, contradictions, { data: client }] = await Promise.all([
    readLedger(clientId),
    // Found by the extraction pass over the whole file and stored with the
    // ledger. They were being left out of the round entirely, which on a file
    // read without the matrix or the spine is most of what there is to ask
    // about — six of twenty questions on the first client tried this way.
    readContradictions(clientId),
    db.from('clients').select('id, name, portal_lang').eq('id', clientId).maybeSingle(),
  ])
  if (!client) return null

  // The matrix and the spine are optional, and a stale one is not used. A
  // client whose facts are read but whose claims have not been mapped still
  // has open loops and contradictions worth asking about, so their absence
  // makes the round thinner rather than making it an error — and the plan
  // records which it was, so the panel can say so.
  const row = await readReading(clientId, readingFingerprint(entries))
  const reading = row && !row.stale ? row.reading : null

  return {
    entries,
    contradictions,
    lang: (client.portal_lang as Lang) ?? 'en',
    findings: allClaims<ClaimFinding>(reading),
    spine: (reading?.spine as SpineReading | undefined) ?? null,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const plans = await readPlans(params.id)
    // The newest round comes with its questions, because that is the one
    // somebody is about to approve, and approving a round means reading the
    // questions rather than a summary of why they were asked.
    const questions = plans[0] ? await planQuestions(plans[0].questionSetId) : []
    return NextResponse.json({ plans, questions })
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

  const meter = new Meter()
  let set
  try {
    set = await askFollowUps({
      entries: input.entries,
      findings: input.findings,
      spine: input.spine,
      contradictions: input.contradictions,
      lang: input.lang,
      limit,
      meter,
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
  // The brief lists the newest round's questions; a new round replaces them.
  await snapshotNow(params.id, 'before a new round of questions was written')
  try {
    const plan = await savePlan({
      clientId: params.id,
      lang: input.lang,
      set,
      factCount: standing(input.entries).length,
      createdBy: 'admin',
      builtFrom: {
        ledger: standing(input.entries).length,
        matrix: input.findings.length,
        spine: input.spine !== null,
      },
    })
    return NextResponse.json({
      plan,
      questions: set.questions,
      problems: vetAll(set),
      spent: meter.spent,
      spentSaid: describeSpend(meter.spent),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/**
 * Approving a round: which questions may go, and that a person read them.
 *
 * `keep` is the whole approved set. Anything left out is struck and deleted —
 * striking one is the point of reviewing, because vet() catches jargon and
 * compound questions but cannot catch a question that is clear, clean and
 * leading. This still sends nothing; the round stays a draft until sent.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const planId = String(body?.planId ?? '')
  if (!planId) return NextResponse.json({ error: 'Which round?' }, { status: 400 })

  const plans = await readPlans(params.id)
  const plan = plans.find(p => p.id === planId)
  if (!plan) {
    return NextResponse.json({ error: 'That round is not this client\u2019s.' }, { status: 404 })
  }

  const keep: string[] = Array.isArray(body?.keep)
    ? body.keep.map(String)
    : plan.questions.map(q => q.questionKey)
  const known = new Set(plan.questions.map(q => q.questionKey))
  const unknown = keep.filter(k => !known.has(k))
  if (unknown.length) {
    return NextResponse.json({ error: `Not in this round: ${unknown.join(', ')}` }, { status: 400 })
  }

  // Striking a question deletes it, and the brief listed it.
  await snapshotNow(params.id, 'before the round was reviewed')
  try {
    const result = await reviewPlan(planId, keep, String(body?.by ?? 'admin'))
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
