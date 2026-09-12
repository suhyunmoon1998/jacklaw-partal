/**
 * @vitest-environment jsdom
 *
 * The questionnaire, drawn.
 *
 * Everything else in this suite reasons about the questionnaire; this renders
 * it. It exists because the two modules went out without anyone having seen a
 * question on a screen — the logic was covered, the screen was not, and a
 * defect that only shows up when a control is drawn would have reached a client
 * before it reached us.
 */

import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { QuestionInput } from '@/components/QuestionField'
import { MODULE_2_SECTIONS } from '@/lib/module2Data'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { liveAnswersFor, preparedSections } from '@/lib/modules'
import { isVisible } from '@/lib/questionLogic'
import { baseId } from '@/lib/repeatSections'
import { AnswerValue, Question } from '@/types'

afterEach(cleanup)

const labels = {
  yesLabel: 'Yes',
  noLabel: 'No',
  notSureLabel: 'Not Sure',
  selectPlaceholder: 'Select…',
}

/**
 * One question on screen, holding its own answer the way the real page does.
 *
 * The state matters: these are controlled inputs, and a harness that never
 * feeds the new value back would show the second keystroke landing on the first
 * keystroke's empty box.
 */
function draw(question: Question, initial: AnswerValue = question.type === 'multiselect' ? [] : '') {
  const written: AnswerValue[] = []

  function Harness() {
    const [value, setValue] = useState<AnswerValue>(initial)
    return (
      <QuestionInput
        question={question}
        inputId={`q-${question.id}`}
        value={value}
        onChange={(_id, v) => {
          written.push(v)
          setValue(v)
        }}
        {...labels}
      />
    )
  }

  return { ...render(<Harness />), written }
}

const find = (sections: { questions: Question[] }[], id: string) => {
  const q = sections.flatMap(s => s.questions).find(x => x.id === id)
  if (!q) throw new Error(`no question ${id}`)
  return q
}

describe('a question on screen', () => {
  it('draws a yes/no as two buttons a thumb can hit', () => {
    const q = find(QUESTIONNAIRE_SECTIONS, 'still_employed')
    draw(q)
    expect(screen.getByRole('button', { name: /Yes/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /No/ })).toBeDefined()
  })

  it('draws each meal interruption as its own choice, none of them compound', () => {
    const q = find(MODULE_2_SECTIONS, 'm2_meal_what_happened')
    draw(q, [])
    // The firm split "a boss told me to wait, skip the meal, or finish work
    // first" and "work was too busy, or no one could cover for me" into one
    // fact each. A worker ticking one box now tells the office one thing.
    for (const choice of [
      'A boss told me to wait or skip the meal',
      'A boss told me to finish work first',
      'Work was too busy',
      'No one could cover for me',
    ]) {
      expect(screen.getByText(choice), `${choice} must be its own box`).toBeDefined()
    }
    expect(q.options).toHaveLength(15)
    // The compounds themselves are gone, so nothing can still be stored as
    // "a boss did one of these three things".
    expect(q.options).not.toContain('A boss told me to wait, skip the meal, or finish work first')
    expect(q.options).not.toContain('Work was too busy, or no one could cover for me')
  })

  it('splits the rest checklist the same way, in the same words', () => {
    const q = find(MODULE_2_SECTIONS, 'm2_rest_what_happened')
    draw(q, [])
    for (const choice of ['Work was too busy', 'No one could cover for me']) {
      expect(screen.getByText(choice), `${choice} must be its own box`).toBeDefined()
    }
    expect(q.options).toHaveLength(14)
    expect(q.options).not.toContain('Work was too busy, or no one could cover')

    // A rush is a rush whichever break it cost, so both checklists and both
    // why-not questions have to offer the worker the same sentence.
    for (const other of ['m2_meal_what_happened', 'm2_meal_why_not', 'm2_rest_why_not']) {
      expect(find(MODULE_2_SECTIONS, other).options).toContain('Work was too busy')
      expect(find(MODULE_2_SECTIONS, other).options).toContain('No one could cover for me')
    }
  })

  it('draws a choice list with every choice, and stores the English one', async () => {
    const user = userEvent.setup()
    const q = find(MODULE_2_SECTIONS, 'm2_meal_given')
    const { written } = draw(q, [])
    const select = screen.getByRole('combobox')
    expect(within(select).getAllByRole('option')).toHaveLength(q.options!.length + 1)
    await user.selectOptions(select, 'Some days')
    expect(written).toEqual(['Some days'])
  })

  it('shows a translated choice while still storing the English', async () => {
    const user = userEvent.setup()
    const q = find(MODULE_2_SECTIONS, 'm2_meal_given')
    const written: AnswerValue[] = []
    render(
      <QuestionInput
        question={q}
        inputId="x"
        value=""
        onChange={(_id, v) => written.push(v)}
        optionLabels={['매일', '가끔', '아니요', '5시간 미만', '잘 모르겠습니다']}
        {...labels}
      />
    )
    expect(screen.getByRole('option', { name: '가끔' })).toBeDefined()
    await user.selectOptions(screen.getByRole('combobox'), 'Some days')
    expect(written).toEqual(['Some days'])
  })
})

