import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { Lang } from '@/lib/langs'
import { standing } from '@/lib/factLedger'
import { readContradictions, readLedger } from '@/lib/factStore'
import { askFollowUps } from '@/lib/followUp'
import { savePlan } from '@/lib/followUpStore'
import { STAGES, Stage, StoredReading, allClaims, isRead, isReadExceptFeha, nextStage } from '@/lib/caseReadingShape'
import { snapshotNow } from '@/lib/briefVersions'
import { WageOrderChoice, checkChoice, isUsable } from '@/lib/wageOrderChoice'
import { readingFingerprint, runStage } from '@/lib/caseReading'
import { readReading, saveStage } from '@/lib/caseReadingStore'
import { ClaimFinding } from '@/lib/claimMatrix'
import { SpineReading } from '@/lib/evidenceSpine'
import { Meter, describeSpend, totalSpend } from '@/lib/spend'
import { Outcome, Waiting, drain, whoIsWaiting } from '@/lib/followUpQueue'

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
 * AS MUCH AS THE CLOCK ALLOWS, SEVERAL TIMES A NIGHT. The plan caps a
 * request at 300 seconds. A run used to do one step for one client and stop,
 * so a client who finished Module 2 waited most of a week behind everyone
 * ahead — two waited eight days for their facts. Now a run keeps taking the
 * next step, for the same client or the next, while there is room for the
 * longest step of that kind ever measured (lib/followUpQueue.ts drain), and
 * vercel.json schedules it six times a night, two hours apart so no two runs
 * can overlap even with Hobby's anywhere-in-the-hour timing.
 */
export const maxDuration = 300

/**
 * Seconds into the run after which no NEW stage of a reading is begun.
 *
 * The longest stage measured is now the spine at 149 seconds (Branden,
 * 2026-09-25), with claims 1 at 131; begun by this mark, either finishes
 * inside the 300-second ceiling. It was 170 when the longest known was 116,
 * which a 149-second spine begun at 169 would have overrun. Past it, whatever
 * is left waits for the next run rather than being paid for and lost.
 */
const START_NO_STAGE_AFTER = 145

/**
 * No extraction is begun after this. Every section is read at once, so a
 * file takes as long as its slowest section — 112 seconds for Jingwen Du's
 * 180 facts; 90 for the longest single section measured before that.
 */
const START_FACTS_BY = 120

/** No round is begun after this. Rounds have taken 83 to 102 seconds. */
const START_ROUND_BY = 170

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
  const [{ data: states }, { data: clients }, { data: plans }, { data: readings }] =
    await Promise.all([
      db.from('questionnaire_states').select('client_id, m2_submitted'),
      db.from('clients').select('id, name, portal_lang'),
      db.from('follow_up_plans').select('client_id'),
      db.from('case_readings').select('client_id, result'),
    ])
  const finishedModule2 = (states ?? []).filter(s => s.m2_submitted).map(s => s.client_id as string)

  // Counted per client, not read off the whole table. This was one select of
  // every fact's client_id, and a select stops at 1000 rows: the table held
  // 758 with five clients read, so the sixth or seventh would have pushed
  // someone's facts past the cut. That client would then look unread, and the
  // night would extract them a second time into the same ledger. A count that
  // fails stops the run rather than being taken for none.
  const haveFacts = (
    await Promise.all(
      finishedModule2.map(async id => {
        const { count, error } = await db
          .from('case_facts')
          .select('client_id', { count: 'exact', head: true })
          .eq('client_id', id)
        if (error) throw new Error(`Could not count facts for ${id}: ${error.message}`)
        return count ? id : null
      })
    )
  ).filter((id): id is string => id !== null)

  // Complete means every stage is on the row. Whether those stages are still
  // true of the facts is a question only the ledger can answer, so it is asked
  // later, for the one client picked — hashing sixteen ledgers to choose one
  // would cost more than the choosing is worth.
  const finishedReading = (readings ?? [])
    .filter(r => isReadExceptFeha((r.result ?? {}) as StoredReading))
    .map(r => r.client_id as string)

  return whoIsWaiting({
    clients: (clients ?? []).map(c => ({
      id: c.id as string,
      name: (c.name as string) ?? '',
      lang: ((c.portal_lang as Lang) ?? 'en') as Lang,
    })),
    finishedModule2,
    haveFacts,
    haveReading: finishedReading,
    haveRound: (plans ?? []).map(p => p.client_id as string),
  })
}

