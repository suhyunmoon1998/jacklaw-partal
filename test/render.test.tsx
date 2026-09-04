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
