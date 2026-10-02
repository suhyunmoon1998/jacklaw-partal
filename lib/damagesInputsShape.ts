/**
 * The damages inputs: the numbers a damages line is multiplied out of, each
 * with the client's own words behind it.
 *
 * The reading (caseAnalysis.ts) writes its arithmetic as prose — "Low: 2
 * days/week x W x $20 = $40 x W" — which a lawyer reads well and a calculator
 * cannot. Eleanor's FACTS / DAMAGES screen multiplies Jack's approved inputs
 * into the office's one-line format, so it needs the inputs themselves: weeks,
 * the hourly rate, meal and rest violations a week, off-the-clock hours a week,
 * overtime hours and rate, waiting-time rate and days.
 *
 * This is a FACT stage. Nothing here says what the law allows or whether a
 * category applies; where that matters the item says so and leaves it to the
 * attorney. A number the answers do not support is null with what is missing
 * and the one question that would settle it — never a plausible guess.
 *
 * Closed sets live in vet(), not in the schema: a provider enforces a schema
 * all-or-nothing, so one stray key would cost the whole call.
 *
 * Kept apart from damagesInputs.ts so the admin panel and tests can use it
 * without the Anthropic SDK. Depends on nothing but zod.
 */

import { z } from 'zod'

/** The inputs Eleanor's calculator takes, in the order it shows them. */
export const INPUT_KEYS = [
  'weeks',
  'hourlyRate',
  'mealViolationsPerWeek',
  'restViolationsPerWeek',
  'offTheClockHoursPerWeek',
  'overtimeHours',
  'overtimeRate',
  'waitingTimeDailyRate',
  'waitingTimeDays',
] as const
export type InputKey = (typeof INPUT_KEYS)[number]

export const INPUT_LABEL: Record<InputKey, string> = {
  weeks: 'Weeks in the period',
  hourlyRate: 'Regular hourly rate',
  mealViolationsPerWeek: 'Meal period violations a week',
  restViolationsPerWeek: 'Rest period violations a week',
  offTheClockHoursPerWeek: 'Off-the-clock hours a week',
  overtimeHours: 'Overtime hours, total',
  overtimeRate: 'Overtime rate',
  waitingTimeDailyRate: 'Waiting-time daily rate',
  waitingTimeDays: 'Waiting-time days',
}

/** Plausibility bounds, the same as Eleanor's calculator; outside them the value is dropped. */
export const INPUT_BOUNDS: Record<InputKey, { min: number; max: number }> = {
  weeks: { min: 0, max: 1040 },
  hourlyRate: { min: 0, max: 1000 },
  mealViolationsPerWeek: { min: 0, max: 21 },
  restViolationsPerWeek: { min: 0, max: 21 },
  offTheClockHoursPerWeek: { min: 0, max: 80 },
  overtimeHours: { min: 0, max: 50000 },
  overtimeRate: { min: 0, max: 2000 },
  waitingTimeDailyRate: { min: 0, max: 10000 },
  waitingTimeDays: { min: 0, max: 30 },
}

export const CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'] as const
export type Confidence = (typeof CONFIDENCE)[number]

/** How the value is known — the labels the office asked for. */
export const STANDING = ['Client estimate', 'Client statement', 'Document-confirmed', 'AI proposed', 'Contested', 'Missing information'] as const
export type Standing = (typeof STANDING)[number]

const Support = z.object({
  /** Where it is: "Wage & Hour answers", "Initial answers", or the follow-up set's title. */
  source: z.string(),
  /** The question as the client saw it, short. */
  question: z.string(),
  /** The client's words, as they wrote them — any language — with an English gloss in brackets if not English. */
  quote: z.string(),
})

const Alternative = z.object({
  value: z.number().nullable(),
  shown: z.string(),
  support: z.array(Support),
})

export const DamagesInput = z.object({
  key: z.string(),
  value: z.number().nullable(),
  /** As it would read in the office's math: "3 violations/week", "$22.00 per hour". */
  shown: z.string(),
  confidence: z.string(),
  standing: z.string(),
  /** One or two plain sentences of what supports it. No reasoning steps. */
  basis: z.string(),
  support: z.array(Support),
  /** Other values the answers also support. Empty when they agree. */
  alternatives: z.array(Alternative),
  /** Why the value was chosen over the alternatives. Empty when there are none. */
  chosenBecause: z.string(),
  /** What is missing to state it reliably. Empty when nothing is. */
  missing: z.string(),
  /** The one question to the client that would settle it, in plain words. Empty when none is needed. */
  question: z.string(),
})

