import { describe, it, expect } from 'vitest'
import {
  FactForPeople,
  alignmentOf,
  isIdentified,
  kindOf,
  maybeTheClient,
  nextStepFor,
  whosWho,
} from '@/lib/whosWho'

/**
 * Every actor string below is one the production ledger actually holds for
 * Dayeon Kim — partial names, role words, and descriptions of people nobody
 * has named. The corpus keeps them as they are; this must not tidy them into
 * a witness who does not exist.
 */
const ACTORS = [
  'Dayeon Kim',
  'DAYEON KIM',
  'Dani Kim',
  'manager',
  'unnamed manager or lead',
  'boss',
  'boss or manager',
  'a boss or coworker',
  'owner',
  'another server',
  'unnamed coworker',
  'servers',
  'bussers',
  'kitchen staff',
  'GUHARA, INC',
  'employer',
  'employer (person who made the requirement not named in this answer)',
]

const fact = (id: string, actors: string[], over: Partial<FactForPeople> = {}): FactForPeople => ({
  id,
  proposition: `proposition ${id}`,
  status: 'REPORTED',
  actors,
  ...over,
})

describe('what kind of thing an actor is', () => {
  it('tells a person from a class of people from the business', () => {
    expect(kindOf('manager')).toBe('individual')
    expect(kindOf('servers')).toBe('group')
    expect(kindOf('kitchen staff')).toBe('group')
    expect(kindOf('GUHARA, INC')).toBe('entity')
    expect(kindOf('employer')).toBe('entity')
  })
})

describe('whose side they are likely on', () => {
  it('places management, coworkers and the client', () => {
    expect(alignmentOf('owner', 'Dayeon Kim')).toBe('company')
    expect(alignmentOf('unnamed manager or lead', 'Dayeon Kim')).toBe('company')
    expect(alignmentOf('another server', 'Dayeon Kim')).toBe('coworker')
    expect(alignmentOf('bussers', 'Dayeon Kim')).toBe('coworker')
    expect(alignmentOf('Dayeon Kim', 'Dayeon Kim')).toBe('client')
  })
})

describe('whether anybody could actually be found', () => {
  it('refuses a role word and a description as an identification', () => {
    // None of these can be served with anything.
    for (const a of ['manager', 'boss', 'unnamed manager or lead', 'a boss or coworker', 'another server', 'servers']) {
      expect(isIdentified(a), a).toBe(false)
    }
  })

  it('accepts a proper name', () => {
    expect(isIdentified('Dani Kim')).toBe(true)
  })
})

describe('the map itself', () => {
  const facts = [
    fact('f001', ['manager'], { legalTags: ['off-the-clock'] }),
    fact('f002', ['manager', 'owner'], { legalTags: ['off-the-clock', 'overtime'] }),
    fact('f003', ['another server']),
    fact('f004', ['servers', 'bussers', 'kitchen staff']),
    fact('f005', ['Dayeon Kim', 'DAYEON KIM']),
  ]

  it('keeps the client off her own witness map', () => {
    const people = whosWho(facts, 'Dayeon Kim')
    expect(people.some(p => p.alignment === 'client')).toBe(false)
  })

  it('ranks by what a person actually knows', () => {
    const people = whosWho(facts, 'Dayeon Kim')
    // The manager appears in two facts and is management; the server in one.
    expect(people[0].name).toBe('manager')
    expect(people[0].facts.map(f => f.id)).toEqual(['f001', 'f002'])
  })

  it('carries the issues those facts are tagged to', () => {
    const people = whosWho(facts, 'Dayeon Kim')
    expect(people[0].knowsAbout).toEqual(['off-the-clock', 'overtime'])
  })

  it('does not fold two descriptions into one witness', () => {
    // "boss", "manager" and "unnamed manager or lead" may be one person or
    // three. Merging them puts a name on a deposition notice nobody gave.
    const people = whosWho(
      [fact('f001', ['boss']), fact('f002', ['manager']), fact('f003', ['unnamed manager or lead'])],
      'Dayeon Kim'
    )
    expect(people).toHaveLength(3)
  })

  it('folds only spellings of the same string', () => {
    const people = whosWho([fact('f001', ['Manager']), fact('f002', ['manager'])], 'Dayeon Kim')
    expect(people).toHaveLength(1)
    expect(people[0].aliases).toEqual(['manager'])
  })

  it('survives every actor string the real ledger holds', () => {
    const people = whosWho(ACTORS.map((a, i) => fact(`f${i}`, [a])), 'Dayeon Kim')
    expect(people.length).toBeGreaterThan(10)
    // Nobody unnamed is ever marked findable.
    for (const p of people) {
      if (/unnamed|not named|a boss or/.test(p.name)) expect(p.identified).toBe(false)
    }
  })
})

describe('the client under another name', () => {
  it('does not put her on her own witness map when the alias is known', () => {
    const people = whosWho([fact('f001', ['Dani Kim'])], ['Dayeon Kim', 'Dani Kim'])
    expect(people).toHaveLength(0)
  })

  it('keeps a shared surname but says to check, rather than guessing', () => {
    // Dropping the row would hide a real witness who happens to be a relative.
    const people = whosWho([fact('f001', ['Dani Kim'])], 'Dayeon Kim')
    expect(people).toHaveLength(1)
    expect(people[0].nextStep).toContain('confirm whether this is her')
  })

  it('takes a name the record itself says was hers', () => {
    // DAYEON KIM's f003, word for word, with both names as its actors.
    const alias = { ...fact('f003', ['Dayeon Kim', 'Dani Kim']), proposition: 'The other name the client used at the job was Dani Kim.' }
    const people = whosWho([alias, fact('f010', ['Dani Kim'])], 'Dayeon Kim')
    expect(people.map(p => p.name)).not.toContain('Dani Kim')
  })

  it('does not take a name the record only mentions beside hers', () => {
    const together = { ...fact('f004', ['Dayeon Kim', 'Dani Kim']), proposition: 'Dani Kim covered her shift on Sunday.' }
    expect(whosWho([together], 'Dayeon Kim').map(p => p.name)).toContain('Dani Kim')
  })

  it('does not ask whether her manager is her, over a shared surname', () => {
    expect(maybeTheClient('manager Kim (김매니져)', 'Dayeon Kim')).toBe(false)
    expect(maybeTheClient('boss Kim', 'Dayeon Kim')).toBe(false)
  })

  it('does not warn about somebody with no name in common', () => {
    expect(maybeTheClient('manager', 'Dayeon Kim')).toBe(false)
    expect(maybeTheClient('Dani Kim', 'Dayeon Kim')).toBe(true)
  })
})

describe('what the office does next about a person', () => {
  it('asks for a name when there is not one', () => {
    expect(nextStepFor({ kind: 'individual', alignment: 'company', identified: false })).toContain(
      'not identified'
    )
  })

  it('sends an identified manager to a deposition and a coworker to an interview', () => {
    expect(nextStepFor({ kind: 'individual', alignment: 'company', identified: true })).toContain(
      'deposition'
    )
    expect(nextStepFor({ kind: 'individual', alignment: 'coworker', identified: true })).toContain(
      'Witness interview'
    )
  })

  it('treats a class of people as the cohort to canvass', () => {
    expect(nextStepFor({ kind: 'group', alignment: 'coworker', identified: false })).toContain(
      'same problem'
    )
  })
})
