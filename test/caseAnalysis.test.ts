import { describe, it, expect } from 'vitest'
import { analysisFingerprint, buildTranscript, AnalysisInput, MIN_ANSWERS } from '@/lib/caseAnalysis'
import { DAMAGES_SOURCE, LAW_VERSION, LEGAL_SOURCE, STATUTORY_MAP } from '@/lib/caLaw'

const input = (over: Partial<AnalysisInput> = {}): AnalysisInput => ({
  clientName: 'Test Client',
  caseType: 'Wage & Hour',
  caseName: '350 atelier',
  answers: {},
  documents: [],
  ...over,
})

describe('the law the reading is grounded on', () => {
  it('carries the office methodology whole, not a summary of it', () => {
    // The section headings the analysis is told to follow. If the document is
    // ever replaced by a paraphrase these go, and the prompt starts asking for
    // structure that is no longer defined anywhere.
    for (const heading of [
      '# 1. CORE DAMAGES INPUTS',
      '# 19. SHOW THE MATH',
      '# 20. DOUBLE-COUNTING CHECK',
      '# 22. MISSING FACTS',
      '# 24. GOVERNING PRINCIPLE',
    ]) {
      expect(DAMAGES_SOURCE).toContain(heading)
    }
    expect(DAMAGES_SOURCE).toContain('Do not silently invent missing facts.')
  })

  it('names the provisions an issue has to cite', () => {
    for (const cite of [
      'Lab. Code sec. 510',
      'Lab. Code sec. 512',
      'Lab. Code sec. 226.7',
      'Lab. Code sec. 2802',
      'Brinker',
      'Augustus',
      'Ferra',
      'Naranjo',
      'Troester',
    ]) {
      expect(STATUTORY_MAP).toContain(cite)
    }
  })

  it('leaves figures that go out of date to be confirmed rather than stating them', () => {
    // A minimum wage or a PAGA split hard-coded here would keep being cited
    // long after it changed, which is worse in a case file than a named gap.
    // Wrapped across lines in the source, so compare on collapsed whitespace.
    const flat = STATUTORY_MAP.replace(/\s+/g, ' ')
    expect(flat).toContain('CONFIRM the rate for each period and location')
    expect(flat).toContain('CONFIRM the current structure and allocation')
  })

  it('sends both halves to the model', () => {
    expect(LEGAL_SOURCE).toContain(DAMAGES_SOURCE)
    expect(LEGAL_SOURCE).toContain(STATUTORY_MAP)
  })
})

describe('the transcript the model reads', () => {
  it('pairs each question with what was chosen, and skips what was not', () => {
    const { text, answered } = buildTranscript(
      input({ answers: { m2_meal_given: 'No', m2_rest_given: '' } })
    )
    expect(answered).toBe(1)
    expect(text).toContain('ANSWER: No')
    expect(text).not.toContain('ANSWER: \n')
  })

  it('writes a multi-select as the several things they picked', () => {
    const { text } = buildTranscript(
      input({ answers: { m2_spoke_up: ['Unpaid overtime', 'Missed breaks'] } })
    )
    expect(text).toContain('Unpaid overtime; Missed breaks')
  })

  it('leaves out an answer the client took back by changing an earlier one', () => {
    // m2_rest_count is only asked of someone who says a rest break happened.
    // Someone who says it did not has no count to stand behind, and a reading
    // that files one anyway is reading a fact that is not there.
    const { text } = buildTranscript(
      input({ answers: { m2_rest_given: 'No', m2_rest_count: '2' } })
    )
    expect(text).toContain('ANSWER: No')
    expect(text).not.toContain('ANSWER: 2')
  })
})

describe('knowing when a stored reading is out of date', () => {
  it('is stable for the same answers in a different order', () => {
    const a = analysisFingerprint(input({ answers: { b: '2', a: '1' } }))
    const b = analysisFingerprint(input({ answers: { a: '1', b: '2' } }))
    expect(a).toBe(b)
  })

  it('moves when the client answers something new', () => {
    const before = analysisFingerprint(input({ answers: { a: '1' } }))
    const after = analysisFingerprint(input({ answers: { a: '1', b: '2' } }))
    expect(after).not.toBe(before)
  })

  it('moves when an answer changes', () => {
    const before = analysisFingerprint(input({ answers: { a: 'Yes' } }))
    const after = analysisFingerprint(input({ answers: { a: 'No' } }))
    expect(after).not.toBe(before)
  })

  it('moves when a document arrives', () => {
    const before = analysisFingerprint(input())
    const after = analysisFingerprint(input({ documents: ['paystub.pdf'] }))
    expect(after).not.toBe(before)
  })

  it('does not move when the same documents are listed in a different order', () => {
    const a = analysisFingerprint(input({ documents: ['b.pdf', 'a.pdf'] }))
    const b = analysisFingerprint(input({ documents: ['a.pdf', 'b.pdf'] }))
    expect(a).toBe(b)
  })

  it('is versioned on the law, so editing it marks every stored reading stale', () => {
    expect(LAW_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/)
    expect(analysisFingerprint(input())).toHaveLength(32)
  })
})

describe('the floor below which there is nothing to read', () => {
  it('is low enough to admit a part-finished questionnaire', () => {
    expect(MIN_ANSWERS).toBeGreaterThan(0)
    expect(MIN_ANSWERS).toBeLessThan(20)
  })
})