export const DamagesInputs = z.object({
  /** The employment period the weeks are counted over, as the answers state it. */
  period: z.object({
    start: z.string(),
    end: z.string(),
    /** How the weeks were counted, or why they could not be. */
    how: z.string(),
  }),
  inputs: z.array(DamagesInput),
  /**
   * Categories whose applicability is a legal question — waiting time, wage
   * statements, liquidated damages. Status says only "Potentially applicable —
   * attorney review required" or "Not raised by the answers"; never a conclusion.
   */
  applicability: z.array(z.object({ category: z.string(), status: z.string(), why: z.string() })),
  /** Items that are not arithmetic: emotional distress, punitive damages, future wage loss. */
  attorneyValuation: z.array(z.object({ category: z.string(), why: z.string() })),
})
export type DamagesInputs = z.infer<typeof DamagesInputs>
export type DamagesInputItem = z.infer<typeof DamagesInput>

const asConfidence = (value: string): Confidence => {
  const upper = value.trim().toUpperCase()
  return (CONFIDENCE as readonly string[]).includes(upper) ? (upper as Confidence) : 'LOW'
}
const asStanding = (value: string): Standing =>
  (STANDING as readonly string[]).find(s => s.toLowerCase() === value.trim().toLowerCase()) as Standing ?? 'AI proposed'

const withinBounds = (key: InputKey, value: number | null): number | null =>
  value === null || !Number.isFinite(value) || value < INPUT_BOUNDS[key].min || value > INPUT_BOUNDS[key].max
    ? null
    : Math.round(value * 100) / 100

/**
 * What the model returned, made safe to show and to multiply.
 *
 * - Unknown keys are dropped and each known key is kept once (the first).
 * - A value out of bounds becomes null and says so; it is never clamped.
 * - A value with no supporting quote is not allowed to stand as more than LOW,
 *   and is labelled an AI proposal: a number nobody can find in the answers is
 *   exactly the invented fact this file exists to prevent.
 * - Every key appears, so the screen can show what is missing as plainly as
 *   what is known.
 */
export function vetDamagesInputs(raw: DamagesInputs): DamagesInputs & { inputs: (DamagesInputItem & { key: InputKey })[] } {
  const seen = new Map<InputKey, DamagesInputItem & { key: InputKey }>()
  for (const item of raw.inputs) {
    const key = item.key.trim() as InputKey
    if (!(INPUT_KEYS as readonly string[]).includes(key) || seen.has(key)) continue
    const value = withinBounds(key, item.value)
    const outOfBounds = item.value !== null && value === null
    const supported = item.support.some(s => s.quote.trim())
    seen.set(key, {
      ...item,
      key,
      value,
      shown: value === null ? 'Not established' : item.shown.trim() || String(value),
      confidence: value === null ? 'LOW' : supported ? asConfidence(item.confidence) : 'LOW',
      standing: value === null ? 'Missing information' : supported ? asStanding(item.standing) : 'AI proposed',
      missing: outOfBounds
        ? `${item.missing ? `${item.missing} ` : ''}The value read (${item.value}) is outside what is plausible, so it was not used.`.trim()
        : item.missing.trim(),
      alternatives: item.alternatives
        .map(a => ({ ...a, value: a.value === null ? null : withinBounds(key, a.value) }))
        .filter(a => a.value !== null && a.value !== value),
      question: item.question.trim(),
      chosenBecause: item.chosenBecause.trim(),
    })
  }
  const inputs = INPUT_KEYS.map(key => seen.get(key) ?? {
    key,
    value: null,
    shown: 'Not established',
    confidence: 'LOW',
    standing: 'Missing information',
    basis: 'Not addressed in the reading.',
    support: [],
    alternatives: [],
    chosenBecause: '',
    missing: 'The answers were not read for this input.',
    question: '',
  })
  return {
    period: raw.period,
    inputs,
    applicability: raw.applicability.map(a => ({
      category: a.category.trim(),
      // The only two statuses this stage may give; anything else is turned into the careful one.
      status: /^not raised/i.test(a.status.trim()) ? 'Not raised by the answers' : 'Potentially applicable — attorney review required',
      why: a.why.trim(),
    })),
    attorneyValuation: raw.attorneyValuation.map(a => ({ category: a.category.trim(), why: a.why.trim() })),
  }
}
