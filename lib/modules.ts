/**
 * The questionnaire modules a client can be given, and the one record they
 * share.
 *
 * Module 1 establishes who the client is, who the employer was, and what the
 * work and the pay actually were. Module 2 asks about meal and rest breaks,
 * unpaid work, overtime, and what happened when the client asked about any of
 * it — and it asks none of Module 1 again. That reuse is only possible because
 * both write into one answers record, so a Module 2 gate can name a Module 1
 * question and get a real answer back.
 *
 * The one rule that keeps it safe: ids never collide. Module 2's all begin
 * `m2_`. A test holds both files to it.
 */

import { Lang } from '@/lib/langs'
import { AnswerValue } from '@/types'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { MODULE_2_SECTIONS } from '@/lib/module2Data'
import { LocalizedSection, questionnaireSections } from '@/lib/questionnaireSections'
import { module2Sections } from '@/lib/module2Sections'
import { effectiveAnswers } from '@/lib/questionLogic'
import { prepareSections } from '@/lib/repeatSections'
import { canonicalAnswers } from '@/lib/answerCompat'

export type ModuleId = 'module1' | 'module2' | 'module3'

/**
 * The modules the office can hand to a client.
 *
 * Module 3 is listed because it is planned and the office asks about it; it has
 * no questions yet, so it cannot be sent. Saying that plainly is better than
 * leaving a gap where a row should be, or a button that does nothing.
 */
export interface ModuleDefinition {
  id: ModuleId
  /** What the office calls it. */
  name: string
  /** What it covers, in one line, for the admin list. */
  summary: string
  /** Where the client opens it. */
  href: string
  built: boolean
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'module1',
    name: 'Module 1 · Intake',
    summary: 'Who they are, the employer, the dates, the job, the pay, the schedule and the time records',
    href: '/questionnaire',
    built: true,
  },
  {
    id: 'module2',
    name: 'Module 2 · Wage & Hour',
    summary: 'Meal and rest breaks, unpaid time, overtime, and retaliation for asking about any of it',
    href: '/questionnaire/module2',
    built: true,
  },
  {
    id: 'module3',
    name: 'Module 3 · Who’s Who',
    summary: 'The people in the workplace and possible witnesses',
    href: '',
    built: false,
  },
]

export const moduleById = (id: ModuleId) => MODULES.find(m => m.id === id)

/**
 * The modules a client is given the moment they are added.
 *
 * The intake questionnaire is what "every client receives this" means, and it is
 * what the office is looking at when they type someone's name in. The later
 * modules are sent deliberately, when the office decides that client is ready
 * for them.
 *
 * This is not a default anyone should be able to forget: while it was missing, a
 * newly added client opened the portal to nothing at all.
 */
export const MODULES_GIVEN_ON_CREATE: ModuleId[] = ['module1']

/** How many questions a built module asks. Module 3 has none yet. */
export function moduleQuestionCount(id: ModuleId): number {
  if (id === 'module1') return QUESTIONNAIRE_SECTIONS.reduce((n, s) => n + s.questions.length, 0)
  if (id === 'module2') return MODULE_2_SECTIONS.reduce((n, s) => n + s.questions.length, 0)
  return 0
}

/** Every section of every module, in the order a client meets them. */
export function allSections(lang: Lang): LocalizedSection[] {
  return [...questionnaireSections(lang), ...module2Sections(lang)]
}

export function sectionsFor(moduleId: ModuleId, lang: Lang): LocalizedSection[] {
  if (moduleId === 'module1') return questionnaireSections(lang)
  if (moduleId === 'module2') return module2Sections(lang)
  return []
}

/**
 * The answers in effect across both modules, with the repeating sections
 * expanded and the borrowed choice lists filled in.
 *
 * The pass runs over Module 1 AND Module 2 even when only one is on screen.
 * Module 2's gates ask about Module 1's answers, and a pass that walked Module 2
 * alone would drop every one of them and close branches that should be open.
 */
export function liveAnswersFor(
  lang: Lang,
  rawAnswers: Record<string, AnswerValue>
): Record<string, AnswerValue> {
  const answers = canonicalAnswers(rawAnswers)
  return effectiveAnswers(prepareSections(allSections(lang), answers), answers)
}

/** One module's sections, ready to render against the answers in effect. */
export function preparedSections(
  moduleId: ModuleId,
  lang: Lang,
  rawAnswers: Record<string, AnswerValue>
): LocalizedSection[] {
  const live = liveAnswersFor(lang, rawAnswers)
  return prepareSections(sectionsFor(moduleId, lang), live)
}

/** Ids owned by each module, for keeping the shared record honest. */
export const MODULE_1_IDS = new Set(
  QUESTIONNAIRE_SECTIONS.flatMap(s => s.questions.map(q => q.id))
)
export const MODULE_2_IDS = new Set(
  MODULE_2_SECTIONS.flatMap(s => s.questions.map(q => q.id))
)

/**
 * Every section a client's record could hold, ready to read — Module 1 followed
 * by Module 2 with its repeating branches expanded for THIS client.
 *
 * The office side uses this rather than Module 1 alone. Reading only Module 1
 * would file every wage-and-hour answer under "an earlier version of the
 * questionnaire", which is exactly backwards: they are the newest thing in the
 * file.
 */
export function sectionsForReading(
  rawAnswers: Record<string, AnswerValue>,
  lang: Lang = 'en'
): LocalizedSection[] {
  const live = liveAnswersFor(lang, rawAnswers)
  return [...questionnaireSections(lang), ...prepareSections(module2Sections(lang), live)]
}
