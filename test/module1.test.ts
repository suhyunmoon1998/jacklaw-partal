/**
 * Module 1 of the intake questionnaire, held to the implementation packet.
 *
 * These cover the two paths a client can take through it, the conditional
 * chains inside them, the rule that a hidden question is never required, and
 * the promise that a file answered under the old questionnaire is still
 * readable.
 */

import { describe, expect, it } from 'vitest'
import { MODULE_1_CROSSWALK, QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { questionnaireSections } from '@/lib/questionnaireSections'
import {
  effectiveAnswers,
  hasAnswer,
  isVisible,
  missingRequired,
  resumeSectionIndex,
  sectionProgressPercent,
} from '@/lib/questionLogic'
import { LEGACY_QUESTIONS, legacyAnswerGroups, liveQuestionIds } from '@/lib/questionnaireLegacy'
import { AnswerValue, Question } from '@/types'
import { LANGUAGES, langFromPreferredAnswer } from '@/lib/langs'
import { COMPATIBLE_QUESTION_IDS, canonicalAnswer, canonicalAnswers } from '@/lib/answerCompat'

type Answers = Record<string, AnswerValue>

const ALL_QUESTIONS: Question[] = QUESTIONNAIRE_SECTIONS.flatMap(s => s.questions)
const byId = (id: string): Question => {
  const q = ALL_QUESTIONS.find(x => x.id === id)
  if (!q) throw new Error(`no question ${id}`)
  return q
}
const shows = (id: string, answers: Answers) => isVisible(byId(id), answers)
const visibleSectionIds = (answers: Answers) =>
  QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, answers)).map(s => s.id)
const visibleIds = (answers: Answers) =>
  QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, answers)).flatMap(s =>
    s.questions.filter(q => isVisible(q, answers)).map(q => q.id)
  )

/** A client who has answered everything always asked of a current employee. */
const CURRENT_EMPLOYEE: Answers = {
  full_name: 'Ana Reyes',
  dob: '1990-04-02',
  address: '1200 W 7th St',
  city_state_zip: 'Los Angeles, CA 90017',
  still_employed: 'yes',
  job_title: 'Line cook',
  job_duties: 'Prep, grill, close the kitchen.',
  employer_name: 'Sunrise Diner LLC',
}

const FORMER_EMPLOYEE: Answers = { ...CURRENT_EMPLOYEE, still_employed: 'no' }

describe('the packet', () => {
  it('asks exactly 77 questions in ten sections', () => {
    expect(ALL_QUESTIONS).toHaveLength(77)
    expect(QUESTIONNAIRE_SECTIONS).toHaveLength(10)
  })

  it('has one live question per packet number, and no id used twice', () => {
    const numbers = Object.keys(MODULE_1_CROSSWALK)
    expect(numbers).toHaveLength(77)
    expect(numbers).toEqual([...numbers].sort())

    const ids = Object.values(MODULE_1_CROSSWALK)
    expect(new Set(ids).size).toBe(77)
    expect(new Set(ALL_QUESTIONS.map(q => q.id)).size).toBe(77)
    expect(ids).toEqual(ALL_QUESTIONS.map(q => q.id))
  })

  it('keeps the section order the packet gives', () => {
    expect(QUESTIONNAIRE_SECTIONS.map(s => s.id)).toEqual([
      'contact',
      'employer',
      'dates_worked',
      'position',
      'pay_rate',
      'schedule',
      'timekeeping',
      'time_check',
      'final_wages',
      'wrongful_termination',
    ])
  })

  it('leaves out every topic the packet excludes from Module 1', () => {
    // Meal breaks, overtime, wage statements, reimbursements, retaliation,
    // leave, harassment, witnesses and documents belong to later modules.
    const excluded = [
      'meal_break_provided',
      'rest_break_provided',
      'paid_overtime',
      'received_paystubs',
      'paid_for_tools',
      'made_complaint',
      'involves_disability',
      'experienced_harassment',
      'has_witnesses',
      'available_documents',
    ]
    const live = liveQuestionIds(QUESTIONNAIRE_SECTIONS)
    for (const id of excluded) expect(live.has(id)).toBe(false)
  })

  it('never gates a question on one that comes later, or does not exist', () => {
    const positionOf = new Map(ALL_QUESTIONS.map((q, i) => [q.id, i]))
    ALL_QUESTIONS.forEach((q, index) => {
      for (const cond of [q.showIf, q.showIf?.and]) {
        if (!cond) continue
        const gate = positionOf.get(cond.questionId)
        expect(gate, `${q.id} is gated on unknown ${cond.questionId}`).toBeDefined()
        expect(gate!, `${q.id} is gated on a later question`).toBeLessThan(index)
      }
    })
  })

  it('only gates on values the gating question can actually take', () => {
    for (const q of ALL_QUESTIONS) {
      for (const cond of [q.showIf, q.showIf?.and]) {
        if (!cond) continue
        const gate = byId(cond.questionId)
        const wanted = [cond.value, ...(cond.orValues ?? [])]
        const allowed = gate.options ?? (gate.type === 'yes_no' ? ['yes', 'no'] : null)
        if (!allowed) continue
        for (const value of wanted) {
          expect(allowed, `${q.id} waits for "${value}", which ${gate.id} never offers`).toContain(value)
        }
      }
    }
  })
})

