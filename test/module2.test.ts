/**
 * Module 2 — wage and hour.
 *
 * The shapes this module needed that the portal did not have are what most of
 * these cover: a section asked once per thing the worker named, choices taken
 * from earlier answers, exclusive options, and gates that read Module 1.
 */

import { describe, expect, it } from 'vitest'
import { MODULE_2_SECTIONS } from '@/lib/module2Data'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import {
  MODULES,
  MODULES_GIVEN_ON_CREATE,
  MODULE_1_IDS,
  MODULE_2_IDS,
  liveAnswersFor,
  preparedSections,
} from '@/lib/modules'
import { module2Sections } from '@/lib/module2Sections'
import { hasAnswer, isVisible, missingRequired } from '@/lib/questionLogic'
import { applyExclusivity, baseId, instanceOf, prepareSections } from '@/lib/repeatSections'
import { formatNumberRange, parseNumberRange, withPart } from '@/lib/numberRange'
import { AnswerValue, Question } from '@/types'
import { LANGUAGES } from '@/lib/langs'

type Answers = Record<string, AnswerValue>

const BASE = MODULE_2_SECTIONS.flatMap(s => s.questions)
const find = (sections: { questions: Question[] }[], id: string) =>
  sections.flatMap(s => s.questions).find(q => q.id === id)

/** Module 2 as the client would meet it, given these answers. */
const shown = (answers: Answers) => {
  const live = liveAnswersFor('en', answers)
  const sections = preparedSections('module2', 'en', answers).filter(s => isVisible(s, live))
  return {
    live,
    sections,
    ids: sections.flatMap(s => s.questions.filter(q => isVisible(q, live)).map(q => q.id)),
    sees: (id: string) => {
      const q = sections.flatMap(s => s.questions).find(x => x.id === id)
      return Boolean(q && isVisible(q, live))
    },
  }
}

describe('the packet', () => {
  it('asks 86 questions in six sections', () => {
    expect(BASE).toHaveLength(86)
    expect(MODULE_2_SECTIONS).toHaveLength(6)
  })

  it('cannot collide with Module 1 in the record they share', () => {
    for (const id of Array.from(MODULE_2_IDS)) {
      expect(id.startsWith('m2_'), `${id} must be namespaced`).toBe(true)
      expect(MODULE_1_IDS.has(id)).toBe(false)
    }
    expect(new Set(BASE.map(q => q.id)).size).toBe(86)
  })

  it('leaves final wages and wrongful termination to Module 1', () => {
    const labels = BASE.map(q => q.label.toLowerCase()).join(' | ')
    expect(labels).not.toContain('final wages')
    expect(labels).not.toContain('wrongfully')
    expect(MODULE_1_IDS.has('employment_ended_how')).toBe(true)
  })

  it('never gates on a question that comes later', () => {
    const at = new Map(BASE.map((q, i) => [q.id, i]))
    // Module 1 answers all count as already given.
    const module1 = new Set(QUESTIONNAIRE_SECTIONS.flatMap(s => s.questions.map(q => q.id)))
    BASE.forEach((q, index) => {
      for (const cond of [q.showIf, q.showIf?.and, q.showIf?.or]) {
        if (!cond) continue
        if (module1.has(cond.questionId)) continue
        const gate = at.get(cond.questionId)
        expect(gate, `${q.id} is gated on unknown ${cond.questionId}`).toBeDefined()
        expect(gate!, `${q.id} is gated on a later question`).toBeLessThan(index)
      }
    })
  })

  it('only waits for values its gating question can take', () => {
    const byId = new Map(BASE.map(q => [q.id, q]))
    for (const q of BASE) {
      for (const cond of [q.showIf, q.showIf?.and, q.showIf?.or]) {
        if (!cond?.value) continue
        const gate = byId.get(cond.questionId)
        if (!gate?.options) continue
        for (const value of [cond.value, ...(cond.orValues ?? [])]) {
          expect(gate.options, `${q.id} waits for "${value}"`).toContain(value)
        }
      }
    }
  })
})

