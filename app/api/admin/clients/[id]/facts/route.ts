import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { extractFacts } from '@/lib/factExtraction'
import {
  addFacts,
  clearContradictions,
  clearLedger,
  readContradictions,
  readLedger,
  saveContradictions,
} from '@/lib/factStore'
import { standing, unsettled } from '@/lib/factLedger'
import { clearReading } from '@/lib/caseReadingStore'
import { AnswerValue } from '@/types'
import { Meter, describeSpend } from '@/lib/spend'

/**
 * Turning one client's answers into the fact ledger everything else stands on.
 *
 * This is the bottom of the stack and it was the one rung with no button. The
 * matrix, the spine, the Wage Order and the follow-up questions were all
 * reachable from the admin; the step that creates the facts they read was run
 * once, from a script, for one client. Every other client opened to "no facts
 * on file, so there is nothing to read".
 *
 * A reading of a hundred and eighty answers, section by section and five at a
 * time, plus a pass over the whole file to find where the answers disagree.
 */
export const maxDuration = 300

async function gather(clientId: string) {
  const db = getSupabase()
  const [{ data: client }, { data: state }] = await Promise.all([
    db.from('clients').select('id, name').eq('id', clientId).maybeSingle(),
    db.from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
  ])
  if (!client) return null
  // The raw record. extractFacts runs it through answersForReading itself, so
  // that a question the client retracted is read as retracted here too rather
  // than twice or not at all.
  return {
    clientId,
    clientName: client.name ?? '',
    answers: (state?.answers ?? {}) as Record<string, AnswerValue>,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [entries, contradictions] = await Promise.all([
      readLedger(params.id),
      readContradictions(params.id),
    ])
    return NextResponse.json({
      facts: standing(entries).length,
      total: entries.length,
      unsettled: unsettled(entries).length,
      contradictions,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await readLedger(params.id)
  const body = await req.json().catch(() => ({}))
  // Reading again over a ledger that already holds facts would insert a second
  // copy of every one of them — addFacts is deliberately not an upsert, so it
  // would fail, but only after the reading had been paid for. Refuse first.
  if (existing.length && body?.replace !== true) {
    return NextResponse.json(
      {
        error: `This client already has ${existing.length} facts on file. Reading again replaces them, and any correction recorded against them goes with them.`,
        facts: existing.length,
      },
      { status: 409 }
    )
  }

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'No such client.' }, { status: 404 })
  if (!Object.keys(input.answers).length) {
    return NextResponse.json(
      { error: 'This client has not answered anything yet, so there is nothing to read.' },
      { status: 409 }
    )
  }

  let read
  const began = Date.now()
  const meter = new Meter()
  try {
    read = await extractFacts({ ...input, meter })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
  if (!read.entries.length) {
    return NextResponse.json(
      { error: 'The reading produced no facts. Nothing was changed.', answered: read.answered },
      { status: 502 }
    )
  }

  try {
    if (existing.length) {
      await clearLedger(params.id)
      await clearContradictions(params.id)
      // The matrix and the spine were read against facts that no longer exist.
      // Keeping them would leave findings citing ids nothing can resolve.
      await clearReading(params.id)
    }
    await addFacts(params.id, read.entries)
    await saveContradictions(params.id, read.contradictions)
  } catch (err) {
    // The reading ran and could not be stored, which has cost this project a
    // whole reading before. It fails loudly rather than reporting success.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  return NextResponse.json({
    facts: read.entries.length,
    answered: read.answered,
    contradictions: read.contradictions,
    replaced: existing.length,
    seconds: Math.round((Date.now() - began) / 1000),
    spent: meter.spent,
    spentSaid: describeSpend(meter.spent),
  })
}

/** Throws the ledger away. Everything read from it goes too. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await clearLedger(params.id)
    await clearContradictions(params.id)
    await clearReading(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