describe('a checklist with a way out', () => {
  const q = find(MODULE_2_SECTIONS, 'm2_before_clock_in')

  it('clears the substantive picks when the worker says none of them', async () => {
    const user = userEvent.setup()
    const { written } = draw(q, ['Opened a door or gate'])
    await user.click(screen.getByText('None of these'))
    expect(written.at(-1)).toEqual(['None of these'])
  })

  it('clears "none of these" the moment something substantive is picked', async () => {
    const user = userEvent.setup()
    const { written } = draw(q, ['None of these'])
    await user.click(screen.getByText('Opened a door or gate'))
    expect(written.at(-1)).toEqual(['Opened a door or gate'])
  })
})

describe('an estimate with a floor and a ceiling', () => {
  const q = find(MODULE_2_SECTIONS, 'm2_p_minutes_per_day')

  it('draws three numbers, not one', () => {
    draw(q)
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3)
    expect(screen.getByText('Best guess')).toBeDefined()
    expect(screen.getByText('Lowest')).toBeDefined()
    expect(screen.getByText('Highest')).toBeDefined()
  })

  it('keeps the other two when one is typed', async () => {
    const user = userEvent.setup()
    const { written } = draw(q, 'best=20; high=30')
    await user.type(screen.getAllByRole('spinbutton')[1], '15')
    expect(written.at(-1)).toBe('best=20; low=15; high=30')
  })

  it('shows what is already stored', () => {
    draw(q, 'best=20; low=15; high=30')
    const [best, low, high] = screen.getAllByRole('spinbutton') as HTMLInputElement[]
    expect([best.value, low.value, high.value]).toEqual(['20', '15', '30'])
  })
})

