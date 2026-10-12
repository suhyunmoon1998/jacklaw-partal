/**
 * The court fee waiver questions (Judicial Council form FW-001), and what their
 * answers say about whether a client qualifies.
 *
 * They go out as an ordinary question set — the same send, the same link, the
 * same answer screen in the client's language — kept under one fixed id so the
 * Fee Waiver tab can find every client's answers without a table of its own.
 *
 * They are about the client's household money, not about the case. The fact
 * reading and the damages reading leave this set out (lib/assignedSets.ts),
 * and finishing it does not queue the client's file to be read again
 * (app/api/cron/follow-ups) — that would cost a full reading for three answers
 * that belong on a court form, not in the claims.
 */

import { getSupabase } from '@/lib/supabase'
import { normalizeQuestions, replaceQuestions, setNameColumns } from '@/lib/questionSets'
import { AnswerValue, Question } from '@/types'

/** The set's row in question_sets. Fixed, so nothing has to look it up by name. */
export const FEE_WAIVER_SET_ID = '6fee0001-0000-4000-8000-000000000001'

export const FEE_WAIVER_SET_NAME = 'Fee Waiver Questions'

/** What a client reading in another language sees as the set's name. */
export const FEE_WAIVER_SET_NAMES = {
  es: 'Preguntas para la exención de cuotas de la corte',
  zh: '免缴法庭费用问题',
  ko: '법원 수수료 면제 질문',
}

/** The staff-only note on the set. Never shown to a client. */
export const FEE_WAIVER_NOTE =
  'Court fee waiver (FW-001). Sent and read from the Fee Waiver tab. Its answers stay out of the case facts.'

/** Above this the household size is asked as "more than ten". */
const LARGEST_LISTED_HOUSEHOLD = 10
const MORE_THAN_LISTED = 'More than 10'

const sizes = Array.from({ length: LARGEST_LISTED_HOUSEHOLD }, (_, i) => String(i + 1))

/**
 * The three questions, in the office's own words in English and Spanish.
 *
 * Income and household size are asked only of a client who does not get
 * benefits, or is not sure: FW-001 qualifies anyone on a listed benefit
 * without asking what the household earns. The office wrote the income and
 * household questions as one ("If no, how much … How many people …"); they
 * are two here so each answer has a box of its own, and the "If no" is the gate.
 */
export const FEE_WAIVER_QUESTIONS: Question[] = [
  {
    id: 'fw_benefits',
    label: 'Do you get any government benefits, like food stamps, Medi-Cal, SSI, or cash aid?',
    type: 'yes_no_unsure',
    required: true,
    es: { label: '¿Recibe ayuda del gobierno, como estampillas de comida, Medi-Cal, SSI o ayuda en efectivo?' },
    zh: { label: '您是否领取政府补助，例如食品券、Medi-Cal、SSI 或现金补助？' },
    ko: { label: '푸드스탬프, Medi-Cal, SSI, 현금 지원 같은 정부 지원을 받고 계신가요?' },
  },
  {
    id: 'fw_household_income',
    label: 'How much money does everyone in your household make each month before taxes?',
    type: 'currency',
    required: true,
    helpText: 'Add it up for everyone who lives with you.',
    showIf: { questionId: 'fw_benefits', value: 'no', orValues: ['not_sure'] },
    es: {
      label: '¿Cuánto dinero ganan en total cada mes, antes de impuestos, las personas de su hogar?',
      helpText: 'Sume lo de todas las personas que viven con usted.',
    },
    zh: {
      label: '您家里所有人每个月税前一共赚多少钱？',
      helpText: '请把和您住在一起的每个人的收入加在一起。',
    },
    ko: {
      label: '함께 사는 가족 모두가 세금 떼기 전에 한 달에 버는 돈은 모두 합쳐 얼마인가요?',
      helpText: '함께 사는 모든 사람의 수입을 합쳐 주세요.',
    },
  },
  {
    id: 'fw_household_size',
    label: 'How many people live in your home?',
    type: 'select',
    required: true,
    helpText: 'Count yourself too.',
    options: [...sizes, MORE_THAN_LISTED],
    showIf: { questionId: 'fw_benefits', value: 'no', orValues: ['not_sure'] },
    es: {
      label: '¿Cuántas personas viven en su casa?',
      helpText: 'Cuéntese usted también.',
      options: [...sizes, 'Más de 10'],
    },
    zh: {
      label: '您家里住了几个人？',
      helpText: '请把您自己也算进去。',
      options: [...sizes, '10人以上'],
    },
    ko: {
      label: '집에 몇 명이 함께 살고 있나요?',
      helpText: '본인도 포함해서 세어 주세요.',
      options: [...sizes, '10명 초과'],
    },
  },
]

/**
 * FW-001 item 5b: the gross monthly household income below which a household
 * of each size qualifies. The Judicial Council revises it every year.
 *
 * `monthly[0]` is one person, `monthly[1]` two, and so on; past the end of the
 * list, `eachAdditional` is added per person, as the form says.
 *
 * Null until the office enters the table from the form they file with. Until
 * then an income answer is shown as it is, with no verdict — a guessed figure
 * would tell the office a client qualifies who does not.
 */