describe('short shifts', () => {
  it('skips the meal details when the days were never over five hours', () => {
    const short = shown({ m2_meal_given: 'My workdays were not over five hours' })
    for (const id of ['m2_meal_start_time', 'm2_meal_minutes_free', 'm2_meal_where', 'm2_meal_what_happened']) {
      expect(short.sees(id)).toBe(false)
    }
    expect(short.sees('m2_meal_days_per_week')).toBe(false)
    expect(short.sees('m2_meal_waiver')).toBe(false)
    // And the second meal cannot arise either.
    expect(short.sees('m2_second_meal_given')).toBe(false)
  })

  it('asks them of everyone else, including the unsure', () => {
    for (const answer of ['Every day', 'Some days', 'Not sure']) {
      expect(shown({ m2_meal_given: answer }).sees('m2_meal_start_time')).toBe(true)
    }
    // Someone who got no meal at all is still asked how often it happened.
    expect(shown({ m2_meal_given: 'No' }).sees('m2_meal_days_per_week')).toBe(true)
  })
})

describe('the meal branch', () => {
  it('asks about a replacement meal only when the meal was actually broken', () => {
    const clean = shown({ m2_meal_given: 'Some days', m2_meal_what_happened: ['I did no work and did not have to stay ready'] })
    expect(clean.sees('m2_meal_redone')).toBe(false)

    const broken = shown({ m2_meal_given: 'Some days', m2_meal_what_happened: ['I kept working while I ate'] })
    expect(broken.sees('m2_meal_redone')).toBe(true)
  })

  it('asks when the problem started once there is a problem', () => {
    expect(shown({ m2_meal_given: 'Some days', m2_meal_days_per_week: '0' }).sees('m2_meal_problem_start')).toBe(false)
    expect(shown({ m2_meal_given: 'Some days', m2_meal_days_per_week: '3' }).sees('m2_meal_problem_start')).toBe(true)
    expect(shown({ m2_meal_given: 'Some days', m2_meal_days_per_week: 'Not sure' }).sees('m2_meal_problem_end')).toBe(true)
  })

  it('asks about a second meal for anyone whose days could have run long', () => {
    expect(shown({ m2_meal_given: 'Every day' }).sees('m2_second_meal_given')).toBe(true)
    const long = shown({ m2_meal_given: 'Every day', m2_second_meal_given: 'Some days' })
    expect(long.sees('m2_second_meal_time')).toBe(true)
    const never = shown({ m2_meal_given: 'Every day', m2_second_meal_given: 'I did not work more than 10 hours' })
    expect(never.sees('m2_second_meal_time')).toBe(false)
  })
})

describe('rest breaks', () => {
  it('asks the details only of someone who got a break', () => {
    const none = shown({ m2_rest_count: '0' })
    for (const id of ['m2_rest_full_ten', 'm2_rest_what_happened', 'm2_rest_phone', 'm2_rest_leave_site', 'm2_rest_eat_drink']) {
      expect(none.sees(id)).toBe(false)
    }
    // The weekly count is still asked — missing every break is the answer.
    expect(none.sees('m2_rest_days_per_week')).toBe(true)

    const some = shown({ m2_rest_count: '2' })
    expect(some.sees('m2_rest_full_ten')).toBe(true)
  })

  it('offers the usual day from Module 1 as the frame for the question', () => {
    expect(find(MODULE_2_SECTIONS, 'm2_rest_count')?.helpText).toContain('Module 1')
  })
})

