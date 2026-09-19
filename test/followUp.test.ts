import { describe, it, expect } from 'vitest'
import {
  ASKABLE_TYPES,
  askOf,
  CONFIDENCE_CHOICES,
  FollowUp,
  GAP_KINDS,
  JARGON,
  LADDER,
  MEMORY_CUES,
  gaps,
  toQuestion,
  vet,
  vetAll,
} from '@/lib/followUp'

const q = (over: Partial<FollowUp> = {}): FollowUp => ({
  id: 'fu01',
  label: 'What were you doing before you clocked in?',
  type: 'textarea',
  options: [],
  helpText: '',
  inTheirLanguage: null,
  rung: 2,
  resolves: { kind: 'open loop', ref: 'c1:f109' },
  whyItMatters: 'Establishes what the pre-shift task actually was.',
  askOnlyIf: null,
  ...over,
})

describe('the method, fixed in code', () => {
  it('is the corpus’s ten rungs, in order', () => {
    expect(LADDER).toHaveLength(10)
    expect(LADDER.map(l => l.rung)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(LADDER[0].key).toBe('threshold')
    expect(LADDER[9].key).toBe('confirmation')
  })

  it('reaches for things that exist when memory has to be reconstructed', () => {
    expect(MEMORY_CUES.join(' ')).toMatch(/group chat/i)
    expect(MEMORY_CUES.join(' ')).toMatch(/pay stub|payday/i)
  })

  it('always offers a way out of a number', () => {
    expect(CONFIDENCE_CHOICES).toContain('I am not sure')
    expect(CONFIDENCE_CHOICES).toContain('This is my best guess')
  })
})

describe('what keeps a question away from a client', () => {
  it('rejects a legal term and says what to write instead', () => {
    // The mechanism the whole layer turns on. Telling a model to write simply
    // is a hope; rejecting "meal period" is a guarantee.
    const problems = vet(q({ label: 'Were you given a meal period on that day?' }))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('meal period')
    expect(problems[0]).toContain('lunch break')
  })

  it('catches jargon hiding in the help text', () => {
    expect(vet(q({ helpText: 'This is about your regular rate.' }))).not.toEqual([])
  })

  it('covers the terms this system uses upstairs', () => {
    for (const term of ['premium', 'retaliation', 'wage statement', 'off the clock', 'willful']) {
      expect(Object.keys(JARGON), `${term} should be caught`).toContain(term)
    }
  })

  it('rejects two questions wearing one question mark', () => {
    expect(vet(q({ label: 'What time did you start? What time did you finish?' }))[0]).toContain(
      'more than one thing'
    )
  })

  it('rejects a double negative, which produces an unreadable answer', () => {
    // A worker answering "no" to "did you not get a break" has told the office
    // nothing at all, and the file records it as testimony.
    expect(vet(q({ label: 'Did you not get a break without asking first?' })).join(' ')).toContain(
      'double negative'
    )
  })

  it('rejects a choice with no way to say "I do not know"', () => {
    const forced = q({ type: 'select', options: ['Yes', 'No'] })
    expect(vet(forced).join(' ')).toContain('no way to say they do not know')
    const kind = q({ type: 'select', options: ['Yes', 'No', 'I am not sure'] })
    expect(vet(kind)).toEqual([])
  })

  it('accepts the safety valve in the language the client reads it in', () => {
    expect(vet(q({ type: 'select', options: ['네', '아니요', '잘 모르겠습니다'] }))).toEqual([])
  })

  it('rejects a choice with nothing to choose between', () => {
    expect(vet(q({ type: 'select', options: ['Yes'] })).join(' ')).toContain('nothing to choose')
  })

  it('rejects a question too long to read once', () => {
    expect(vet(q({ label: `Can you tell us ${'more '.repeat(30)}?` })).join(' ')).toContain('too long')
  })

  it('rejects an empty translation, which would show the client nothing', () => {
    const blank = q({ inTheirLanguage: { label: '   ', helpText: '', options: [] } })
    expect(vet(blank).join(' ')).toContain('empty translation')
  })

  it('passes a question written the way the corpus asks', () => {
    expect(vet(q())).toEqual([])
  })

  it('checks the closed sets here, where a bad value costs one question', () => {
    // These were enums in the output schema once. A single rung the model
    // spelled its own way failed the whole call and lost twenty good
    // questions with it. The provider enforces the schema; it cannot be
    // persuaded to drop one field and keep the rest — so the closed sets
    // moved here.
    expect(vet(q({ rung: 11 })).join(' ')).toContain('the ladder has ten')
    expect(vet(q({ type: 'slider' })).join(' ')).toContain('cannot render')
    expect(vet(q({ resolves: { kind: 'vibes', ref: 'x' } })).join(' ')).toContain('not a kind of gap')
    expect(vet(q({ resolves: { kind: 'open loop', ref: '  ' } })).join(' ')).toContain(
      'cannot be filed'
    )
    expect(ASKABLE_TYPES).toContain('textarea')
    expect(GAP_KINDS).toContain('date conflict')
  })

  it('renders an unknown type as free text rather than as nothing', () => {
    expect(toQuestion(q({ type: 'slider' }), 'en').type).toBe('textarea')
  })

  it('reports a whole set at once, listing only the questions with problems', () => {
    const out = vetAll({
      questions: [q(), q({ id: 'fu02', label: 'Did you get your premium?' })],
      leftOut: [],
    })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('fu02')
  })
})

describe('handing a question to the portal', () => {
  it('renders as an ordinary portal question, with the internals stripped', () => {
    const out = toQuestion(q({ type: 'select', options: ['Yes', 'No', 'I am not sure'] }), 'en')
    expect(out).toEqual({
      id: 'fu01',
      label: 'What were you doing before you clocked in?',
      type: 'select',
      required: false,
      options: ['Yes', 'No', 'I am not sure'],
    })
    expect(out).not.toHaveProperty('whyItMatters')
    expect(out).not.toHaveProperty('resolves')
  })

  it('puts the client’s language where the renderer looks for it', () => {
    const out = toQuestion(
      q({ inTheirLanguage: { label: '출근 기록 전에 무엇을 하셨나요?', helpText: '', options: [] } }),
      'ko'
    )
    expect(out.ko).toEqual({ label: '출근 기록 전에 무엇을 하셨나요?' })
    expect(out.es).toBeUndefined()
    // The English stays, because a reviewer who cannot read Korean still has
    // to be able to check what was sent.
    expect(out.label).toBe('What were you doing before you clocked in?')
  })

  it('carries a gate across as the portal’s own showIf', () => {
    const out = toQuestion(q({ askOnlyIf: { questionId: 'fu01', answers: ['Yes', 'Sometimes'] } }), 'en')
    expect(out.showIf).toEqual({ questionId: 'fu01', value: 'Yes', orValues: ['Sometimes'] })
  })
})

describe('the gaps handed to the engine', () => {
  it('are collected from the layers below, not worked out again', () => {
    const entries = [
      {
        id: 'c1:f001', proposition: 'She does not know her hourly rate.', verbatim: '모르겠어요',
        provenance: { kind: 'portal answer', pinpoint: 'hourly_rate', on: '' },
        period: '', actors: [], location: '', status: 'UNKNOWN' as const,
        confidenceBasis: '', corroboration: [], contrary: '', legalTags: [], damagesTags: ['rate'],
        openLoop: 'Hourly rate at hire and at each change — pay stubs.',
        addedBy: 'test', supersededBy: null, supersededWhy: null,
      },
    ]
    const findings = [
      {
        claimId: 'overtime', standing: 'gaps to close' as const,
        elements: [
          { key: 'regular-rate', state: 'unknown' as const, facts: [], reasoning: '', wouldSettleIt: 'A pay stub.' },
        ],
        defense: '', adverse: [], damagesInputs: [], damagesMissing: ['the hourly rate'],
      },
    ]
    const g = gaps(entries, findings, null)
    expect(g.openLoops).toEqual([{ factId: 'c1:f001', need: 'Hourly rate at hire and at each change — pay stubs.' }])
    expect(g.elements).toEqual([
      { claimId: 'overtime', element: 'regular-rate', state: 'unknown', need: 'A pay stub.' },
    ])
    expect(g.damagesMissing).toEqual([{ claimId: 'overtime', need: 'the hourly rate' }])
    expect(g.unsettledFacts[0].status).toBe('UNKNOWN')
    // No spine yet is not an error — the engine runs on whatever exists.
    expect(g.silences).toEqual([])
  })
})

describe('measuring the question and not the run-up to it', () => {
  it('finds the ask at the end, after the restatement', () => {
    expect(
      askOf('Earlier you said the break was 30 minutes. You also said someone spoke to you. Did both happen?')
    ).toBe('Did both happen?')
    expect(askOf('What time did you start?')).toBe('What time did you start?')
  })

  it('lets a contradiction check restate two answers, because it has to', () => {
    // The corpus's own rung-8 template is "Earlier you said X; this sounds
    // like Y. Which is closer, or did both happen at different times?" — long
    // by construction. Measuring the whole label flagged every properly
    // written one of these in the first real set.
    const real = q({
      rung: 8,
      type: 'select',
      options: ['Both happened, on different days', 'The first one is closer', 'I am not sure'],
      label:
        'Earlier you said you had a full 30 minutes free to eat, and you also said that a boss ' +
        'or coworker asked you a work question while you were eating. Did both of those happen, ' +
        'maybe on different days?',
    })
    expect(vet(real)).toEqual([])
  })

  it('does not read her own words back as a double negative', () => {
    // "you do not think the restaurant still owes you money" is a quotation of
    // her answer. The question after it is fine.
    const real = q({
      rung: 8,
      type: 'select',
      options: ['I am still owed for those hours', 'I am not owed anything', 'I am not sure'],
      label:
        'Earlier you said you do not think the restaurant still owes you any money. You also ' +
        'said the two hours of tip work were never paid. Which of these is closest to what you meant?',
    })
    expect(vet(real)).toEqual([])
  })

  it('still catches a genuinely compound ask', () => {
    expect(
      vet(q({ type: 'select', options: ['a', 'b', 'not sure'], label: 'Who was there and what did they say?' })).join(' ')
    ).toContain('two things at once')
  })

  it('lets a narrative prompt name what to cover, and holds a choice to one idea', () => {
    // "Tell us about that day: what time you arrived, and what you did first"
    // is the corpus's concrete-reconstruction rung, not a compound question.
    const story = q({ type: 'textarea', label: 'Tell us about that day. What time did you get there, and what did you do first?' })
    expect(vet(story)).toEqual([])
  })

  it('still refuses a paragraph', () => {
    expect(vet(q({ label: `${'Some setup. '.repeat(30)}What happened?` })).join(' ')).toContain(
      'a paragraph, not a question'
    )
  })
})
