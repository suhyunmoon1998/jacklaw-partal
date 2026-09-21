import { describe, it, expect } from 'vitest'
import { whoIsWaiting } from '@/lib/followUpQueue'

const who = (id: string, lang: 'en' | 'ko' | 'es' | 'zh' = 'en') => ({ id, name: id, lang })

describe('choosing who the nightly run reads next', () => {
  it('waits for Module 2, not Module 1', () => {
    // Module 2 is where the meal breaks, the unpaid time and the retaliation
    // are asked about. A round written before those answers exist would ask
    // about the half of the case nobody has described yet.
    const out = whoIsWaiting({
      clients: [who('a'), who('b')],
      finishedModule2: ['b'],
      haveFacts: [],
      haveRound: [],
    })
    expect(out.map(w => w.clientId)).toEqual(['b'])
  })

  it('leaves alone anyone who already has a round', () => {
    const out = whoIsWaiting({
      clients: [who('a')],
      finishedModule2: ['a'],
      haveFacts: ['a'],
      haveRound: ['a'],
    })
    expect(out).toEqual([])
  })

  it('asks for facts first, then questions', () => {
    expect(
      whoIsWaiting({ clients: [who('a')], finishedModule2: ['a'], haveFacts: [], haveRound: [] })[0].needs
    ).toBe('facts')
    expect(
      whoIsWaiting({ clients: [who('a')], finishedModule2: ['a'], haveFacts: ['a'], haveRound: [] })[0].needs
    ).toBe('questions')
  })

  it('puts whoever is one step from a round at the front', () => {
    // Otherwise a client needing only their questions written queues behind
    // somebody else's extraction and waits another night for no reason.
    const out = whoIsWaiting({
      clients: [who('needs-extraction'), who('needs-questions')],
      finishedModule2: ['needs-extraction', 'needs-questions'],
      haveFacts: ['needs-questions'],
      haveRound: [],
    })
    expect(out.map(w => w.clientId)).toEqual(['needs-questions', 'needs-extraction'])
  })

  it('carries the language the client reads, so the round is written in it', () => {
    const out = whoIsWaiting({
      clients: [who('a', 'ko')],
      finishedModule2: ['a'],
      haveFacts: [],
      haveRound: [],
    })
    expect(out[0].lang).toBe('ko')
  })

  it('is empty when nobody is owed anything', () => {
    expect(whoIsWaiting({ clients: [who('a')], finishedModule2: [], haveFacts: [], haveRound: [] })).toEqual([])
    expect(whoIsWaiting({ clients: [], finishedModule2: ['ghost'], haveFacts: [], haveRound: [] })).toEqual([])
  })
})