describe('finding work that was never paid', () => {
  it('still asks for examples after the worker first says no', () => {
    const saidNo = shown({ m2_worked_off_clock: 'No' })
    for (const id of ['m2_before_clock_in', 'm2_after_clock_out', 'm2_away_from_job', 'm2_unclocked_meetings', 'm2_wait_and_travel']) {
      expect(saidNo.sees(id)).toBe(true)
    }
    expect(shown({ m2_worked_off_clock: 'Not sure' }).sees('m2_before_clock_in')).toBe(true)
  })

  it('offers only the kinds this worker named', () => {
    const nothing = shown({ m2_before_clock_in: ['None of these'] })
    expect(nothing.sees('m2_most_frequent_pattern')).toBe(false)

    const named = shown({
      m2_before_clock_in: ['Opened a door or gate', 'Got keys, tools, food, papers, or supplies'],
      m2_after_clock_out: ['Counted money, tips, or products'],
    })
    const q = find(named.sections, 'm2_most_frequent_pattern')
    expect(q?.options).toEqual([
      'Opened a door or gate',
      'Got keys, tools, food, papers, or supplies',
      'Counted money, tips, or products',
    ])
  })

  it('does not offer "None of these" as a kind of work to describe', () => {
    const mixed = shown({ m2_before_clock_in: ['Opened a door or gate'], m2_unclocked_meetings: ['None of these'] })
    expect(find(mixed.sections, 'm2_most_frequent_pattern')?.options).toEqual(['Opened a door or gate'])
  })

  it('asks about a second kind only once the first is named', () => {
    const one = shown({ m2_before_clock_in: ['Opened a door or gate'] })
    expect(one.sees('m2_another_pattern')).toBe(false)
    const chosen = shown({ m2_before_clock_in: ['Opened a door or gate'], m2_most_frequent_pattern: 'Opened a door or gate' })
    expect(chosen.sees('m2_another_pattern')).toBe(true)
  })
})

describe('one branch per kind of unpaid work', () => {
  const OPENED = 'Opened a door or gate'
  const COUNTED = 'Counted money, tips, or products'
  const WAITED = 'Waited at a gate or security check'

  it('gives a single pattern its own section', () => {
    const one = shown({
      m2_before_clock_in: [OPENED],
      m2_most_frequent_pattern: OPENED,
    })
    const branches = one.sections.filter(s => baseId(s.id) === 'm2_pattern')
    expect(branches).toHaveLength(1)
    expect(branches[0].title).toBe(`Unpaid Work — ${OPENED}`)
    expect(one.ids).toContain(`m2_p_what::${OPENED}`)
  })

  it('gives every additional pattern its own, and never mixes their answers', () => {
    const answers: Answers = {
      m2_before_clock_in: [OPENED],
      m2_after_clock_out: [COUNTED],
      m2_wait_and_travel: [WAITED],
      m2_most_frequent_pattern: OPENED,
      m2_another_pattern: 'Yes',
      m2_other_frequent_patterns: [COUNTED, WAITED],
      [`m2_p_what::${OPENED}`]: 'Unlocked the gate for the crew',
      [`m2_p_what::${COUNTED}`]: 'Counted the till after clocking out',
    }
    const many = shown(answers)
    const branches = many.sections.filter(s => baseId(s.id) === 'm2_pattern')
    expect(branches.map(s => instanceOf(s.id))).toEqual([OPENED, COUNTED, WAITED])

    expect(many.live[`m2_p_what::${OPENED}`]).toBe('Unlocked the gate for the crew')
    expect(many.live[`m2_p_what::${COUNTED}`]).toBe('Counted the till after clocking out')
    expect(many.live[`m2_p_what::${WAITED}`]).toBeUndefined()
    // 28 questions, three times over.
    expect(branches.flatMap(s => s.questions)).toHaveLength(84)
  })

  it('keeps each branch\'s own skip logic inside that branch', () => {
    const answers: Answers = {
      m2_before_clock_in: [OPENED],
      m2_after_clock_out: [COUNTED],
      m2_most_frequent_pattern: OPENED,
      m2_another_pattern: 'Yes',
      m2_other_frequent_patterns: [COUNTED],
      // Told someone about the first pattern only.
      [`m2_p_told_anyone::${OPENED}`]: 'Yes',
      [`m2_p_told_anyone::${COUNTED}`]: 'No',
    }
    const two = shown(answers)
    expect(two.sees(`m2_p_told_who::${OPENED}`)).toBe(true)
    expect(two.sees(`m2_p_told_who::${COUNTED}`)).toBe(false)
  })

  it('drops a branch when the worker takes the pattern back', () => {
    const before = shown({
      m2_before_clock_in: [OPENED],
      m2_most_frequent_pattern: OPENED,
      [`m2_p_what::${OPENED}`]: 'Unlocked the gate',
    })
    expect(before.sections.some(s => baseId(s.id) === 'm2_pattern')).toBe(true)

    const after = shown({ m2_before_clock_in: ['None of these'] })
    expect(after.sections.some(s => baseId(s.id) === 'm2_pattern')).toBe(false)
  })

  it('opens the clock-in and clock-out reasons from their own answers', () => {
    const a: Answers = {
      m2_before_clock_in: [OPENED],
      m2_most_frequent_pattern: OPENED,
      [`m2_p_could_clock_in_first::${OPENED}`]: 'No',
      [`m2_p_could_stay_clocked_in::${OPENED}`]: 'Always',
    }
    const s = shown(a)
    expect(s.sees(`m2_p_why_not_clock_in::${OPENED}`)).toBe(true)
    expect(s.sees(`m2_p_why_clocked_out_early::${OPENED}`)).toBe(false)
  })
})

