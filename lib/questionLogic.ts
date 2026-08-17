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
