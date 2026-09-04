/**
 * Module 2 in whichever language the client is reading the portal in.
 *
 * Identical arrangement to Module 1's questionnaireSections(): the English file
 * owns the structure — ids, types, option values, exclusivity, repeat rules and
 * skip logic — and a translated file supplies only what appears on screen. That
 * is what lets a gate mean the same thing in four languages and a client's
 * choice reach the office in English whichever one they read.
 */

import { Lang } from '@/lib/langs'
import { Question, QuestionnaireSection } from '@/types'
import { LocalizedSection } from '@/lib/questionnaireSections'
import { MODULE_2_SECTIONS } from './module2Data'
import { MODULE_2_SECTIONS_ES } from './module2DataEs'
import { MODULE_2_SECTIONS_ZH } from './module2DataZh'
import { MODULE_2_SECTIONS_KO } from './module2DataKo'

const BY_LANG: Record<Lang, QuestionnaireSection[]> = {
  en: MODULE_2_SECTIONS,
  es: MODULE_2_SECTIONS_ES,
  zh: MODULE_2_SECTIONS_ZH,
  ko: MODULE_2_SECTIONS_KO,
}

export function module2Sections(lang: Lang): LocalizedSection[] {
  if (lang === 'en') return MODULE_2_SECTIONS
  const translated = BY_LANG[lang]
  if (!translated || translated === MODULE_2_SECTIONS) return MODULE_2_SECTIONS

  const titles = new Map(translated.map(s => [s.id, s.title]))
  const templates = new Map(
    translated.filter(s => s.repeatFor).map(s => [s.id, s.repeatFor!.titleTemplate])
  )
  const questions = new Map<string, Question>(
    translated.flatMap(s => s.questions.map(q => [q.id, q] as const))
  )

  return MODULE_2_SECTIONS.map(section => ({
    ...section,
    title: titles.get(section.id)?.trim() || section.title,
    repeatFor: section.repeatFor && {
      ...section.repeatFor,
      titleTemplate: templates.get(section.id)?.trim() || section.repeatFor.titleTemplate,
    },
    questions: section.questions.map(q => {
      const t = questions.get(q.id)
      if (!t) return q
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
