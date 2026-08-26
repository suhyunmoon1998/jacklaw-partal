/**
 * The client information form, in whichever language the client is reading
 * the portal in.
 *
 * The four files this picks between are kept structurally identical — the
 * translated ones are generated from the English original — so switching
 * language mid-form changes only the words on screen.
 */

import { Lang } from '@/lib/langs'
import { INTAKE_SECTIONS, IntakeSection } from './intakeFormData'
import { INTAKE_SECTIONS_ES } from './intakeFormDataEs'
import { INTAKE_SECTIONS_ZH } from './intakeFormDataZh'
import { INTAKE_SECTIONS_KO } from './intakeFormDataKo'

const INTAKE_BY_LANG: Record<Lang, IntakeSection[]> = {
  en: INTAKE_SECTIONS,
  es: INTAKE_SECTIONS_ES,
  zh: INTAKE_SECTIONS_ZH,
  ko: INTAKE_SECTIONS_KO,
}

export function intakeSections(lang: Lang): IntakeSection[] {
  return INTAKE_BY_LANG[lang] ?? INTAKE_SECTIONS
}