describe('estimates a worker can actually give', () => {
  it('takes a best guess with a floor and a ceiling, and keeps them apart', () => {
    let stored = withPart('', 'best', '20')
    stored = withPart(stored, 'low', '15')
    stored = withPart(stored, 'high', '30')
    expect(parseNumberRange(stored)).toEqual({ best: 20, low: 15, high: 30 })
    expect(stored).toBe('best=20; low=15; high=30')
  })

  it('accepts a best guess on its own', () => {
    expect(parseNumberRange(withPart('', 'best', '4'))).toEqual({ best: 4 })
  })

  it('forgets a part the worker clears, and keeps the rest', () => {
    const cleared = withPart('best=20; low=15; high=30', 'low', '')
    expect(parseNumberRange(cleared)).toEqual({ best: 20, high: 30 })
  })

  it('reads nothing out of an empty or unparseable answer', () => {
    expect(parseNumberRange('')).toEqual({})
    expect(parseNumberRange('about twenty minutes')).toEqual({})
    expect(formatNumberRange({})).toBe('')
  })

  it('is what the two quantity questions use', () => {
    expect(find(MODULE_2_SECTIONS, 'm2_p_days_per_week')?.type).toBe('number_range')
    expect(find(MODULE_2_SECTIONS, 'm2_p_minutes_per_day')?.type).toBe('number_range')
  })
})

describe('overtime', () => {
  it('asks about the pay record if either the day or the week ran long', () => {
    const neither = shown({ m2_over_8_hours: 'Never', m2_over_40_hours: 'Never' })
    expect(neither.sees('m2_overtime_on_stub')).toBe(false)

    const daily = shown({ m2_over_8_hours: '3-4 days', m2_over_40_hours: 'Never' })
    expect(daily.sees('m2_overtime_on_stub')).toBe(true)

    const weekly = shown({ m2_over_8_hours: 'Never', m2_over_40_hours: '3-4 weeks' })
    expect(weekly.sees('m2_overtime_on_stub')).toBe(true)
    expect(weekly.sees('m2_ever_paid_overtime')).toBe(true)
  })

  it('asks about double time only when the day ran past twelve', () => {
    expect(shown({ m2_over_12_hours: 'Never' }).sees('m2_double_time_on_stub')).toBe(false)
    expect(shown({ m2_over_12_hours: 'A few times a month' }).sees('m2_double_time_on_stub')).toBe(true)
  })
})

