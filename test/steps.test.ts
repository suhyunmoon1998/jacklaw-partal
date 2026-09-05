/**
 * Which step a client is on.
 *
 * The case that prompted this: the office sent Module 1 to david0test as a
 * test, and nothing on that client's screen changed — because the Module 1 card
 * was drawn for everyone whether or not it had been sent, while Module 2 was
 * drawn only if it had. Two modules, one screen, two different rules, and no
 * way for the office to see that a send had landed.
 *
 * The rule these tests hold is the narrow one: a step opens when the office has
 * sent it and every step they sent BEFORE it is submitted. Steps that were never
 * sent are not prerequisites, because nobody ever asked this client to do them.
 */

import { describe, expect, it } from 'vitest'
import { ModuleId } from '@/lib/modules'
import {
  ModuleProgress,
  ModuleSend,
  StepView,
  allSentStepsDone,
  currentStep,
  overallPercent,
  stepViews,
  unseenStep,
  visibleSteps,
} from '@/lib/moduleSteps'

const SENT = '2026-09-05T17:50:23Z'

const sent = (openedAt: string | null = null): ModuleSend => ({ sentAt: SENT, openedAt })

const progress = (over: Partial<ModuleProgress> = {}): ModuleProgress => ({
  submitted: false,
  completedSections: [],
  totalSections: 10,
  ...over,
})

const done = progress({ submitted: true, completedSections: [0, 1, 2] })

const at = (views: StepView[], id: ModuleId) => views.find(v => v.id === id)!

describe('every client on the books today', () => {
  // All sixteen have a module1 row; nobody has been sent module2 yet.
  const views = stepViews({ module1: sent() }, { module1: progress() })

  it('is on step 1, and it is open to them', () => {
    expect(at(views, 'module1').state).toBe('open')
    expect(currentStep(views)?.id).toBe('module1')
  })

  it('is not shown step 2 as something they can start', () => {
    expect(at(views, 'module2').state).toBe('unsent')
  })

  it('sees three steps, because the office sends three', () => {
    expect(views.map(v => v.step)).toEqual([1, 2, 3])
  })

  it('is not promised step 3 can be opened, since it has no questions yet', () => {
    expect(at(views, 'module3').built).toBe(false)
    expect(at(views, 'module3').state).toBe('unsent')
  })
})

describe('the six clients who already submitted their intake', () => {
  const views = stepViews({ module1: sent() }, { module1: progress({ submitted: true }) })

  it('reads as done, not as something still owed', () => {
    expect(at(views, 'module1').state).toBe('done')
    expect(at(views, 'module1').percent).toBe(100)
  })

  it('leaves nothing open until the office sends the next one', () => {
    expect(currentStep(views)).toBeNull()
    expect(allSentStepsDone(views)).toBe(true)
  })
})

describe('a step the office has sent and the client has never opened', () => {
  // david0test, 2026-09-05: sent by admin, opened_at still null.
  const views = stepViews({ module1: sent(null) }, { module1: progress() })

  it('is announced as new', () => {
    expect(at(views, 'module1').isNew).toBe(true)
    expect(unseenStep(views)?.id).toBe('module1')
  })

  it('stops being new once they have been in, on any device', () => {
    const opened = stepViews({ module1: sent('2026-09-05T18:00:00Z') }, { module1: progress() })
    expect(at(opened, 'module1').isNew).toBe(false)
    expect(unseenStep(opened)).toBeNull()
  })

  it('is never announced while it is still locked behind an earlier step', () => {
    const both = stepViews(
      { module1: sent(), module2: sent(null) },
      { module1: progress(), module2: progress({ totalSections: 6 }) }
    )
    expect(at(both, 'module2').state).toBe('waiting')
    expect(at(both, 'module2').isNew).toBe(false)
    expect(unseenStep(both)?.id).toBe('module1')
  })
})

describe('one at a time', () => {
  const views = stepViews(
    { module1: sent(), module2: sent() },
    { module1: progress({ completedSections: [0, 1] }), module2: progress({ totalSections: 6 }) }
  )

  it('holds step 2 shut while step 1 is unfinished', () => {
    expect(at(views, 'module2').state).toBe('waiting')
    expect(at(views, 'module2').blockedBy).toBe(1)
  })

  it('leaves exactly one step open', () => {
    expect(views.filter(v => v.state === 'open')).toHaveLength(1)
    expect(currentStep(views)?.id).toBe('module1')
  })

  it('opens step 2 the moment step 1 is submitted', () => {
    const after = stepViews(
      { module1: sent(), module2: sent() },
      { module1: done, module2: progress({ totalSections: 6 }) }
    )
    expect(at(after, 'module2').state).toBe('open')
    expect(at(after, 'module2').blockedBy).toBeNull()
    expect(currentStep(after)?.id).toBe('module2')
  })
})

describe('an order that would otherwise be a trap', () => {
  it('opens step 2 for a client who was only ever sent step 2', () => {
    // The office can hand out a module on its own. A step nobody was asked to
    // do cannot be the reason they are stuck on the one they were asked to do.
    const views = stepViews({ module2: sent() }, { module2: progress({ totalSections: 6 }) })
    expect(at(views, 'module1').state).toBe('unsent')
    expect(at(views, 'module2').state).toBe('open')
    expect(currentStep(views)?.id).toBe('module2')
  })

  it('never takes a submitted questionnaire away from the client who filled it', () => {
    // Six clients answered the intake before any of this existed. A missing
    // send row is a gap in our bookkeeping, not grounds to hide their answers.
    const views = stepViews({}, { module1: progress({ submitted: true }) })
    expect(at(views, 'module1').state).toBe('done')
  })
})

