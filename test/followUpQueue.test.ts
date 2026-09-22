import { describe, it, expect } from 'vitest'
import { whoIsWaiting } from '@/lib/followUpQueue'

const who = (id: string, lang: 'en' | 'ko' | 'es' | 'zh' = 'en') => ({ id, name: id, lang })

/** Defaults so a case only states the lists it is actually about. */
const ask = (input: {
  clients?: { id: string; name: string; lang: 'en' | 'ko' | 'es' | 'zh' }[]
  finishedModule2?: string[]
  haveFacts?: string[]
  haveReading?: string[]
  haveRound?: string[]
}) =>
  whoIsWaiting({
    clients: input.clients ?? [],
    finishedModule2: input.finishedModule2 ?? [],
    haveFacts: input.haveFacts ?? [],
    haveReading: input.haveReading ?? [],
    haveRound: input.haveRound ?? [],
  })

describe('choosing who the nightly run reads next', () => {
  it('waits for Module 2, not Module 1', () => {
    // Module 2 is where the meal breaks, the unpaid time and the retaliation
    // are asked about. A round written before those answers exist would ask
    // about the half of the case nobody has described yet.
    const out = ask({ clients: [who('a'), who('b')], finishedModule2: ['b'] })
    expect(out.map(w => w.clientId)).toEqual(['b'])
  })

  it('leaves alone anyone who has all three', () => {
    const out = ask({
      clients: [who('a')],
      finishedModule2: ['a'],
      haveFacts: ['a'],
      haveReading: ['a'],
      haveRound: ['a'],
    })
    expect(out).toEqual([])
  })

  it('walks facts, then the reading, then the questions', () => {
    const needs = (had: { haveFacts?: string[]; haveReading?: string[] }) =>
      ask({ clients: [who('a')], finishedModule2: ['a'], ...had })[0].needs

    expect(needs({})).toBe('facts')
    expect(needs({ haveFacts: ['a'] })).toBe('reading')
    expect(needs({ haveFacts: ['a'], haveReading: ['a'] })).toBe('questions')
  })

  it('still reads a client who was given a round before readings were run', () => {
    // Branden's twenty questions were written from the fact ledger alone, with
    // no reading on file. Keying the queue off the round alone would have left
    // him — and everyone else read in those days — never read at all.
    const out = ask({
      clients: [who('branden')],
      finishedModule2: ['branden'],
      haveFacts: ['branden'],
      haveRound: ['branden'],
    })
    expect(out.map(w => w.needs)).toEqual(['reading'])
  })

  it('puts whoever is furthest along at the front', () => {
    // Otherwise a client needing only their questions written queues behind
    // somebody else's extraction and waits another night for no reason.
    const out = ask({
      clients: [who('needs-extraction'), who('needs-reading'), who('needs-questions')],
      finishedModule2: ['needs-extraction', 'needs-reading', 'needs-questions'],
      haveFacts: ['needs-reading', 'needs-questions'],
      haveReading: ['needs-questions'],
    })
    expect(out.map(w => w.clientId)).toEqual(['needs-questions', 'needs-reading', 'needs-extraction'])
  })

  it('carries the language the client reads, so the round is written in it', () => {
    const out = ask({ clients: [who('a', 'ko')], finishedModule2: ['a'] })
    expect(out[0].lang).toBe('ko')
  })

  it('is empty when nobody is owed anything', () => {
    expect(ask({ clients: [who('a')] })).toEqual([])
    expect(ask({ finishedModule2: ['ghost'] })).toEqual([])
  })
})