describe('retaliation', () => {
  const OPENED = 'Opened a door or gate'

  it('opens from the protected-activity question', () => {
    expect(shown({ m2_spoke_up: ['None of these'] }).sees('m2_spoke_up_what')).toBe(false)
    const spoke = shown({ m2_spoke_up: ['I asked for missing pay'] })
    expect(spoke.sees('m2_spoke_up_what')).toBe(true)
  })

  it('follows through to what got worse, and to who decided', () => {
    const answers: Answers = {
      m2_spoke_up: ['I said my time record was wrong'],
      m2_spoke_up_what: 'I told the office my hours were short two days that week.',
      m2_what_changed_after: 'Something got worse',
      m2_what_got_worse: ['My hours were cut', 'I was written up or disciplined'],
    }
    const s = shown(answers)
    expect(s.sees('m2_spoke_up_who_heard')).toBe(true)
    expect(s.sees('m2_what_got_worse')).toBe(true)
    // The first bad thing is chosen from what they just said got worse.
    expect(find(s.sections, 'm2_first_bad_thing')?.options).toEqual([
      'My hours were cut',
      'I was written up or disciplined',
    ])
  })

  it('does not offer "nothing got worse" as the first bad thing', () => {
    const s = shown({
      m2_spoke_up: ['I asked about overtime pay'],
      m2_spoke_up_what: 'I asked why there was no overtime on my check.',
      m2_what_changed_after: 'Not sure',
      m2_what_got_worse: ['Nothing got worse'],
    })
    expect(s.sees('m2_first_bad_thing')).toBe(false)
  })

  it('asks the rest only once the first bad thing is named', () => {
    const named = shown({
      m2_spoke_up: ['I refused to work without pay'],
      m2_spoke_up_what: 'I said I would not stay after clocking out.',
      m2_what_changed_after: 'Something got worse',
      m2_what_got_worse: ['I was suspended'],
      m2_first_bad_thing: 'I was suspended',
    })
    for (const id of ['m2_first_bad_when', 'm2_who_decided', 'm2_decider_knew', 'm2_company_reason', 'm2_retaliation_records']) {
      expect(named.sees(id)).toBe(true)
    }
    expect(named.sees('m2_how_you_know_they_knew')).toBe(false)
  })

  it('is also reachable from a complaint made inside one unpaid-work branch', () => {
    // The worker never used the general screen, but did tell someone about the
    // missing time; the packet opens retaliation either way.
    const s = shown({
      m2_before_clock_in: [OPENED],
      m2_most_frequent_pattern: OPENED,
      [`m2_p_told_anyone::${OPENED}`]: 'Yes',
      [`m2_p_told_what_said::${OPENED}`]: 'I asked to be paid for the twenty minutes.',
    })
    expect(s.sees(`m2_p_told_result::${OPENED}`)).toBe(true)
    expect(s.sees('m2_spoke_up')).toBe(true)
  })
})

describe('exclusive choices', () => {
  it('clears the substantive picks when the worker says none of them', () => {
    const next = applyExclusivity(['Opened a door or gate', 'None of these'], 'None of these', ['None of these', 'Not sure'])
    expect(next).toEqual(['None of these'])
  })

  it('clears "none of these" the moment something substantive is picked', () => {
    const next = applyExclusivity(['None of these', 'Opened a door or gate'], 'Opened a door or gate', ['None of these', 'Not sure'])
    expect(next).toEqual(['Opened a door or gate'])
  })

  it('leaves an ordinary checklist alone', () => {
    const next = applyExclusivity(['a', 'b'], 'b', undefined)
    expect(next).toEqual(['a', 'b'])
  })

  it('is set on every checklist that offers a way out', () => {
    for (const q of BASE) {
      if (q.type !== 'multiselect' || !q.options) continue
      const outs = q.options.filter(o => ['None of these', 'Not sure', 'No', 'None yet', 'Nothing got worse', 'No one that I know of', 'None that I know of'].includes(o))
      if (outs.length === 0) continue
      expect(q.exclusiveOptions ?? [], `${q.id} offers ${outs.join('/')} without making them exclusive`).toEqual(
        expect.arrayContaining(outs)
      )
    }
  })
})

describe('hidden questions', () => {
  it('are never required', () => {
    expect(BASE.filter(q => q.showIf && q.required)).toEqual([])
  })

  it('do not hold up a section the worker can finish', () => {
    const answers: Answers = { m2_meal_given: 'My workdays were not over five hours' }
    const live = liveAnswersFor('en', answers)
    for (const section of preparedSections('module2', 'en', answers)) {
      expect(missingRequired(section, live)).toEqual([])
    }
  })

  it('stop deciding anything once their gate closes, without being deleted', () => {
    const stored: Answers = {
      m2_meal_given: 'Some days',
      m2_meal_what_happened: ['I kept working while I ate'],
      m2_meal_redone: 'Never',
    }
    expect(shown(stored).live.m2_meal_redone).toBe('Never')

    // They go back and say the meal was clean after all.
    const changed: Answers = { ...stored, m2_meal_what_happened: ['I did no work and did not have to stay ready'] }
    expect(shown(changed).live.m2_meal_redone).toBeUndefined()
    expect(changed.m2_meal_redone).toBe('Never')

    // And it returns if they change their mind back.
    expect(shown(stored).live.m2_meal_redone).toBe('Never')
  })
})