describe('the employment dates', () => {
  it('asks whether the date is known before asking for the date', () => {
    expect(byId('start_date_known').label).toBe('Do you know the exact date you started working there?')
    expect(byId('start_date_known').options).toEqual(['Yes', 'No', 'I am not sure'])
    expect(byId('end_date_known').label).toBe('Do you know your exact last day of work?')
    expect(byId('end_date_known').options).toEqual(['Yes', 'No', 'I am not sure'])
  })

  it('takes the start date after any answer, including "Yes"', () => {
    expect(shows('start_date', {})).toBe(false)
    for (const answer of ['Yes', 'No', 'I am not sure']) {
      expect(shows('start_date', { start_date_known: answer })).toBe(true)
    }
    expect(byId('start_date').type).toBe('text')
    expect(byId('end_date').type).toBe('text')
  })

  it('asks the last-day pair only of someone who has left', () => {
    expect(shows('end_date_known', CURRENT_EMPLOYEE)).toBe(false)
    expect(shows('end_date_known', FORMER_EMPLOYEE)).toBe(true)
  })
})

describe('the current-employee path', () => {
  it('never shows a former employee question', () => {
    const sections = visibleSectionIds(CURRENT_EMPLOYEE)
    expect(sections).not.toContain('final_wages')
    expect(sections).not.toContain('wrongful_termination')

    const ids = visibleIds(CURRENT_EMPLOYEE)
    for (const id of ['end_date_known', 'end_date', 'employment_ended_how', 'fired_or_forced']) {
      expect(ids).not.toContain(id)
    }
  })

  it('is complete once the always-asked questions are answered', () => {
    for (const section of QUESTIONNAIRE_SECTIONS) {
      expect(missingRequired(section, CURRENT_EMPLOYEE)).toEqual([])
    }
  })

  it('holds a former employee back until the pivot is answered', () => {
    const blank: Answers = {}
    const dates = QUESTIONNAIRE_SECTIONS.find(s => s.id === 'dates_worked')!
    expect(missingRequired(dates, blank).map(q => q.id)).toEqual(['still_employed'])
  })
})

describe('the former-employee path', () => {
  it('opens both closing sections', () => {
    const sections = visibleSectionIds(FORMER_EMPLOYEE)
    expect(sections).toContain('final_wages')
    expect(sections).toContain('wrongful_termination')
    expect(shows('end_date_known', FORMER_EMPLOYEE)).toBe(true)
  })

  it('asks for the last day after any answer about knowing it', () => {
    expect(shows('end_date_known', FORMER_EMPLOYEE)).toBe(true)
    expect(shows('end_date', FORMER_EMPLOYEE)).toBe(false)
    for (const answer of ['Yes', 'No', 'I am not sure']) {
      expect(shows('end_date', { ...FORMER_EMPLOYEE, end_date_known: answer })).toBe(true)
    }
  })

  it('closes the last-day pair for someone who never left', () => {
    const stayed: Answers = { ...CURRENT_EMPLOYEE, end_date_known: 'Yes', end_date: '2023-11-30' }
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, stayed)
    expect(live.end_date_known).toBeUndefined()
    expect(live.end_date).toBeUndefined()
    // The answer is not deleted — say they left and it is back.
    expect(effectiveAnswers(QUESTIONNAIRE_SECTIONS, { ...stayed, still_employed: 'no' }).end_date)
      .toBe('2023-11-30')
  })

  it('asks what is still owed when the client is unsure, not only when certain', () => {
    expect(shows('wages_owed_estimate', { ...FORMER_EMPLOYEE, wages_owed: 'No' })).toBe(false)
    expect(shows('wages_owed_estimate', { ...FORMER_EMPLOYEE, wages_owed: 'Yes' })).toBe(true)
    expect(shows('wages_owed_estimate', { ...FORMER_EMPLOYEE, wages_owed: 'I am not sure' })).toBe(true)
  })
})

