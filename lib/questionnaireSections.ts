/**
 * The default onboarding questionnaire, in whichever language the client is
 * reading the portal in.
 *
 * The English file is the structure — ids, types, options, required flags and
 * skip logic all come from it, in every language. A translated file supplies
 * only what the client reads: the section title, the question label, the help
 * text, the placeholder, and the words shown for each answer choice.
 *
 * That split is what keeps skip logic working in four languages. A question
 * gated on "Yes or Sometimes" tests the English option, which is what gets
 * stored whichever language it was chosen in — so a client can switch language
 * mid-questionnaire and every gate still means what it meant, and the office
 * reads one record rather than four. It is the same rule the admin's question
 * sets follow (see localize() in lib/questionLogic.ts), and the same rule the
 * translated files always stated for 'yes' / 'no' / 'not_sure'; Module 1 is the
 * first questionnaire to gate on a choice list, which is what made the rule
 * something the code has to enforce rather than something an author remembers.
 *
 * A question a translated file has not caught up with falls back to English
 * rather than disappearing, so a half-translated file is still usable.
 */

import { Lang } from '@/lib/langs'
import { Question, QuestionnaireSection } from '@/types'
import { QUESTIONNAIRE_SECTIONS } from './questionnaireData'
import { QUESTIONNAIRE_SECTIONS_ES } from './questionnaireDataEs'
import { QUESTIONNAIRE_SECTIONS_ZH } from './questionnaireDataZh'
import { QUESTIONNAIRE_SECTIONS_KO } from './questionnaireDataKo'

/** A question to render: English structure, client's language on screen. */
export interface LocalizedQuestion extends Question {
  /**
   * Display text for `options`, matched by position. `options` stays the stored
   * answer, so a Spanish reader's choice is filed in English.
   */
  optionLabels?: string[]
}

export interface LocalizedSection extends Omit<QuestionnaireSection, 'questions'> {
  questions: LocalizedQuestion[]
}

const SECTIONS_BY_LANG: Record<Lang, QuestionnaireSection[]> = {
  en: QUESTIONNAIRE_SECTIONS,
  es: QUESTIONNAIRE_SECTIONS_ES,
  zh: QUESTIONNAIRE_SECTIONS_ZH,
  ko: QUESTIONNAIRE_SECTIONS_KO,
}

function translationIndex(sections: QuestionnaireSection[]) {
  const titles = new Map<string, string>()
  const questions = new Map<string, Question>()
  for (const section of sections) {
    titles.set(section.id, section.title)
    for (const q of section.questions) questions.set(q.id, q)
  }
  return { titles, questions }
}

export function questionnaireSections(lang: Lang): LocalizedSection[] {
  if (lang === 'en') return QUESTIONNAIRE_SECTIONS
  const translated = SECTIONS_BY_LANG[lang]
  if (!translated || translated === QUESTIONNAIRE_SECTIONS) return QUESTIONNAIRE_SECTIONS

  const { titles, questions } = translationIndex(translated)

  return QUESTIONNAIRE_SECTIONS.map(section => ({
    ...section,
    title: titles.get(section.id)?.trim() || section.title,
    questions: section.questions.map(q => {
      const t = questions.get(q.id)
      if (!t) return q
      // Counts must agree or the pairing is guesswork, and a wrong pairing puts
      // one choice's words on another choice's value.
      const optionLabels =
        q.options && t.options && t.options.length === q.options.length ? t.options : undefined
      return {
        ...q,
        label: t.label?.trim() || q.label,
        helpText: t.helpText?.trim() || q.helpText,
        placeholder: t.placeholder?.trim() || q.placeholder,
        ...(optionLabels ? { optionLabels } : {}),
      }
    }),
  }))
}
