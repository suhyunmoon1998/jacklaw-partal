import { describe, it, expect } from 'vitest'
import { Waiting, drain, whoIsWaiting } from '@/lib/followUpQueue'

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

describe('draining the queue in one run', () => {
  const w = (clientId: string, needs: Waiting['needs']): Waiting => ({
    clientId,
    name: clientId,
    lang: 'en',
    needs,
  })
  const startBy = { facts: 120, reading: 145, questions: 170 }

  /** A queue that moves each client one step along whenever it is stepped. */
  function fakeNight(initial: Waiting[], secondsPerStep: number) {
    const state = new Map(initial.map(x => [x.clientId, x.needs as string]))
    const order = ['facts', 'reading', 'questions', 'done']
    let clock = 0
    return {
      waiting: async () =>
        initial
          .filter(x => state.get(x.clientId) !== 'done')
          .map(x => w(x.clientId, state.get(x.clientId) as Waiting['needs'])),
      step: async (next: Waiting) => {
        clock += secondsPerStep
        state.set(next.clientId, order[order.indexOf(next.needs) + 1])
        return { ran: true, client: next.clientId, did: next.needs }
      },
      elapsed: () => clock,
    }
  }

  it('keeps going while there is time, across steps and clients', async () => {
    const night = fakeNight([w('a', 'questions'), w('b', 'facts')], 40)
    const { done, left } = await drain({ ...night, startBy })
    expect(done.map(d => `${d.client}:${d.did}`)).toEqual(['a:questions', 'b:facts', 'b:reading', 'b:questions'])
    expect(left).toEqual([])
  })

  it('does not begin a step it has no room for, but always begins the first', async () => {
    const night = fakeNight([w('a', 'facts')], 130)
    const { done, left } = await drain({ ...night, startBy })
    // The first step runs whatever the clock says; at 130s a reading may not
    // begin (145 is the limit, so it could), but at 260s nothing may.
    expect(done.map(d => d.did)).toEqual(['facts', 'reading'])
    expect(left.map(x => x.needs)).toEqual(['questions'])
  })

  it('passes over a client whose step did not advance, and serves the next', async () => {
    let bRead = false
    const { done } = await drain({
      waiting: async () => (bRead ? [w('stuck', 'reading')] : [w('stuck', 'reading'), w('b', 'facts')]),
      step: async next => {
        if (next.clientId === 'b') bRead = true
        return next.clientId === 'stuck'
          ? { ran: false, client: 'stuck', reason: 'the Wage Order proposal contradicts itself' }
          : { ran: true, client: 'b', did: 'facts' }
      },
      elapsed: () => 0,
      startBy,
    })
    expect(done.map(d => `${d.client}:${d.ran}`)).toEqual(['stuck:false', 'b:true'])
  })

  it('records a step that throws and moves on', async () => {
    const { done } = await drain({
      waiting: async () => [w('a', 'facts'), w('b', 'questions')],
      step: async next => {
        if (next.clientId === 'a') throw new Error('terminated')
        return { ran: false, client: 'b', reason: 'The reading found nothing worth asking.' }
      },
      elapsed: () => 0,
      startBy,
    })
    expect(done).toEqual([
      { ran: false, client: 'a', error: 'terminated' },
      { ran: false, client: 'b', reason: 'The reading found nothing worth asking.' },
    ])
  })
})