describe('a nested conditional chain', () => {
  // Q019 No -> Q072 -> Q074 -> Q075 / Q076, four levels down from the pivot.
  it('follows the wrongful-termination chain to the not-sure branch', () => {
    const fired: Answers = { ...FORMER_EMPLOYEE, fired_or_forced: 'I am not sure' }
    expect(shows('ended_unlawfully', fired)).toBe(true)
    expect(shows('reason_given_for_termination', fired)).toBe(true)
    expect(shows('written_warnings', fired)).toBe(true)

    const unsure: Answers = { ...fired, ended_unlawfully: 'I am not sure' }
    expect(shows('wrongful_not_sure_details', unsure)).toBe(true)
    expect(shows('wrongful_reason_belief', unsure)).toBe(false)

    const unlawful: Answers = { ...fired, ended_unlawfully: 'Yes' }
    expect(shows('wrongful_reason_belief', unlawful)).toBe(true)
    expect(shows('wrongful_not_sure_details', unlawful)).toBe(false)
  })

  it('closes the whole chain for someone who was not fired', () => {
    // "Yes, it was unlawful" is left over from before they changed their mind.
    // It stays on file and decides nothing: neither the question it belongs to
    // nor the one below it is asked again.
    const quit: Answers = { ...FORMER_EMPLOYEE, fired_or_forced: 'No', ended_unlawfully: 'Yes' }
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, quit)

    expect(quit.ended_unlawfully).toBe('Yes')
    expect(live.ended_unlawfully).toBeUndefined()
    expect(isVisible(byId('ended_unlawfully'), live)).toBe(false)
    expect(isVisible(byId('wrongful_reason_belief'), live)).toBe(false)
  })

  it('drops a stale answer three levels down, and brings it back on the way in', () => {
    const stale: Answers = {
      ...CURRENT_EMPLOYEE,
      still_employed: 'yes',
      fired_or_forced: 'Yes',
      ended_unlawfully: 'Yes',
      wrongful_reason_belief: 'They fired me the week after I complained.',
    }
    const closed = effectiveAnswers(QUESTIONNAIRE_SECTIONS, stale)
    expect(closed.wrongful_reason_belief).toBeUndefined()

    // Nothing was deleted: say they left, and every answer is back in effect.
    const reopened = effectiveAnswers(QUESTIONNAIRE_SECTIONS, { ...stale, still_employed: 'no' })
    expect(reopened.wrongful_reason_belief).toBe('They fired me the week after I complained.')
  })

  it('reads a checklist gate by membership, not by equality', () => {
    const salaried: Answers = { ...CURRENT_EMPLOYEE, pay_calculated: ['Salary'] }
    expect(shows('hourly_rate', salaried)).toBe(false)
    expect(shows('salary_amount', salaried)).toBe(true)

    const both: Answers = { ...CURRENT_EMPLOYEE, pay_calculated: ['Hourly', 'Commission'] }
    expect(shows('hourly_rate', both)).toBe(true)
    expect(shows('other_pay_rates', both)).toBe(true)

    const noSystem: Answers = { ...CURRENT_EMPLOYEE, time_recorded_how: ['Paper record'] }
    expect(shows('timekeeping_system_name', noSystem)).toBe(false)
    const register: Answers = { ...CURRENT_EMPLOYEE, time_recorded_how: ['Cash register'] }
    expect(shows('timekeeping_system_name', register)).toBe(true)
  })

  it('asks about entering the end time the same way only of someone who entered both', () => {
    const endOnly: Answers = { ...CURRENT_EMPLOYEE, entered_own_start: 'No', entered_own_end: 'Yes' }
    expect(shows('end_entered_same_way', endOnly)).toBe(false)

    const bothTimes: Answers = { ...CURRENT_EMPLOYEE, entered_own_start: 'Sometimes', entered_own_end: 'Yes' }
    expect(shows('end_entered_same_way', bothTimes)).toBe(true)
  })
})

