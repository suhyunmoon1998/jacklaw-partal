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

export interface Waiting {
  clientId: string
  name: string
  lang: Lang
  /** What this client needs next. One per run. */
  needs: 'facts' | 'questions'
}

export function whoIsWaiting(input: {
  clients: { id: string; name: string; lang: Lang }[]
  /** Clients whose Module 2 is submitted. */
  finishedModule2: string[]
  haveFacts: string[]
  haveRound: string[]
}): Waiting[] {
  const done = new Set(input.finishedModule2)
  const withFacts = new Set(input.haveFacts)
  const withRound = new Set(input.haveRound)

  const out = input.clients
    // Module 2 and not Module 1: the second module is where the meal breaks,
    // the unpaid time and the retaliation are asked about, and a round written
    // before those answers exist would ask about the half of the case nobody
    // has described yet.
    .filter(c => done.has(c.id) && !withRound.has(c.id))
    .map(c => ({
      clientId: c.id,
      name: c.name,
      lang: c.lang,
      needs: (withFacts.has(c.id) ? 'questions' : 'facts') as Waiting['needs'],
    }))

  // Whoever is furthest along goes first, so a client one step from a round
  // gets it tonight rather than queueing behind somebody else's extraction.
  return out.sort((a, b) => Number(b.needs === 'questions') - Number(a.needs === 'questions'))
}