describe('what Module 1 already established', () => {
  it('is never asked again', () => {
    const module1Labels = new Set(
      QUESTIONNAIRE_SECTIONS.flatMap(s => s.questions.map(q => q.label.toLowerCase().trim()))
    )
    for (const q of BASE) {
      expect(module1Labels.has(q.label.toLowerCase().trim()), `${q.id} repeats Module 1`).toBe(false)
    }
  })

  it('is still in effect while Module 2 is on screen', () => {
    // A Module 2 pass that walked Module 2 alone would drop these.
    const answers: Answers = {
      still_employed: 'no',
      job_title: 'Line cook',
      m2_meal_given: 'Some days',
    }
    const live = liveAnswersFor('en', answers)
    expect(live.job_title).toBe('Line cook')
    expect(live.still_employed).toBe('no')
    expect(live.m2_meal_given).toBe('Some days')
  })
})

describe('the four languages stay in step', () => {
  for (const { code } of LANGUAGES) {
    it(`renders every Module 2 question and choice in ${code}`, () => {
      const sections = module2Sections(code)
      expect(sections.map(s => s.id)).toEqual(MODULE_2_SECTIONS.map(s => s.id))

      const localized = sections.flatMap(s => s.questions)
      expect(localized).toHaveLength(86)
      localized.forEach((q, i) => {
        const english = BASE[i]
        expect(q.id).toBe(english.id)
        expect(q.type).toBe(english.type)
        expect(q.showIf).toEqual(english.showIf)
        expect(q.options).toEqual(english.options)
        expect(q.exclusiveOptions).toEqual(english.exclusiveOptions)
        expect(q.label.trim().length).toBeGreaterThan(0)
      })
    })
  }

  it('keeps the repeated heading able to name the pattern', () => {
    for (const { code } of LANGUAGES) {
      const repeated = module2Sections(code).find(s => s.repeatFor)
      expect(repeated?.repeatFor?.titleTemplate).toContain('{instance}')
    }
  })

  it('names the pattern in the client\'s own words, in their own language', () => {
    const OPENED = 'Opened a door or gate'
    const answers: Answers = { m2_before_clock_in: [OPENED], m2_most_frequent_pattern: OPENED }
    const ko = prepareSections(module2Sections('ko'), liveAnswersFor('ko', answers))
    const branch = ko.find(s => baseId(s.id) === 'm2_pattern')
    expect(branch?.title).toContain('임금')
    expect(branch?.title).toContain(OPENED)
  })
})

describe('a client who was part-way through', () => {
  it('keeps every Module 1 answer readable and in effect', () => {
    const legacy: Answers = {
      full_name: 'Rosa Delgado',
      preferred_language: 'Español',
      still_employed: 'no',
      meal_break_provided: 'no',
      m2_meal_given: 'Some days',
    }
    const live = liveAnswersFor('en', legacy)
    expect(live.full_name).toBe('Rosa Delgado')
    // The translated choice is read back as the choice it was.
    expect(live.preferred_language).toBe('Spanish')
    expect(hasAnswer(live.m2_meal_given)).toBe(true)
  })
})

describe('what a client can open the day they are added', () => {
  it('includes the intake questionnaire', () => {
    // Gating the modules without this left a newly added client looking at an
    // empty portal: every module was "not sent to you yet", including the one
    // the office had just created them for.
    expect(MODULES_GIVEN_ON_CREATE).toContain('module1')
  })

  it('does not include the modules the office sends deliberately', () => {
    expect(MODULES_GIVEN_ON_CREATE).not.toContain('module2')
    expect(MODULES_GIVEN_ON_CREATE).not.toContain('module3')
  })

  it('names only modules that exist and are built', () => {
    for (const id of MODULES_GIVEN_ON_CREATE) {
      const mod = MODULES.find(m => m.id === id)
      expect(mod, `${id} is not a module`).toBeDefined()
      expect(mod!.built, `${id} is not built, so it cannot be given to anyone`).toBe(true)
    }
  })
})
