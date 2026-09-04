/**
 * What the admin list says a client has done.
 *
 * The case that prompted this: two Chinese-speaking clients were added so a
 * pasted question set could be sent to them. Both finished it — 35 and 36
 * answers — and the office got the email saying so. The list showed them as
 * "Not Started · 0%", because it was reading the onboarding questionnaire,
 * which neither had been asked to fill in.
 */

import { describe, expect, it } from 'vitest'
import { ClientWork, clientProgressPercent, clientStatus } from '@/lib/clientProgress'

const work = (over: Partial<ClientWork> = {}): ClientWork => ({
  questionnaire: { submitted: false, completedSections: [] },
  assignments: { total: 0, completed: 0 },
  ...over,
})

describe('a client who was only ever sent a question set', () => {
  // Jingwen Du and Xilong Wang, 2026-09-04.
  const finishedTheSet = work({ assignments: { total: 1, completed: 1 } })

  it('is not called "Not Started" once they have finished it', () => {
    expect(clientStatus(finishedTheSet)).toBe('sets_done')
    expect(clientStatus(finishedTheSet)).not.toBe('not_started')
  })

  it('does not read 0%', () => {
    expect(clientProgressPercent(finishedTheSet)).toBeGreaterThan(0)
    // One of the two things on their file is done: the set, not the onboarding.
    expect(clientProgressPercent(finishedTheSet)).toBe(50)
  })

  it('reads as sent, not as untouched, while it is still open', () => {
    const sent = work({ assignments: { total: 1, completed: 0 } })
    expect(clientStatus(sent)).toBe('sets_sent')
    expect(clientProgressPercent(sent)).toBe(0)
  })

  it('counts part of the way through several sets as in progress', () => {
    const partly = work({ assignments: { total: 3, completed: 1 } })
    expect(clientStatus(partly)).toBe('in_progress')
    expect(clientProgressPercent(partly)).toBe(25)
  })
})

describe('a client who has done everything', () => {
  it('reads 100% only when the questionnaire and every set are finished', () => {
    const all = work({
      questionnaire: { submitted: true, completedSections: [0, 1] },
      assignments: { total: 2, completed: 2 },
    })
    expect(clientProgressPercent(all)).toBe(100)
    expect(clientStatus(all)).toBe('submitted')

    const questionnaireOnly = work({
      questionnaire: { submitted: true, completedSections: [0] },
      assignments: { total: 1, completed: 0 },
    })
    expect(clientProgressPercent(questionnaireOnly)).toBe(50)
  })
})

describe('a client with nothing but the onboarding questionnaire', () => {
  it('behaves as it always did', () => {
    expect(clientStatus(work())).toBe('not_started')
    expect(clientProgressPercent(work())).toBe(0)

    const started = work({ questionnaire: { submitted: false, completedSections: [0, 1, 2] } })
    expect(clientStatus(started)).toBe('in_progress')

    const done = work({ questionnaire: { submitted: true, completedSections: [0] } })
    expect(clientStatus(done)).toBe('submitted')
    expect(clientProgressPercent(done)).toBe(100)
  })

  it('never reports more than 100, whatever a stale section history says', () => {
    // The 20-section questionnaire left indices the 10-section one does not have.
    const stale = work({
      questionnaire: { submitted: true, completedSections: Array.from({ length: 19 }, (_, i) => i) },
    })
    expect(clientProgressPercent(stale)).toBe(100)
  })
})

describe('drafts', () => {
  it('are not counted, because they were never shown to anyone', () => {
    // The API filters them out before this sees them; this documents the contract.
    const onlyReleased = work({ assignments: { total: 0, completed: 0 } })
    expect(clientProgressPercent(onlyReleased)).toBe(0)
    expect(clientStatus(onlyReleased)).toBe('not_started')
  })
})
