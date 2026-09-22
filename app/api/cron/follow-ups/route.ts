import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { Lang } from '@/lib/langs'
import { standing } from '@/lib/factLedger'
import { readContradictions, readLedger } from '@/lib/factStore'
import { askFollowUps } from '@/lib/followUp'
import { savePlan } from '@/lib/followUpStore'
import { STAGES, Stage, StoredReading, allClaims, isComplete, nextStage } from '@/lib/caseReadingShape'
import { WageOrderChoice, checkChoice, isUsable } from '@/lib/wageOrderChoice'
import { readingFingerprint, runStage, stampsNow } from '@/lib/caseReading'
import { readReading, saveStage } from '@/lib/caseReadingStore'
import { ClaimFinding } from '@/lib/claimMatrix'
import { SpineReading } from '@/lib/evidenceSpine'
import { Meter, describeSpend, totalSpend } from '@/lib/spend'
import { Waiting, whoIsWaiting } from '@/lib/followUpQueue'

/**
 * Reading a client's answers and writing their next questions, unprompted.
 *
 * A client who finishes Module 2 has told the office everything the
 * questionnaire knows how to ask. What happens next used to be that somebody
 * remembered — opened the client, pressed two buttons, waited. This does it
 * the night they finish.
 *
 * WHAT IT DOES NOT DO IS SEND ANYTHING. The round lands as a draft
 * assignment, which the portal hides from clients, and it is not approved. A
 * question written by a model still reaches a real person only after somebody
 * at the firm has read it. Generation is the part worth automating; approval
 * is the part that must not be.
 *
 * ONE UNIT OF WORK PER RUN. The plan caps a request at 300 seconds, and a
 * client's extraction alone can use most of that. So a run does the next thing
 * for one client — read the answers into facts, or write the round — and stops.
 * A backlog clears over a few nights; in steady state there is rarely more
 * than one client a day to do.
 */
export const maxDuration = 300

/**
 * Seconds into the run after which no NEW stage is begun.
 *
 * The longest stage ever measured is the spine at 116 seconds, so a stage
 * started before this mark finishes inside the 300-second ceiling. Past it,
 * whatever is left waits for tomorrow rather than being paid for and lost.
 */
const START_NO_STAGE_AFTER = 170

function authorised(req: NextRequest): boolean {
  // Vercel's scheduler sends the secret as a bearer token. An admin can also
  // run it by hand from the panel, which is how a backlog gets cleared without
  // waiting for midnight.
  if (isAdmin(req)) return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (!auth) return false
  const a = Buffer.from(auth)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}



