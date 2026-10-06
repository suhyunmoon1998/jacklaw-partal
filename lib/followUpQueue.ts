/**
 * Who the nightly run should read next.
 *
 * Pulled out of the route because getting this wrong is silent. A client
 * filtered out by mistake is not an error anybody sees — they simply never get
 * a round, and the office finds out weeks later when somebody notices the file
 * is thin. So the choosing is a pure function over four lists and is tested,
 * and the route only fetches the lists.
 */

import { Lang } from '@/lib/langs'
import { QUESTIONNAIRE_V1_SECTIONS } from '@/lib/questionnaireV1'

/**
 * In the order the work has to happen. Also the order of precedence below.
 *
 * 'additions' reads answers that arrived after the facts — a follow-up round's,
 * usually — into the ledger; the reading then no longer matches the facts and
 * is read again (owner's decision, 2026-10-03). 'damages' is the damages
 * reading begun when Module 2 was submitted and not finished in that request
 * (lib/damagesAuto.ts). Neither writes a new round: a re-read client already
 * has one, and writing the next is not automated.
 */
export const STEPS = ['facts', 'additions', 'reading', 'questions', 'damages'] as const
export type Step = (typeof STEPS)[number]

export interface Waiting {
  clientId: string
  name: string
  lang: Lang
  /** What this client needs next. One per run. */
  needs: Step
}

/**
 * Whether a client has told the office everything the questionnaire asks.
 *
 * Module 2 submitted — or, for the clients who answered before Module 2
 * existed, the earlier twenty-section version answered through. That version
 * asked the meal, rest, overtime and retaliation questions Module 2 asks now,
 * so waiting for a Module 2 from them would wait on questions they have
 * already answered; four clients sat unread for two months on exactly that.
 *
 * Nineteen of the twenty sections counts: the twentieth was "Additional
 * Information" (prior complaints, prior attorneys, notes), and the office
 * counted a client who stopped there as finished (2026-09-27). The current
 * Module 1 has ten sections, so nineteen completed can only be the earlier
 * version.
 */
export function finishedQuestionnaire(state: {
  m2_submitted?: boolean | null
  completed_sections?: number[] | null
}): boolean {
  if (state.m2_submitted) return true
  return (state.completed_sections?.length ?? 0) >= QUESTIONNAIRE_V1_SECTIONS.length - 1
}

export function whoIsWaiting(input: {
  clients: { id: string; name: string; lang: Lang }[]
  /** Clients who have answered everything: see finishedQuestionnaire. */
  finishedModule2: string[]
  haveFacts: string[]
  /** Clients whose reading is on file with every stage run. */
  haveReading: string[]
  haveRound: string[]
  /** Clients who finished a question set after their facts were last read or searched. */
  answeredSinceFacts?: string[]
  /** Clients whose facts are newer than their reading, so the reading no longer describes them. */
  readingBehindFacts?: string[]
  /** Clients owed the damages reading: see owedDamages in lib/damagesAuto.ts. */
  owedDamages?: string[]
}): Waiting[] {
  const done = new Set(input.finishedModule2)
  const withFacts = new Set(input.haveFacts)
  const withReading = new Set(input.haveReading)
  const withRound = new Set(input.haveRound)
  const answered = new Set(input.answeredSinceFacts ?? [])
  const behind = new Set(input.readingBehindFacts ?? [])
  const damages = new Set(input.owedDamages ?? [])

  // What is still owed, earliest step first. A client is in the queue while
  // any of them is missing — including someone who already has a round but no
  // reading, who would otherwise never be read at all.
  const owes = (id: string): Step | null => {
    if (!withFacts.has(id)) return 'facts'
    if (answered.has(id)) return 'additions'
    if (!withReading.has(id) || behind.has(id)) return 'reading'
    if (!withRound.has(id)) return 'questions'
    if (damages.has(id)) return 'damages'
    return null
  }

  const out = input.clients
    // Module 2 and not Module 1: the second module is where the meal breaks,
    // the unpaid time and the retaliation are asked about, and a round written
    // before those answers exist would ask about the half of the case nobody
    // has described yet.
    .filter(c => done.has(c.id) && owes(c.id) !== null)
    .map(c => ({
      clientId: c.id,
      name: c.name,
      lang: c.lang,
      needs: owes(c.id) as Step,
    }))

  // Whoever is furthest along goes first, so a client one step from a round
  // gets it tonight rather than queueing behind somebody else's extraction.
  return out.sort((a, b) => STEPS.indexOf(b.needs) - STEPS.indexOf(a.needs))
}

/** What one step of the run did, as the night reports it. */
export interface Outcome {
  ran: boolean
  client: string
  did?: string
  reason?: string
  error?: string
  [detail: string]: unknown
}

/**
 * As many steps as the run has time for, not one.
 *
 * The night used to take the first client in the queue, do one step, and
 * stop — so a client who finished Module 2 waited a night for facts, a night
 * or two for the reading and another for a round, behind everyone ahead of
 * them. Two clients finished on 2026-09-17 and had nothing
 * eight days later. The 300-second ceiling still rules: a step is begun only
 * while there is room for the longest one of its kind ever measured, and the
 * first step of a run is always begun, as before.
 *
 * A client whose step did not advance — nothing to read, a proposal that
 * contradicts itself, an error — is passed over for the rest of the run, so it
 * is neither retried in a loop nor left holding up everyone behind it.
 */
export async function drain(opts: {
  waiting: () => Promise<Waiting[]>
  step: (next: Waiting) => Promise<Outcome>
  /** Seconds since the run began. */
  elapsed: () => number
  /** The latest second at which a step of each kind may still be begun. */
  startBy: Partial<Record<Step, number>>
}): Promise<{ done: Outcome[]; left: Waiting[] }> {
  const done: Outcome[] = []
  const passedOver = new Set<string>()
  let queue = await opts.waiting()

  for (;;) {
    const next = queue.find(w => !passedOver.has(w.clientId))
    if (!next) break
    // A step with no limit given is begun only as the first of a run.
    const startBy = opts.startBy[next.needs]
    if (done.length && (startBy === undefined || opts.elapsed() > startBy)) break

    let outcome: Outcome
    try {
      outcome = await opts.step(next)
    } catch (err) {
      outcome = { ran: false, client: next.name, error: (err as Error).message }
    }
    done.push(outcome)
    if (!outcome.ran) passedOver.add(next.clientId)
    queue = await opts.waiting()
  }

  return { done, left: queue }
}
