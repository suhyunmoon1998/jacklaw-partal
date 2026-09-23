import { describe, it, expect } from 'vitest'
import { readingSectionDone } from '@/lib/modules'

/**
 * The office reads Module 1 and Module 2 as one numbered run of sections, but
 * the client's record keeps a completed list per module, each counting from
 * zero. Checking a Module 2 row by its combined number against Module 1's list
 * is what drew every Module 2 section "In Progress" for a client whose own
 * record said m2_submitted — with "Submitted · 100%" in the header above it.
 */
describe('a section of the office reading', () => {
  const M1_ROWS = 10
  const doneM1 = { submitted: true, completedSections: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }
  const doneM2 = { submitted: true, completedSections: [0, 1, 2, 3, 4, 5, 6, 7] }

  it('counts a finished Module 2 section as done, not in progress', () => {
    // Rows 10–17 are Module 2's 0–7. This is the case that was wrong.
    for (let idx = M1_ROWS; idx < M1_ROWS + 8; idx++) {
      expect(readingSectionDone(idx, M1_ROWS, doneM1, doneM2)).toBe(true)
    }
  })

  it('still reads Module 1 rows off Module 1', () => {
    for (let idx = 0; idx < M1_ROWS; idx++) {
      expect(readingSectionDone(idx, M1_ROWS, doneM1, doneM2)).toBe(true)
    }
  })

  it('does not let one module answer for the other', () => {
    const m1Only = { submitted: true, completedSections: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }
    const m2None = { submitted: false, completedSections: [] }
    expect(readingSectionDone(0, M1_ROWS, m1Only, m2None)).toBe(true)
    // Module 1 being finished says nothing about Module 2's first section.
    expect(readingSectionDone(M1_ROWS, M1_ROWS, m1Only, m2None)).toBe(false)
  })

  it('reads a half-finished Module 2 section by section', () => {
    const partly = { submitted: false, completedSections: [0, 2] }
    const m1 = { submitted: true, completedSections: [] }
    expect(readingSectionDone(M1_ROWS + 0, M1_ROWS, m1, partly)).toBe(true)
    expect(readingSectionDone(M1_ROWS + 1, M1_ROWS, m1, partly)).toBe(false)
    expect(readingSectionDone(M1_ROWS + 2, M1_ROWS, m1, partly)).toBe(true)
  })

  it('trusts a submission over the index list it carries', () => {
    // Sections added since they answered carry indices no older row can hold,
    // so the arithmetic under-reports a questionnaire they actually finished.
    const submittedOldVersion = { submitted: true, completedSections: [0, 1] }
    const none = { submitted: false, completedSections: [] }
    expect(readingSectionDone(9, M1_ROWS, submittedOldVersion, none)).toBe(true)
    expect(readingSectionDone(M1_ROWS + 3, M1_ROWS, none, submittedOldVersion)).toBe(true)
  })

  it('reads a record written before Module 2 existed as unfinished, not done', () => {
    const m1 = { submitted: true, completedSections: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }
    const missing = { submitted: false, completedSections: [] }
    expect(readingSectionDone(M1_ROWS, M1_ROWS, m1, missing)).toBe(false)
  })
})
