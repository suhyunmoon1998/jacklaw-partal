import { describe, expect, it } from 'vitest'
import { sectionsFor } from '@/lib/modules'
import { prepareSections } from '@/lib/repeatSections'

type Shown = { id: string; options?: string[]; optionLabels?: string[] }
const question = (sections: { questions: Shown[] }[], id: string) =>
  sections.flatMap(s => s.questions).find(q => q.id === id)!

describe('choices borrowed from earlier answers read in the client’s language', () => {
  const answers = {
    m2_before_clock_in: ['Opened a door or gate'],
    m2_most_frequent_pattern: 'Opened a door or gate',
    m2_what_got_worse: ['I was fired or laid off'],
  }

  it('shows a Spanish client Spanish choices, and files the English value', () => {
    const shown = prepareSections(sectionsFor('module2', 'es'), answers) as unknown as { title: string; questions: Shown[] }[]
    const most = question(shown, 'm2_most_frequent_pattern')
    expect(most.options).toEqual(['Opened a door or gate'])
    expect(most.optionLabels).toEqual(['Abrió una puerta o un portón'])
    expect(question(shown, 'm2_first_bad_thing').optionLabels).toEqual(['Me despidieron o me dieron de baja'])
    expect(shown.map(s => s.title)).toContain('Trabajo no remunerado — Abrió una puerta o un portón')
  })

  it('leaves English as it was', () => {
    const shown = prepareSections(sectionsFor('module2', 'en'), answers) as unknown as { title: string; questions: Shown[] }[]
    expect(question(shown, 'm2_most_frequent_pattern').optionLabels).toEqual(['Opened a door or gate'])
    expect(shown.map(s => s.title)).toContain('Unpaid Work — Opened a door or gate')
  })
})
