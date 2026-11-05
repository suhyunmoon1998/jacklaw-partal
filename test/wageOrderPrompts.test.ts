import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LedgerEntry } from '@/lib/factLedger'

/*
 * What the models are told about a Wage Order that is not settled, or that an
 * attorney settled. The model itself is a fake that records what it was sent.
 */

const sent = vi.hoisted(() => ({ texts: [] as string[], output: {} as unknown }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: (request: { messages: { content: string | { text: string }[] }[] }) => {
        const { content } = request.messages[0]
        sent.texts.push(typeof content === 'string' ? content : content.map(c => c.text).join('\n'))
        return { finalMessage: async () => ({ usage: {}, stop_reason: 'end_turn', parsed_output: sent.output }) }
      },
    }
  },
}))

import { askFollowUps } from '@/lib/followUp'
import { buildMatrix } from '@/lib/claimMatrix'
import { claimsFor } from '@/lib/caseReading'

const fact: LedgerEntry = {
  id: 'c1:f001',
  proposition: 'She rang up customers at the counter.',
  verbatim: 'cashier',
  provenance: { kind: 'portal answer', pinpoint: 'job', on: '' },
  period: '',
  actors: [],
  location: '',
  status: 'REPORTED',
  confidenceBasis: '',
  corroboration: [],
  contrary: '',
  legalTags: [],
  damagesTags: [],
  openLoop: '',
  addedBy: 'test',
  supersededBy: null,
  supersededWhy: null,
}

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic')
  sent.texts = []
})

describe('a round of questions while no Wage Order is settled', () => {
  const ask = (wageOrderOpen?: string) => {
    sent.output = { questions: [], leftOut: [] }
    return askFollowUps({ entries: [fact], findings: [], spine: null, lang: 'es', wageOrderOpen })
  }

  it('asks what would settle it, first, and in words the client can answer', async () => {
    await ask('Did customers eat there, or take goods away?')
    const missing = sent.texts[0].split('=== WHAT IS STILL MISSING ===')[1]
    expect(missing).toContain('ASK THIS FIRST')
    expect(missing).toContain('LEAVE OUT ANY PART THAT IS A LEGAL QUESTION')
    expect(missing.trim().startsWith('WHAT THE BUSINESS ACTUALLY DOES')).toBe(true)
    expect(missing).toContain('Did customers eat there, or take goods away?')
  })

  it('says nothing about it once the Order is settled', async () => {
    await ask('')
    expect(sent.texts[0]).not.toContain('WHAT THE BUSINESS ACTUALLY DOES')
  })
})

describe('the claims', () => {
  const read = (wageOrderChosen: boolean) => {
    sent.output = { claimId: 'x', standing: 'unknown', elements: [], adverse: [], defense: '', damagesInputs: [], damagesMissing: [] }
    return buildMatrix([fact], claimsFor('claims 1').slice(0, 5), { wageOrder: '7', wageOrderChosen })
  }

  it('are told when an attorney chose the Order', async () => {
    await read(true)
    expect(sent.texts.join('\n')).toContain('the Order CHOSEN BY AN ATTORNEY for this employer')
    expect(sent.texts.join('\n')).not.toContain('not confirmed by an attorney')
  })

  it('are told it is only a proposal otherwise', async () => {
    await read(false)
    expect(sent.texts.join('\n')).toContain('the Order PROPOSED for this employer; not confirmed by an attorney')
  })
})
