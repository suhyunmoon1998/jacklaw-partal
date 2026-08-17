/**
 * Question visibility and answer helpers.
 *
 * Lifted out of app/questionnaire/page.tsx unchanged so the default onboarding
 * questionnaire and admin-built question sets share one implementation of the
 * skip logic — a question set's `showIf` behaves exactly like the default
 * questionnaire's.
 */

import { AnswerValue, Question, QuestionnaireSection } from '@/types'

export function isVisible(
  q: Question | QuestionnaireSection,
  answers: Record<string, AnswerValue>
): boolean {
  if (!q.showIf) return true
  return answers[q.showIf.questionId] === q.showIf.value
}

export function hasAnswer(val: AnswerValue | undefined): boolean {
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  return String(val).trim().length > 0
}

/** Button groups have no single control to point a <label for> at. */
export function isFieldControl(type: Question['type']): boolean {
  return type !== 'yes_no' && type !== 'yes_no_unsure' && type !== 'multiselect'
}

/**
 * The question as one client should see it.
 *
 * Question sets are authored in English and carry optional Spanish in `es`;
 * anything untranslated falls back to the English so a half-translated set is
 * still usable rather than blank.
 *
 * `optionLabels` is deliberately separate from `options`: the English option
 * strings stay the stored answer, so a Spanish-speaking client's multiple
 * choice answers reach the firm in English and never mix languages in the
 * record. Free text is of course whatever the client typed.
 */
export function localize(q: Question, lang: 'en' | 'es'): Question & { optionLabels?: string[] } {
  if (lang !== 'es' || !q.es) return q

  const optionLabels =
    q.options && q.es.options && q.es.options.length === q.options.length
      ? q.es.options
      : q.options

  return {
    ...q,
    label: q.es.label || q.label,
    helpText: q.es.helpText || q.helpText,
    placeholder: q.es.placeholder || q.placeholder,
    optionLabels,
  }
}
