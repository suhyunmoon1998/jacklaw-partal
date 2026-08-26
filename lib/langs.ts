/**
 * The languages the client portal is offered in.
 *
 * Kept in a module of its own rather than inside lib/i18n.tsx so that server
 * code — API routes, email templates, the question-set helpers — can name a
 * language without importing a 'use client' module and its React context.
 *
 * English is the language everything is authored in: questions are written in
 * English, and every other language is a translation layered over it. That
 * asymmetry is deliberate and is what `TranslatedLang` names.
 */

export type Lang = 'en' | 'es' | 'zh' | 'ko'

/** Every language that is a translation of the English original. */
export type TranslatedLang = Exclude<Lang, 'en'>

export interface LanguageOption {
  code: Lang
  /** The language's own name, as someone who reads it would expect to see it. */
  label: string
  /** Compact badge for the header toggle, where there is no room for the name. */
  short: string
}

/** Display order everywhere a language is offered. */
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'zh', label: '中文', short: '中文' },
  { code: 'ko', label: '한국어', short: '한국어' },
]

export const TRANSLATED_LANGS: TranslatedLang[] = ['es', 'zh', 'ko']

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some(l => l.code === value)
}

/** Narrows anything to a Lang, falling back to the language of authorship. */
export function toLang(value: unknown): Lang {
  return isLang(value) ? value : 'en'
}

/** How staff refer to each language, for the admin panel and internal notes. */
export const LANG_ENGLISH_NAME: Record<Lang, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  ko: 'Korean',
}

/**
 * What a client picks on the intake's "Preferred Language" question, mapped to
 * the language we would then write to them in.
 *
 * Both the English and the translated wording of each option are listed,
 * because the stored answer is whichever the client's form showed them.
 */
const PREFERRED_LANGUAGE_ANSWERS: Record<string, Lang> = {
  english: 'en',
  inglés: 'en',
  ingles: 'en',
  英语: 'en',
  영어: 'en',
  spanish: 'es',
  español: 'es',
  espanol: 'es',
  西班牙语: 'es',
  스페인어: 'es',
  chinese: 'zh',
  chino: 'zh',
  中文: 'zh',
  중국어: 'zh',
  korean: 'ko',
  coreano: 'ko',
  韩语: 'ko',
  한국어: 'ko',
}

/**
 * The language a client asked to be contacted in, from their intake answer.
 *
 * Returns null rather than 'en' when the answer is missing or is "Other", so a
 * caller can tell "they chose English" apart from "they never said" and fall
 * back on its own terms.
 */
export function langFromPreferredAnswer(answer: unknown): Lang | null {
  const key = String(answer ?? '').trim().toLowerCase()
  return PREFERRED_LANGUAGE_ANSWERS[key] ?? null
}