/** Read the answers into facts. Its own step: extraction is the longest single thing a run does. */
async function readFacts(next: Waiting): Promise<Outcome> {
  const meter = new Meter()
  // Saved before any other step begins, so a later step cut off by the
  // 300-second ceiling cannot take the extraction down with it.
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
    return { ran: false, client: next.name, reason: 'The reading produced no facts.' }
  }
  await addFacts(next.clientId, read.entries)
  await saveContradictions(next.clientId, read.contradictions)
  return {
    ran: true,
    client: next.name,
    did: 'read the answers into facts',
    facts: read.entries.length,
    contradictions: read.contradictions.length,
    spent: describeSpend(meter.spent),
  }
}

/** As many stages of the reading as the run's clock allows. */
async function readCase(next: Waiting, began: number): Promise<Outcome> {
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
    return { ran: false, client: next.name, reason: 'No facts stand for this client.' }
  }
  const fingerprint = readingFingerprint(entries)
  const row = await readReading(next.clientId, fingerprint)
  let stored = row && !row.stale ? row.reading : {}
  const ran: Stage[] = []
  // Only stages never read. A stage that is merely stale — its model, its
  // Order, its claims or its authority moved since — is shown as stale on
  // the panel and re-read when somebody asks. Unprompted, the night would
  // otherwise re-read every Module 2 client's claims the first time a
  // holding was added to the library, and nobody would have decided to
  // spend that.
  let stage = nextStage(stored)
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

    // A stage already on the row is about to be written over — a reading
    // whose facts moved restarts from the Wage Order. Kept first, as the
    // panel keeps it, so the brief it produced can still be compared.
    if (row && isRead(row.reading, stage)) {
      await snapshotNow(next.clientId, `before the night read "${stage}" again`)
    }
    // Handed the reading even for the Wage Order, so the other stages'
    // stamps survive it — see the panel's route.
    const patch = await runStage(stage, entries, stored)
    stored = await saveStage(next.clientId, fingerprint, { ...stored, ...patch })
    ran.push(stage)
    stage = nextStage(stored)
  }

  if (!ran.length) {
    return {
      ran: false,
      client: next.name,
      reason: stoppedFor || 'The reading is already complete.',
    }
  }
  return {
    ran: true,
    client: next.name,
    did: `read ${ran.length} of ${STAGES.length} stages: ${ran.join(', ')}`,
    stagesLeft: stage ? `${stage} next — ${stoppedFor}` : 'the reading is complete',
    // runStage meters itself and records it on the row, so the nightly
    // meter never sees these tokens. Read them back off the stages run.
    spent: describeSpend(totalSpend(stored.spent ?? {})),
  }
}

/** Write the next round of questions, as a draft nobody has sent. */
async function writeRound(next: Waiting): Promise<Outcome> {
  const meter = new Meter()
  const entries = await readLedger(next.clientId)
  if (!standing(entries).length) {
    return { ran: false, client: next.name, reason: 'No facts stand for this client.' }
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
    return { ran: false, client: next.name, reason: 'The reading found nothing worth asking.' }
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
  return {
    ran: true,
    client: next.name,
    did: 'wrote the next questions',
    questions: plan.questions.length,
    // Said plainly in the response, because this is the part somebody has to
    // do and nothing else will do it for them.
    needsApproval: 'A draft. The client cannot see it until somebody reads it and approves it.',
    spent: describeSpend(meter.spent),
  }
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const first = await waitingFor()
  if (dryRun || !first.length) {
    return NextResponse.json({ ran: false, waiting: first, reason: first.length ? 'dry run' : 'Nobody is waiting.' })
  }

  // One clock for the whole run, so every step knows what it has left.
  const began = Date.now()
  const elapsed = () => (Date.now() - began) / 1000
  let served = false
  const { done, left } = await drain({
    // The first call is already made; later ones see what the steps changed.
    waiting: async () => {
      if (!served) {
        served = true
        return first
      }
      return waitingFor()
    },
    step: async next => {
      try {
        const outcome =
          next.needs === 'facts'
            ? await readFacts(next)
            : next.needs === 'reading'
              ? await readCase(next, began)
              : await writeRound(next)
        console.log(`cron follow-ups: ${next.name} — ${outcome.did ?? outcome.reason ?? ''}`)
        return outcome
      } catch (err) {
        console.error(`cron follow-ups: ${next.name}:`, err)
        throw err
      }
    },
    elapsed,
    startBy: { facts: START_FACTS_BY, reading: START_NO_STAGE_AFTER, questions: START_ROUND_BY },
  })

  const ran = done.some(d => d.ran)
  return NextResponse.json(
    { ran, did: done, stillWaiting: left.length, seconds: Math.round(elapsed()) },
    // A run in which every step failed is a failed run; one that got
    // something done reports its failures in `did` and succeeds.
    { status: !ran && done.some(d => d.error) ? 502 : 200 }
  )
}
