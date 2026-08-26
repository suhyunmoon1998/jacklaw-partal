/**
 * The default onboarding questionnaire, in whichever language the client is
 * reading the portal in.
 *
 * The four files this picks between are kept structurally identical — same
 * question ids, types, option counts and skip logic — so switching language
 * mid-questionnaire changes only the words on screen. Answers stay filed under
 * the same keys either way.
 */

import { Lang } from '@/lib/langs'
import { QuestionnaireSection } from '@/types'
import { QUESTIONNAIRE_SECTIONS } from './questionnaireData'
import { QUESTIONNAIRE_SECTIONS_ES } from './questionnaireDataEs'
import { QUESTIONNAIRE_SECTIONS_ZH } from './questionnaireDataZh'
import { QUESTIONNAIRE_SECTIONS_KO } from './questionnaireDataKo'

const SECTIONS_BY_LANG: Record<Lang, QuestionnaireSection[]> = {
  en: QUESTIONNAIRE_SECTIONS,
  es: QUESTIONNAIRE_SECTIONS_ES,
  zh: QUESTIONNAIRE_SECTIONS_ZH,
  ko: QUESTIONNAIRE_SECTIONS_KO,
}

export function questionnaireSections(lang: Lang): QuestionnaireSection[] {
  return SECTIONS_BY_LANG[lang] ?? QUESTIONNAIRE_SECTIONS
}
