/**
 * Question visibility and answer helpers.
 *
 * Lifted out of app/questionnaire/page.tsx unchanged so the default onboarding
 * questionnaire and admin-built question sets share one implementation of the
 * skip logic — a question set's `showIf` behaves exactly like the default
 * questionnaire's.
 */

import { Lang, TranslatedLang } from '@/lib/langs'
import { AnswerValue, Question, QuestionnaireSection } from '@/types'

/**
 * Does one answer satisfy one condition?
 *
 * A multi-select answer is an array, and satisfies the condition when any of
 * the wanted values is among the options chosen — "was a clock, scan, app or
 * register used" is a question about a checklist, not about one string.
 */
function conditionHolds(
  answer: AnswerValue | undefined,
  cond: { value?: string; orValues?: string[]; answered?: true }
): boolean {
  if (cond.answered) return hasAnswer(answer)
  if (cond.value === undefined) return false
  const wanted = cond.orValues ? [cond.value, ...cond.orValues] : [cond.value]
  if (Array.isArray(answer)) return answer.some(a => wanted.includes(a))
  return typeof answer === 'string' && wanted.includes(answer)
}

export function isVisible(
  q: Question | QuestionnaireSection,
  answers: Record<string, AnswerValue>
): boolean {
  // A question whose choices come from earlier answers has nothing to ask until
  // those answers exist. Rendering an empty dropdown asks the worker to pick
  // from nothing.
  if ('optionsFrom' in q && q.optionsFrom && (q.options?.length ?? 0) === 0) return false

  const gate = q.showIf
  if (!gate) return true

  const head = conditionHolds(answers[gate.questionId], gate)
  const either = gate.or ? conditionHolds(answers[gate.or.questionId], gate.or) : false
  if (!head && !either) return false

  if (gate.and && !conditionHolds(answers[gate.and.questionId], gate.and)) return false
  return true
}

export function hasAnswer(val: AnswerValue | undefined): boolean {
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  return String(val).trim().length > 0
}

/**
 * Whether a stored answer still fits the question it belongs to.
 *
 * An admin can change a question's type after clients have answered it. The
 * control then renders empty — a multiselect cannot show a string, a text box
 * cannot show an array — while the old value is still on file, so counting it
 * as answered would show a client 12/12 with a blank box in front of them, and
 * would let a required question pass validation with nothing visible in it.
 */
export function answerFitsType(val: AnswerValue | undefined, type: Question['type']): boolean {
  if (!hasAnswer(val)) return false
  const wantsArray = type === 'multiselect'
  return wantsArray === Array.isArray(val)
}

/** hasAnswer, but only counting answers the client can actually see and edit. */
export function isAnsweredFor(q: Question, answers: Record<string, AnswerValue>): boolean {
  return answerFitsType(answers[q.id], q.type)
}

/**
 * The answers that are actually in effect, with the stale ones dropped.
 *
 * A gate that closes leaves its answer behind. Ask someone whether they were
 * fired, follow that to "was it unlawful", let them answer Yes, then let them
 * go back and say they quit: the middle question is gone from the screen, but
 * its Yes is still on file, and reading the file alone would reopen the
 * question below it to a client who was never asked the one above.
 *
 * The project-wide rule is that an answer is retained in storage and ignored
 * for routing. Nothing is deleted — a client who changes their mind back finds
 * their answer where they left it — but a hidden question's answer decides
 * nothing while it is hidden. One forward pass is enough because a gate always
 * points at an earlier question; a test holds the questionnaire to that.
 */
export function effectiveAnswers(
  sections: QuestionnaireSection[],
  answers: Record<string, AnswerValue>
): Record<string, AnswerValue> {
  const inEffect: Record<string, AnswerValue> = {}
  for (const section of sections) {
    if (!isVisible(section, inEffect)) continue
    for (const q of section.questions) {
      if (!isVisible(q, inEffect)) continue
      if (q.id in answers) inEffect[q.id] = answers[q.id]
    }
  }
  return inEffect
}

/**
 * The visible, required questions of one section that have not been answered.
 *
 * The rule the Next button enforces, in one place so a test can hold it to
 * account: a question is only ever required of someone who can see it. A gate
 * that closes takes its questions' required-ness with it, and an answer left
 * behind by a gate that has since closed is not what the client is being asked
 * for now.
 */
export function missingRequired(
  section: QuestionnaireSection,
  answers: Record<string, AnswerValue>
): Question[] {
  if (!isVisible(section, answers)) return []
  return section.questions.filter(
    q => q.required && isVisible(q, answers) && !hasAnswer(answers[q.id])
  )
}

/**
 * Where to put a client who comes back.
 *
 * Not "however many sections they had finished". A section count is an index
 * into a questionnaire that has not always had the same number of sections: a
 * client who left the twenty-section version carries nineteen, and the
 * ten-section one clamps that to its last section — which is the one with the
 * Submit button on it. Someone one section from the end of the old form was
 * being handed the end of a form they had never seen.
 *
 * So the question is not how far they got, it is what is still unanswered. They
 * land on the first section that still wants something, and on the last one only
 * when everything before it is done.
 */
export function resumeSectionIndex(
  sections: QuestionnaireSection[],
  answers: Record<string, AnswerValue>
): number {
  const visible = sections.filter(s => isVisible(s, answers))
  const firstUnfinished = visible.findIndex(section =>
    section.questions.some(q => isVisible(q, answers) && !hasAnswer(answers[q.id]))
  )
  if (firstUnfinished !== -1) return firstUnfinished
  return Math.max(visible.length - 1, 0)
}

/**
 * How far through the questionnaire a client is, as a percentage.
 *
 * `completedSections` holds indices, and the questionnaire has not always had
 * the same number of sections. A client who started the twenty-section version
 * carries indices the ten-section one does not have, and dividing straight
 * through showed them as 200% complete.
 */
export function sectionProgressPercent(completed: number[], total: number): number {
  if (total === 0) return 0
  const inRange = completed.filter(i => i >= 0 && i < total).length
  return Math.min(100, Math.round((inRange / total) * 100))
}

/** Button groups have no single control to point a <label for> at. */
export function isFieldControl(type: Question['type']): boolean {
  return type !== 'yes_no' && type !== 'yes_no_unsure' && type !== 'multiselect'
}

/**
 * The question as one client should see it.
 *
 * Question sets are authored in English and carry optional translations under
 * a key per language; anything untranslated falls back to the English so a
 * half-translated set is still usable rather than blank.
 *
 * `optionLabels` is deliberately separate from `options`: the English option
 * strings stay the stored answer, so a client's multiple choice answers reach
 * the firm in English and never mix languages in the record, whichever
 * language they read the question in. Free text is of course whatever the
 * client typed.
 */
export function localize(q: Question, lang: Lang): Question & { optionLabels?: string[] } {
  if (lang === 'en') return q
  const t = q[lang as TranslatedLang]
  if (!t) return q

  const optionLabels =
    q.options && t.options && t.options.length === q.options.length
      ? t.options
      : q.options

  return {
    ...q,
    label: t.label || q.label,
    helpText: t.helpText || q.helpText,
    placeholder: t.placeholder || q.placeholder,
    optionLabels,
  }
}

/**
 * A question set's name as one client should see it.
 *
 * Untranslated sets — and every set, in English — fall back to the name the
 * firm gave it, which is also what staff see in the admin panel.
 */
export function localizeName(
  name: string,
  translations: Partial<Record<TranslatedLang, string>> | undefined,
  lang: Lang
): string {
  if (lang === 'en') return name
  return translations?.[lang as TranslatedLang]?.trim() || name
}
