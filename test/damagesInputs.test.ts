import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * The damages inputs (lib/damagesInputs*.ts): the numbers Eleanor's FACTS /
 * DAMAGES screen multiplies out. What is tested is that nothing unsupported
 * stands as more than an AI proposal, nothing out of range is used, every input
 * is listed even when missing, applicability never becomes a legal conclusion,
 * and the stage sends no law text — it is a fact stage.
 */

const requests: Record<string, unknown>[] = []
let reply: unknown = null

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: (request: Record<string, unknown>) => {
        requests.push(request)
        return { finalMessage: async () => ({ stop_reason: 'end_turn', parsed_output: reply }) }
      },
    }
  },
}))

import { INPUT_KEYS, vetDamagesInputs, type DamagesInputs } from '@/lib/damagesInputsShape'
import { INPUTS_SYSTEM, runDamagesInputs } from '@/lib/damagesInputs'
import { LEGAL_SOURCE } from '@/lib/caLaw'

const quote = (text: string) => ({ source: 'Wage & Hour answers', question: 'How often?', quote: text })
const item = (key: string, value: number | null, extra: Partial<DamagesInputs['inputs'][number]> = {}) => ({
  key, value, shown: value === null ? '' : String(value), confidence: 'medium', standing: 'Client estimate',
  basis: 'Synthetic.', support: [quote('about three times a week')], alternatives: [], chosenBecause: '', missing: '', question: '', ...extra,
})
const raw = (inputs: DamagesInputs['inputs'], extra: Partial<DamagesInputs> = {}): DamagesInputs => ({
  period: { start: '2024-01-08', end: '2026-03-06', how: 'Synthetic.' }, inputs, applicability: [], attorneyValuation: [], ...extra,
})

describe('vetting what the model returned', () => {
  it('lists every input once, in order, and drops what it does not know', () => {
    const vetted = vetDamagesInputs(raw([item('weeks', 113), item('bogus', 5), item('weeks', 99), item('hourlyRate', 22)]))
    expect(vetted.inputs.map(i => i.key)).toEqual([...INPUT_KEYS])
    expect(vetted.inputs[0].value).toBe(113)
    const missing = vetted.inputs.find(i => i.key === 'overtimeRate')!
    expect(missing).toMatchObject({ value: null, shown: 'Not established', standing: 'Missing information', confidence: 'LOW' })
  })

  it('a number with no quote behind it stands only as a LOW AI proposal', () => {
    const vetted = vetDamagesInputs(raw([item('mealViolationsPerWeek', 3, { support: [], confidence: 'HIGH', standing: 'Document-confirmed' })]))
    expect(vetted.inputs.find(i => i.key === 'mealViolationsPerWeek')).toMatchObject({ value: 3, confidence: 'LOW', standing: 'AI proposed' })
  })

  it('an implausible value is not used, and says so; it is never clamped', () => {
    const vetted = vetDamagesInputs(raw([item('waitingTimeDays', 45), item('hourlyRate', -1)]))
    const days = vetted.inputs.find(i => i.key === 'waitingTimeDays')!
    expect(days.value).toBeNull()
    expect(days.missing).toMatch(/outside what is plausible/)
    expect(vetted.inputs.find(i => i.key === 'hourlyRate')!.value).toBeNull()
  })

  it('keeps conflicting values as alternatives, not as the answer', () => {
    const vetted = vetDamagesInputs(raw([item('mealViolationsPerWeek', 3, {
      alternatives: [{ value: 4.5, shown: '4-5 violations/week', support: [quote('like 4 or 5 days')] }, { value: 3, shown: 'same', support: [] }],
      chosenBecause: 'The more conservative supported estimate.',
    })]))
    const meal = vetted.inputs.find(i => i.key === 'mealViolationsPerWeek')!
    expect(meal.value).toBe(3)
    expect(meal.alternatives.map(a => a.value)).toEqual([4.5])
  })

  it('applicability is only ever "potentially applicable" or "not raised"', () => {
    const vetted = vetDamagesInputs(raw([], { applicability: [
      { category: 'Waiting-time penalties', status: 'Applies — willful', why: 'Final pay late.' },
      { category: 'Wage statements', status: 'Not raised', why: '' },
    ] }))
    expect(vetted.applicability.map(a => a.status)).toEqual([
      'Potentially applicable — attorney review required',
      'Not raised by the answers',
    ])
  })
})

describe('the inputs stage', () => {
  beforeEach(() => {
    requests.length = 0
    process.env.ANTHROPIC_API_KEY = 'test'
  })

  const input = {
    clientName: 'Synthetic Client', caseType: 'Wage & Hour', caseName: '', documents: [],
    answers: {},
    // Follow-up rows count as answered, without depending on questionnaire ids.
    sets: [{ title: 'Synthetic follow-up', rows: Array.from({ length: 10 }, (_, n) => ({ id: `r${n}`, label: `Question ${n}?`, answer: `about ${n} times a week` })) }],
  }
  const stored = {
    overview: { summary: 's', baseline: [{ label: 'Rate', value: '$22/hour', basis: 'FACT' as const }], limitationsAnchor: 'a' },
    findings: { issues: [], notRaised: [] },
  }

  it('sends no law text, and returns the vetted inputs', async () => {
    reply = raw([item('weeks', 113)])
    const result = await runDamagesInputs(input, stored)
    expect(result.inputs.find(i => i.key === 'weeks')!.value).toBe(113)
    const request = requests[0] as { system: string; messages: { content: string }[] }
    expect(request.system).toBe(INPUTS_SYSTEM)
    expect(request.system).not.toContain(LEGAL_SOURCE.slice(0, 200))
    expect(request.messages[0].content).toContain('Rate: $22/hour (FACT)')
    expect(INPUTS_SYSTEM).toMatch(/NEVER INVENT A NUMBER/)
    expect(INPUTS_SYSTEM).toMatch(/APPLICABILITY IS NOT YOURS TO DECIDE/)
  })

  it('will not run before the reading it agrees with exists', async () => {
    await expect(runDamagesInputs(input, {})).rejects.toThrow(/has not been run yet/)
    expect(requests).toHaveLength(0)
  })
})
