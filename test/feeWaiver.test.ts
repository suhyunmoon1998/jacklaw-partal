import { describe, expect, it } from 'vitest'
import {
  FEE_WAIVER_QUESTIONS,
  FEE_WAIVER_SET_NAMES,
  IncomeTable,
  feeWaiverVerdict,
  incomeLimit,
  readFeeWaiverAnswers,
} from '@/lib/feeWaiver'
import { normalizeQuestions } from '@/lib/questionSets'
import { isVisible, localize } from '@/lib/questionLogic'
import { TRANSLATED_LANGS } from '@/lib/langs'

describe('the fee waiver questions', () => {
  const saved = normalizeQuestions(FEE_WAIVER_QUESTIONS)

  it('survive being saved as a question set, gates and translations included', () => {
    expect(saved.map(q => q.id)).toEqual(['fw_benefits', 'fw_household_income', 'fw_household_size'])
    expect(saved[1].showIf).toEqual({ questionId: 'fw_benefits', value: 'no', orValues: ['not_sure'] })
    expect(saved[2].showIf).toEqual(saved[1].showIf)
    for (const q of saved) for (const lang of TRANSLATED_LANGS) expect(q[lang]?.label, `${q.id} ${lang}`).toBeTruthy()
    expect(saved[2].es?.options).toHaveLength(saved[2].options!.length)
    expect(saved[2].zh?.options).toHaveLength(saved[2].options!.length)
    expect(saved[2].ko?.options).toHaveLength(saved[2].options!.length)
    for (const lang of TRANSLATED_LANGS) expect(FEE_WAIVER_SET_NAMES[lang]).toBeTruthy()
  })

  it('read in Spanish as the office wrote them', () => {
    expect(localize(saved[0], 'es').label).toBe('¿Recibe ayuda del gobierno, como estampillas de comida, Medi-Cal, SSI o ayuda en efectivo?')
    expect(localize(saved[2], 'es').label).toBe('¿Cuántas personas viven en su casa?')
    expect(localize(saved[2], 'es').optionLabels?.at(-1)).toBe('Más de 10')
  })

  it('ask about income only of a client not on benefits, or not sure', () => {
    expect(isVisible(saved[1], { fw_benefits: 'yes' })).toBe(false)
    expect(isVisible(saved[1], { fw_benefits: 'no' })).toBe(true)
    expect(isVisible(saved[2], { fw_benefits: 'not_sure' })).toBe(true)
    expect(isVisible(saved[1], {})).toBe(false)
  })
})

describe('what the answers come to', () => {
  const table: IncomeTable = { effective: 'test', monthly: [1000, 2000, 3000], eachAdditional: 500 }
  const verdict = (answers: Record<string, string>, t: IncomeTable | null = table) => feeWaiverVerdict(readFeeWaiverAnswers(answers), t)

  it('qualifies anyone on benefits without asking more', () => {
    expect(verdict({ fw_benefits: 'yes' }, null)).toEqual({ kind: 'benefits' })
  })

  it('waits for all three answers', () => {
    expect(verdict({})).toEqual({ kind: 'waiting' })
    expect(verdict({ fw_benefits: 'no', fw_household_income: '900' })).toEqual({ kind: 'waiting' })
  })

  it('gives no income verdict before the office enters the table', () => {
    expect(verdict({ fw_benefits: 'no', fw_household_income: '900', fw_household_size: '1' }, null)).toEqual({ kind: 'no-table' })
  })

  it('compares income with the figure for the household, strictly under', () => {
    expect(verdict({ fw_benefits: 'no', fw_household_income: '1,999.50', fw_household_size: '2' })).toEqual({ kind: 'under', limit: 2000, size: 2 })
    expect(verdict({ fw_benefits: 'not_sure', fw_household_income: '2000', fw_household_size: '2' })).toEqual({ kind: 'over', limit: 2000, size: 2 })
  })

  it('adds the per-person figure past the end of the list', () => {
    expect(incomeLimit(table, 5)).toBe(4000)
  })

  it('leaves a household too large to count to a person', () => {
    expect(verdict({ fw_benefits: 'no', fw_household_income: '100', fw_household_size: 'More than 10' })).toEqual({ kind: 'check' })
  })
})
