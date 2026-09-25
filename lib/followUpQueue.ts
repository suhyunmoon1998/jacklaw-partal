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

/** In the order the work has to happen. Also the order of precedence below. */
export const STEPS = ['facts', 'reading', 'questions'] as const
export type Step = (typeof STEPS)[number]

export interface Waiting {
  clientId: string
  name: string
  lang: Lang
  /** What this client needs next. One per run. */
  needs: Step
}

export function whoIsWaiting(input: {
  clients: { id: string; name: string; lang: Lang }[]
  /** Clients whose Module 2 is submitted. */
  finishedModule2: string[]
  haveFacts: string[]
  /** Clients whose reading is on file with every stage run. */
  haveReading: string[]
  haveRound: string[]
}): Waiting[] {
  const done = new Set(input.finishedModule2)
  const withFacts = new Set(input.haveFacts)
  const withReading = new Set(input.haveReading)
  const withRound = new Set(input.haveRound)

  // What is still owed, earliest step first. A client is in the queue while
  // any of the three is missing — including someone who already has a round
  // but no reading, who would otherwise never be read at all.
  const owes = (id: string): Step | null => {
    if (!withFacts.has(id)) return 'facts'
    if (!withReading.has(id)) return 'reading'
    if (!withRound.has(id)) return 'questions'
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
 * them. Jingwen Du and Xilong Wang finished on 2026-09-17 and had nothing
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
  startBy: Record<Step, number>
}): Promise<{ done: Outcome[]; left: Waiting[] }> {
  const done: Outcome[] = []
  const passedOver = new Set<string>()
  let queue = await opts.waiting()

  for (;;) {
    const next = queue.find(w => !passedOver.has(w.clientId))
    if (!next) break
    if (done.length && opts.elapsed() > opts.startBy[next.needs]) break

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