describe('the wage-and-hour module as a worker would meet it', () => {
  const OPENED = 'Opened a door or gate'
  const COUNTED = 'Counted money, tips, or products'

  /** Every visible question of a module, drawn one after another. */
  function drawModule(answers: Record<string, AnswerValue>) {
    const live = liveAnswersFor('en', answers)
    const sections = preparedSections('module2', 'en', answers).filter(s => isVisible(s, live))
    const drawn = render(
      <div>
        {sections.map(section => (
          <section key={section.id}>
            <h2>{section.title}</h2>
            {section.questions
              .filter(q => isVisible(q, live))
              .map(q => (
                <div key={q.id}>
                  <p>{q.label}</p>
                  <QuestionInput
                    question={q}
                    inputId={`q-${q.id}`}
                    value={live[q.id] ?? (q.type === 'multiselect' ? [] : '')}
                    onChange={() => {}}
                    {...labels}
                  />
                </div>
              ))}
          </section>
        ))}
      </div>
    )
    return { drawn, sections }
  }

  it('draws every section without throwing, from an empty start', () => {
    const { sections } = drawModule({})
    expect(sections.length).toBeGreaterThan(0)
    expect(screen.getByText('Meal Breaks')).toBeDefined()
    expect(screen.getByText(/did you get a meal break/)).toBeDefined()
  })

  it('draws one branch per kind of unpaid work, each headed by its own name', () => {
    const { sections } = drawModule({
      m2_before_clock_in: [OPENED],
      m2_after_clock_out: [COUNTED],
      m2_most_frequent_pattern: OPENED,
      m2_another_pattern: 'Yes',
      m2_other_frequent_patterns: [COUNTED],
    })

    const branches = sections.filter(s => baseId(s.id) === 'm2_pattern')
    expect(branches).toHaveLength(2)
    expect(screen.getByText(`Unpaid Work — ${OPENED}`)).toBeDefined()
    expect(screen.getByText(`Unpaid Work — ${COUNTED}`)).toBeDefined()

    // The same question appears once per branch, and nothing is deduplicated
    // away — two separate answers are being collected.
    expect(screen.getAllByText('What exactly did you do when this unpaid work happened?')).toHaveLength(2)
  })

  it('keeps the two branches\' answers apart on screen', () => {
    const answers = {
      m2_before_clock_in: [OPENED],
      m2_after_clock_out: [COUNTED],
      m2_most_frequent_pattern: OPENED,
      m2_another_pattern: 'Yes',
      m2_other_frequent_patterns: [COUNTED],
      [`m2_p_what::${OPENED}`]: 'Unlocked the gate for the crew',
      [`m2_p_what::${COUNTED}`]: 'Counted the till after clocking out',
    }
    drawModule(answers)
    expect(screen.getByDisplayValue('Unlocked the gate for the crew')).toBeDefined()
    expect(screen.getByDisplayValue('Counted the till after clocking out')).toBeDefined()
  })

  it('shows the offered choices as the worker\'s own words', () => {
    drawModule({ m2_before_clock_in: [OPENED], m2_after_clock_out: [COUNTED] })
    const q = screen.getByText('Which kind of unpaid work happened most often?')
    const select = q.parentElement!.querySelector('select')!
    const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent)
    expect(options).toEqual(['Select…', OPENED, COUNTED])
  })

  it('draws in Korean without losing a single question', () => {
    const answers = { m2_before_clock_in: [OPENED], m2_most_frequent_pattern: OPENED }
    const live = liveAnswersFor('ko', answers)
    const ko = preparedSections('module2', 'ko', answers).filter(s => isVisible(s, live))
    const en = preparedSections('module2', 'en', answers).filter(s => isVisible(s, live))

    render(
      <div>
        {ko.map(s => (
          <section key={s.id}>
            <h2>{s.title}</h2>
            {s.questions.filter(q => isVisible(q, live)).map(q => <p key={q.id}>{q.label}</p>)}
          </section>
        ))}
      </div>
    )
    const drawnQuestions = ko.flatMap(s => s.questions.filter(q => isVisible(q, live)))
    const englishQuestions = en.flatMap(s => s.questions.filter(q => isVisible(q, live)))
    expect(drawnQuestions).toHaveLength(englishQuestions.length)
    expect(screen.getByText('식사 시간(밀 브레이크)')).toBeDefined()
  })

  /**
   * The other two languages, held to the same bar as Korean.
   *
   * A translated file that falls a question short, or leaves one in English,
   * reaches a client as a questionnaire with a hole in it — and the merge is
   * silent about it, because an untranslated label falls back to the English
   * rather than failing.
   */
  for (const lang of ['es', 'zh', 'ko'] as const) {
    it(`draws every Module 2 question in ${lang}, none of it left in English`, () => {
      const answers = { m2_before_clock_in: [OPENED], m2_most_frequent_pattern: OPENED }
      const live = liveAnswersFor(lang, answers)
      const translated = preparedSections('module2', lang, answers).filter(s => isVisible(s, live))
      const english = preparedSections('module2', 'en', answers).filter(s => isVisible(s, live))

      const drawn = translated.flatMap(s => s.questions.filter(q => isVisible(q, live)))
      const source = english.flatMap(s => s.questions.filter(q => isVisible(q, live)))
      expect(drawn).toHaveLength(source.length)

      const byId = new Map(source.map(q => [q.id, q]))
      for (const q of drawn) {
        const e = byId.get(q.id)!
        expect(q.label.trim().length, `${q.id} has no label`).toBeGreaterThan(0)
        expect(q.label, `${q.id} is still English`).not.toBe(e.label)
        // The stored answer stays English whatever the client is reading, or
        // the office gets a case file in four languages.
        expect(q.options, `${q.id} stores translated values`).toEqual(e.options)
      }

      // And it actually reaches the screen.
      render(
        <div>{translated.map(s => (
          <section key={s.id}>
            <h2>{s.title}</h2>
            {s.questions.filter(q => isVisible(q, live)).map(q => <p key={q.id}>{q.label}</p>)}
          </section>
        ))}</div>
      )
      for (const q of drawn.slice(0, 5)) expect(screen.getAllByText(q.label).length).toBeGreaterThan(0)
    })
  }

  /**
   * The questions the firm added when it reviewed the printed packet.
   *
   * Every one of them sits behind a gate, so the "draws every section from an
   * empty start" test above never reaches them — that one renders exactly what
   * a worker sees before answering anything. These open each gate and draw what
   * is behind it, because a question nobody has seen drawn is a question that
   * can reach a client broken.
   */
  describe('the questions added in the firm review', () => {
    /** For each new question, answers that open its gate. */
    const OPENS: [string, Record<string, AnswerValue>][] = [
      ['m2_meal_start_time_changed', { m2_meal_given: 'Some days' }],
      ['m2_meal_hours_after_start', { m2_meal_given: 'Some days' }],
      ['m2_meal_minutes_free_explain', { m2_meal_given: 'Some days', m2_meal_minutes_free: 'It changed' }],
      ['m2_meal_why_not', { m2_meal_given: 'No' }],
      ['m2_meal_why_not_explain', { m2_meal_given: 'No', m2_meal_why_not: ['Something else happened'] }],
      ['m2_meal_days_missed', { m2_meal_given: 'Some days' }],
      ['m2_meal_days_late', { m2_meal_given: 'Some days' }],
      ['m2_meal_days_short', { m2_meal_given: 'Some days' }],
      ['m2_meal_days_worked_during', { m2_meal_given: 'Some days' }],
      ['m2_meal_days_stay_ready', { m2_meal_given: 'Some days' }],
      ['m2_meal_problem_start', { m2_meal_given: 'Some days', m2_meal_days_stay_ready: '4' }],
      ['m2_rest_given', {}],
      ['m2_rest_why_not', { m2_rest_given: 'Sometimes' }],
      ['m2_rest_why_not_explain', { m2_rest_given: 'No', m2_rest_why_not: ['Something else happened'] }],
      ['m2_after_clock_out_explain', { m2_after_clock_out: ['Something else after clocking out'] }],
      ['m2_away_from_job_explain', { m2_away_from_job: ['Something else away from work'] }],
      ['m2_unclocked_meetings_explain', { m2_unclocked_meetings: ['Something else I attended'] }],
      ['m2_wait_and_travel_explain', { m2_wait_and_travel: ['Something else while waiting or travelling'] }],
      ['m2_another_pattern_explain', { m2_most_frequent_pattern: OPENED, m2_another_pattern: 'Not sure' }],
    ]

    for (const [id, opening] of OPENS) {
      it(`draws ${id} once its gate is open`, () => {
        const answers = { m2_before_clock_in: [OPENED], ...opening }
        const question = find(MODULE_2_SECTIONS, id)
        const { sections } = drawModule(answers)
        const live = liveAnswersFor('en', answers)
        const onScreen = sections.flatMap(s => s.questions).filter(q => isVisible(q, live))
        expect(onScreen.map(q => q.id), `${id} should be visible`).toContain(id)

        // The label is drawn, and so is a control the worker can actually use.
        expect(screen.getAllByText(question.label).length).toBeGreaterThan(0)
        if (question.options) {
          for (const option of question.options) {
            expect(screen.getAllByText(option).length, `${id} choice "${option}"`).toBeGreaterThan(0)
          }
        } else {
          expect(document.querySelector(`#q-${id}`), `${id} needs an input`).not.toBeNull()
        }
      })
    }

    it('carries the new explain box into every branch of the repeating section', () => {
      const answers: Record<string, AnswerValue> = {
        m2_before_clock_in: [OPENED],
        m2_most_frequent_pattern: OPENED,
        [`m2_p_could_wait::${OPENED}`]: 'Sometimes',
      }
      const live = liveAnswersFor('en', answers)
      const { sections } = drawModule(answers)
      const ids = sections.flatMap(s => s.questions).filter(q => isVisible(q, live)).map(q => q.id)
      expect(ids).toContain(`m2_p_could_wait_explain::${OPENED}`)
      expect(
        screen.getAllByText('What stopped you from waiting until you were on the clock?').length
      ).toBeGreaterThan(0)
    })
  })
})

describe('the intake module', () => {
  it('draws every question a new client is shown', () => {
    const live = liveAnswersFor('en', {})
    const sections = preparedSections('module1', 'en', {}).filter(s => isVisible(s, live))
    render(
      <div>
        {sections.map(s => (
          <section key={s.id}>
            {s.questions.filter(q => isVisible(q, live)).map(q => (
              <div key={q.id}>
                <p>{q.label}</p>
                <QuestionInput
                  question={q}
                  inputId={`q-${q.id}`}
                  value={q.type === 'multiselect' ? [] : ''}
                  onChange={() => {}}
                  {...labels}
                />
              </div>
            ))}
          </section>
        ))}
      </div>
    )
    expect(screen.getByText('What is your full legal name?')).toBeDefined()
    expect(screen.getByText('Do you still work there?')).toBeDefined()
    // A current employee's closing sections are not drawn at all.
    expect(screen.queryByText('How did your employment end?')).toBeNull()
  })
})
