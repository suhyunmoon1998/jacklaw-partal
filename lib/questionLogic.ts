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