/** Who has finished Module 2 and is owed something. */
async function waitingFor(): Promise<Waiting[]> {
  const db = getSupabase()
  const [{ data: states }, { data: clients }, { data: plans }, { data: facts }, { data: readings }] =
    await Promise.all([
      db.from('questionnaire_states').select('client_id, m2_submitted'),
      db.from('clients').select('id, name, portal_lang'),
      db.from('follow_up_plans').select('client_id'),
      db.from('case_facts').select('client_id'),
      db.from('case_readings').select('client_id, result'),
    ])

  // Complete means every stage is on the row. Whether those stages are still
  // true of the facts is a question only the ledger can answer, so it is asked
  // later, for the one client picked — hashing sixteen ledgers to choose one
  // would cost more than the choosing is worth.
  const finishedReading = (readings ?? [])
    .filter(r => isComplete((r.result ?? {}) as StoredReading))
    .map(r => r.client_id as string)

  return whoIsWaiting({
    clients: (clients ?? []).map(c => ({
      id: c.id as string,
      name: (c.name as string) ?? '',
      lang: ((c.portal_lang as Lang) ?? 'en') as Lang,
    })),
    finishedModule2: (states ?? []).filter(s => s.m2_submitted).map(s => s.client_id as string),
    haveFacts: (facts ?? []).map(f => f.client_id as string),
    haveReading: finishedReading,
    haveRound: (plans ?? []).map(p => p.client_id as string),
  })
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const queue = await waitingFor()
  if (dryRun || !queue.length) {
    return NextResponse.json({ ran: false, waiting: queue, reason: queue.length ? 'dry run' : 'Nobody is waiting.' })
  }

  const next = queue[0]
  const meter = new Meter()
  // One clock for the whole run, so the reading loop knows what it has left.
  const began = Date.now()

  try {
    if (next.needs === 'facts') {
      // Deliberately a separate request from the round. Extraction can use most
      // of the 300 seconds on a long file, and a run that tried both would lose
      // the extraction it had already paid for when the request was cut off.
      const { extractFacts } = await import('@/lib/factExtraction')
      const { addFacts, saveContradictions } = await import('@/lib/factStore')
      const { data: state } = await getSupabase()
        .from('questionnaire_states')
        .select('answers')
        .eq('client_id', next.clientId)
        .maybeSingle()

      const read = await extractFacts({
        clientId: next.clientId,
        clientName: next.name,
        answers: (state?.answers ?? {}) as Record<string, never>,
        meter,
      })
      if (!read.entries.length) {
        return NextResponse.json({ ran: false, client: next.name, reason: 'The reading produced no facts.' })
      }
      await addFacts(next.clientId, read.entries)
      await saveContradictions(next.clientId, read.contradictions)
      return NextResponse.json({
        ran: true,
        client: next.name,
        did: 'read the answers into facts',
        facts: read.entries.length,
        contradictions: read.contradictions.length,
        spent: describeSpend(meter.spent),
        // Still waiting: this client is one step further along but not done,
        // so they remain in the queue for tomorrow's run.
        stillWaiting: queue.length,
      })
    }

    if (next.needs === 'reading') {
      // AS MANY STAGES AS THE CLOCK ALLOWS, not one a night.
      //
      // The staging is not negotiable — the plan caps a request at 300 seconds
      // and an undivided reading that overran would be lost having been paid
      // for. But a stage SAVES when it finishes, so running them back to back
      // risks only the stage in flight, never the ones already stored.
      //
      // Measured on the three readings on file: 169s, 211s and 235s for all
      // four stages. A whole reading fits in one request with room, and the
      // 73-minute afternoon that justified one-a-night is an outlier the
      // resume path already handles. So: start another stage while there is
      // time for it, and leave the rest for tomorrow when there is not.
      const entries = await readLedger(next.clientId)
      if (!standing(entries).length) {
        return NextResponse.json({ ran: false, client: next.name, reason: 'No facts stand for this client.' })
      }
      const fingerprint = readingFingerprint(entries)
      const row = await readReading(next.clientId, fingerprint)
      let stored = row && !row.stale ? row.reading : {}
      const ran: Stage[] = []
      let stage = nextStage(stored, stampsNow(entries, stored))
      let stoppedFor = ''

      while (stage) {
        // The gate is on STARTING a stage, not on finishing one. The longest
        // stage measured is the spine at 116s, so a stage begun before this
        // mark has the room it has ever needed; one begun later might not.
        const elapsed = (Date.now() - began) / 1000
        if (ran.length && elapsed > START_NO_STAGE_AFTER) {
          stoppedFor = `out of time after ${Math.round(elapsed)}s`
          break
        }

        // A proposal that contradicts itself must not become the law ten
        // claims are read under — one proposed Order 7 while quoting the
        // provision naming restaurants in Order 5. The panel refuses this;
        // so does the night.
        if (stage === 'claims 1' || stage === 'claims 2') {
          const choice = stored.wageOrder as WageOrderChoice
          if (!isUsable(choice)) {
            stoppedFor = 'the Wage Order proposal contradicts itself'
            break
          }
        }

        const patch = await runStage(stage, entries, stage === 'wage order' ? {} : stored)
        stored = await saveStage(next.clientId, fingerprint, { ...stored, ...patch })
        ran.push(stage)
        stage = nextStage(stored, stampsNow(entries, stored))
      }

      if (!ran.length) {
        return NextResponse.json({
          ran: false,
          client: next.name,
          reason: stoppedFor || 'The reading is already complete.',
        })
      }
      return NextResponse.json({
        ran: true,
        client: next.name,
        did: `read ${ran.length} of ${STAGES.length} stages: ${ran.join(', ')}`,
        stagesLeft: stage ? `${stage} next — ${stoppedFor}` : 'the reading is complete',
        // runStage meters itself and records it on the row, so the nightly
        // meter never sees these tokens. Read them back off the stages run.
        spent: describeSpend(totalSpend(stored.spent ?? {})),
        stillWaiting: queue.length,
      })
    }

    const entries = await readLedger(next.clientId)
    if (!standing(entries).length) {
      return NextResponse.json({ ran: false, client: next.name, reason: 'No facts stand for this client.' })
    }
    const contradictions = await readContradictions(next.clientId)
    const row = await readReading(next.clientId, readingFingerprint(entries))
    const reading = row && !row.stale ? row.reading : null

    const set = await askFollowUps({
      entries,
      findings: allClaims<ClaimFinding>(reading),
      spine: (reading?.spine as SpineReading | undefined) ?? null,
      contradictions,
      lang: next.lang,
      limit: 20,
      meter,
    })
    if (!set.questions.length) {
      return NextResponse.json({ ran: false, client: next.name, reason: 'The reading found nothing worth asking.' })
    }

    const plan = await savePlan({
      clientId: next.clientId,
      lang: next.lang,
      set,
      factCount: standing(entries).length,
      createdBy: 'nightly',
      builtFrom: {
        ledger: standing(entries).length,
        matrix: allClaims<ClaimFinding>(reading).length,
        spine: Boolean(reading?.spine),
      },
    })
    return NextResponse.json({
      ran: true,
      client: next.name,
      did: 'wrote the next questions',
      questions: plan.questions.length,
      // Said plainly in the response, because this is the part somebody has to
      // do and nothing else will do it for them.
      needsApproval: 'A draft. The client cannot see it until somebody reads it and approves it.',
      spent: describeSpend(meter.spent),
      stillWaiting: queue.length - 1,
    })
  } catch (err) {
    console.error('cron follow-ups:', err)
    return NextResponse.json(
      { ran: false, client: next.name, error: (err as Error).message },
      { status: 502 }
    )
  }
}