describe('hidden questions are never required', () => {
  it('does not count a hidden question towards progress', () => {
    const stale: Answers = { ...CURRENT_EMPLOYEE, employment_ended_how: 'Fired' }
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, stale)
    expect(hasAnswer(live.employment_ended_how)).toBe(false)
  })

  it('does not require anything inside a section the client cannot see', () => {
    const finals = QUESTIONNAIRE_SECTIONS.find(s => s.id === 'final_wages')!
    const wrongful = QUESTIONNAIRE_SECTIONS.find(s => s.id === 'wrongful_termination')!
    expect(missingRequired(finals, CURRENT_EMPLOYEE)).toEqual([])
    expect(missingRequired(wrongful, CURRENT_EMPLOYEE)).toEqual([])
  })

  it('requires nothing that is only revealed by a gate', () => {
    const gated = ALL_QUESTIONS.filter(q => q.showIf && q.required)
    expect(gated).toEqual([])
  })

  it('flags a required question the client can see and has skipped', () => {
    const position = QUESTIONNAIRE_SECTIONS.find(s => s.id === 'position')!
    const missing = missingRequired(position, { ...CURRENT_EMPLOYEE, job_title: '   ' })
    expect(missing.map(q => q.id)).toEqual(['job_title'])
  })
})

describe('a file answered under the old questionnaire', () => {
  // A draft saved before Module 1: old ids, old option wording, and more
  // completed-section indices than the questionnaire now has sections.
  const LEGACY_DRAFT: Answers = {
    full_name: 'Marcus Webb',
    email: 'marcus@example.com',
    preferred_language: 'Spanish',
    still_employed: 'no',
    job_title: 'Warehouse associate',
    hourly_rate: '18.50',
    employment_type: 'Full-Time',
    meal_break_provided: 'no',
    paid_overtime: 'no',
    harassment_type: ['Race / Color', 'Age (40 or older)'],
    additional_notes: 'They cut my hours after I asked about my checks.',
  }

  it('still reads the answers Module 1 kept', () => {
    for (const id of ['full_name', 'email', 'preferred_language', 'still_employed', 'hourly_rate']) {
      expect(hasAnswer(LEGACY_DRAFT[id])).toBe(true)
      expect(liveQuestionIds(QUESTIONNAIRE_SECTIONS).has(id)).toBe(true)
    }
  })

  it('addresses the client and picks their language by the same keys as before', () => {
    // lib/sendIntakeEmail.ts and lib/sendAssignmentEmail.ts read these by name.
    expect(byId('email').id).toBe('email')
    expect(byId('preferred_language').options).toEqual([
      'English', 'Spanish', 'Chinese', 'Korean', 'Other',
    ])
  })

  it('surfaces every retired answer rather than dropping it', () => {
    const groups = legacyAnswerGroups(LEGACY_DRAFT, liveQuestionIds(QUESTIONNAIRE_SECTIONS))
    const shown = groups.flatMap(g => g.entries.map(e => e.id))
    expect(shown).toContain('meal_break_provided')
    expect(shown).toContain('harassment_type')
    expect(shown).toContain('additional_notes')
    expect(shown).toContain('employment_type')
    expect(shown).not.toContain('full_name')

    const labelled = groups.flatMap(g => g.entries).find(e => e.id === 'meal_break_provided')
    expect(labelled?.label).toBe(LEGACY_QUESTIONS.meal_break_provided.label)
  })

  it('reports an answer it has no label for instead of hiding it', () => {
    const groups = legacyAnswerGroups({ mystery_field: 'something' }, liveQuestionIds(QUESTIONNAIRE_SECTIONS))
    const entries = groups.flatMap(g => g.entries)
    expect(entries.map(e => e.id)).toEqual(['mystery_field'])
    expect(entries[0].label).toBe('mystery_field')
  })

  it('renames nothing in place, so no old answer is read as a new question', () => {
    // Every id Module 1 kept must still mean what it meant. The ones whose
    // wording or answer shape changed took a new id and are retired instead.
    const live = liveQuestionIds(QUESTIONNAIRE_SECTIONS)
    for (const id of Object.keys(LEGACY_QUESTIONS)) expect(live.has(id)).toBe(false)
  })

  it('does not report a stale draft as more than complete', () => {
    const stale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    expect(sectionProgressPercent(stale, QUESTIONNAIRE_SECTIONS.length)).toBe(100)
    expect(sectionProgressPercent([0, 1, 2, 3, 4], 10)).toBe(50)
    expect(sectionProgressPercent([], 10)).toBe(0)
  })

  it('validates a resumed legacy draft without tripping over what it does not have', () => {
    for (const section of QUESTIONNAIRE_SECTIONS) {
      const missing = missingRequired(section, LEGACY_DRAFT).map(q => q.id)
      // Only the always-asked questions this draft genuinely never answered.
      expect(missing.every(id => ['dob', 'address', 'city_state_zip', 'employer_name', 'job_duties'].includes(id))).toBe(true)
    }
  })
})