export interface IncomeTable {
  /** The form revision the figures are from, shown beside every verdict. */
  effective: string
  monthly: number[]
  eachAdditional: number
}

export const FW001_INCOME_TABLE: IncomeTable | null = null

/** What the three answers come to. */
export type FeeWaiverVerdict =
  /** Nothing to judge yet: unanswered, or answered only in part. */
  | { kind: 'waiting' }
  /** On a listed benefit — FW-001 item 5a. */
  | { kind: 'benefits' }
  /** Under the item 5b figure for the household's size. */
  | { kind: 'under'; limit: number; size: number }
  /** At or over it. The court can still grant one under item 5c. */
  | { kind: 'over'; limit: number; size: number }
  /** Income and household given, but the office has not entered the table. */
  | { kind: 'no-table' }
  /** More people than the form's list counts — for a person to work out. */
  | { kind: 'check' }

export interface FeeWaiverAnswers {
  benefits: 'yes' | 'no' | 'not_sure' | null
  /** Dollars a month, before tax. */
  income: number | null
  /** People in the home; null when not answered or more than ten. */
  household: number | null
  /** As the client picked it — "More than 10" is not a number. */
  householdAnswer: string | null
}

const text = (v: AnswerValue | undefined): string => (Array.isArray(v) ? v.join(' ') : String(v ?? '')).trim()

/** The three answers out of an assignment's raw answers. */
export function readFeeWaiverAnswers(answers: Record<string, AnswerValue>): FeeWaiverAnswers {
  const benefits = text(answers.fw_benefits)
  const income = text(answers.fw_household_income).replace(/[^0-9.]/g, '')
  const size = text(answers.fw_household_size)
  const n = Number(size)
  return {
    benefits: benefits === 'yes' || benefits === 'no' || benefits === 'not_sure' ? benefits : null,
    income: income && Number.isFinite(Number(income)) ? Number(income) : null,
    household: Number.isInteger(n) && n > 0 ? n : null,
    householdAnswer: size || null,
  }
}

/** The 5b figure for a household of `size`. */
export function incomeLimit(table: IncomeTable, size: number): number {
  const listed = table.monthly.length
  if (size <= listed) return table.monthly[size - 1]
  return table.monthly[listed - 1] + (size - listed) * table.eachAdditional
}

/**
 * Whether the answers qualify, by FW-001 items 5a and 5b.
 *
 * The form asks whether income is *less than* the figure, so a household
 * exactly at it does not qualify under 5b.
 */
export function feeWaiverVerdict(
  a: FeeWaiverAnswers,
  table: IncomeTable | null = FW001_INCOME_TABLE
): FeeWaiverVerdict {
  if (a.benefits === 'yes') return { kind: 'benefits' }
  if (a.benefits === null || a.income === null || a.householdAnswer === null) return { kind: 'waiting' }
  if (a.household === null) return { kind: 'check' }
  if (!table || table.monthly.length === 0) return { kind: 'no-table' }
  const limit = incomeLimit(table, a.household)
  return a.income < limit
    ? { kind: 'under', limit, size: a.household }
    : { kind: 'over', limit, size: a.household }
}

/**
 * Makes sure the set exists, with its questions.
 *
 * Created the first time the Fee Waiver tab is opened rather than by a
 * migration, so the questions above are the only copy anyone edits. A set
 * that exists is left alone — the office may have reworded it in the editor.
 * One that exists with no questions (a create that failed half way) is filled.
 */
export async function ensureFeeWaiverSet(): Promise<void> {
  const db = getSupabase()
  const { data: set, error } = await db.from('question_sets').select('id').eq('id', FEE_WAIVER_SET_ID).maybeSingle()
  if (error) throw new Error(`Could not read the fee waiver questions: ${error.message}`)

  if (!set) {
    const { error: insertError } = await db.from('question_sets').insert({
      id: FEE_WAIVER_SET_ID,
      name: FEE_WAIVER_SET_NAME,
      ...setNameColumns(FEE_WAIVER_SET_NAMES),
      description: FEE_WAIVER_NOTE,
      status: 'active',
    })
    // 23505: another request created it a moment ago, which is what was wanted.
    if (insertError && insertError.code !== '23505') {
      throw new Error(`Could not create the fee waiver questions: ${insertError.message}`)
    }
  }

  const { count, error: countError } = await db
    .from('question_set_questions')
    .select('question_set_id', { count: 'exact', head: true })
    .eq('question_set_id', FEE_WAIVER_SET_ID)
  if (countError) throw new Error(`Could not read the fee waiver questions: ${countError.message}`)
  if (!count) await replaceQuestions(FEE_WAIVER_SET_ID, normalizeQuestions(FEE_WAIVER_QUESTIONS))
}