describe('progress carried over from an older questionnaire', () => {
  it('does not read past 100%', () => {
    // Flora Sanchez-Adame and Roberto Paco Garcia hold twenty section indices
    // from the version before Module 1 cut it to ten.
    const legacy = progress({ completedSections: Array.from({ length: 20 }, (_, i) => i) })
    const views = stepViews({ module1: sent() }, { module1: legacy })
    expect(at(views, 'module1').percent).toBeLessThanOrEqual(100)
  })
})

describe('a client with nothing on file at all', () => {
  const views = stepViews({}, {})

  it('is shown three steps, none of them open', () => {
    expect(views).toHaveLength(3)
    expect(currentStep(views)).toBeNull()
    expect(views.every(v => v.state === 'unsent')).toBe(true)
  })

  it('is not told they are all caught up, because they have finished nothing', () => {
    expect(allSentStepsDone(views)).toBe(false)
  })
})

describe('a step sent a second time', () => {
  // The office nudges when the first send went unanswered. That nudge has to be
  // announceable without erasing the date they are looking at when they ask
  // "has this client ever been in?".
  const opened = '2026-09-05T18:00:00Z'
  const resent = '2026-09-08T09:00:00Z'

  it('reads as unread again without losing when they last opened it', () => {
    const views = stepViews(
      { module1: { sentAt: resent, openedAt: opened } },
      { module1: progress() }
    )
    expect(at(views, 'module1').isNew).toBe(true)
    expect(at(views, 'module1').openedAt).toBe(opened)
  })

  it('is not called unread when the opening came after the send', () => {
    const views = stepViews(
      { module1: { sentAt: SENT, openedAt: opened } },
      { module1: progress() }
    )
    expect(at(views, 'module1').isNew).toBe(false)
  })

  it('compares the two as instants, not as strings', () => {
    // Postgres hands back "2026-09-05 17:50:23.661+00"; the browser writes
    // "2026-09-05T18:00:00.000Z". Sorted as text the space beats the T and the
    // client is told a step they opened ten minutes ago is new.
    const views = stepViews(
      { module1: { sentAt: '2026-09-05 17:50:23.661+00', openedAt: '2026-09-05T18:00:00.000Z' } },
      { module1: progress() }
    )
    expect(at(views, 'module1').isNew).toBe(false)
  })
})

describe('a client who answered everything and never pressed Submit', () => {
  // Ester, since 30 July: nineteen section indices from the old questionnaire
  // and submitted still false.
  const views = stepViews(
    { module1: sent() },
    { module1: progress({ completedSections: Array.from({ length: 19 }, (_, i) => i) }) }
  )

  it('is not shown a full bar over an unfinished step', () => {
    expect(at(views, 'module1').percent).toBeLessThan(100)
  })

  it('is told what is actually left to do', () => {
    expect(at(views, 'module1').finishedNotSubmitted).toBe(true)
    expect(at(views, 'module1').state).toBe('open')
  })

  it('does not have a submitted step reported as merely in progress', () => {
    const real = stepViews({ module1: sent() }, { module1: done })
    expect(at(real, 'module1').percent).toBe(100)
    expect(at(real, 'module1').finishedNotSubmitted).toBe(false)
  })
})

describe('what the client is actually shown', () => {
  it('hides a step that has no questions written for it', () => {
    // "Step 3 of 3" would promise a questionnaire the firm cannot deliver and
    // cannot date. It stays in the admin panel, where "Not built yet" is a fact
    // about our work rather than a commitment to a client.
    const views = stepViews({ module1: sent() }, { module1: progress() })
    expect(visibleSteps(views).map(v => v.id)).toEqual(['module1', 'module2'])
    expect(visibleSteps(views).some(v => v.id === 'module3')).toBe(false)
  })

  it('shows an unbuilt step anyway if this client somehow has it', () => {
    const views = stepViews({ module3: sent() }, {})
    expect(visibleSteps(views).some(v => v.id === 'module3')).toBe(true)
  })
})

describe('the number on the case card', () => {
  it('does not call a client finished while a step is still open', () => {
    // The old card read Module 1 alone: "✓ Submitted · 100%", in green,
    // directly above a Step 2 they had not started.
    const views = stepViews(
      { module1: sent(), module2: sent() },
      { module1: done, module2: progress({ totalSections: 6 }) }
    )
    expect(allSentStepsDone(views)).toBe(false)
    expect(overallPercent(views)).toBeLessThan(100)
    expect(overallPercent(views)).toBe(50)
  })

  it('counts only the steps this client was actually asked to do', () => {
    const views = stepViews({ module1: sent() }, { module1: done })
    expect(overallPercent(views)).toBe(100)
  })

  it('is zero, not undefined, for a client with nothing on file', () => {
    expect(overallPercent(stepViews({}, {}))).toBe(0)
  })
})

describe('taking a step back', () => {
  it('closes it again, so a mis-send can be undone', () => {
    // Deleting the row is the whole mechanism. If a missing row were quietly
    // treated as a grant — say, to protect the intake against a failed insert —
    // Unsend would do nothing and the office would have no remedy at all.
    const views = stepViews({}, { module1: progress() })
    expect(at(views, 'module1').granted).toBe(false)
    expect(at(views, 'module1').state).toBe('unsent')
  })

  it('unblocks a later step the client was already given', () => {
    // Step 1 unsent, Step 2 sent: Step 2 opens. This is the office's way out
    // for a client who will never finish the intake.
    const views = stepViews({ module2: sent() }, { module1: progress(), module2: progress({ totalSections: 6 }) })
    expect(at(views, 'module2').state).toBe('open')
  })

  it('leaves a submitted step readable even with the row gone', () => {
    const views = stepViews({}, { module1: done })
    expect(at(views, 'module1').state).toBe('done')
  })
})