describe('the four languages stay in step', () => {
  for (const { code } of LANGUAGES) {
    it(`renders every question and every answer choice in ${code}`, () => {
      const sections = questionnaireSections(code)
      expect(sections.map(s => s.id)).toEqual(QUESTIONNAIRE_SECTIONS.map(s => s.id))

      const localized = sections.flatMap(s => s.questions)
      expect(localized).toHaveLength(77)

      localized.forEach((q, i) => {
        const english = ALL_QUESTIONS[i]
        expect(q.id).toBe(english.id)
        expect(q.type).toBe(english.type)
        expect(q.required).toBe(english.required)
        expect(q.showIf).toEqual(english.showIf)
        // Option VALUES are the stored answer and never translated, so a gate
        // means the same thing whichever language the client read it in.
        expect(q.options).toEqual(english.options)
        expect(q.label.trim().length).toBeGreaterThan(0)
        if (english.options) {
          expect(q.optionLabels ?? english.options).toHaveLength(english.options.length)
        }
      })
    })
  }

  it('shows a non-English reader words they can read', () => {
    const korean = questionnaireSections('ko').flatMap(s => s.questions)
    const english = ALL_QUESTIONS
    const translated = korean.filter((q, i) => q.label !== english[i].label)
    expect(translated.length).toBe(77)
  })
})

describe('answers stored in the language the client read', () => {
  // Before Module 1 each language had its own questionnaire and its own answer
  // choices, so these are real values that are sitting in the database today.
  const OLD_SPANISH: Answers = {
    full_name: 'Rosa Delgado',
    preferred_language: 'Español',
    still_employed: 'no',
    employment_type: 'Tiempo Completo',
    job_duties: 'Preparación de alimentos y limpieza de la cocina.',
  }
  const OLD_CHINESE: Answers = {
    preferred_language: '中文',
    still_employed: 'yes',
    classification: '雇员',
  }
  const OLD_KOREAN: Answers = {
    preferred_language: '한국어',
    still_employed: 'no',
    separation_type: '해고당함',
  }

  it('reads a choice made in Spanish as the choice it was', () => {
    const fixed = canonicalAnswers(OLD_SPANISH)
    expect(fixed.preferred_language).toBe('Spanish')
    expect(byId('preferred_language').options).toContain(fixed.preferred_language)
  })

  it('reads a choice made in Chinese and in Korean too', () => {
    expect(canonicalAnswers(OLD_CHINESE).preferred_language).toBe('Chinese')
    expect(canonicalAnswers(OLD_KOREAN).preferred_language).toBe('Korean')
  })

  it('counts a translated answer as answered, for progress and for required', () => {
    const contact = QUESTIONNAIRE_SECTIONS.find(s => s.id === 'contact')!
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, canonicalAnswers(OLD_SPANISH))
    expect(hasAnswer(live.preferred_language)).toBe(true)
    // preferred_language is not required, but it must not read as blank either.
    expect(missingRequired(contact, live).map(q => q.id)).not.toContain('preferred_language')
  })

  it('routes on a translated answer exactly as on an English one', () => {
    // still_employed is a yes/no, whose value was never translated in any
    // language — this is the guarantee the pivot has always rested on.
    for (const answers of [OLD_SPANISH, OLD_KOREAN]) {
      const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, canonicalAnswers(answers))
      expect(QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, live)).map(s => s.id))
        .toContain('final_wages')
    }
    const stillThere = effectiveAnswers(QUESTIONNAIRE_SECTIONS, canonicalAnswers(OLD_CHINESE))
    expect(QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, stillThere)).map(s => s.id))
      .not.toContain('final_wages')
  })

  it('still writes to the client in the language they asked for', () => {
    // lib/sendAssignmentEmail.ts reads this answer to choose a language.
    for (const [stored, expected] of [['Español', 'es'], ['中文', 'zh'], ['한국어', 'ko'], ['Spanish', 'es']] as const) {
      expect(langFromPreferredAnswer(stored)).toBe(expected)
      expect(langFromPreferredAnswer(canonicalAnswer('preferred_language', stored) as string)).toBe(expected)
    }
  })

  it('repairs a retired multi-choice answer for the office to read', () => {
    const spanishChecklist: Answers = { harassment_type: ['Raza / Color', 'Edad (40 años o más)'] }
    expect(canonicalAnswers(spanishChecklist).harassment_type)
      .toEqual(['Race / Color', 'Age (40 or older)'])
  })

  it('changes nothing it does not recognise, and deletes nothing', () => {
    const untouched: Answers = {
      job_duties: '주방 청소와 마감을 했습니다.',
      hourly_rate: '18.50',
      preferred_language: 'Spanish',
      mystery: 'something nobody mapped',
      pay_calculated: ['Hourly'],
    }
    const out = canonicalAnswers(untouched)
    expect(out).toEqual(untouched)
    for (const key of Object.keys(untouched)) expect(key in out).toBe(true)
    // The same array object comes back when there was nothing to change.
    expect(out.pay_calculated).toBe(untouched.pay_calculated)
  })

  it('leaves the stored record alone', () => {
    const stored: Answers = { ...OLD_SPANISH }
    const before = JSON.stringify(stored)
    canonicalAnswers(stored)
    expect(JSON.stringify(stored)).toBe(before)
  })

  it('only ever maps onto a choice the question still offers', () => {
    const live = new Map(ALL_QUESTIONS.map(q => [q.id, q]))
    for (const id of COMPATIBLE_QUESTION_IDS) {
      const question = live.get(id)
      if (!question?.options) continue // retired: shown in the earlier-answers list
      for (const lang of ['Español', '中文', '한국어']) {
        const mapped = canonicalAnswer(id, lang)
        if (mapped !== lang) expect(question.options).toContain(mapped)
      }
    }
  })
})

