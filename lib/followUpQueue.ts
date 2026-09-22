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
