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
import { LANGUAGES, TRANSLATED_LANGS } from '@/lib/langs'
import { invitationSms } from '@/lib/assignmentInvite'
import { reminderBody } from '@/lib/reminderMessages'
import { reminderPreview } from '@/lib/reminderSend'
import { planReminders } from '@/lib/reminderSchedule'

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


describe('what the fee waiver texts say', () => {
  /** A word in each language that tells the client what the questions are for. */
  const SAYS: Record<string, RegExp> = { en: /waive/, es: /cuotas/, zh: /免缴/, ko: /수수료 면제/ }

  it('says what the questions are for, in every language, on the first text and every reminder', () => {
    for (const { code } of LANGUAGES) {
      const first = invitationSms(code, 'Maria Lopez', 'https://x.test', 'fee-waiver')
      expect(first, code).toMatch(SAYS[code])
      expect(first, code).toContain(`https://x.test/client?lang=${code}`)
      expect(first, code).toMatch(/STOP/)
      for (const kind of ['day2', 'day5'] as const) {
        const body = reminderBody(kind, code, { name: 'Maria Lopez', link: 'https://x.test/client', subject: 'fee-waiver' })
        expect(body, `${code}/${kind}`).toMatch(SAYS[code])
        expect(body, `${code}/${kind}`).toContain('866 JACK LAW')
        expect(body, `${code}/${kind}`).toContain('https://x.test/client')
        expect(body, `${code}/${kind}`).toMatch(/STOP/)
        expect(body).not.toMatch(/\{name\}|\{link\}/)
      }
      const call = reminderBody('call', code, { name: 'Maria Lopez', link: 'https://x.test/client', subject: 'fee-waiver' })
      expect(call, `${code}/call`).toMatch(SAYS[code])
      expect(call, `${code}/call`).not.toContain('https://')
    }
  })

  it('leaves the ordinary first text as it was', () => {
    expect(invitationSms('es', 'Maria Lopez', 'https://x.test')).toContain('tenemos unas preguntas sobre su caso')
  })

  it('chases a fee waiver assignment in its own words, and any other set as a follow-up', () => {
    const now = new Date('2026-10-15T17:00:00Z')
    const targets = new Map([['c1', { clientId: 'c1', name: 'Maria Lopez', phone: '2135550147', lang: 'es' as const, optedOut: false }]])
    const step = (id: string, feeWaiver: boolean) => ({
      clientId: 'c1', chasing: `assignment:${id}` as const, sentAt: '2026-10-12T17:00:00Z', submitted: false, feeWaiver,
    })
    const [fw] = planReminders({ steps: [step('a1', true)], targets, alreadySent: new Map(), now }).due
    const [other] = planReminders({ steps: [step('a2', false)], targets, alreadySent: new Map(), now }).due
    expect(fw.feeWaiver).toBe(true)
    expect(reminderPreview(fw, 'https://x.test').body).toMatch(/cuotas/)
    expect(reminderPreview(other, 'https://x.test').body).toMatch(/leímos sus respuestas/)
  })
})