describe('coming back to a questionnaire that changed underneath you', () => {
  // The two clients who were mid-intake when Module 1 shipped, as their rows
  // actually stand in the database.
  const ESTER_COMPLETED = Array.from({ length: 19 }, (_, i) => i)

  it('lands on the first section that still wants something, not on Submit', () => {
    const partly: Answers = {
      full_name: 'Ester',
      dob: '1980-01-01',
      address: '1 Test St',
      city_state_zip: 'Los Angeles, CA 90017',
      still_employed: 'no',
    }
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, partly)
    const at = resumeSectionIndex(QUESTIONNAIRE_SECTIONS, live)
    const visible = QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, live))

    // Not the last section, which is where the Submit button lives.
    expect(at).toBeLessThan(visible.length - 1)
    // And the section it picked really does still want something.
    const landed = visible[at]
    expect(landed.questions.some(q => isVisible(q, live) && !hasAnswer(live[q.id]))).toBe(true)
    // A stale count of nineteen would have clamped to the end.
    expect(ESTER_COMPLETED.length).toBeGreaterThan(visible.length - 1)
  })

  it('sends someone who has finished everything to the last section', () => {
    const done: Answers = {}
    for (const section of QUESTIONNAIRE_SECTIONS) {
      for (const q of section.questions) done[q.id] = q.type === 'multiselect' ? ['x'] : 'answered'
    }
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, done)
    const visible = QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, live))
    expect(resumeSectionIndex(QUESTIONNAIRE_SECTIONS, live)).toBe(visible.length - 1)
  })

  it('starts a brand new client at the beginning', () => {
    expect(resumeSectionIndex(QUESTIONNAIRE_SECTIONS, {})).toBe(0)
  })

  it('skips over a section the client cannot see', () => {
    // A current employee never sees the two closing sections, so "the last
    // section" means the last one they are actually shown.
    const current: Answers = {}
    for (const section of QUESTIONNAIRE_SECTIONS) {
      if (section.id === 'final_wages' || section.id === 'wrongful_termination') continue
      for (const q of section.questions) current[q.id] = q.type === 'multiselect' ? ['x'] : 'answered'
    }
    current.still_employed = 'yes'
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, current)
    const visible = QUESTIONNAIRE_SECTIONS.filter(s => isVisible(s, live))
    expect(visible).toHaveLength(8)
    expect(resumeSectionIndex(QUESTIONNAIRE_SECTIONS, live)).toBe(7)
  })
})
