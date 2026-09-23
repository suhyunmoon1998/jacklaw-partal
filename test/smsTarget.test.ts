import { describe, it, expect } from 'vitest'
import { chooseSmsTarget, usablePhone } from '@/lib/assignmentInvite'

/**
 * The office can now type a number the client's file does not have, which is
 * the point: a client with no email address usually reached this firm by
 * telephone, and that number is on a message pad rather than in the database.
 * What must survive anything they type is the STOP flag and an honest refusal
 * of a number that is not one.
 */
describe('choosing the number a send will text', () => {
  const onFile = { phone: '(213) 555-0147', optedOut: false }

  it('texts the number on file when the caller offers no field', () => {
    expect(chooseSmsTarget(undefined, onFile)).toEqual({ phone: '(213) 555-0147' })
  })

  it('texts the number the office typed instead of the one on file', () => {
    expect(chooseSmsTarget('310-555-0182', onFile)).toEqual({ phone: '310-555-0182' })
  })

  it('texts a typed number for a client whose file has none', () => {
    // The whole reason the field exists.
    expect(chooseSmsTarget('310-555-0182', { phone: '', optedOut: false })).toEqual({
      phone: '310-555-0182',
    })
  })

  it('sends no text when the office clears the box', () => {
    // Clearing one channel is how they send by the other alone.
    expect(chooseSmsTarget('', onFile)).toEqual({ phone: '', reason: 'off' })
    expect(chooseSmsTarget('   ', onFile)).toEqual({ phone: '', reason: 'off' })
  })

  it('never texts a client who replied STOP, whatever is typed', () => {
    const stopped = { phone: '(213) 555-0147', optedOut: true }
    expect(chooseSmsTarget(undefined, stopped)).toEqual({ phone: '', reason: 'opted-out' })
    expect(chooseSmsTarget('310-555-0182', stopped)).toEqual({ phone: '', reason: 'opted-out' })
  })

  it('refuses a half-typed number out loud rather than dropping it', () => {
    // Silently ignoring this is how a send reports success for a text nobody
    // sent, and the office stops chasing a client who was never reached.
    expect(chooseSmsTarget('213-555', onFile)).toEqual({ phone: '', reason: 'unusable' })
    expect(chooseSmsTarget('ext. 4', onFile)).toEqual({ phone: '', reason: 'unusable' })
  })

  it('says so when there is nothing to text and nothing was typed', () => {
    expect(chooseSmsTarget(undefined, { phone: '', optedOut: false })).toEqual({
      phone: '',
      reason: 'none',
    })
  })
})

describe('what counts as a phone number', () => {
  it('takes ten digits however they are punctuated', () => {
    for (const s of ['2135550147', '213-555-0147', '(213) 555-0147', '+1 213 555 0147']) {
      expect(usablePhone(s)).toBe(s.trim())
    }
  })

  it('rejects anything shorter, which is an extension or a partial', () => {
    for (const s of ['555-0147', '213', '', '   ', 'x4']) expect(usablePhone(s)).toBe('')
  })
})
