/**
 * Sections asked once per thing the worker named.
 *
 * Module 2 asks the same twenty-eight questions about every kind of unpaid work
 * someone did: what it was, who told them to, who knew, how many minutes it
 * took. A worker who did three kinds has three sets of answers, and they must
 * not land on top of each other.
 *
 * So a repeating section is expanded before anything renders. Each instance is
 * a real section with real question ids — `m2_pattern_what::Waited at a gate` —
 * which means everything downstream needs no idea this happened: skip logic,
 * validation, progress, autosave, the admin panel and the PDF all work on
 * ordinary questions. The only rule is that a gate inside a repeated section
 * points at its own instance, never at another worker's other pattern, which is
 * what `instanceId` below is for.
 */

import { AnswerValue, Question, QuestionnaireSection, ShowIfCondition } from '@/types'

/** Separates a question's own id from the thing this copy is about. */
export const INSTANCE_SEPARATOR = '::'

export const instanceId = (questionId: string, instance: string) =>
  `${questionId}${INSTANCE_SEPARATOR}${instance}`

/** The thing an expanded answer is about, or null for an ordinary question. */
export function instanceOf(answerId: string): string | null {
  const at = answerId.indexOf(INSTANCE_SEPARATOR)
  return at === -1 ? null : answerId.slice(at + INSTANCE_SEPARATOR.length)
}

export const baseId = (answerId: string) => answerId.split(INSTANCE_SEPARATOR)[0]

/** The values a worker chose across several questions, in the order asked. */
function chosenAcross(
  questionIds: string[],
  answers: Record<string, AnswerValue>,
  exclusiveByQuestion: Map<string, Set<string>>
): string[] {
  const out: string[] = []
  for (const id of questionIds) {
    const value = answers[id]
    const exclusive = exclusiveByQuestion.get(id) ?? new Set<string>()
    for (const v of Array.isArray(value) ? value : value ? [value] : []) {
      // "None of these" is not a kind of work to ask twenty-eight questions about.
      if (exclusive.has(v)) continue
      if (!out.includes(v)) out.push(v)
    }
  }
  return out
}

/** Points a condition at this instance's copy of a question in the same section. */
function rewriteGate(
  gate: ShowIfCondition | undefined,
  ownIds: Set<string>,
  instance: string
): ShowIfCondition | undefined {
  if (!gate) return undefined
  const point = <T extends { questionId: string }>(c: T): T =>
    ownIds.has(c.questionId) ? { ...c, questionId: instanceId(c.questionId, instance) } : c

  const next: ShowIfCondition = point(gate)
  if (gate.and) next.and = point(gate.and)
  if (gate.or) next.or = point(gate.or)
  return next
}

/**
 * Turns every repeating section into one plain section per instance.
 *
 * A section whose worker named nothing disappears rather than rendering empty —
 * there is nothing to ask about.
 */
export function expandSections(
  sections: QuestionnaireSection[],
  answers: Record<string, AnswerValue>
): QuestionnaireSection[] {
  const exclusiveByQuestion = new Map<string, Set<string>>()
  for (const section of sections) {
    for (const q of section.questions) {
      if (q.exclusiveOptions) exclusiveByQuestion.set(q.id, new Set(q.exclusiveOptions))
    }
  }

  return sections.flatMap(section => {
    if (!section.repeatFor) return [section]

    const instances = chosenAcross(section.repeatFor.fromQuestionIds, answers, exclusiveByQuestion)
    const ownIds = new Set(section.questions.map(q => q.id))

    return instances.map(instance => ({
      ...section,
      id: instanceId(section.id, instance),
      title: section.repeatFor!.titleTemplate.replace('{instance}', instance),
      repeatFor: undefined,
      questions: section.questions.map<Question>(q => ({
        ...q,
        id: instanceId(q.id, instance),
        showIf: rewriteGate(q.showIf, ownIds, instance),
        optionsFrom: q.optionsFrom?.map(id => (ownIds.has(id) ? instanceId(id, instance) : id)),
      })),
    }))
  })
}

/**
 * Fills in the options of a question that takes them from earlier answers.
 *
 * "Which kind of unpaid work happened most often" can only offer the kinds this
 * worker actually named. A question whose source answers are still empty is
 * left with no options, which `isVisible` callers treat as nothing to ask yet.
 */
export function resolveOptions(
  sections: QuestionnaireSection[],
  answers: Record<string, AnswerValue>
): QuestionnaireSection[] {
  const exclusiveByQuestion = new Map<string, Set<string>>()
  for (const section of sections) {
    for (const q of section.questions) {
      if (q.exclusiveOptions) exclusiveByQuestion.set(q.id, new Set(q.exclusiveOptions))
    }
  }

  return sections.map(section => ({
    ...section,
    questions: section.questions.map(q => {
      if (!q.optionsFrom) return q
      const options = chosenAcross(q.optionsFrom, answers, exclusiveByQuestion)
      return { ...q, options }
    }),
  }))
}

/** Both passes, in the order they have to happen. */
export function prepareSections(
  sections: QuestionnaireSection[],
  answers: Record<string, AnswerValue>
): QuestionnaireSection[] {
  return resolveOptions(expandSections(sections, answers), answers)
}

/**
 * A multi-select answer with the exclusivity rule applied.
 *
 * `justPicked` is what the worker touched. If it is exclusive, everything else
 * goes; if it is not, every exclusive choice goes. Nothing else is disturbed.
 */
export function applyExclusivity(
  selected: string[],
  justPicked: string,
  exclusiveOptions: string[] | undefined
): string[] {
  if (!exclusiveOptions?.length) return selected
  const exclusive = new Set(exclusiveOptions)
  if (exclusive.has(justPicked)) return selected.filter(v => v === justPicked)
  return selected.filter(v => !exclusive.has(v))
}
